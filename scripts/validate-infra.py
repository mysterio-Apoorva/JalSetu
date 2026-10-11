import json,re
from pathlib import Path
root=Path(__file__).resolve().parent.parent
t=json.loads((root/'infra/template.yaml').read_text())
assert (root/'infra/template.yaml').read_bytes()==(root/'aws-infra/template.yaml').read_bytes(),'Template aliases drifted'
resources=t['Resources'];known=set(resources)|set(t['Parameters'])|{'AWS::Region','AWS::AccountId','AWS::Partition','AWS::URLSuffix','AWS::StackName'}
def walk(x):
 if isinstance(x,dict):
  if 'Ref' in x: assert x['Ref'] in known,x
  if 'Fn::GetAtt' in x: assert x['Fn::GetAtt'][0] in resources,x
  for v in x.values():walk(v)
 elif isinstance(x,list):
  for v in x:walk(v)
walk(t)
for name,r in resources.items():
 if r['Type']=='AWS::Serverless::Function':
  p=r['Properties'];code=(root/'infra'/p['CodeUri']).resolve();handler=p['Handler'].rsplit('.',1)[0]+'.js';assert (code/handler).exists(),handler
w=json.loads((root/'backend/step-functions/delivery-verification-workflow.asl.json').read_text());assert w['StartAt'] in w['States']
for s in w['States'].values():
 if 'Next' in s: assert s['Next'] in w['States']
assert '.waitForTaskToken' in w['States']['AwaitVerifiedDelivery']['Resource']
assert 'STATE_MACHINE_ARN' not in t['Globals']['Function']['Environment']['Variables'],'Circular workflow dependency'
print(f'PASS: {len(resources)} resources, handler paths, references, workflow transitions, template parity')
