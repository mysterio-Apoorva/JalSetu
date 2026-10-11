"""Read-only AWS readiness and provider probes. Never logs credentials or user data.

Run with --inference to include one small Bedrock request (provider usage applies).
No emails, account changes, dispatches or database writes are performed.
"""
import argparse
import json
from pathlib import Path
import urllib.request
import urllib.error
import boto3
from botocore.config import Config

ROOT = Path(__file__).resolve().parents[1]

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--inference', action='store_true')
    args = parser.parse_args()
    config = dict(line.split('=', 1) for line in (ROOT / '.env').read_text().splitlines()
                  if '=' in line and not line.lstrip().startswith('#'))
    session = boto3.Session(profile_name=config.get('AWS_PROFILE') or None, region_name=config['AWS_REGION'])
    options = Config(connect_timeout=8, read_timeout=25, retries={'max_attempts': 1})
    client = lambda name: session.client(name, config=options)
    report = {}

    def check(name, work):
        try:
            report[name] = work()
        except Exception as error:
            report[name] = {'error': getattr(error, 'response', {}).get('Error', {}).get('Code', type(error).__name__)}
        print(name + ': ' + json.dumps(report[name], default=str), flush=True)

    environment = client('lambda').get_function_configuration(FunctionName=config['REQUEST_FUNCTION_NAME'])['Environment']['Variables']

    def email():
        sender = environment.get('OTP_FROM_EMAIL')
        ses = client('ses')
        verified = ses.get_identity_verification_attributes(Identities=[sender]).get('VerificationAttributes', {}).get(sender, {}).get('VerificationStatus') if sender else None
        account = client('sesv2').get_account()
        return {'senderConfigured': bool(sender), 'senderVerified': verified == 'Success',
                'productionAccess': account.get('ProductionAccessEnabled'), 'sendingEnabled': account.get('SendingEnabled'),
                'max24HourSend': account.get('SendQuota', {}).get('Max24HourSend')}

    def route():
        centre = next(row for row in json.loads((ROOT / 'backend/shared/jal-kendras.json').read_text()) if row['status'] == 'READY')
        point = centre['coordinates']
        result = client('location').calculate_route(CalculatorName=config['ROUTE_CALCULATOR_NAME'],
            DeparturePosition=[point['lng'], point['lat']], DestinationPosition=[77.21, 28.63],
            TravelMode='Truck', IncludeLegGeometry=True, DistanceUnit='Kilometers', DepartNow=True)
        return {'provider': result['Summary']['DataSource'], 'distanceKm': result['Summary']['Distance'],
                'geometryPoints': sum(len(leg.get('Geometry', {}).get('LineString', [])) for leg in result['Legs'])}

    def public_api():
        base = config['VITE_API_BASE_URL'].rstrip('/') + '/api/v1'
        with urllib.request.urlopen(base + '/public', timeout=25) as response:
            data = json.load(response)
        unauthenticated = None
        try:
            with urllib.request.urlopen(base + '/snapshot', timeout=15) as response:
                unauthenticated = response.status
        except urllib.error.HTTPError as error:
            unauthenticated = error.code
        return {'publicAvailable': isinstance(data.get('deliveries'), list), 'recordedDeliveries': len(data.get('deliveries', [])),
                'verifiedWards': len(data.get('wards', [])), 'unauthenticatedSnapshotStatus': unauthenticated}

    def bedrock():
        result = client('bedrock-runtime').converse(modelId=config['BEDROCK_MODEL_ID'],
            messages=[{'role': 'user', 'content': [{'text': 'Reply with READY only.'}]}],
            inferenceConfig={'maxTokens': 8, 'temperature': 0})
        return {'responseReceived': bool(result.get('output', {}).get('message', {}).get('content')), 'stopReason': result.get('stopReason')}

    check('email', email)
    check('roadRoute', route)
    check('api', public_api)
    check('workflow', lambda: {'status': client('stepfunctions').describe_state_machine(stateMachineArn=config['STATE_MACHINE_ARN'])['status']})
    check('eventBus', lambda: {'configured': bool(client('events').describe_event_bus(Name=config['EVENTS_BUS_NAME']).get('Arn'))})
    check('imageGeneration', lambda: {'dailyLimit': int(environment.get('SIMULATION_DAILY_LIMIT', '0'))})
    if args.inference:
        check('bedrock', bedrock)
    target = ROOT / '.runtime/service-health.json'
    target.parent.mkdir(exist_ok=True)
    target.write_text(json.dumps(report, indent=2) + '\n')

if __name__ == '__main__':
    main()
