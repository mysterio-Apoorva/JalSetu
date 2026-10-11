# JAL-SETU · जल–सेतु

Water needs, vulnerability-aware prioritization, and accountable tanker operations for Delhi.

## Current pilot

The map supports destination search, fixed-Jal-Kendra road routing, real weather and WorldPop population-density lookup. Delivery stays simulated; its confirmation uses a real email OTP once an AWS email sender is verified. See [data sources, priority formula and activation inputs](docs/REAL_DATA_AND_ROUTING.txt). The operator must supply the Jal Kendra coordinates and email sender; missing configuration is shown explicitly.

The production frontend uses real Cognito authentication and AWS APIs. Residents select a map location and report water-outage days, infants under one year, and elders aged 60+. The backend retrieves recent Open-Meteo weather, calculates a transparent priority score, and persists the report in DynamoDB. Failed weather retrieval does not produce an invented score.

These are self-reported household counts, **not verified ward-wide elderly population statistics**. The allocation weights are pilot policy, not a trained or validated forecasting model. The board shows the weather-through date and removes reports after seven days. See [priority methodology and data sources](docs/PILOT_DEPLOYMENT.txt).

The delivery illustration is a full-size AI-generated scene with a permanent simulation label. It never enters delivery evidence or water totals. See [image prompt and provenance](docs/IMAGE_GENERATION.txt). Optional per-account Nova Canvas generation is separately quota-controlled and disabled by default; the bundled image works without it.

Verified service points, delivery partners, tanker inventory and staff assignments must be supplied by the operator. Until then, operations show honest empty states and household reporting does not book a tanker. Historical demo data remains separate from the LIVE namespace. Production bundles exclude the development simulator and preset records.

## Run locally

Use Node.js 22 or later. Copy .env.example to the root .env and fill the deployment values; never commit credentials. The existing deployment's Cognito identifiers are configured in frontend/src/services/auth.ts; update them when using a different user pool. AWS tooling uses your local AWS profile.

```sh
cd frontend
npm ci
npm run dev
```

Open http://localhost:5174. VITE_DATA_MODE=aws uses AWS services. VITE_DATA_MODE=demo enables an isolated development-only simulator; production always uses AWS.

Residents create an account, confirm the email code, and sign in. Public registration grants Citizen access only. An administrator grants Driver, Dispatcher or Auditor access to verified users using scripts/assign_staff.py. Drivers need a verified fleet assignment. Password reset, email-confirmation recovery and per-tab sessions are supported.

## Architecture

React / TypeScript / Vite frontend with six Node.js Lambda handlers, API Gateway, Cognito, DynamoDB and Streams, SQS FIFO, Step Functions, Bedrock, Amazon Location, private S3 evidence and EventBridge. infra/template.yaml is authoritative; aws-infra/template.yaml is its compatibility copy. See [architecture](docs/ARCHITECTURE.md), [service map](SERVICE_MAP.md), and [AWS setup](docs/AWS_SETUP.md).

Real delivery settlement requires a resident code, current driver GPS, a valid photograph and an atomic inventory update. SHA-256 checks establish record integrity, not independent proof of physical delivery. Route planning uses a capacity-constrained road-distance heuristic; it makes no mathematical optimality claim. Device GPS and delivered volumes are driver-reported, not certified hardware measurements.

## Verify

```sh
cd backend
npm ci
npm test
cd ../frontend
npm run lint
npm run build
npx playwright install chromium
npx playwright test
npx playwright test --config playwright.production.config.ts
cd ..
python -m unittest discover -s backend/registration -p 'test_*.py'
python -m unittest discover -s backend/tests -p 'test_*.py'
python scripts/validate-infra.py
python scripts/verify_production_build.py
```

Backend and browser regression tests use mocked service responses. Live AWS verification is separate; neither proves physical deliveries or production-scale authenticated capacity.

## Deploy

The backend is deployed separately from the static frontend. Follow [pilot release instructions](docs/PILOT_DEPLOYMENT.txt) and [operational onboarding](docs/PRODUCTION_INPUTS.txt). The CSV files in docs/ provide import headers for verified records; keep completed records in ignored operations-data/.

For the existing AWS deployment:

```sh
python scripts/deploy_amplify.py inspect
python scripts/deploy_amplify.py prepare
# Confirm backend LIVE namespace and exact hosting CORS before publishing.
python scripts/deploy_amplify.py publish
python scripts/deploy_amplify.py status
```

The publisher uploads only frontend/dist, excludes source maps and environment files, and checks the backend account, namespace and CORS origin. amplify.yml also provides a frontend build specification for a future Git-connected Amplify app; configure VITE_API_BASE_URL in that app's build environment.

Further operational work requires verified fleet/ward data, staff onboarding, an alert recipient, a supervised real delivery, backup/queue recovery rehearsal and representative authenticated load testing. Hosting the pilot does not establish those capabilities.
