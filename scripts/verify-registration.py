"""Live hook, role-claim and API smoke test. No email is sent.

Uses disposable suppressed-invitation users and invokes the deployed hook with
an IAM-authorized test event. This does not claim to test inbox code delivery.
Always deletes only the exact unique accounts this run created.
"""
import base64
import json
import secrets
import uuid
import urllib.request
from pathlib import Path
import boto3

root = Path(__file__).resolve().parents[1]
settings = dict(line.split('=',1) for line in (root/'.env').read_text().splitlines() if '=' in line and not line.startswith('#'))
session = boto3.Session(profile_name=settings.get('AWS_PROFILE') or None,region_name='us-east-1')
c = session.client('cognito-idp')
lam = session.client('lambda')
pool = 'us-east-1_ko5ROUcaz'
client = '16ploao82gc7qg4djtua5sdbuh'
p = c.describe_user_pool(UserPoolId=pool)['UserPool']
arn = p['LambdaConfig']['PostConfirmation']
assert p['LambdaConfig']['PreSignUp'] == arn
assert 'email' in p['AutoVerifiedAttributes']
assert not p['AdminCreateUserConfig']['AllowAdminCreateUserOnly']
attr=next(a for a in p['SchemaAttributes'] if a['Name']=='custom:registration_role')
assert not attr['Mutable']

# Invalid role must fail at real SignUp before Cognito can send a message.
try:
    c.sign_up(ClientId=client,Username='invalid-'+uuid.uuid4().hex+'@example.invalid',Password='Abc!'+secrets.token_hex(16),UserAttributes=[{'Name':'email','Value':'invalid@example.invalid'},{'Name':'custom:registration_role','Value':'Invalid'}])
    raise AssertionError('Invalid role was accepted')
except c.exceptions.UserLambdaValidationException:
    print('Live SignUp rejects unsupported roles: PASS',flush=True)

for role in ('Citizen','Driver','Dispatcher','Auditor'):
    username='registration-test-'+uuid.uuid4().hex
    password='Abc!'+secrets.token_hex(16)
    created=False
    try:
        c.admin_create_user(UserPoolId=pool,Username=username,MessageAction='SUPPRESS',UserAttributes=[
            {'Name':'email','Value':username+'@example.invalid'},
            {'Name':'email_verified','Value':'true'},
            {'Name':'custom:registration_role','Value':role}])
        created=True
        c.admin_set_user_password(UserPoolId=pool,Username=username,Password=password,Permanent=True)
        event={'version':'1','region':'us-east-1','userPoolId':pool,'userName':username,
          'callerContext':{'clientId':client},'triggerSource':'PostConfirmation_ConfirmSignUp',
          'request':{'userAttributes':{'email':username+'@example.invalid','email_verified':'true','custom:registration_role':role}},'response':{}}
        result=lam.invoke(FunctionName=arn,Payload=json.dumps(event).encode())
        response=json.loads(result['Payload'].read())
        assert not result.get('FunctionError'),response
        auth=c.initiate_auth(ClientId=client,AuthFlow='USER_PASSWORD_AUTH',AuthParameters={'USERNAME':username,'PASSWORD':password})['AuthenticationResult']
        claims=json.loads(base64.urlsafe_b64decode(auth['IdToken'].split('.')[1]+'==='))
        assert claims['cognito:groups']==[role]
        request=urllib.request.Request(settings['VITE_API_BASE_URL']+'/api/v1/snapshot',headers={'Authorization':'Bearer '+auth['IdToken']})
        with urllib.request.urlopen(request,timeout=25) as response:
            assert response.status==200
        # Immutable attribute must not let an authenticated user change roles.
        try:
            c.update_user_attributes(AccessToken=auth['AccessToken'],UserAttributes=[{'Name':'custom:registration_role','Value':'Auditor' if role!='Auditor' else 'Citizen'}])
            raise AssertionError('Immutable role changed')
        except c.exceptions.InvalidParameterException: pass
        print(role+': hook assignment, signed role claim, API authorization, immutable role PASS',flush=True)
    finally:
        if created: c.admin_delete_user(UserPoolId=pool,Username=username)
print('Disposable users removed. Real inbox delivery still requires user verification.',flush=True)
