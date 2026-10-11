// Uses the same root .env as Vite and deployment tooling. No browser credentials.
const { createRequire } = require("node:module");
const { resolve } = require("node:path");
const { readFileSync } = require("node:fs");
const sdk = createRequire(resolve(__dirname, "../backend/package.json"));
async function main() {
  const { config, required } = await import("./aws-config.mjs");
  for (const [k, v] of Object.entries(config))
    if (!k.startsWith("VITE_")) process.env[k] = v;
  const opts = { region: required("AWS_REGION"), maxAttempts: 2 };
  const command = process.argv[2] || "health";
  if (command === "seed") {
    const file = process.argv[3];
    if (!file)
      throw new Error(
        "Usage: node scripts/aws-live.cjs seed path/to/records.json",
      );
    const records = JSON.parse(readFileSync(resolve(file), "utf8"));
    if (!Array.isArray(records))
      throw new Error("Seed file must be an array of records.");
    for (const r of records) {
      if (
        !["WARD", "DEPOT", "TANKER"].includes(r.GSI1PK) ||
        !r.id ||
        r.PK !== `${r.GSI1PK}#${r.id}` ||
        r.SK !== "META"
      )
        throw new Error("Invalid seed record key");
      if (
        r.GSI1PK === "TANKER" &&
        (!r.driverId || r.driverId.includes("REPLACE"))
      )
        throw new Error(
          "Set tanker driverId to the real identity-provider subject before seeding",
        );
    }
    const { DynamoDBClient } = sdk("@aws-sdk/client-dynamodb");
    const { DynamoDBDocumentClient, PutCommand } = sdk("@aws-sdk/lib-dynamodb");
    const db = DynamoDBDocumentClient.from(new DynamoDBClient(opts));
    for (const Item of records) {
      try {
        await db.send(
          new PutCommand({
            TableName: required("TABLE_NAME"),
            Item,
            ConditionExpression: "attribute_not_exists(PK)",
          }),
        );
        console.log(`Created ${Item.PK}`);
      } catch (e) {
        if (e.name === "ConditionalCheckFailedException")
          console.log(`Kept existing ${Item.PK}`);
        else throw e;
      }
    }
    const { LocationClient, PutGeofenceCommand } = sdk(
      "@aws-sdk/client-location",
    );
    const loc = new LocationClient(opts);
    for (const ward of records.filter((r) => r.GSI1PK === "WARD")) {
      await loc.send(
        new PutGeofenceCommand({
          CollectionName: required("GEOFENCE_COLLECTION_NAME"),
          GeofenceId: ward.id,
          Geometry: {
            Circle: {
              Center: [ward.coordinates.lng, ward.coordinates.lat],
              Radius: 200,
            },
          },
        }),
      );
      console.log(`Registered geofence ${ward.id}`);
    }
    return;
  }
  if (command !== "health") throw new Error("Use health or seed.");
  const tests = [
    [
      "DynamoDB",
      "@aws-sdk/client-dynamodb",
      "DynamoDBClient",
      "DescribeTableCommand",
      { TableName: required("TABLE_NAME") },
    ],
    [
      "SQS",
      "@aws-sdk/client-sqs",
      "SQSClient",
      "GetQueueAttributesCommand",
      {
        QueueUrl: required("SURGE_QUEUE_URL"),
        AttributeNames: ["QueueArn", "FifoQueue"],
      },
    ],
    [
      "Step Functions",
      "@aws-sdk/client-sfn",
      "SFNClient",
      "DescribeStateMachineCommand",
      { stateMachineArn: required("STATE_MACHINE_ARN") },
    ],
    [
      "EventBridge",
      "@aws-sdk/client-eventbridge",
      "EventBridgeClient",
      "DescribeEventBusCommand",
      { Name: required("EVENTS_BUS_NAME") },
    ],
    [
      "S3",
      "@aws-sdk/client-s3",
      "S3Client",
      "HeadBucketCommand",
      { Bucket: required("POD_BUCKET_NAME") },
    ],
    [
      "Verified Permissions",
      "@aws-sdk/client-verifiedpermissions",
      "VerifiedPermissionsClient",
      "GetPolicyStoreCommand",
      { policyStoreId: required("POLICY_STORE_ID") },
    ],
    [
      "Location tracker",
      "@aws-sdk/client-location",
      "LocationClient",
      "DescribeTrackerCommand",
      { TrackerName: required("TRACKER_NAME") },
    ],
    [
      "Location geofences",
      "@aws-sdk/client-location",
      "LocationClient",
      "DescribeGeofenceCollectionCommand",
      { CollectionName: required("GEOFENCE_COLLECTION_NAME") },
    ],
    [
      "Location routes",
      "@aws-sdk/client-location",
      "LocationClient",
      "DescribeRouteCalculatorCommand",
      { CalculatorName: required("ROUTE_CALCULATOR_NAME") },
    ],
  ];
  const results = await Promise.allSettled(
    tests.map(async ([name, pkg, client, cmd, input]) => {
      if (name === "Verified Permissions" && input.policyStoreId === "local-cognito-rbac") {
        return "Cognito RBAC";
      }
      const module = sdk(pkg);
      await new module[client](opts).send(new module[cmd](input));
      return name;
    }),
  );
  results.forEach((r, i) =>
    console.log(
      `${r.status === "fulfilled" ? "PASS" : "FAIL"} ${tests[i][0]}${r.status === "rejected" ? ": " + r.reason.name : ""}`,
    ),
  );
  console.log(
    "Resource existence checks only. Validate API identity, Bedrock model access and a full delivery separately using docs/AWS_SETUP.md.",
  );
  if (results.some((r) => r.status === "rejected")) process.exitCode = 1;
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
