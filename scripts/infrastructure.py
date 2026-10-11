from pathlib import Path
import json

# JSON is valid YAML and avoids custom-tag loader ambiguity in validation tools.
R=lambda x:{'Ref':x}
A=lambda x,y='Arn':{'Fn::GetAtt':[x,y]}
S=lambda x:{'Fn::Sub':x}
t={'AWSTemplateFormatVersion':'2010-09-09','Transform':'AWS::Serverless-2016-10-31','Description':'JAL-SETU: six-service verified water delivery network','Parameters':{},'Globals':{'Function':{'Runtime':'nodejs22.x','Timeout':30,'MemorySize':512,'Tracing':'Active','Environment':{'Variables':{'TABLE_NAME':R('CoreTable'),'EVENTS_BUS_NAME':R('OperationsBus'),'POLICY_STORE_ID':'local-cognito-rbac'}}}},'Resources':{},'Outputs':{}}
params={'TableName':'JalSetu-Core','BusName':'JalSetu-Operations','GeofenceName':'JalSetu-DeliveryZones','TrackerName':'JalSetu-Fleet','RouteCalculatorName':'JalSetu-Routes','MapName':'JalSetu-DelhiWater','BucketName':None,'AllowedOrigin':None,'JwtIssuer':None,'JwtAudience':None,'BedrockModelId':None}
for k,v in params.items():t['Parameters'][k]={'Type':'String',**({'Default':v}if v else{})}
r=t['Resources']
t['Parameters']['DataNamespace']={'Type':'String','Default':'LIVE','AllowedPattern':'[A-Z][A-Z0-9_]{0,20}'}
t['Globals']['Function']['Environment']['Variables']['DATA_NAMESPACE']=R('DataNamespace')
t['Parameters']['BlockedSubjects']={'Type':'String','Default':''}
t['Globals']['Function']['Environment']['Variables']['BLOCKED_SUBJECTS']=R('BlockedSubjects')
r['Api']={'Type':'AWS::Serverless::HttpApi','Properties':{'CorsConfiguration':{'AllowOrigins':[R('AllowedOrigin')],'AllowMethods':['GET','POST','OPTIONS'],'AllowHeaders':['Content-Type','Authorization']},'Auth':{'DefaultAuthorizer':'JwtAuthorizer','Authorizers':{'JwtAuthorizer':{'IdentitySource':'$request.header.Authorization','JwtConfiguration':{'issuer':R('JwtIssuer'),'audience':[R('JwtAudience')]}}}},'DefaultRouteSettings':{'ThrottlingBurstLimit':200,'ThrottlingRateLimit':100}}}
r['CoreTable']={'Type':'AWS::DynamoDB::Table','DeletionPolicy':'Retain','UpdateReplacePolicy':'Retain','Properties':{'TableName':R('TableName'),'BillingMode':'PAY_PER_REQUEST','AttributeDefinitions':[{'AttributeName':n,'AttributeType':'S'}for n in ['PK','SK','GSI1PK','GSI1SK']],'KeySchema':[{'AttributeName':'PK','KeyType':'HASH'},{'AttributeName':'SK','KeyType':'RANGE'}],'GlobalSecondaryIndexes':[{'IndexName':'GSI1','KeySchema':[{'AttributeName':'GSI1PK','KeyType':'HASH'},{'AttributeName':'GSI1SK','KeyType':'RANGE'}],'Projection':{'ProjectionType':'ALL'}}],'StreamSpecification':{'StreamViewType':'NEW_AND_OLD_IMAGES'},'PointInTimeRecoverySpecification':{'PointInTimeRecoveryEnabled':True},'SSESpecification':{'SSEEnabled':True}}}
r['CoreTable']['Properties']['AttributeDefinitions'] += [{'AttributeName':'ownerId','AttributeType':'S'},{'AttributeName':'createdAt','AttributeType':'S'}]
r['CoreTable']['Properties']['GlobalSecondaryIndexes'].append({'IndexName':'OwnerRequests','KeySchema':[{'AttributeName':'ownerId','KeyType':'HASH'},{'AttributeName':'createdAt','KeyType':'RANGE'}],'Projection':{'ProjectionType':'ALL'}})
r['QueueDLQ']={'Type':'AWS::SQS::Queue','Properties':{'FifoQueue':True,'SqsManagedSseEnabled':True,'MessageRetentionPeriod':1209600}}
r['SurgeQueue']={'Type':'AWS::SQS::Queue','Properties':{'FifoQueue':True,'SqsManagedSseEnabled':True,'VisibilityTimeout':180,'RedrivePolicy':{'deadLetterTargetArn':A('QueueDLQ'),'maxReceiveCount':5}}}
r['OperationsBus']={'Type':'AWS::Events::EventBus','Properties':{'Name':R('BusName')}}
r['EvidenceBucket']={'Type':'AWS::S3::Bucket','DeletionPolicy':'Retain','UpdateReplacePolicy':'Retain','Properties':{'BucketName':R('BucketName'),'VersioningConfiguration':{'Status':'Enabled'},'BucketEncryption':{'ServerSideEncryptionConfiguration':[{'ServerSideEncryptionByDefault':{'SSEAlgorithm':'AES256'}}]},'PublicAccessBlockConfiguration':{'BlockPublicAcls':True,'BlockPublicPolicy':True,'IgnorePublicAcls':True,'RestrictPublicBuckets':True},'LifecycleConfiguration':{'Rules':[{'Id':'ArchiveEvidence','Status':'Enabled','Transitions':[{'TransitionInDays':90,'StorageClass':'GLACIER'}]}]}}}
r['EvidenceTlsPolicy']={'Type':'AWS::S3::BucketPolicy','Properties':{'Bucket':R('EvidenceBucket'),'PolicyDocument':{'Version':'2012-10-17','Statement':[{'Effect':'Deny','Principal':'*','Action':'s3:*','Resource':[A('EvidenceBucket'),S('${EvidenceBucket.Arn}/*')],'Condition':{'Bool':{'aws:SecureTransport':'false'}}}]}}}
r['Geofences']={'Type':'AWS::Location::GeofenceCollection','Properties':{'CollectionName':R('GeofenceName')}}
r['Tracker']={'Type':'AWS::Location::Tracker','Properties':{'TrackerName':R('TrackerName'),'PositionFiltering':'TimeBased'}}
r['Routes']={'Type':'AWS::Location::RouteCalculator','Properties':{'CalculatorName':R('RouteCalculatorName'),'DataSource':'Here'}}
r['Map']={'Type':'AWS::Location::Map','Properties':{'MapName':R('MapName'),'Configuration':{'Style':'VectorHereExplore'}}}
def stmt(actions,resources):return {'Statement':[{'Effect':'Allow','Action':actions,'Resource':resources}]}
dbpolicy=stmt(['dynamodb:GetItem','dynamodb:BatchGetItem','dynamodb:PutItem','dynamodb:UpdateItem','dynamodb:Query','dynamodb:TransactWriteItems'],[A('CoreTable'),S('${CoreTable.Arn}/index/*')])
eventpolicy=stmt(['events:PutEvents'],A('OperationsBus'))
def function(name,folder,paths=(),env=None,extra=()):
 p={'CodeUri':'../backend/','Handler':'lambdas/'+folder+'/index.handler','Policies':[dbpolicy,*extra],'Events':{f'Route{i}':{'Type':'HttpApi','Properties':{'ApiId':R('Api'),'Path':'/api/v1'+path,'Method':method}}for i,(path,method)in enumerate(paths)}}
 if env:p['Environment']={'Variables':env}
 r[name]={'Type':'AWS::Serverless::Function','Properties':p}
 r[name+'Log']={'Type':'AWS::Logs::LogGroup','Properties':{'LogGroupName':S('/aws/lambda/${'+name+'}'),'RetentionInDays':14}}
function('IntakeFunction','citizen-request-intake',[('/requests','POST'),('/snapshot','GET'),('/requests/rating','POST'),('/public','GET'),('/requests/otp','POST'),('/anomalies/resolve','POST')],{'SURGE_QUEUE_URL':R('SurgeQueue'),'STATE_MACHINE_ARN':R('DeliveryWorkflow')},[stmt(['sqs:SendMessage'],A('SurgeQueue')),stmt(['states:StartExecution'],R('DeliveryWorkflow'))])
r['IntakeFunction']['Properties']['Policies'].append(stmt(['states:SendTaskSuccess'],'*'))
r['IntakeFunction']['Properties']['Events']['RefillRoute']={'Type':'HttpApi','Properties':{'ApiId':R('Api'),'Path':'/api/v1/fleet/refill','Method':'POST'}}
t['Parameters']['SimulationDailyLimit']={'Type':'Number','Default':0,'MinValue':0,'MaxValue':100}
r['IntakeFunction']['Properties']['Timeout']=120
r['SurgeQueue']['Properties']['VisibilityTimeout']=720
r['IntakeFunction']['Properties']['Environment']['Variables'].update({'SIMULATION_DAILY_LIMIT':R('SimulationDailyLimit'),'POD_BUCKET_NAME':R('EvidenceBucket')})
r['IntakeFunction']['Properties']['Policies'] += [stmt(['bedrock:InvokeModel'],S('arn:${AWS::Partition}:bedrock:${AWS::Region}::foundation-model/amazon.nova-canvas-v1:0')),stmt(['s3:PutObject','s3:GetObject'],S('${EvidenceBucket.Arn}/simulations/*'))]
for name,path,method in [('Needs','/needs','GET'),('NeedsReport','/needs/report','POST'),('SimulationStart','/simulation','POST'),('SimulationRead','/simulation','GET')]:
 r['IntakeFunction']['Properties']['Events'][name]={'Type':'HttpApi','Properties':{'ApiId':R('Api'),'Path':'/api/v1'+path,'Method':method}}
r['IntakeFunction']['Properties']['Events']['Route3']['Properties']['Auth']={'Authorizer':'NONE'}
r['IntakeFunction']['Properties']['Events']['Stream']={'Type':'DynamoDB','Properties':{'Stream':A('CoreTable','StreamArn'),'StartingPosition':'TRIM_HORIZON','BatchSize':1,'MaximumRetryAttempts':10,'BisectBatchOnFunctionError':True}}
r['StreamDLQ']={'Type':'AWS::SQS::Queue','Properties':{'SqsManagedSseEnabled':True,'MessageRetentionPeriod':1209600}}
r['IntakeFunction']['Properties']['Events']['Stream']['Properties']['DestinationConfig']={'OnFailure':{'Type':'SQS','Destination':A('StreamDLQ')}}
r['IntakeFunction']['Properties']['Events']['Queue']={'Type':'SQS','Properties':{'Queue':A('SurgeQueue'),'BatchSize':1,'FunctionResponseTypes':['ReportBatchItemFailures']}}
function('ClassifierFunction','bedrock-urgency-classifier',[('/copilot','POST')],{'BEDROCK_MODEL_ID':R('BedrockModelId')},[stmt(['bedrock:InvokeModel'],[S('arn:${AWS::Partition}:bedrock:*::foundation-model/*'),S('arn:${AWS::Partition}:bedrock:*:${AWS::AccountId}:inference-profile/*'),S('arn:${AWS::Partition}:bedrock:*:${AWS::AccountId}:application-inference-profile/*')])])
function('OptimizerFunction','vrp-route-optimizer',[('/optimize','POST')],{'ROUTE_CALCULATOR_NAME':R('Routes')},[stmt(['geo:CalculateRouteMatrix'],A('Routes'))])
r['OptimizerFunction']['Properties']['Timeout']=60
r['OptimizerFunction']['Properties']['Events']['Batch']={'Type':'Schedule','Properties':{'Schedule':'rate(10 minutes)','Enabled':True}}
function('TelemetryFunction','geofence-telemetry-processor',[('/telemetry','POST')],{'TRACKER_NAME':R('Tracker'),'GEOFENCE_COLLECTION_NAME':R('Geofences')},[eventpolicy,stmt(['geo:BatchUpdateDevicePosition'],A('Tracker')),stmt(['geo:BatchEvaluateGeofences'],A('Geofences'))])
function('PodFunction','pod-verification-handler',[('/delivery/verify','POST'),('/evidence','GET')],{'POD_BUCKET_NAME':R('EvidenceBucket')},[eventpolicy,stmt(['s3:PutObject','s3:GetObject','s3:GetObjectVersion'],S('${EvidenceBucket.Arn}/evidence/*')),stmt(['states:SendTaskSuccess'], '*')])
function('FraudFunction','fraud-sentinel-anomaly-detector')
r['FraudRule']={'Type':'AWS::Events::Rule','Properties':{'EventBusName':R('OperationsBus'),'EventPattern':{'source':['jalsetu.pod','jalsetu.telemetry'],'detail-type':['UnverifiedResidentClaim','ValveOutsideDeliveryZone','ShortPourDurationDetected','GeofenceExitWithoutPoD']},'Targets':[{'Arn':A('FraudFunction'),'Id':'FraudSentinel','RetryPolicy':{'MaximumRetryAttempts':10,'MaximumEventAgeInSeconds':86400}}]}}
r['FraudPermission']={'Type':'AWS::Lambda::Permission','Properties':{'Action':'lambda:InvokeFunction','FunctionName':R('FraudFunction'),'Principal':'events.amazonaws.com','SourceArn':A('FraudRule')}}
r['DeliveryWorkflow']={'Type':'AWS::Serverless::StateMachine','Properties':{'Type':'STANDARD','DefinitionUri':'../backend/step-functions/delivery-verification-workflow.asl.json','DefinitionSubstitutions':{'BedrockClassifierArn':A('ClassifierFunction'),'VrpOptimizerArn':A('OptimizerFunction'),'PoDValidatorArn':A('PodFunction')},'Policies':[{'LambdaInvokePolicy':{'FunctionName':R(n)}}for n in ['ClassifierFunction','OptimizerFunction','PodFunction']]}}
outputs={'ApiUrl':S('https://${Api}.execute-api.${AWS::Region}.${AWS::URLSuffix}'),'TableName':R('CoreTable'),'QueueUrl':R('SurgeQueue'),'StateMachineArn':R('DeliveryWorkflow'),'PolicyStoreId':'local-cognito-rbac','BucketName':R('EvidenceBucket')}
outputs.update({k:R(k)for k in ['IntakeFunction','ClassifierFunction','OptimizerFunction','TelemetryFunction','PodFunction','FraudFunction']})
# Alarm destinations are exposed as an output; subscribe the operations team before launch.
r['OperationsAlarmTopic']={'Type':'AWS::SNS::Topic','Properties':{'DisplayName':'JAL-SETU operations alarms'}}
for name in ['IntakeFunction','ClassifierFunction','OptimizerFunction','TelemetryFunction','PodFunction','FraudFunction']:
 r[name+'ErrorAlarm']={'Type':'AWS::CloudWatch::Alarm','Properties':{'AlarmDescription':name+' errors require investigation','Namespace':'AWS/Lambda','MetricName':'Errors','Dimensions':[{'Name':'FunctionName','Value':R(name)}],'Statistic':'Sum','Period':60,'EvaluationPeriods':2,'Threshold':3,'ComparisonOperator':'GreaterThanOrEqualToThreshold','TreatMissingData':'notBreaching','AlarmActions':[R('OperationsAlarmTopic')]}}
for name in ['QueueDLQ','StreamDLQ']:
 r[name+'Alarm']={'Type':'AWS::CloudWatch::Alarm','Properties':{'AlarmDescription':'Failed delivery processing requires redrive after investigation','Namespace':'AWS/SQS','MetricName':'ApproximateNumberOfMessagesVisible','Dimensions':[{'Name':'QueueName','Value':A(name,'QueueName')}],'Statistic':'Maximum','Period':60,'EvaluationPeriods':1,'Threshold':1,'ComparisonOperator':'GreaterThanOrEqualToThreshold','TreatMissingData':'notBreaching','AlarmActions':[R('OperationsAlarmTopic')]}}
outputs['OperationsAlarmTopicArn']=R('OperationsAlarmTopic')
t['Outputs']={k:{'Value':v}for k,v in outputs.items()}
for path in ['infra/template.yaml','aws-infra/template.yaml']:Path(path).write_text(json.dumps(t,indent=2)+'\n')
retry=[{'ErrorEquals':['Lambda.ServiceException','Lambda.AWSLambdaException','Lambda.SdkClientException','Lambda.TooManyRequestsException'],'IntervalSeconds':2,'MaxAttempts':3,'BackoffRate':2}]
retry.append({'ErrorEquals':['States.TaskFailed'],'IntervalSeconds':5,'MaxAttempts':2,'BackoffRate':2})
workflow={'Comment':'Triage and dispatch, then wait for real driver evidence; never auto-verify after a timer.','StartAt':'Triage','TimeoutSeconds':86400,'States':{
 'Triage':{'Type':'Task','Resource':'arn:aws:states:::lambda:invoke','Parameters':{'FunctionName':'${BedrockClassifierArn}','Payload.$':'$'},'ResultPath':'$.triage','Retry':retry,'Next':'Dispatch'},
 'Dispatch':{'Type':'Task','Resource':'arn:aws:states:::lambda:invoke','Parameters':{'FunctionName':'${VrpOptimizerArn}','Payload.$':'$'},'ResultPath':'$.dispatch','Retry':retry,'Next':'AwaitVerifiedDelivery'},
 'AwaitVerifiedDelivery':{'Type':'Task','Resource':'arn:aws:states:::lambda:invoke.waitForTaskToken','Parameters':{'FunctionName':'${PoDValidatorArn}','Payload':{'requestId.$':'$.requestId','taskToken.$':'$$.Task.Token'}},'TimeoutSeconds':82800,'ResultPath':'$.delivery','Next':'Complete'},
 'Complete':{'Type':'Succeed'}}}
Path('backend/step-functions/delivery-verification-workflow.asl.json').write_text(json.dumps(workflow,indent=2)+'\n')

# Service folders retain reviewable excerpts, generated from the same master.
excerpts={
 'api-gateway':['Api'], 'dynamodb':['CoreTable'],
 'sqs':['SurgeQueue','QueueDLQ','StreamDLQ'],
 'eventbridge':['OperationsBus','FraudRule','FraudPermission'],
 'step-functions':['DeliveryWorkflow'],
 'bedrock':['ClassifierFunction'],
 'location-service':['Geofences','Tracker','Routes','Map'],
 's3':['EvidenceBucket','EvidenceTlsPolicy'],
 'verified-permissions':[]
}
for folder,names in excerpts.items():
 excerpt={'Metadata':{'Source':'infra/template.yaml','Usage':'Review excerpt only. Deploy the complete master template.'},'Resources':{name:r[name]for name in names if name in r}}
 Path('backend/'+folder+'/resource.yaml').write_text(json.dumps(excerpt,indent=2)+'\n')
