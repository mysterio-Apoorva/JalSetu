const { test } = require("node:test");
const assert = require("node:assert/strict");
const { DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");
const {
  VerifiedPermissionsClient,
} = require("@aws-sdk/client-verifiedpermissions");
const { EventBridgeClient } = require("@aws-sdk/client-eventbridge");
const { S3Client } = require("@aws-sdk/client-s3");
const { SFNClient } = require("@aws-sdk/client-sfn");
const { SQSClient } = require("@aws-sdk/client-sqs");
const { BedrockRuntimeClient } = require("@aws-sdk/client-bedrock-runtime");
const { LocationClient } = require("@aws-sdk/client-location");
Object.assign(process.env, {
  AWS_REGION: "ap-south-1",
  TABLE_NAME: "test",
  POLICY_STORE_ID: "test-policy",
  EVENTS_BUS_NAME: "test-bus",
  POD_BUCKET_NAME: "test-evidence",
  SURGE_QUEUE_URL: "https://sqs.test/test.fifo",
  STATE_MACHINE_ARN: "arn:aws:states:ap-south-1:123456789012:stateMachine:test",
  BEDROCK_MODEL_ID: "test-model",
  ROUTE_CALCULATOR_NAME: "test-routes",
  TRACKER_NAME: "test-tracker",
  GEOFENCE_COLLECTION_NAME: "test-geofences",
});
const c = require("../shared/core");
const intake = require("../lambdas/citizen-request-intake");
const pod = require("../lambdas/pod-verification-handler");
const classifier = require("../lambdas/bedrock-urgency-classifier");
const optimizer = require("../lambdas/vrp-route-optimizer");
const telemetry = require("../lambdas/geofence-telemetry-processor");
const fraud = require("../lambdas/fraud-sentinel-anomaly-detector");
const event = (body, path = "/delivery/verify", sub = "driver-1") => ({
  rawPath: "/api/v1" + path,
  body: JSON.stringify(body),
  requestContext: {
    http: { method: "POST" },
    authorizer: { jwt: { claims: { sub, groups: '["Driver"]' } } },
  },
});
const request = {
  id: "r1",
  wardId: "w1",
  assignedTankerId: "t1",
  assignedDriverId: "driver-1",
  status: "DISPATCHED",
  otpHash: c.hash("r1:123456"),
  otpExpiresAt: Date.now() + 86400000,
  otpAttempts: 0,
  demandLiters: 4000,
  coordinates: { lat: 28.5, lng: 77.2 },
};
const photo = require("jpeg-js")
  .encode(
    { width: 320, height: 240, data: Buffer.alloc(320 * 240 * 4, 128) },
    80,
  )
  .data.toString("base64");
const proof = {
  requestId: "r1",
  driverOtpInput: "123456",
  driverGps: { lat: 28.5, lng: 77.2 },
  accuracyMeters: 10,
  litersDelivered: 2000,
  photoProofBase64: photo,
};

test("policy service outage cannot fall back to weaker role permissions", async (t) => {
  setup(t, {
    IsAuthorizedCommand: () => {
      throw new Error("outage");
    },
  });
  assert.equal((await pod.handler(event(proof))).statusCode, 503);
});
test("evidence validation rejects corrupt JPEG headers and tiny images", () => {
  const { normalizePhoto } = require("../shared/evidence");
  assert.throws(() =>
    normalizePhoto(
      Buffer.concat([Buffer.from([255, 216, 255]), Buffer.alloc(150)]).toString(
        "base64",
      ),
    ),
  );
  const tiny = require("jpeg-js").encode(
    { width: 1, height: 1, data: Buffer.alloc(4) },
    80,
  ).data;
  assert.throws(() => normalizePhoto(tiny.toString("base64")), /at least 320/);
  assert.ok(normalizePhoto(photo).length > 100);
});
test("replacement OTP requires ownership and invalidates the previous hash atomically", async (t) => {
  const calls = setup(t, {
    GetCommand: () => ({ Item: { ...request, ownerId: "resident" } }),
  });
  assert.equal(
    (
      await intake.handler(
        event({ requestId: "r1" }, "/requests/otp", "intruder"),
      )
    ).statusCode,
    403,
  );
  const response = await intake.handler(
    event({ requestId: "r1" }, "/requests/otp", "resident"),
  );
  assert.equal(response.statusCode, 200);
  const body = JSON.parse(response.body);
  assert.match(body.expectedOtp, /^\d{6}$/);
  const update = calls.find((x) => x.name === "UpdateCommand").input;
  assert.equal(
    update.ExpressionAttributeValues[":hash"],
    c.hash("r1:" + body.expectedOtp),
  );
  assert.match(update.ConditionExpression, /otpHash=:old/);
});
test("replacement OTP cannot be regenerated during cooldown or after settlement", async (t) => {
  let item = { ...request, ownerId: "resident", otpIssuedAt: Date.now() };
  setup(t, { GetCommand: () => ({ Item: item }) });
  assert.equal(
    (
      await intake.handler(
        event({ requestId: "r1" }, "/requests/otp", "resident"),
      )
    ).statusCode,
    429,
  );
  item = { ...item, status: "DELIVERED_VERIFIED" };
  assert.equal(
    (
      await intake.handler(
        event({ requestId: "r1" }, "/requests/otp", "resident"),
      )
    ).statusCode,
    409,
  );
});
test("browser telemetry cannot impersonate a physical flow sensor", async (t) => {
  const calls = setup(t);
  const response = await telemetry.handler(
    event(
      {
        tankerId: "t1",
        coordinates: { lat: 28.5, lng: 77.2 },
        speedKmph: 0,
        waterLevelLiters: 5000,
        accuracyMeters: 10,
      },
      "/telemetry",
    ),
  );
  assert.equal(response.statusCode, 400);
  assert.equal(
    calls.some((x) => x.name === "BatchUpdateDevicePositionCommand"),
    false,
  );
});
test("stale browser GPS is rejected before updating Location", async (t) => {
  setup(t);
  const response = await telemetry.handler(
    event(
      {
        tankerId: "t1",
        coordinates: { lat: 28.5, lng: 77.2 },
        speedKmph: 0,
        sampledAt: "2020-01-01T00:00:00Z",
        accuracyMeters: 10,
      },
      "/telemetry",
    ),
  );
  assert.equal(response.statusCode, 400);
});
test("alert resolution stores who, when and why using a conditional write", async (t) => {
  const calls = setup(t);
  assert.equal(
    (
      await intake.handler(
        event(
          {
            anomalyId: "a1",
            reason: "Inspected vehicle and reconciled delivery",
          },
          "/anomalies/resolve",
          "dispatcher",
        ),
      )
    ).statusCode,
    200,
  );
  const update = calls.find((x) => x.name === "UpdateCommand").input;
  assert.equal(update.ExpressionAttributeValues[":by"], "dispatcher");
  assert.match(update.ConditionExpression, /attribute_exists/);
});
test("resident query uses the owner index and a bounded page", async (t) => {
  const calls = setup(t, { QueryCommand: () => ({ Items: [] }) });
  await c.ownerRequests("resident");
  const input = calls.find((x) => x.name === "QueryCommand").input;
  assert.equal(input.IndexName, "OwnerRequests");
  assert.equal(input.ExpressionAttributeValues[":owner"], "resident");
  assert.equal(input.Limit, 100);
});
test("evidence viewer checks the versioned photo and canonical audit hashes", async (t) => {
  const bytes = Buffer.from(photo,"base64");
  const evidence = {requestId:"r1",wardId:"w1",tankerId:"t1",litersDelivered:2000,deliveredAt:"2026-10-10T00:00:00Z",driverGps:{lat:28.5,lng:77.2},photoHash:c.hash(bytes)};
  const auditHash = c.hash(JSON.stringify(evidence));
  const calls = setup(t,{
    GetCommand:()=>({Item:{...evidence,auditHash,photoKey:"private.jpg",photoVersionId:"v1"}}),
    GetObjectCommand:()=>({ContentLength:bytes.length,Body:{transformToByteArray:async()=>bytes}}),
  });
  const e=event({},"/evidence","auditor");e.queryStringParameters={requestId:"r1"};
  const result=await pod.handler(e);
  assert.equal(result.statusCode,200);assert.equal(JSON.parse(result.body).integrityVerified,true);
  assert.equal(calls.find(x=>x.name==="GetObjectCommand").input.VersionId,"v1");
});
test("Cognito-only role checks prevent residents reading private audit evidence", async (t) => {
  const previous=process.env.POLICY_STORE_ID;process.env.POLICY_STORE_ID="local-cognito-rbac";
  try {
    const calls=setup(t);const e=event({},"/evidence","resident");
    e.requestContext.authorizer.jwt.claims.groups='["Citizen"]';e.queryStringParameters={requestId:"r1"};
    assert.equal((await pod.handler(e)).statusCode,403);
    assert.equal(calls.some(x=>x.name==="GetObjectCommand"),false);
  } finally {process.env.POLICY_STORE_ID=previous;}
});
test("audit integrity survives database map reordering and rejects altered coordinates", () => {
  const { evidenceHash, matchesEvidence } = require("../shared/audit");
  const a={requestId:"r1",driverGps:{lat:28.5,lng:77.2}};
  const reordered={driverGps:{lng:77.2,lat:28.5},requestId:"r1"};
  assert.equal(evidenceHash(a),evidenceHash(reordered));
  assert.ok(matchesEvidence({...a,driverGps:reordered.driverGps},c.hash(JSON.stringify(a))));
  assert.ok(matchesEvidence(reordered,evidenceHash(a),"sorted-json-v1"));
  assert.equal(matchesEvidence({...a,driverGps:{lat:0,lng:0}},evidenceHash(a),"sorted-json-v1"),false);
});
function setup(t, overrides = {}) {
  const calls = [];
  for (const Class of [
    DynamoDBDocumentClient,
    VerifiedPermissionsClient,
    EventBridgeClient,
    S3Client,
    SFNClient,
    SQSClient,
    BedrockRuntimeClient,
    LocationClient,
  ])
    t.mock.method(Class.prototype, "send", async function (command) {
      calls.push({ name: command.constructor.name, input: command.input });
      const override = overrides[command.constructor.name];
      if (override) return override(command.input);
      if (command.constructor.name === "CalculateRouteCommand") {
        const points = [command.input.DeparturePosition, ...(command.input.WaypointPositions || []), command.input.DestinationPosition];
        return { Legs: points.slice(1).map((point, i) => ({ Geometry: { LineString: [points[i], point] } })) };
      }
      if (command.constructor.name === "IsAuthorizedCommand")
        return { decision: "ALLOW" };
      if (command.constructor.name === "GetCommand")
        return {
          Item: command.input.Key.PK.startsWith("REQUEST")
            ? { ...request }
            : {
                id: "t1",
                driverId: "driver-1",
                capacityLiters: 10000,
                currentWaterLevelLiters: 5000,
                assignedRoute: [{ requestId: "r1" }],
              },
        };
      if (command.constructor.name === "PutObjectCommand")
        return { VersionId: "v1" };
      return {};
    });
  return calls;
}

test("simulation is disabled before any paid invocation when budget is unset",async t=>{
  const calls=setup(t);const response=await intake.handler(event({},"/simulation"));
  assert.equal(response.statusCode,503);assert.equal(calls.filter(c=>c.name==="InvokeModelCommand").length,0);
});
test("simulation image access is restricted to its owner",async t=>{
  setup(t,{GetCommand:()=>({Item:{ownerId:"another-person",status:"COMPLETE"}})});
  const e=event({},"/simulation");e.requestContext.http.method="GET";e.queryStringParameters={id:"image-1"};
  assert.equal((await intake.handler(e)).statusCode,404);
});
test("generated images carry permanent simulation labels and never write delivery evidence",async t=>{
  const png=Buffer.from([137,80,78,71,13,10,26,10,0]).toString("base64");
  const calls=setup(t,{InvokeModelCommand:()=>({body:Buffer.from(JSON.stringify({images:[png]}))})});
  await require("../shared/pilot").generate({id:"sim-1"});
  const upload=calls.find(c=>c.name==="PutObjectCommand").input;
  assert.equal(upload.Key,"simulations/sim-1.svg");assert.match(upload.Body,/AI-GENERATED DELIVERY SIMULATION/);
  assert.match(upload.Body,/Not evidence of a real water delivery/);
  assert.ok(calls.filter(c=>c.name==="UpdateCommand").every(c=>c.input.Key.PK.startsWith("SIMULATION#")));
  assert.ok(!calls.some(c=>c.name==="PutEventsCommand" || c.name==="TransactWriteCommand"));
});
test("duplicate stream delivery cannot trigger another paid generation",async t=>{
  const calls=setup(t,{UpdateCommand:()=>{const e=new Error();e.name="ConditionalCheckFailedException";throw e;}});
  await require("../shared/pilot").generate({id:"sim-1"});assert.ok(!calls.some(c=>c.name==="InvokeModelCommand"));
});
test("need reports reject missing vulnerability data before writing or fetching weather",async t=>{
  const calls=setup(t);const e=event({place:"Locality",coordinates:{lat:28.6,lng:77.2},daysWithoutWater:1,elders:0},"/needs/report");
  assert.equal((await intake.handler(e)).statusCode,400);assert.ok(!calls.some(c=>["PutCommand","UpdateCommand"].includes(c.name)));
});

test("production namespace isolates keys, entity queries, owner results and stream events", async (t) => {
  const old = process.env.DATA_NAMESPACE; process.env.DATA_NAMESPACE = "LIVE";
  t.after(() => { if (old === undefined) delete process.env.DATA_NAMESPACE; else process.env.DATA_NAMESPACE = old; });
  const calls = setup(t, { QueryCommand: () => ({ Items: [{ PK: "REQUEST#demo", id: "demo" }, { PK: "LIVE#REQUEST#real", id: "real" }] }) });
  assert.deepEqual(c.key("WARD", "w1"), { PK: "LIVE#WARD#w1", SK: "META" });
  await c.query("WARD");
  assert.equal(calls[0].input.ExpressionAttributeValues[":pk"], "LIVE#WARD");
  assert.deepEqual((await c.ownerRequests("resident")).items.map(x => x.id), ["real"]);
  await c.put({ ...c.key("REQUEST", "real"), GSI1PK: "REQUEST", id: "real" });
  assert.equal(calls.find(x => x.name === "PutCommand").input.Item.GSI1PK, "LIVE#REQUEST");
  const { marshall } = require("@aws-sdk/util-dynamodb");
  await intake.handler({ Records: [{ eventSource: "aws:dynamodb", eventName: "INSERT", dynamodb: { NewImage: marshall({ GSI1PK: "REQUEST", id: "demo", wardId: "w1" }) } }] });
  assert.equal(calls.some(x => x.name === "SendMessageCommand"), false);
});

test("production denies existing demo credentials even with valid role claims", async (t) => {
  const old = process.env.DATA_NAMESPACE; process.env.DATA_NAMESPACE = "LIVE";
  t.after(() => { if (old === undefined) delete process.env.DATA_NAMESPACE; else process.env.DATA_NAMESPACE = old; });
  const calls = setup(t);
  const e = event({}, "/snapshot"); e.requestContext.authorizer.jwt.claims.email = "driver@jalsetu.local";
  assert.equal((await intake.handler(e)).statusCode, 403);
  assert.equal(calls.length, 0);
});

test("blocked test subjects are rejected even when a JWT lacks an email claim", async (t) => {
  const old = process.env.BLOCKED_SUBJECTS; process.env.BLOCKED_SUBJECTS = "driver-1";
  t.after(() => { if (old === undefined) delete process.env.BLOCKED_SUBJECTS; else process.env.BLOCKED_SUBJECTS = old; });
  const calls = setup(t);
  assert.equal((await intake.handler(event({}, "/snapshot"))).statusCode, 403);
  assert.equal(calls.length, 0);
});

test("live intake uses the verified collection point and a namespace-specific workflow identity", async (t) => {
  const old = process.env.DATA_NAMESPACE; process.env.DATA_NAMESPACE = "LIVE";
  t.after(() => { if (old === undefined) delete process.env.DATA_NAMESPACE; else process.env.DATA_NAMESPACE = old; });
  const point = { lat: 28.51, lng: 77.21 };
  const calls = setup(t, { GetCommand: input => ({ Item: input.Key.PK.startsWith("LIVE#WARD#") ? { id: "w1", name: "Fixture ward", coordinates: {lat:0,lng:0}, provenance: { verifiedAt: "2026-01-01T00:00:00Z" }, servicePoint: { coordinates: point, address: "Verified shared point" } } : undefined }) });
  const response = await intake.handler(event({ wardId: "w1", citizenName: "Fixture resident", phone: "9999999999", householdCount: 1, complaintText: "Supply unavailable", daysWithoutWater: 1, vulnerableCount: 0, idempotencyKey: "same-key", coordinates:{lat:0,lng:0} }, "/requests", "resident"));
  assert.equal(response.statusCode, 200);
  const item = calls.find(x => x.name === "PutCommand").input.Item;
  assert.deepEqual(item.coordinates, point);
  assert.equal(item.GSI1PK, "LIVE#REQUEST");
  assert.notEqual(item.id, "REQ-" + c.hash("resident:same-key").slice(0,28));
});

test("resident cannot change tanker inventory", async (t) => {
  const old = process.env.POLICY_STORE_ID; process.env.POLICY_STORE_ID = "local-cognito-rbac";
  t.after(() => { process.env.POLICY_STORE_ID = old; });
  const calls = setup(t), e = event({}, "/fleet/refill");
  e.requestContext.authorizer.jwt.claims.groups = '["Citizen"]';
  assert.equal((await intake.handler(e)).statusCode, 403); assert.equal(calls.length, 0);
});

test("invalid historical photo is reported and never returned as valid evidence", async (t) => {
  const bytes = Buffer.from("invalid photo");
  setup(t, { GetCommand: () => ({ Item: { photoKey: "historical.jpg", photoHash: c.hash(bytes), auditHash: "wrong" } }),
    GetObjectCommand: () => ({ ContentLength: bytes.length, Body: { transformToByteArray: async () => bytes } }) });
  const e = event({}, "/evidence"); e.queryStringParameters = { requestId: "r1" };
  const response = await pod.handler(e), body = JSON.parse(response.body);
  assert.equal(response.statusCode, 200); assert.equal(body.photoValid, false); assert.equal(body.photoBase64, undefined);
});

test("refill validates capacity and atomically records a receipt and inventory", async (t) => {
  const tanker = { id: "t1", status: "IDLE", assignedRoute: [], capacityLiters: 10000, currentWaterLevelLiters: 5000, assignedDepotId: "d1" };
  const calls = setup(t, { GetCommand: input => ({ Item: input.Key.PK.startsWith("TANKER") ? tanker : input.Key.PK.startsWith("DEPOT") ? { id: "d1" } : undefined }) });
  const input = { tankerId: "t1", litersAdded: 6000, receiptReference: "receipt-42", idempotencyKey: "refill-42" };
  assert.equal((await intake.handler(event(input, "/fleet/refill"))).statusCode, 409);
  input.litersAdded = 4000;
  assert.equal((await intake.handler(event(input, "/fleet/refill"))).statusCode, 200);
  const transaction = calls.find(x => x.name === "TransactWriteCommand").input.TransactItems;
  assert.equal(transaction[0].Update.ExpressionAttributeValues[":next"], 9000);
  assert.equal(transaction[1].Put.Item.receiptReference, "receipt-42");
  assert.match(transaction[1].Put.ConditionExpression, /attribute_not_exists/);
});
test("validates coordinates and rejects non-finite quantities", () => {
  assert.throws(() => c.coords({ lat: 200, lng: 0 }));
  assert.throws(() => c.number(NaN, 0, 10, "volume"));
  assert.throws(() => c.number("5", 0, 10, "volume"));
  assert.equal(c.distance({ lat: 28, lng: 77 }, { lat: 28, lng: 77 }), 0);
  assert.ok(c.distance({ lat: 28, lng: 77 }, { lat: 29, lng: 77 }) > 100000);
});
test("malformed JSON yields a controlled 400", async (t) => {
  setup(t);
  const e = event({});
  e.body = "{bad";
  assert.equal((await pod.handler(e)).statusCode, 400);
});
test("unauthenticated proof is rejected before AWS calls", async (t) => {
  const calls = setup(t);
  const e = event(proof);
  delete e.requestContext.authorizer;
  assert.equal((await pod.handler(e)).statusCode, 401);
  assert.equal(calls.length, 0);
});
test("Verified Permissions denial blocks delivery", async (t) => {
  const calls = setup(t, { IsAuthorizedCommand: () => ({ decision: "DENY" }) });
  assert.equal((await pod.handler(event(proof))).statusCode, 403);
  assert.equal(calls.length, 1);
});
test("driver cannot verify another driver’s request", async (t) => {
  setup(t);
  assert.equal(
    (await pod.handler(event(proof, "/delivery/verify", "attacker")))
      .statusCode,
    403,
  );
});
test("caller-supplied expected OTP cannot override database OTP", async (t) => {
  const calls = setup(t);
  const response = await pod.handler(
    event({
      ...proof,
      driverOtpInput: "999999",
      residentExpectedOtp: "999999",
    }),
  );
  assert.equal(response.statusCode, 400);
  assert.ok(calls.some((x) => x.name === "PutEventsCommand"));
  assert.ok(!calls.some((x) => x.name === "PutObjectCommand"));
});
test("GPS target comes from database, not caller coordinates", async (t) => {
  setup(t);
  assert.equal(
    (
      await pod.handler(
        event({
          ...proof,
          driverGps: { lat: 0, lng: 0 },
          residentGps: { lat: 0, lng: 0 },
        }),
      )
    ).statusCode,
    400,
  );
});
test("photo is mandatory and errors do not leak AWS internals", async (t) => {
  const calls = setup(t);
  assert.equal(
    (await pod.handler(event({ ...proof, photoProofBase64: "" }))).statusCode,
    400,
  );
  assert.ok(!calls.some((x) => x.name === "TransactWriteCommand"));
});
test("invalid accuracy, expired and locked OTP are rejected", async (t) => {
  setup(t, { GetCommand: () => ({ Item: { ...request, otpAttempts: 5 } }) });
  assert.equal((await pod.handler(event(proof))).statusCode, 429);
});
test("expired OTP is rejected", async (t) => {
  setup(t, { GetCommand: () => ({ Item: { ...request, otpExpiresAt: 1 } }) });
  assert.equal((await pod.handler(event(proof))).statusCode, 409);
});
test("verified delivery atomically writes ledger, request, ward and capacity", async (t) => {
  const calls = setup(t);
  const result = await pod.handler(event(proof));
  assert.equal(result.statusCode, 200);
  assert.match(JSON.parse(result.body).auditHash, /^[a-f0-9]{64}$/);
  const txn = calls.find((x) => x.name === "TransactWriteCommand").input;
  assert.equal(txn.TransactItems.length, 4);
  assert.ok(
    txn.TransactItems[0].Update.ConditionExpression.includes("otpAttempts"),
  );
  const upload = calls.find((x) => x.name === "PutObjectCommand").input;
  assert.equal(upload.ServerSideEncryption, "AES256");
  assert.ok(upload.ChecksumSHA256);
});
test("retrying completed delivery never deducts water twice", async (t) => {
  const calls = setup(t, {
    GetCommand: () => ({
      Item: {
        ...request,
        status: "DELIVERED_VERIFIED",
        proofHash: "existing",
        taskToken: "token",
      },
    }),
  });
  assert.equal((await pod.handler(event(proof))).statusCode, 200);
  assert.ok(calls.some((x) => x.name === "SendTaskSuccessCommand"));
  assert.ok(!calls.some((x) => x.name === "TransactWriteCommand"));
});
test("S3 failure cannot mark a delivery completed", async (t) => {
  const calls = setup(t, {
    PutObjectCommand: () => {
      throw new Error("private-bucket-internal-details");
    },
  });
  const result = await pod.handler(event(proof));
  assert.equal(result.statusCode, 500);
  assert.ok(!result.body.includes("private-bucket"));
  assert.ok(!calls.some((x) => x.name === "TransactWriteCommand"));
});
test("FIFO worker stops after a failed message and returns remaining IDs", async (t) => {
  setup(t, {
    StartExecutionCommand: () => {
      throw new Error("throttled");
    },
  });
  const Records = ["one", "two"].map((messageId) => ({
    eventSource: "aws:sqs",
    messageId,
    body: '{"requestId":"r1"}',
  }));
  assert.deepEqual((await intake.handler({ Records })).batchItemFailures, [
    { itemIdentifier: "one" },
    { itemIdentifier: "two" },
  ]);
});
test("duplicate workflow start is acknowledged safely", async (t) => {
  setup(t, {
    StartExecutionCommand: () => {
      const e = new Error();
      e.name = "ExecutionAlreadyExists";
      throw e;
    },
  });
  assert.deepEqual(
    await intake.handler({
      Records: [
        {
          eventSource: "aws:sqs",
          messageId: "one",
          body: '{"requestId":"r1"}',
        },
      ],
    }),
    { batchItemFailures: [] },
  );
});
test("Bedrock failures propagate; no fake model fallback", async (t) => {
  setup(t, {
    GetCommand: () => ({ Item: { ...request, status: "PENDING_TRIAGE" } }),
    ConverseCommand: () => {
      throw new Error("ModelUnavailable");
    },
  });
  await assert.rejects(
    classifier.handler({ requestId: "r1" }),
    /ModelUnavailable/,
  );
});
test("out-of-range model output is rejected before database write", async (t) => {
  const calls = setup(t, {
    GetCommand: () => ({ Item: { ...request, status: "PENDING_TRIAGE" } }),
    ConverseCommand: () => ({
      output: {
        message: {
          content: [{ text: '{"urgencyScore":999,"keyConcerns":[]}' }],
        },
      },
    }),
  });
  await assert.rejects(classifier.handler({ requestId: "r1" }));
  assert.ok(!calls.some((x) => x.name === "UpdateCommand"));
});
test("triage calls Bedrock and persists validated classification", async (t) => {
  const calls = setup(t, {
    GetCommand: () => ({ Item: { ...request, status: "PENDING_TRIAGE" } }),
    ConverseCommand: () => ({
      output: {
        message: {
          content: [
            { text: '{"urgencyScore":87,"keyConcerns":["Dry for four days"]}' },
          ],
        },
      },
    }),
  });
  assert.equal(
    (await classifier.handler({ requestId: "r1" })).priorityTier,
    "CRITICAL_EMERGENCY",
  );
  assert.ok(calls.some((x) => x.name === "UpdateCommand"));
});
test("optimizer does not overfill or double-assign a tanker", async (t) => {
  const calls = setup(t, {
    QueryCommand: (i) => ({
      Items:
        i.ExpressionAttributeValues[":pk"] === "REQUEST"
          ? [
              {
                ...request,
                status: "SCHEDULED",
                urgencyScore: 90,
                createdAt: "2026",
              },
              {
                ...request,
                id: "r2",
                status: "SCHEDULED",
                urgencyScore: 80,
                createdAt: "2026",
              },
            ]
          : [
              {
                id: "t1",
                status: "IDLE",
                driverId: "driver-1",
                currentWaterLevelLiters: 5000,
                currentCoordinates: request.coordinates,
              },
            ],
    }),
    CalculateRouteMatrixCommand: () => ({
      RouteMatrix: [[{ Distance: 3.2, DurationSeconds: 420 }]],
    }),
  });
  const result = await optimizer.handler({});
  assert.equal(result.assignments.length, 1);
  assert.equal(result.unassigned, 1);
  assert.equal(result.assignments[0].distanceKm, 3.2);
  assert.equal(
    calls.filter((x) => x.name === "TransactWriteCommand").length,
    1,
  );
});
test("telemetry must belong to authenticated driver", async (t) => {
  setup(t);
  assert.equal(
    (
      await telemetry.handler(
        event({ tankerId: "t1" }, "/telemetry", "attacker"),
      )
    ).statusCode,
    403,
  );
});
test("EventBridge partial failures are not swallowed", async (t) => {
  setup(t, { PutEventsCommand: () => ({ FailedEntryCount: 1 }) });
  await assert.rejects(c.emit("test", {}), /rejected/);
});
test("anomaly replay is idempotent", async (t) => {
  setup(t, {
    PutCommand: () => {
      const e = new Error();
      e.name = "ConditionalCheckFailedException";
      throw e;
    },
  });
  const e = {
    id: "event-1",
    detail: { tankerId: "t1", incidentType: "VALVE_TAMPER" },
  };
  assert.deepEqual(await fraud.handler(e), await fraud.handler(e));
});
test("request serialization strips OTP hashes and callback tokens", () => {
  const safe = c.publicRequest({
    ...request,
    taskToken: "secret",
    expectedOtp: "123456",
    ownerId: "private",
  });
  for (const field of ["otpHash", "taskToken", "expectedOtp", "ownerId"])
    assert.ok(!(field in safe));
});
test("optimizer builds multiple stops when capacity allows", async (t) => {
  setup(t, {
    QueryCommand: (i) => ({
      Items:
        i.ExpressionAttributeValues[":pk"] === "REQUEST"
          ? [
              {
                ...request,
                status: "SCHEDULED",
                urgencyScore: 90,
                createdAt: "2026",
              },
              {
                ...request,
                id: "r2",
                status: "SCHEDULED",
                urgencyScore: 80,
                createdAt: "2026",
              },
            ]
          : [
              {
                id: "t1",
                status: "IDLE",
                driverId: "driver-1",
                currentWaterLevelLiters: 9000,
                currentCoordinates: request.coordinates,
              },
            ],
    }),
    CalculateRouteMatrixCommand: () => ({
      RouteMatrix: [
        [
          { Distance: 3, DurationSeconds: 300 },
          { Distance: 4, DurationSeconds: 400 },
        ],
      ],
    }),
  });
  const result = await optimizer.handler({});
  assert.equal(result.assignments.length, 2);
  assert.equal(result.plans[0].scheduledLiters, 8000);
  assert.equal(result.plans[0].stops.length, 2);
  assert.ok(result.plans[0].stops.every(stop => stop.roadGeometry.length >= 2));
});

test("optimizer refuses dispatch when road geometry is missing", async (t) => {
  const calls = setup(t, {
    QueryCommand: i => ({ Items: i.ExpressionAttributeValues[":pk"] === "REQUEST"
      ? [{ ...request, status: "SCHEDULED", urgencyScore: 90, createdAt: "2026" }]
      : [{ id: "t1", status: "IDLE", driverId: "driver-1", currentWaterLevelLiters: 5000, currentCoordinates: request.coordinates }] }),
    CalculateRouteMatrixCommand: () => ({ RouteMatrix: [[{ Distance: 3.2, DurationSeconds: 420 }]] }),
    CalculateRouteCommand: () => ({ Legs: [{ Geometry: { LineString: [] } }] }),
  });
  await assert.rejects(optimizer.handler({}), /invalid road geometry/);
  assert.equal(calls.filter(call => call.name === "TransactWriteCommand").length, 0);
});
test("request intake persists private OTP hash and returns code only to creator", async (t) => {
  const calls = setup(t, {
    GetCommand: (i) => ({
      Item: i.Key.PK.startsWith("WARD")
        ? { id: "w1", name: "Test ward", coordinates: request.coordinates }
        : undefined,
    }),
  });
  const result = await intake.handler(
    event(
      {
        idempotencyKey: "stable-key",
        wardId: "w1",
        householdCount: 10,
        citizenName: "Resident",
        phone: "9999999999",
        complaintText: "No water",
        daysWithoutWater: 3,
        vulnerableCount: 2,
      },
      "/requests",
      "resident-1",
    ),
  );
  assert.equal(result.statusCode, 200);
  const data = JSON.parse(result.body);
  assert.match(data.request.expectedOtp, /^\d{6}$/);
  assert.ok(!data.request.otpHash);
  const stored = calls.find((x) => x.name === "PutCommand").input.Item;
  assert.equal(
    stored.otpHash,
    c.hash(stored.id + ":" + data.request.expectedOtp),
  );
  assert.ok(!stored.expectedOtp);
  assert.ok(
    !calls.some((x) => x.name === "SendMessageCommand"),
    "Queue must follow durable stream, not an unsafe dual write",
  );
});
test("public endpoint excludes names, phones, GPS evidence and OTPs", async (t) => {
  setup(t, {
    QueryCommand: (i) => ({
      Items:
        i.ExpressionAttributeValues[":pk"] === "WARD"
          ? [
              {
                id: "w1",
                name: "Ward",
                population: 100,
                coordinates: request.coordinates,
                deliveredLitersToday: 10,
              },
            ]
          : [
              {
                requestId: "r1",
                wardId: "w1",
                litersDelivered: 10,
                auditHash: "hash",
                citizenName: "Private",
                phone: "secret",
                driverGps: request.coordinates,
                photoKey: "private",
              },
            ],
    }),
  });
  const result = await intake.handler({ rawPath: "/api/v1/public" });
  assert.equal(result.statusCode, 200);
  for (const secret of [
    "Private",
    "secret",
    "driverGps",
    "photoKey",
    "otpHash",
  ])
    assert.ok(!result.body.includes(secret));
});
