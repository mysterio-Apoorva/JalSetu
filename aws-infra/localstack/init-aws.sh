#!/bin/bash
echo ">>> Initializing JAL-SETU AWS Serverless Resources in LocalStack (Region: ap-south-1)..."

# 1. Create Core DynamoDB Table with GSIs
awslocal dynamodb create-table \
    --table-name JalSetu-Core-Prod \
    --attribute-definitions \
        AttributeName=PK,AttributeType=S \
        AttributeName=SK,AttributeType=S \
        AttributeName=GSI1PK,AttributeType=S \
        AttributeName=GSI1SK,AttributeType=S \
    --key-schema \
        AttributeName=PK,KeyType=HASH \
        AttributeName=SK,KeyType=RANGE \
    --global-secondary-indexes \
        "[{\"IndexName\": \"GSI1\", \"KeySchema\": [{\"AttributeName\":\"GSI1PK\",\"KeyType\":\"HASH\"},{\"AttributeName\":\"GSI1SK\",\"KeyType\":\"RANGE\"}], \"Projection\":{\"ProjectionType\":\"ALL\"}}]" \
    --billing-mode PAY_PER_REQUEST \
    --region ap-south-1

# 2. Create SQS Fifo Queue for Citizen Surge
awslocal sqs create-queue \
    --queue-name JalSetu-CitizenSurge-Queue.fifo \
    --attributes FifoQueue=true,ContentBasedDeduplication=true \
    --region ap-south-1

# 3. Create EventBridge Custom Bus
awslocal events create-event-bus \
    --name JalSetu-Operations-Bus \
    --region ap-south-1

# 4. Create S3 Bucket for Proof of Delivery Photos
awslocal s3 mb s3://jalsetu-pod-evidence-local --region ap-south-1

echo ">>> JAL-SETU Local AWS Environment initialized successfully! 100% Free & Ready."
