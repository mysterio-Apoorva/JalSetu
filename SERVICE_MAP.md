# Service map

| Handler | Trigger | Real integrations |
| --- | --- | --- |
| citizen-request-intake | API, DynamoDB Streams, SQS FIFO | DynamoDB, SQS, Step Functions, Verified Permissions |
| bedrock-urgency-classifier | Workflow; copilot API | Bedrock Converse, DynamoDB, Verified Permissions |
| vrp-route-optimizer | Workflow, 10-minute schedule, dispatcher API | Location road matrix, DynamoDB conditional transactions, Verified Permissions |
| geofence-telemetry-processor | Assigned-driver API | Location tracker/geofences, DynamoDB, EventBridge, Verified Permissions |
| pod-verification-handler | Assigned-driver API; workflow callback registration | S3, DynamoDB atomic settlement, EventBridge, Step Functions, Verified Permissions |
| fraud-sentinel-anomaly-detector | EventBridge rule | Idempotent DynamoDB anomaly writes |

The topology remains React → API Gateway → six Lambda services with the existing AWS service families. Deployment source: `infra/template.yaml`. Detailed setup and payloads: [AWS_SETUP.md](docs/AWS_SETUP.md).
