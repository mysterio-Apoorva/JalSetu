"""Inspect or execute the already prepared, replacement-free backend release."""
import argparse,json,hashlib
from review_backend_changes import validate
from pathlib import Path
import boto3
from botocore.config import Config
root=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--execute',action='store_true');args=parser.parse_args()
settings=dict(line.split('=',1) for line in (root/'.env').read_text().splitlines() if '=' in line and not line.startswith('#'))
session=boto3.Session(profile_name=settings.get('AWS_PROFILE') or None,region_name=settings['AWS_REGION'])
cf=session.client('cloudformation',config=Config(connect_timeout=10,read_timeout=20,retries={'max_attempts':1}))
stack=cf.describe_stacks(StackName=settings['STACK_NAME'])['Stacks'][0]
print('Backend:',stack['StackStatus'],flush=True)
state=root/'.runtime/production-backend-release.json'
if args.execute:
 if not state.exists():
  candidates=[x for x in cf.list_change_sets(StackName=settings['STACK_NAME'])['Summaries'] if x['ChangeSetName'].startswith('production-') and x['Status']=='CREATE_COMPLETE' and x['ExecutionStatus']=='AVAILABLE']
  latest=max(candidates,key=lambda x:x['CreationTime'])
  hosting=json.loads((root/'.runtime/amplify-release.json').read_text())
  original=cf.get_template(ChangeSetName=latest['ChangeSetId'],StackName=settings['STACK_NAME'],TemplateStage='Original')['TemplateBody']
  if isinstance(original,str):original=json.loads(original)
  digest=hashlib.sha256((root/'.runtime/production-backend.zip').read_bytes()).hexdigest()
  assert all(r['Properties']['CodeUri']['Key']==f'production-releases/{digest}.zip' for r in original['Resources'].values() if r['Type']=='AWS::Serverless::Function'),'Change set does not use the latest reviewed package'
  release={'changeSet':latest['ChangeSetId'],'artifactSha256':digest,'origin':hosting['origin'],'namespace':'LIVE'}
 else: release=json.loads(state.read_text())
 change=cf.describe_change_set(ChangeSetName=release['changeSet'])
 assert change['StackId']==stack['StackId'] and change['Status']=='CREATE_COMPLETE' and change['ExecutionStatus']=='AVAILABLE'
 parameters={p['ParameterKey']:p['ParameterValue'] for p in change['Parameters']}
 assert parameters['DataNamespace']=='LIVE' and parameters['AllowedOrigin']==release['origin'] and parameters['SimulationDailyLimit']=='0'
 release['reviewedDynamicTriggerReferences']=validate(change['Changes'])
 state.write_text(json.dumps(release,indent=2))
 cf.execute_change_set(ChangeSetName=release['changeSet'])
 print('Reviewed backend change set execution started',flush=True)
else:
 changes=[x for x in cf.list_change_sets(StackName=settings['STACK_NAME'])['Summaries'] if x['ChangeSetName'].startswith('production-')]
 for change in changes:
  details=cf.describe_change_set(ChangeSetName=change['ChangeSetId']).get('Changes',[])
  print(json.dumps({'name':change['ChangeSetName'],'status':change['Status'],'count':len(details),'review':[x for x in details if x['ResourceChange']['Action']=='Remove' or x['ResourceChange'].get('Replacement') in ('True','Conditional')]},indent=2))
 print('Registration:',cf.describe_stacks(StackName=settings['STACK_NAME']+'-registration')['Stacks'][0]['StackStatus'],flush=True)
