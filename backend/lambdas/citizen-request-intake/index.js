const c = require("../../shared/core");
const { SQSClient, SendMessageCommand } = require("@aws-sdk/client-sqs");
const {
  SFNClient,
  StartExecutionCommand,
  SendTaskSuccessCommand,
} = require("@aws-sdk/client-sfn");
const sqs = new SQSClient({ maxAttempts: 3 }),
  sfn = new SFNClient({ maxAttempts: 3 });
const handleHttp = c.http(async (event) => {
  const path = event.rawPath || "",
    method = event.requestContext?.http?.method;
  if (path.includes("/needs") || path.endsWith("/simulation")) return require("../../shared/pilot").handle(event);
  if (path.endsWith("/public")) {
    const [wards, audits, anomalies] = await Promise.all(["WARD", "AUDIT", "ANOMALY"].map(c.query));
    return {
      anomalyCount: anomalies.length,
      wards: wards.map(
        ({
          id,
          name,
          zone,
          population,
          coordinates,
          deliveredLitersToday,
          deficitSeverity,
        }) => ({
          id,
          name,
          zone,
          population,
          coordinates,
          deliveredLitersToday,
          deficitSeverity,
        }),
      ),
      deliveries: audits.map(
        ({ requestId, wardId, litersDelivered, deliveredAt, auditHash }) => ({
          id: requestId,
          wardId,
          litersDelivered,
          deliveredAt,
          proofHash: auditHash,
          status: "DELIVERED_VERIFIED",
        }),
      ),
    };
  }
  const user = await c.authorize(
    event,
    path.endsWith("/refill") ? "RecordRefill" : path.endsWith("/resolve")
      ? "ResolveAnomaly"
      : path.endsWith("/snapshot")
        ? "ReadOperations"
        : path.endsWith("/rating")
          ? "SubmitQualityFeedback"
          : "SubmitWaterRequest",
  );
  if (path.endsWith("/refill")) {
    const b = c.body(event), tanker = await c.get("TANKER", c.text(b.tankerId, "tanker ID"));
    c.check(tanker, "Tanker not found", 404);
    const liters = c.number(b.litersAdded, 1, tanker.capacityLiters, "refill litres");
    const receipt = c.text(b.receiptReference, "depot receipt reference", 200);
    const id = c.hash(tanker.id + ":" + c.text(b.idempotencyKey, "idempotency key", 100));
    const previous = await c.get("REFILL", id);
    if (previous) {
      c.check(previous.litersAdded === liters && previous.receiptReference === receipt, "Refill key already used with different details", 409);
      return { success: true, alreadyRecorded: true };
    }
    c.check(tanker.status === "IDLE" && tanker.assignedRoute?.length === 0, "Only idle tankers without assigned stops can be refilled", 409);
    c.check(tanker.currentWaterLevelLiters + liters <= tanker.capacityLiters, "Refill exceeds tanker capacity", 409);
    const depot = await c.get("DEPOT", tanker.assignedDepotId);
    c.check(depot, "Assigned depot is unavailable", 409);
    const at = new Date().toISOString();
    await c.db.send(new c.TransactWriteCommand({ TransactItems: [
      { Update: { TableName: c.env("TABLE_NAME"), Key: c.key("TANKER", tanker.id),
        UpdateExpression: "SET currentWaterLevelLiters=:next, lastRefillAt=:at",
        ConditionExpression: "#s=:idle AND currentWaterLevelLiters=:old AND size(assignedRoute)=:zero",
        ExpressionAttributeNames: { "#s": "status" }, ExpressionAttributeValues: { ":next": tanker.currentWaterLevelLiters + liters, ":old": tanker.currentWaterLevelLiters, ":at": at, ":idle": "IDLE", ":zero": 0 } } },
      { Put: { TableName: c.env("TABLE_NAME"), Item: { ...c.key("REFILL", id), GSI1PK: c.partition("REFILL"), GSI1SK: at, id, tankerId: tanker.id, depotId: depot.id, litersAdded: liters, receiptReference: receipt, recordedBy: user.sub, recordedAt: at }, ConditionExpression: "attribute_not_exists(PK)" } },
    ] }));
    return { success: true, recordedAt: at };
  }
  if (path.endsWith("/resolve")) {
    const b = c.body(event);
    const id = c.text(b.anomalyId, "anomaly ID");
    const reason = c.text(b.reason, "resolution reason", 1000);
    try {
      await c.db.send(
        new c.UpdateCommand({
          TableName: c.env("TABLE_NAME"),
          Key: c.key("ANOMALY", id),
          UpdateExpression:
            "SET #s=:resolved, resolvedAt=:at, resolvedBy=:by, resolutionReason=:reason",
          ConditionExpression: "attribute_exists(PK) AND #s=:active",
          ExpressionAttributeNames: { "#s": "status" },
          ExpressionAttributeValues: {
            ":resolved": "RESOLVED",
            ":active": "ACTIVE_ALARM",
            ":at": new Date().toISOString(),
            ":by": user.sub,
            ":reason": reason,
          },
        }),
      );
    } catch (e) {
      if (e.name === "ConditionalCheckFailedException")
        throw new c.HttpError(
          409,
          "Alert has already changed. Refresh and retry.",
        );
      throw e;
    }
    return { success: true };
  }
  if (path.endsWith("/otp")) {
    const b = c.body(event),
      r = await c.get("REQUEST", c.text(b.requestId, "requestId"));
    c.check(
      r && r.ownerId === user.sub,
      "Request not owned by this account",
      403,
    );
    c.check(
      ["PENDING_TRIAGE", "SCHEDULED", "DISPATCHED", "ARRIVED_AT_STOP"].includes(
        r.status,
      ),
      "This request is closed",
      409,
    );
    const now = Date.now();
    c.check(
      !r.otpIssuedAt || now - r.otpIssuedAt >= 60000,
      "Wait one minute before generating another code",
      429,
    );
    const otp = c.crypto.randomInt(100000, 1000000).toString();
    try {
      await c.db.send(
        new c.UpdateCommand({
          TableName: c.env("TABLE_NAME"),
          Key: c.key("REQUEST", r.id),
          UpdateExpression:
            "SET otpHash=:hash, otpExpiresAt=:expires, otpAttempts=:zero, otpIssuedAt=:now",
          ConditionExpression:
            "ownerId=:owner AND #s=:status AND otpHash=:old AND (attribute_not_exists(otpIssuedAt) OR otpIssuedAt <= :cooldown)",
          ExpressionAttributeNames: { "#s": "status" },
          ExpressionAttributeValues: {
            ":owner": user.sub,
            ":status": r.status,
            ":old": r.otpHash,
            ":hash": c.hash(r.id + ":" + otp),
            ":expires": now + 86400000,
            ":zero": 0,
            ":now": now,
            ":cooldown": now - 60000,
          },
        }),
      );
    } catch (e) {
      if (e.name === "ConditionalCheckFailedException")
        throw new c.HttpError(
          409,
          "Request changed. Refresh before generating another code.",
        );
      throw e;
    }
    return { expectedOtp: otp, expiresAt: now + 86400000 };
  }
  if (path.endsWith("/rating")) {
    const b = c.body(event),
      r = await c.get("REQUEST", c.text(b.requestId, "requestId"));
    c.check(
      r && r.ownerId === user.sub,
      "Request not owned by this account",
      403,
    );
    c.check(
      r.status === "DELIVERED_VERIFIED",
      "Rate a completed delivery",
      409,
    );
    const rating = c.number(b.rating, 1, 5, "rating");
    c.check(Number.isInteger(rating), "Rating must be an integer");
    await c.db.send(
      new c.UpdateCommand({
        TableName: c.env("TABLE_NAME"),
        Key: c.key("REQUEST", r.id),
        UpdateExpression: "SET rating=:r",
        ExpressionAttributeValues: { ":r": rating },
      }),
    );
    return { success: true };
  }
  if (path.endsWith("/snapshot")) {
    const all = user.groups.includes("Dispatcher");
    const auditor = user.groups.includes("Auditor");
    const driver = user.groups.includes("Driver");
    const [fleet, wards, depots, anomalies] = await Promise.all([
      all || driver ? c.query("TANKER") : [],
      c.query("WARD"),
      all || driver ? c.query("DEPOT") : [],
      all || auditor ? c.query("ANOMALY") : [],
    ]);
    const own =
      !all && !driver && !auditor ? await c.ownerRequests(user.sub) : null;
    const requests = all
      ? await c.query("REQUEST")
      : driver
        ? await c.routeRequests(fleet.filter((t) => t.driverId === user.sub))
        : own?.items || [];
    return {
      requestHistoryLimited: own?.hasMore || false,
      requests: requests
        .filter(
          (r) =>
            all || r.ownerId === user.sub || r.assignedDriverId === user.sub,
        )
        .map(c.publicRequest),
      fleet: fleet.filter((t) => all || t.driverId === user.sub),
      wards: wards.map((w) => ({
        ...w,
        activeRequestsCount: all
          ? requests.filter(
              (r) => r.wardId === w.id && r.status !== "DELIVERED_VERIFIED",
            ).length
          : undefined,
      })),
      depots,
      anomalies: all || user.groups.includes("Auditor") ? anomalies : [],
    };
  }
  c.check(method === "POST", "Unsupported method", 405);
  const b = c.body(event);
  const ward = await c.get("WARD", c.text(b.wardId, "wardId"));
  c.check(ward, "Ward is not registered", 404);
  if (process.env.DATA_NAMESPACE) c.check(ward.provenance?.verifiedAt && ward.servicePoint?.address, "This service area has not been verified for dispatch", 409);
  const householdCount = c.number(
    b.householdCount,
    1,
    50,
    "household count (maximum 50 per request)",
  );
  c.check(
    Number.isInteger(householdCount),
    "Household count must be an integer",
  );
  const idempotency = c.text(b.idempotencyKey, "idempotency key", 100);
  const id = "REQ-" + c.hash((process.env.DATA_NAMESPACE ? process.env.DATA_NAMESPACE + ":" : "") + user.sub + ":" + idempotency).slice(0, 28),
    now = new Date().toISOString();
  const existing = await c.get("REQUEST", id);
  if (existing)
    return {
      request: c.publicRequest(existing),
      message:
        "Request already accepted; your OTP was displayed on initial submission.",
    };
  const otp = c.crypto.randomInt(100000, 1000000).toString();
  const item = {
    ...c.key("REQUEST", id),
    GSI1PK: "REQUEST",
    GSI1SK: now,
    id,
    requestId: id,
    ownerId: user.sub,
    wardId: ward.id,
    wardName: ward.name,
    citizenName: c.text(b.citizenName, "name", 100),
    phone: c.text(b.phone, "phone", 30),
    complaintText: c.text(b.complaintText, "complaint", 4000),
    householdCount,
    daysWithoutWater: c.number(b.daysWithoutWater, 0, 60, "dry days"),
    vulnerableCount: c.number(
      b.vulnerableCount,
      0,
      1000,
      "vulnerable residents",
    ),
    coordinates: c.coords(ward.servicePoint?.coordinates || ward.coordinates),
    deliveryAddress: ward.servicePoint?.address,
    demandLiters: householdCount * 200,
    otpHash: c.hash(id + ":" + otp),
    otpExpiresAt: Date.now() + 86400000,
    otpAttempts: 0,
    status: "PENDING_TRIAGE",
    urgencyScore: 0,
    priorityTier: "STANDARD_BATCH",
    createdAt: now,
  };
  try {
    await c.rateLimit(user.sub, "create-request", 60000);
    await c.put(item);
  } catch (e) {
    if (e.name === "ConditionalCheckFailedException")
      return { request: c.publicRequest(await c.get("REQUEST", id)) };
    throw e;
  }
  // DynamoDB Streams forwards this durable write to SQS; no dual-write loss window.
  return { request: { ...c.publicRequest(item), expectedOtp: otp } };
});
exports.handler = async (event) => {
  if (event.Records?.[0]?.eventSource === "aws:dynamodb") {
    const { unmarshall } = require("@aws-sdk/util-dynamodb");
    for (const record of event.Records) {
      if (!record.dynamodb.NewImage) continue;
      const item = unmarshall(record.dynamodb.NewImage);
      if (item.PK?.startsWith(c.partition("SIMULATION") + "#")) {
        if (record.eventName === "INSERT" && item.status === "QUEUED") await require("../../shared/pilot").generate(item);
        continue;
      }
      if (item.GSI1PK !== c.partition("REQUEST")) continue;
      if (item.status === "DELIVERED_VERIFIED" && item.taskToken) {
        try {
          await sfn.send(
            new SendTaskSuccessCommand({
              taskToken: item.taskToken,
              output: JSON.stringify({
                requestId: item.id,
                verified: true,
                auditHash: item.proofHash,
              }),
            }),
          );
        } catch (e) {
          if (
            !["TaskTimedOut", "TaskDoesNotExist", "InvalidToken"].includes(
              e.name,
            )
          )
            throw e;
        }
      }
      if (record.eventName === "INSERT")
        await sqs.send(
          new SendMessageCommand({
            QueueUrl: c.env("SURGE_QUEUE_URL"),
            MessageGroupId: item.wardId,
            MessageDeduplicationId: item.id,
            MessageBody: JSON.stringify({ requestId: item.id }),
          }),
        );
    }
    return {};
  }
  if (event.Records?.[0]?.eventSource === "aws:sqs") {
    const batchItemFailures = [];
    let failed = false;
    for (const record of event.Records) {
      if (failed) {
        batchItemFailures.push({ itemIdentifier: record.messageId });
        continue;
      }
      try {
        const { requestId } = JSON.parse(record.body);
        await sfn.send(
          new StartExecutionCommand({
            stateMachineArn: c.env("STATE_MACHINE_ARN"),
            name: requestId,
            input: JSON.stringify({ requestId }),
          }),
        );
      } catch (e) {
        if (e.name !== "ExecutionAlreadyExists") {
          failed = true;
          batchItemFailures.push({ itemIdentifier: record.messageId });
        }
      }
    }
    return { batchItemFailures };
  }
  return handleHttp(event);
};
