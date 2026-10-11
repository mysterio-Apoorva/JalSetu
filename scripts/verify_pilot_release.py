"""Read-only live checks: public data, exact CORS, auth enforcement and deployed configuration."""
import json,urllib.request,urllib.error
from pathlib import Path
import boto3
from botocore.config import Config
from verify_cognito_auth import call,CLIENT
root=Path(__file__).resolve().parents[1]
settings=dict(line.split('=',1) for line in (root/'.env').read_text().splitlines() if '=' in line and not line.startswith('#'))
hosting=json.loads((root/'.runtime/amplify-release.json').read_text())
session=boto3.Session(profile_name=settings.get('AWS_PROFILE') or None,region_name=settings['AWS_REGION'])
options=Config(connect_timeout=10,read_timeout=20,retries={'max_attempts':1})
stack=session.client('cloudformation',config=options).describe_stacks(StackName=settings['STACK_NAME'])['Stacks'][0]
assert stack['StackStatus']=='UPDATE_COMPLETE',stack['StackStatus']
params={x['ParameterKey']:x['ParameterValue'] for x in stack['Parameters']}
assert params['DataNamespace']=='LIVE' and params['AllowedOrigin']==hosting['origin'] and params['SimulationDailyLimit']=='0'
base=settings['VITE_API_BASE_URL'].rstrip('/')+'/api/v1'
with urllib.request.urlopen(base+'/public',timeout=25) as r:public=json.load(r)
assert not public['deliveries'] and not public['wards'],'Unexpected production data; inspect before publishing'
request=urllib.request.Request(base+'/needs',method='OPTIONS',headers={'Origin':hosting['origin'],'Access-Control-Request-Method':'GET','Access-Control-Request-Headers':'authorization,content-type'})
with urllib.request.urlopen(request,timeout=20) as r:assert r.headers.get('Access-Control-Allow-Origin')==hosting['origin']
try:urllib.request.urlopen(base+'/needs',timeout=20)
except urllib.error.HTTPError as e:assert e.code==401
else:raise AssertionError('Unauthenticated needs API access allowed')
account=next(x for x in json.loads((root/'scratch_cognito.json').read_text())['users'] if x['role']=='Citizen')
auth=call('InitiateAuth',{'ClientId':CLIENT,'AuthFlow':'USER_PASSWORD_AUTH','AuthParameters':{'USERNAME':account['username'],'PASSWORD':account['password']}})['AuthenticationResult']
try:
 request=urllib.request.Request(base+'/needs',headers={'Authorization':'Bearer '+auth['IdToken']})
 try:urllib.request.urlopen(request,timeout=25)
 except urllib.error.HTTPError as e:assert e.code==403
 else:raise AssertionError('Demo account entered production namespace')
finally:call('RevokeToken',{'ClientId':CLIENT,'Token':auth['RefreshToken']})
outputs={x['OutputKey']:x['OutputValue'] for x in stack['Outputs']}
function=session.client('lambda',config=options).get_function_configuration(FunctionName=outputs['IntakeFunction'])
assert function['State']=='Active' and function['LastUpdateStatus']=='Successful'
result={'backend':'UPDATE_COMPLETE','namespace':'LIVE','emptyProductionData':True,'exactAmplifyCors':True,'unauthenticatedNeeds':401,'oldDemoAccountNeeds':403,'intakeLambda':'Active','imageGeneration':'disabled_pending_budget'}
(root/'.runtime/pilot-release-verification.json').write_text(json.dumps(result,indent=2))
print(json.dumps(result,indent=2))
