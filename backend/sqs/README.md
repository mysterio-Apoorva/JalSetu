# sqs

FIFO request buffer with ordered retries and a dead-letter queue. DynamoDB Streams is the durable source for new-request enqueueing.

The complete deployable resource is in `../../infra/template.yaml`; standalone resource snippets are reference material, not separate stacks. Use only the root `.env`. See [setup and live acceptance](../../docs/AWS_SETUP.md).
