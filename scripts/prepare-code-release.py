"""Prepare an immutable code-only CloudFormation change set; never execute it.

Usage: python scripts/prepare-code-release.py PodFunction
Dependencies must first be packaged with the project's SAM build command.
"""
import hashlib
import json
import shutil
import sys
import time
import zipfile
from pathlib import Path
from urllib.parse import urlparse
import boto3
import yaml
from botocore.config import Config

root = Path(__file__).resolve().parents[1]
name = sys.argv[1]
settings = dict(line.split('=', 1) for line in (root / '.env').read_text().splitlines()
                if '=' in line and not line.startswith('#'))
session = boto3.Session(region_name=settings['AWS_REGION'], profile_name=settings.get('AWS_PROFILE') or None)
options = Config(connect_timeout=8, read_timeout=60, retries={'max_attempts': 1})
cf = session.client('cloudformation', config=options)
template = cf.get_template(StackName=settings['STACK_NAME'], TemplateStage='Original')['TemplateBody']
if isinstance(template, str):
    template = yaml.safe_load(template)
resource = template['Resources'][name]
assert resource['Type'] == 'AWS::Serverless::Function'
old_uri = resource['Properties']['CodeUri']
bucket = old_uri['Bucket'] if isinstance(old_uri, dict) else urlparse(old_uri).netloc
assert bucket
artifact = root / '.aws-sam/build' / name
for file in ('package.json', 'package-lock.json'):
    assert (artifact / file).read_bytes() == (root / 'backend' / file).read_bytes(), 'Run SAM build after dependency changes'
staging = root / '.runtime' / ('code-release-' + str(time.time_ns()))
shutil.copytree(artifact, staging)
for directory in ('shared', 'lambdas'):
    shutil.copytree(root / 'backend' / directory, staging / directory, dirs_exist_ok=True)
archive = staging.with_suffix('.zip')
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as package:
    for file in sorted(staging.rglob('*')):
        if file.is_file():
            package.write(file, file.relative_to(staging).as_posix())
code = archive.read_bytes()
digest = hashlib.sha256(code).hexdigest()
key = 'code-releases/' + digest + '.zip'
print('Uploading immutable code artifact:', len(code), 'bytes', flush=True)
session.client('s3', config=options).put_object(Bucket=bucket, Key=key, Body=code, ServerSideEncryption='AES256')
resource['Properties']['CodeUri'] = {'Bucket': bucket, 'Key': key}
change = cf.create_change_set(StackName=settings['STACK_NAME'], ChangeSetName='code-release-' + str(time.time_ns()),
    ChangeSetType='UPDATE', TemplateBody=json.dumps(template), Capabilities=['CAPABILITY_IAM'],
    Parameters=[{'ParameterKey': parameter, 'UsePreviousValue': True} for parameter in template['Parameters']])
cf.get_waiter('change_set_create_complete').wait(ChangeSetName=change['Id'], WaiterConfig={'Delay': 3, 'MaxAttempts': 30})
changes = cf.describe_change_set(ChangeSetName=change['Id'])['Changes']
summary = [{'resource': x['ResourceChange']['LogicalResourceId'], 'action': x['ResourceChange']['Action'], 'replacement': x['ResourceChange'].get('Replacement')} for x in changes]
assert not any(x['action'] == 'Remove' or x['replacement'] == 'True' for x in summary), 'Review unexpected destructive changes'
report = {'changeSet': change['Id'], 'artifactSha256': digest, 'changes': summary}
(root / '.runtime/code-release.json').write_text(json.dumps(report, indent=2))
print(json.dumps(report, indent=2), flush=True)
