"""Prepare (never execute) an in-place production CloudFormation release.

Usage: python scripts/prepare_production_backend.py --origin https://main.APP.amplifyapp.com
Requires current npm dependencies and generated infra templates. Prints only change summaries.
"""
import argparse
import hashlib
import json
from pathlib import Path
from urllib.parse import urlparse
import time
import zipfile
import boto3
import yaml
from review_backend_changes import validate
from botocore.config import Config

ROOT = Path(__file__).resolve().parents[1]

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--origin', required=True)
    args = parser.parse_args()
    origin = urlparse(args.origin)
    assert origin.scheme == 'https' and origin.netloc and origin.path in ('','/'), 'Use an exact HTTPS origin'
    settings = dict(line.split('=',1) for line in (ROOT/'.env').read_text().splitlines() if '=' in line and not line.startswith('#'))
    session = boto3.Session(profile_name=settings.get('AWS_PROFILE') or None, region_name=settings['AWS_REGION'])
    options=Config(connect_timeout=10,read_timeout=30,retries={'max_attempts':2})
    cf = session.client('cloudformation',config=options)
    stack = cf.describe_stacks(StackName=settings['STACK_NAME'])['Stacks'][0]
    assert stack['StackStatus'] in ['CREATE_COMPLETE','UPDATE_COMPLETE'], 'Finish or repair the existing update first'
    old = cf.get_template(StackName=settings['STACK_NAME'], TemplateStage='Original')['TemplateBody']
    if isinstance(old,str): old = yaml.safe_load(old)
    old_uri = old['Resources']['IntakeFunction']['Properties']['CodeUri']
    bucket = old_uri['Bucket'] if isinstance(old_uri,dict) else urlparse(old_uri).netloc
    assert bucket, 'No deployment artifact bucket found'
    pool = settings['JWT_ISSUER'].rstrip('/').split('/')[-1]
    cognito = session.client('cognito-idp')
    blocked = []
    for role in ['citizen','driver','dispatcher','auditor']:
        email = role+'@jalsetu.local'
        try: user = cognito.admin_get_user(UserPoolId=pool,Username=email)
        except cognito.exceptions.UserNotFoundException: continue
        attributes = {x['Name']:x['Value'] for x in user['UserAttributes']}
        assert attributes.get('email') == email, 'Unexpected identity for test account'
        blocked.append(attributes['sub'])
    template = json.loads((ROOT/'infra/template.yaml').read_text())
    # Preserve SAM packaging metadata to avoid spurious downstream replacements.
    for name,resource in template['Resources'].items():
        if 'Metadata' in old.get('Resources',{}).get(name,{}):
            resource['Metadata']=old['Resources'][name]['Metadata']
    template['Resources']['DeliveryWorkflow']['Properties'].pop('DefinitionUri')
    template['Resources']['DeliveryWorkflow']['Properties']['Definition'] = json.loads((ROOT/'backend/step-functions/delivery-verification-workflow.asl.json').read_text())
    archive = ROOT/'.runtime/production-backend.zip'
    with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as package:
        for directory in ['shared','lambdas','node_modules']:
            for path in (ROOT/'backend'/directory).rglob('*'):
                if path.is_file() and path.suffix != '.zip': package.write(path,path.relative_to(ROOT/'backend').as_posix())
        for filename in ['package.json','package-lock.json']: package.write(ROOT/'backend'/filename,filename)
    code = archive.read_bytes(); digest = hashlib.sha256(code).hexdigest()
    key = f'production-releases/{digest}.zip'
    print('Uploading backend artifact',flush=True)
    upload_options = Config(connect_timeout=20, read_timeout=90, retries={'max_attempts':2}, s3={'us_east_1_regional_endpoint':'regional'})
    session.client('s3',config=upload_options).put_object(Bucket=bucket,Key=key,Body=code,ServerSideEncryption='AES256')
    for resource in template['Resources'].values():
        if resource['Type'] == 'AWS::Serverless::Function': resource['Properties']['CodeUri'] = {'Bucket':bucket,'Key':key}
    previous = {p['ParameterKey']:p['ParameterValue'] for p in stack.get('Parameters',[])}
    values = {**previous,'AllowedOrigin':args.origin.rstrip('/'),'DataNamespace':'LIVE','BlockedSubjects':','.join(blocked)}
    for parameter, setting in [('JalKendraName','JAL_KENDRA_NAME'),('JalKendraLat','JAL_KENDRA_LAT'),('JalKendraLng','JAL_KENDRA_LNG'),('OtpFromEmail','OTP_FROM_EMAIL')]:
        if settings.get(setting): values[parameter] = settings[setting]
    parameters = [{'ParameterKey':k,'ParameterValue':values[k]} for k in template['Parameters'] if k in values]
    change = cf.create_change_set(StackName=settings['STACK_NAME'],ChangeSetName='production-'+str(time.time_ns()),ChangeSetType='UPDATE',
        TemplateBody=json.dumps(template),Capabilities=['CAPABILITY_IAM'],Parameters=parameters)
    print('Reviewing backend change set',flush=True)
    cf.get_waiter('change_set_create_complete').wait(ChangeSetName=change['Id'],WaiterConfig={'Delay':3,'MaxAttempts':40})
    changes = cf.describe_change_set(ChangeSetName=change['Id'])['Changes']
    summary = [{k:c['ResourceChange'].get(k) for k in ['LogicalResourceId','Action','Replacement']} for c in changes]
    reviewed=validate(changes)
    result = {'changeSet':change['Id'],'artifactSha256':digest,'origin':args.origin,'namespace':'LIVE','blockedTestAccounts':len(blocked),'changes':summary,'reviewedDynamicTriggerReferences':reviewed}
    (ROOT/'.runtime/production-backend-release.json').write_text(json.dumps(result,indent=2))
    print(json.dumps(result,indent=2))

if __name__ == '__main__': main()
