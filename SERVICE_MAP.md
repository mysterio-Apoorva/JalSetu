# Service map

| Handler | Trigger | Real integrations |
| --- | --- | --- |
| citizen-request-intake | API, DynamoDB Streams, SQS FIFO | DynamoDB, SQS, Step Functions, Location search/routes, SES, Open-Meteo, WorldPop; optional Bedrock Canvas/S3 simulation |
| bedrock-urgency-classifier | Workflow; copilot API | Bedrock Converse (Nova Lite), DynamoDB |
| vrp-route-optimizer | Workflow, 10-minute schedule, dispatcher API | Location road matrix, DynamoDB conditional transactions |
| geofence-telemetry-processor | Assigned-driver API | Location tracker/geofences, DynamoDB, EventBridge |
| pod-verification-handler | Assigned-driver API; workflow callback registration | S3, DynamoDB atomic settlement, EventBridge, Step Functions |
| fraud-sentinel-anomaly-detector | EventBridge rule | Idempotent DynamoDB anomaly writes |

API Gateway validates Cognito JWTs, then handlers apply server-side role and ownership checks. The deployed authorization mode is `local-cognito-rbac`; optional Verified Permissions code exists but no policy store is active. The resident priority board uses a deterministic formula, separate from Bedrock operational triage. Optional Nova Canvas generation is disabled by its zero daily quota. The physical-delivery pipeline requires operational onboarding before it can be claimed as live.

The topology remains React → API Gateway → six Lambda services with the existing AWS service families. Deployment source: `infra/template.yaml`. Detailed setup and payloads: [AWS_SETUP.md](docs/AWS_SETUP.md).
