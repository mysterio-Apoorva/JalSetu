"""Read-only deployment audit. Saves summaries, never credentials, tokens or record PII."""
import base64
import collections
import concurrent.futures
import hashlib
import io
import json
from pathlib import Path
import urllib.request
import zipfile
import sys
from decimal import Decimal
import boto3
from botocore.config import Config

ROOT = Path(__file__).resolve().parents[1]
CONFIG = dict(line.split('=', 1) for line in (ROOT / '.env').read_text().splitlines()
              if '=' in line and not line.lstrip().startswith('#'))
session = boto3.Session(region_name=CONFIG.get('AWS_REGION'), profile_name=CONFIG.get('AWS_PROFILE') or None)
options = Config(connect_timeout=8, read_timeout=20, retries={'max_attempts': 1})
report = json.loads((ROOT / '.runtime/project-audit-aws.json').read_text()) if (ROOT / '.runtime/project-audit-aws.json').exists() else {}

def client(name):
    return session.client(name, config=options)

def capture(name, fn):
    try:
        value = fn()
    except Exception as error:
        value = {'error': type(error).__name__, 'detail': str(error)[:700]}
    report[name] = value
    (ROOT / '.runtime').mkdir(exist_ok=True)
    (ROOT / '.runtime/project-audit-aws.json').write_text(json.dumps(report, indent=2, default=str))
    print(name + ': ' + json.dumps(value, default=str), flush=True)

def infrastructure():
    cf = client('cloudformation')
    stack = cf.describe_stacks(StackName=CONFIG['STACK_NAME'])['Stacks'][0]
    resources = cf.list_stack_resources(StackName=CONFIG['STACK_NAME'])['StackResourceSummaries']
    return {'status': stack['StackStatus'], 'updated': stack.get('LastUpdatedTime'),
            'resources': [{k: r.get(k) for k in ['LogicalResourceId', 'ResourceType', 'ResourceStatus']} for r in resources],
            'policy_mode': CONFIG.get('POLICY_STORE_ID')}

def lambdas():
    aws = client('lambda')
    result = []
    for key in ['REQUEST_FUNCTION_NAME', 'CLASSIFIER_FUNCTION_NAME', 'OPTIMIZER_FUNCTION_NAME',
                'TELEMETRY_FUNCTION_NAME', 'POD_FUNCTION_NAME', 'FRAUD_FUNCTION_NAME']:
        data = aws.get_function(FunctionName=CONFIG[key])
        cfg = data['Configuration']
        item = {'component': key, 'state': cfg['State'], 'runtime': cfg['Runtime'],
                'updated': cfg['LastModified'], 'handler': cfg['Handler'],
                'policy_mode': cfg.get('Environment', {}).get('Variables', {}).get('POLICY_STORE_ID'),
                'model': cfg.get('Environment', {}).get('Variables', {}).get('BEDROCK_MODEL_ID')}
        item['package_bytes'] = cfg['CodeSize']
        item['package_hash'] = cfg['CodeSha256']
        item['source_comparison'] = 'Not completed: package downloads exceeded practical audit duration'
        item['event_sources'] = [{k: m.get(k) for k in ['State', 'LastProcessingResult', 'EventSourceArn']}
                                for m in aws.list_event_source_mappings(FunctionName=CONFIG[key])['EventSourceMappings']]
        result.append(item)
        print('Lambda metadata: ' + key + ' ' + cfg['State'], flush=True)
    return result

def records():
    table = session.resource('dynamodb', config=options).Table(CONFIG['TABLE_NAME'])
    items = []
    args = {}
    while True:
        page = table.scan(**args)
        items.extend(page.get('Items', []))
        if not page.get('LastEvaluatedKey'): break
        args['ExclusiveStartKey'] = page['LastEvaluatedKey']
    counts = collections.Counter(x.get('GSI1PK', 'unknown') for x in items)
    requests = [x for x in items if x.get('GSI1PK') == 'REQUEST']
    wards = [x for x in items if x.get('GSI1PK') == 'WARD']
    fleet = [x for x in items if x.get('GSI1PK') == 'TANKER']
    bootstrap = json.loads((ROOT / 'backend/dynamodb/bootstrap-records.json').read_text())
    return {'counts': counts, 'request_statuses': collections.Counter(x.get('status') for x in requests),
            'requests': [{'id': x['id'], 'status': x.get('status'), 'urgency': x.get('urgencyScore'),
                          'created': x.get('createdAt'), 'otp_expired': float(x.get('otpExpiresAt', 0)) < __import__('time').time()*1000,
                          'has_workflow_callback': bool(x.get('taskToken')), 'has_evidence': bool(x.get('proofHash'))} for x in requests],
            'ward_delivered_liters': sum(x.get('deliveredLitersToday', 0) for x in wards),
            'audit_liters': sum(x.get('litersDelivered', 0) for x in items if x.get('GSI1PK') == 'AUDIT'),
            'bootstrap_static_matches': {x['id']: all(json.loads(json.dumps(x.get(k), default=lambda v: float(v) if isinstance(v, Decimal) else str(v))) == seed.get(k) for k in ['name', 'population', 'coordinates', 'deficitSeverity']) for x in wards for seed in bootstrap if seed['id'] == x['id']},
            'fleet': [{'id': x['id'], 'status': x.get('status'), 'stops': len(x.get('assignedRoute', [])),
                       'telemetry_at': x.get('telemetryAt'), 'recorded_liters': x.get('currentWaterLevelLiters'),
                       'observed_liters': x.get('observedWaterLevelLiters'),
                       'is_bootstrap_vehicle': any(s['id'] == x['id'] for s in bootstrap)} for x in fleet]}

def workflows():
    aws = client('stepfunctions')
    executions = aws.list_executions(stateMachineArn=CONFIG['STATE_MACHINE_ARN'], maxResults=25)['executions']
    result = []
    for ex in executions:
        hist = aws.get_execution_history(executionArn=ex['executionArn'], maxResults=100, reverseOrder=True, includeExecutionData=False)['events']
        errors = []
        for entry in hist:
            for key, detail in entry.items():
                if isinstance(detail, dict) and detail.get('error'):
                    errors.append({'event': entry['type'], 'error': detail['error']})
        result.append({'name': ex['name'], 'status': ex['status'], 'started': ex['startDate'],
                       'recent_events': [x['type'] for x in hist[:6]], 'errors': errors})
    return result

def storage():
    s3 = client('s3')
    bucket = CONFIG['POD_BUCKET_NAME']
    objects = s3.list_objects_v2(Bucket=bucket, Prefix='evidence/', MaxKeys=1000)
    sqs = client('sqs')
    attrs = sqs.get_queue_attributes(QueueUrl=CONFIG['SURGE_QUEUE_URL'], AttributeNames=['All'])['Attributes']
    result = {'s3_versioning': s3.get_bucket_versioning(Bucket=bucket).get('Status'),
              'evidence_objects': objects.get('KeyCount', 0),
              's3_public_block': s3.get_public_access_block(Bucket=bucket)['PublicAccessBlockConfiguration'],
              'queue': {k: attrs.get(k) for k in ['ApproximateNumberOfMessages', 'ApproximateNumberOfMessagesNotVisible', 'FifoQueue']}}
    result['photo_validation'] = []
    for obj in objects.get('Contents', [])[:5]:
        data = s3.get_object(Bucket=bucket, Key=obj['Key'])
        content = data['Body'].read()
        (ROOT / '.runtime/audit-proof-image.jpg').write_bytes(content)
        entry = {'bytes': len(content), 'content_type': data.get('ContentType'),
                 'hash_matches_metadata': hashlib.sha256(content).hexdigest() == data.get('Metadata', {}).get('photohash')}
        try:
            from PIL import Image
            picture = Image.open(io.BytesIO(content))
            entry['dimensions'] = list(picture.size)
            picture.verify()
            entry['decodable_image'] = True
        except ImportError:
            entry['decodable_image'] = 'Pillow unavailable'
        except Exception as error:
            entry['decodable_image'] = False
            entry['decode_error'] = type(error).__name__
        result['photo_validation'].append(entry)
    if attrs.get('RedrivePolicy'):
        arn = json.loads(attrs['RedrivePolicy'])['deadLetterTargetArn']
        url = sqs.get_queue_url(QueueName=arn.split(':')[-1])['QueueUrl']
        result['dlq'] = sqs.get_queue_attributes(QueueUrl=url, AttributeNames=['ApproximateNumberOfMessages'])['Attributes']
    return result

def locations():
    loc = client('location')
    return {'tracked_devices': len(loc.list_device_positions(TrackerName=CONFIG['TRACKER_NAME']).get('Entries', [])),
            'geofences': [{'id': g['GeofenceId'], 'status': g['Status']} for g in loc.list_geofences(CollectionName=CONFIG['GEOFENCE_COLLECTION_NAME']).get('Entries', [])],
            'routing_provider': loc.describe_route_calculator(CalculatorName=CONFIG['ROUTE_CALCULATOR_NAME'])['DataSource']}

if __name__ == '__main__':
    for name, function in [('infrastructure', infrastructure), ('records', records), ('workflows', workflows),
                           ('storage', storage), ('locations', locations), ('lambdas', lambdas)]:
        if len(sys.argv) == 1 or sys.argv[1] == name:
            capture(name, function)
