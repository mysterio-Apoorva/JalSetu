"""Read-only deployment and image-model availability checks. Never prints credentials."""
import json
from pathlib import Path
import boto3
root=Path(__file__).resolve().parents[1]
cfg=dict(line.split('=',1) for line in (root/'.env').read_text().splitlines() if '=' in line and not line.startswith('#'))
session=boto3.Session(profile_name=cfg.get('AWS_PROFILE') or None,region_name=cfg['AWS_REGION'])
result={'account':session.client('sts').get_caller_identity()['Account'],'region':cfg['AWS_REGION']}
for name,call in [
 ('imageModel',lambda:session.client('bedrock').get_foundation_model_availability(modelId='amazon.nova-canvas-v1:0')),
 ('freeTierPlan',lambda:session.client('freetier').get_account_plan_state()),
 ('amplify',lambda:[{'appId':a['appId'],'name':a['name']} for a in session.client('amplify').list_apps()['apps']])]:
 try:
  value=call()
  if isinstance(value,dict):value.pop('ResponseMetadata',None)
  result[name]=value
 except Exception as e:result[name]={'error':type(e).__name__,'message':str(e)[:500]}
(root/'.runtime/pilot-account.json').write_text(json.dumps(result,indent=2,default=str))
print(json.dumps(result,indent=2,default=str))
