# AWS setup and live acceptance

## One environment file

Use `.env` in the project root. Do not create frontend/backend copies. Vite exposes only `VITE_` fields. Credentials are resolved by the standard AWS profile/SSO chain locally and by execution roles in Lambda. Restart Vite after changing frontend values; rebuild it for production.

| Value | Where to obtain it |
| --- | --- |
| `AWS_REGION`, `AWS_PROFILE` | Your intended AWS region and local CLI profile |
| `JWT_ISSUER` | Cognito user pool issuer URL, or compatible OIDC issuer |
| `JWT_AUDIENCE` | Identity provider application/client ID |
| `BEDROCK_MODEL_ID` | Accessible Bedrock Converse-compatible model ID or inference profile ID/ARN |
| `ALLOWED_ORIGIN` | Exact frontend origin; localhost for development or HTTPS origin for hosting |
| `POD_BUCKET_NAME` | Globally unique S3 bucket name for the new stack |
| Table, event bus, tracker, geofence, calculator, map names | Desired names before deployment; matching console names for compatible existing infrastructure |
| API URL, FIFO URL, state machine ARN, policy store ID, function names | SAM stack Outputs, copied automatically by `node scripts/aws-config.mjs outputs` |
| `VITE_DATA_MODE` | `demo` or `aws` |

`MAP_NAME` provisions the existing architecture's map resource. The browser street map currently uses attributed OpenStreetMap tiles; Location Service is actively used for routing, tracking and geofencing. A Location map resource alone is not a browser map credential.

## Deploy the supplied stack

1. Install AWS CLI and SAM CLI; use Node 22 for local packaging. Run `aws sso login --profile YOUR_PROFILE` or your organization's equivalent credential setup. This project does not store access keys.
2. Create/configure your JWT identity provider. For Cognito, use groups exactly named `Citizen`, `Driver`, `Dispatcher`, `Auditor`. Users must be assigned groups by a trusted administrator. Obtain tokens through that provider's normal sign-in flow. This application supplies a token connection field, not a custom password authentication service.
3. Fill the pre-deployment fields in root `.env`. Confirm the chosen model supports Bedrock Converse in your region and your account can invoke it. Cross-region inference profiles may require model access in their destination regions.
4. From the root, run `node scripts/aws-config.mjs check`, then `node scripts/aws-config.mjs build`. The latter invokes SAM build against `infra/template.yaml`, packaging the existing six handler entry points and shared backend dependencies.
5. Run `node scripts/aws-config.mjs deploy` to prepare a change set, or `node scripts/aws-config.mjs deploy --execute` when you intend to create/update billable AWS resources. The deployment role needs the normal CloudFormation/SAM resource-creation and IAM role permissions. No deployment was executed as part of the local code changes.
6. Run `node scripts/aws-config.mjs outputs`. It updates values in the same `.env`, without creating another environment file.
7. Review `backend/dynamodb/bootstrap-records.json`. These are demonstration wards/depot/tanker records, not authoritative municipal data. Replace the tanker's `driverId` with the Driver user's JWT `sub`. Adapt service areas and the physical test location appropriately. Run `node scripts/aws-live.cjs seed backend/dynamodb/bootstrap-records.json`. This preserves existing database records and registers ward geofences.
8. Run `node scripts/aws-live.cjs health`. This checks the existence/accessibility of the table, queue, workflow, bucket, event bus, policy store and Location resources. It does not claim to test model invocation, end-to-end delivery, IAM permissions of every execution role, or deployed code versions.
9. Set `VITE_DATA_MODE=aws` and restart the frontend. Use the connection form to paste your identity provider's JWT. Tokens stay in memory, not `.env` or browser storage. The selected UI tab never grants permissions.

Do not deploy both template aliases as separate stacks. Do not attempt to redeploy pre-existing manually created resource names without importing them or choosing distinct names. `.env` values alone cannot retrofit triggers or IAM onto arbitrary console resources; the SAM stack is the reproducible integration path.

## API routes

All routes use the `/api/v1` prefix. JSON responses never include AWS exception details. Private routes require `Authorization: Bearer <JWT>`.

| Route | Access | Payload / result |
| --- | --- | --- |
| `POST /requests` | Citizen | `idempotencyKey`, `wardId`, `citizenName`, `phone`, `householdCount`, `daysWithoutWater`, `vulnerableCount`, `complaintText`; returns persisted request and initial OTP |
| `GET /snapshot` | Known role | Dispatcher sees operational records; citizen/driver sees owned/assigned requests and vehicles |
| `GET /public` | Anonymous | Aggregate wards and safe delivery hash metadata; no names, phone numbers, evidence GPS or photo keys |
| `POST /requests/rating` | Owning citizen | `requestId`, integer `rating` 1–5; delivered requests only |
| `POST /optimize` | Dispatcher | Empty object; capacity-aware multi-stop assignments and unassigned count |
| `POST /copilot` | Dispatcher | `question`; snapshot-grounded Bedrock response |
| `POST /telemetry` | Assigned driver | `tankerId`, `coordinates:{lat,lng}`, `accuracyMeters`, `speedKmph`, `waterLevelLiters`, `valveStatus` |
| `POST /delivery/verify` | Assigned driver | `requestId`, `driverOtpInput`, `litersDelivered`, `driverGps:{lat,lng}`, `accuracyMeters`, `photoProofBase64` (JPEG, ≤ 2 MB) |

The expected OTP and destination are always read from DynamoDB. The initial code is shown only on creation, kept in memory in the citizen view, and stored only as a salted SHA-256 hash on the server. Keep the citizen tab open through the demonstration. Codes expire after 24 hours and lock after five incorrect attempts; a managed recovery/reissue flow is not yet implemented. Never distribute a driver token that grants the Citizen role for the same delivery.

## Live acceptance walkthrough

Use separate browser sessions for Citizen, Dispatcher and Driver.

1. Submit a citizen request. Record its ID and code. Confirm the row exists in DynamoDB and no plaintext OTP is stored.
2. Confirm DynamoDB Streams forwarded the request to FIFO SQS. Confirm one named Step Functions execution starts, even if the message is retried.
3. Confirm Bedrock triage updates urgency and priority, then Location road routing assigns a tanker with sufficient capacity. If no tanker is available the request stays scheduled until a subsequent optimization. Inspect workflow and Lambda logs for real service errors.
4. As Dispatcher, ask Copilot about the new request. Check the response against the snapshot. Do not interpret the assistant's text as an executed dispatch command.
5. As Driver, send GPS at the actual seeded ward location. Confirm the Location tracker receives it. Device location requires HTTPS or localhost and user browser permission. The verification geofence is 200 m with reported accuracy ≤ 100 m.
6. Upload a real JPEG, enter the resident code and delivered volume, and submit. Verify the encrypted/versioned S3 object, conditional DynamoDB settlement, remaining tanker route/volume, audit hash, and Step Functions success callback. Repeat the submission and confirm volume is not deducted twice.
7. For a fresh request, try a wrong OTP and confirm rejection plus EventBridge/Fraud Sentinel record. Never consume all five attempts on a request needed for the successful demo. Try an out-of-zone GPS and missing photo; both must fail.
8. Open the public route without a token and inspect the response for absence of names, phones, OTP hashes, private evidence locations and S3 keys. Export the ward CSV from Transparency.
9. Inspect SQS dead-letter queues and failed workflows. After correcting a failed dependency, deliberately redrive/recover affected requests; do not assume a finished failed execution automatically restarts from the same FIFO message.

## Operation and limits

- The optimizer processes up to 50 scheduled requests and 10 idle vehicles per run, with up to 10 stops per vehicle. Unassigned requests remain scheduled for the next 10-minute run. Its heuristic is urgency-banded nearest-road, not guaranteed optimal CVRP.
- Workflow maximum lifetime is 24 hours; delivery callback waits up to 23 hours. Expired workflows/OTPs need operator recovery. No automated settlement occurs on timeout.
- The ledger volume is separate from observed telemetry water volume to avoid deducting the same water twice. Depot refill/inventory administration remains a trusted operational data-management task.
- S3 upload occurs before the settlement transaction; a transaction conflict can leave an unreferenced evidence version. Lifecycle archiving applies; an orphan-cleanup policy can be added after retention requirements are known.
- Fraud heuristics are investigative signals. GPS, reported tank level and photos can be manipulated on an untrusted client; deploy trusted sensors/attestation if stronger physical guarantees are needed.
- AWS account billing, model access, regional availability, CORS, group claims, IAM and actual endpoint execution must be verified in your account. The checked-in local tests do not certify these external conditions.

## Primary API references

- [Bedrock Converse](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_Converse.html)
- [Step Functions callback integration](https://docs.aws.amazon.com/step-functions/latest/dg/connect-to-resource.html)
- [Verified Permissions authorization](https://docs.aws.amazon.com/verifiedpermissions/latest/apireference/API_IsAuthorized.html)
- [Amazon Location Service API](https://docs.aws.amazon.com/location/latest/APIReference/Welcome.html)
