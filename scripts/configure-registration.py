"""Deploy registration hooks and connect the existing pool without replacing users.

Run without arguments to inspect. --execute applies the reviewed local hook template.
The existing user pool is external to the main SAM stack.
"""
import argparse
import json
from pathlib import Path
import boto3

ROOT = Path(__file__).resolve().parents[1]
POOL = 'us-east-1_ko5ROUcaz'
CLIENT = '16ploao82gc7qg4djtua5sdbuh'
parser = argparse.ArgumentParser()
parser.add_argument('--execute', action='store_true')
args = parser.parse_args()
settings = dict(line.split('=', 1) for line in (ROOT / '.env').read_text().splitlines()
                if '=' in line and not line.startswith('#'))
session = boto3.Session(profile_name=settings.get('AWS_PROFILE') or None, region_name='us-east-1')
cognito = session.client('cognito-idp')
cf = session.client('cloudformation')
pool = cognito.describe_user_pool(UserPoolId=POOL)['UserPool']
client = cognito.describe_user_pool_client(UserPoolId=POOL, ClientId=CLIENT)['UserPoolClient']
stack_name = settings['STACK_NAME'] + '-registration'
template = {
 'AWSTemplateFormatVersion': '2010-09-09',
 'Description': 'JAL-SETU self-service registration hooks for the existing Cognito pool',
 'Resources': {
  'RegistrationRole': {'Type': 'AWS::IAM::Role', 'Properties': {
   'AssumeRolePolicyDocument': {'Version': '2012-10-17', 'Statement': [{'Effect':'Allow','Principal':{'Service':'lambda.amazonaws.com'},'Action':'sts:AssumeRole'}]},
   'ManagedPolicyArns': ['arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'],
   'Policies': [{'PolicyName':'AssignRegistrationRole','PolicyDocument':{'Version':'2012-10-17','Statement':[{
    'Effect':'Allow','Action':'cognito-idp:AdminAddUserToGroup','Resource':pool['Arn']}]}}]}},
  'RegistrationFunction': {'Type': 'AWS::Lambda::Function', 'Properties': {
   'Runtime':'python3.12','Handler':'index.handler','Timeout':5,'MemorySize':128,
   'Role':{'Fn::GetAtt':['RegistrationRole','Arn']},
   'Environment':{'Variables':{'USER_POOL_ID':POOL,'APP_CLIENT_ID':CLIENT}},
   'Code':{'ZipFile':(ROOT/'backend/registration/handler.py').read_text()}}},
  'RegistrationLog': {'Type':'AWS::Logs::LogGroup','Properties':{
   'LogGroupName':{'Fn::Sub':'/aws/lambda/${RegistrationFunction}'},'RetentionInDays':14}},
  'CognitoInvokePermission': {'Type':'AWS::Lambda::Permission','Properties':{
   'Action':'lambda:InvokeFunction','FunctionName':{'Ref':'RegistrationFunction'},
   'Principal':'cognito-idp.amazonaws.com','SourceArn':pool['Arn'],
   'SourceAccount':{'Ref':'AWS::AccountId'}}}},
 'Outputs': {'TriggerArn': {'Value':{'Fn::GetAtt':['RegistrationFunction','Arn']}}}
}
(ROOT/'infra/registration.json').write_text(json.dumps(template, indent=2)+'\n')
print(json.dumps({'selfSignup':not pool.get('AdminCreateUserConfig',{}).get('AllowAdminCreateUserOnly',False),
 'emailVerification':pool.get('AutoVerifiedAttributes',[]),
 'triggers':pool.get('LambdaConfig',{}),'roleAttribute':any(a['Name']=='custom:registration_role' for a in pool['SchemaAttributes'])}))
if not args.execute:
    raise SystemExit(0)

# Refuse to overwrite another integration's hooks.
try:
    stack = cf.describe_stacks(StackName=stack_name)['Stacks'][0]
except cf.exceptions.ClientError as exc:
    if 'does not exist' not in str(exc): raise
    stack = None
old_arn = next((o['OutputValue'] for o in (stack or {}).get('Outputs',[]) if o['OutputKey']=='TriggerArn'),None)
for key in ('PreSignUp','PostConfirmation'):
    if pool.get('LambdaConfig',{}).get(key) not in (None,old_arn):
        raise RuntimeError(f'Existing {key} integration must be merged before deployment')
body = json.dumps(template)
if stack:
    try:
        cf.update_stack(StackName=stack_name, TemplateBody=body, Capabilities=['CAPABILITY_IAM'])
        print('Updating registration stack',flush=True)
        cf.get_waiter('stack_update_complete').wait(StackName=stack_name)
    except cf.exceptions.ClientError as exc:
        if 'No updates are to be performed' not in str(exc): raise
else:
    cf.create_stack(StackName=stack_name, TemplateBody=body, Capabilities=['CAPABILITY_IAM'])
    print('Creating registration stack',flush=True)
    cf.get_waiter('stack_create_complete').wait(StackName=stack_name)
stack = cf.describe_stacks(StackName=stack_name)['Stacks'][0]
arn = next(o['OutputValue'] for o in stack['Outputs'] if o['OutputKey']=='TriggerArn')
attribute = next((a for a in pool['SchemaAttributes'] if a['Name']=='custom:registration_role'),None)
if attribute and attribute.get('Mutable'):
    raise RuntimeError('Registration role attribute must be immutable')
if not attribute:
    cognito.add_custom_attributes(UserPoolId=POOL,CustomAttributes=[{
      'Name':'registration_role','AttributeDataType':'String','Mutable':False,
      'StringAttributeConstraints':{'MinLength':'6','MaxLength':'10'}}])
for group in ('Citizen','Driver','Dispatcher','Auditor'):
    try: cognito.get_group(UserPoolId=POOL,GroupName=group)
    except cognito.exceptions.ResourceNotFoundException:
        cognito.create_group(UserPoolId=POOL,GroupName=group)

# Update APIs reset omitted settings: carry forward every accepted existing property.
pool = cognito.describe_user_pool(UserPoolId=POOL)['UserPool']
members = cognito.meta.service_model.operation_model('UpdateUserPool').input_shape.members
update = {k:v for k,v in pool.items() if k in members}
update['UserPoolId'] = POOL
update['PoolName'] = pool['Name']
update['LambdaConfig'] = {**pool.get('LambdaConfig',{}),'PreSignUp':arn,'PostConfirmation':arn}
update['AutoVerifiedAttributes'] = list(set(pool.get('AutoVerifiedAttributes',[])) | {'email'})
update['AdminCreateUserConfig'] = {k:v for k,v in pool.get('AdminCreateUserConfig',{}).items() if k!='UnusedAccountValidityDays'}
update['AdminCreateUserConfig']['AllowAdminCreateUserOnly'] = False
update.setdefault('Policies',{}).setdefault('PasswordPolicy',{}).update({
 'MinimumLength':8,'RequireUppercase':True,'RequireLowercase':True,'RequireNumbers':True,'RequireSymbols':True})
update['AccountRecoverySetting'] = {'RecoveryMechanisms':[{'Priority':1,'Name':'verified_email'}]}
cognito.update_user_pool(**update)
client = cognito.describe_user_pool_client(UserPoolId=POOL,ClientId=CLIENT)['UserPoolClient']
members = cognito.meta.service_model.operation_model('UpdateUserPoolClient').input_shape.members
update_client = {k:v for k,v in client.items() if k in members}
update_client.update(UserPoolId=POOL,ClientId=CLIENT)
# This application only needs email and its immutable registration selection.
update_client['WriteAttributes'] = ['email','custom:registration_role']
update_client['ReadAttributes'] = list(set(client.get('ReadAttributes',[]) + ['email','email_verified','sub','custom:registration_role']))
cognito.update_user_pool_client(**update_client)
print('Registration deployed: resident self-registration only; staff roles require administrator assignment.',flush=True)
