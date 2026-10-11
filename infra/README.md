# Infrastructure

`template.yaml` is the authoritative SAM template (JSON, which is valid YAML). It packages the same six Lambda services and provisions the documented serverless resource graph. `../aws-infra/template.yaml` is a byte-identical compatibility alias; deploy only one stack.

Use root `.env` and `node scripts/aws-config.mjs check|build|deploy|outputs` from the project root. `deploy` prepares a change set; `deploy --execute` creates/updates resources. Setup and live verification: [AWS_SETUP.md](../docs/AWS_SETUP.md).

`python scripts/infrastructure.py` regenerates both template aliases and the workflow after editing the generator. `python scripts/validate-infra.py` checks parity, handler paths and workflow wiring. The template also passes cfn-lint resource validation.

The existing LocalStack directory is retained for historical local experiments. It does not emulate Bedrock, Verified Permissions and all Location/Step Functions behaviors equivalently; it is not the acceptance environment for the real integrations.
