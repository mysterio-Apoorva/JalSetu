"""Reject stateful replacement; allow only reviewed dynamic trigger references."""
def validate(changes):
    resources={x['ResourceChange']['LogicalResourceId']:x['ResourceChange'] for x in changes}
    allowed={
        'FraudPermission':('AWS::Lambda::Permission','SourceArn','FraudRule.Arn'),
        'OptimizerFunctionBatchPermission':('AWS::Lambda::Permission','SourceArn','OptimizerFunctionBatch.Arn'),
        'IntakeFunctionQueue':('AWS::Lambda::EventSourceMapping','EventSourceArn','SurgeQueue.Arn'),
        'IntakeFunctionStream':('AWS::Lambda::EventSourceMapping','EventSourceArn','CoreTable.StreamArn'),
    }
    reviewed=[]
    for name,r in resources.items():
        assert r['Action']!='Remove' and r.get('Replacement')!='True',f'Resource removal/replacement forbidden: {name}'
        if r.get('Replacement')!='Conditional':continue
        assert name in allowed,f'Unreviewed conditional replacement: {name}'
        resource_type,property_name,reference=allowed[name]
        assert r['ResourceType']==resource_type
        anchor=resources.get(reference.split('.')[0])
        assert anchor is None or (anchor['Action']=='Modify' and anchor.get('Replacement')=='False'),f'Referenced resource may change: {reference}'
        details=[d for d in r['Details'] if d['Target']['RequiresRecreation']!='Never']
        assert details and all(d['Evaluation']=='Dynamic' and d['ChangeSource']=='ResourceAttribute' and d.get('CausingEntity')==reference and d['Target'].get('Name')==property_name for d in details),f'Unexpected replacement reason: {name}'
        reviewed.append(name)
    return reviewed
