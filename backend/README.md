# Backend

Six existing Lambda services, Node.js runtime, AWS SDK v3, one DynamoDB table. Shared clients, HTTP errors, validation and authorization live in `shared/core.js`. Install/lock dependencies at this directory (`npm ci`); SAM packages this directory for each handler. Per-service legacy package manifests are not deployment entry points.

See [AWS setup](../docs/AWS_SETUP.md) and the [master README](../README.md). The root `.env` is the only local environment file. SAM supplies runtime variables using resource references. Never put AWS keys into the frontend.

Run `npm test` for security/failure/integration-contract tests using mocked SDK transports. These do not make AWS calls. Use the documented account acceptance walkthrough for real service verification.

Keys are `PK=<ENTITY>#<id>, SK=META`, with `GSI1PK=<ENTITY>` and `GSI1SK` ordering values. Supported entities include WARD, DEPOT, TANKER, REQUEST, AUDIT and ANOMALY. Bootstrap input is `dynamodb/bootstrap-records.json`; the old `seed-data.json` is a legacy sketch, not a supported live bootstrap.
