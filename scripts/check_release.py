"""Read-only deployment readiness check. Never outputs credentials or account records."""
import json
import sys
import time
from pathlib import Path
import boto3
from botocore.config import Config

root = Path(__file__).resolve().parents[1]
settings = dict(line.split('=', 1) for line in (root / '.env').read_text().splitlines()
                if '=' in line and not line.startswith('#'))
session = boto3.Session(region_name=settings['AWS_REGION'], profile_name=settings.get('AWS_PROFILE') or None)
options = Config(connect_timeout=8, read_timeout=20, retries={'max_attempts': 1})
cf = session.client('cloudformation', config=options)
db = session.client('dynamodb', config=options)
deadline = time.monotonic() + (900 if '--watch' in sys.argv else 0)
while True:
    stack = cf.describe_stacks(StackName=settings['STACK_NAME'])['Stacks'][0]
    table = db.describe_table(TableName=settings['TABLE_NAME'])['Table']
    indexes = {item['IndexName']: item['IndexStatus'] for item in table.get('GlobalSecondaryIndexes', [])}
    report = {'stack': stack['StackStatus'], 'indexes': indexes,
              'ready': stack['StackStatus'] == 'UPDATE_COMPLETE' and indexes.get('OwnerRequests') == 'ACTIVE'}
    (root / '.runtime').mkdir(exist_ok=True)
    (root / '.runtime/release-status.json').write_text(json.dumps(report, indent=2))
    print(json.dumps(report), flush=True)
    if report['ready']:
        break
    if 'ROLLBACK' in report['stack'] or time.monotonic() >= deadline:
        sys.exit(1)
    time.sleep(10)
