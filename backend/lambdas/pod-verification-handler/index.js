const c = require("../../shared/core");
const { evidenceHash, matchesEvidence } = require("../../shared/audit");
const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { SFNClient, SendTaskSuccessCommand } = require("@aws-sdk/client-sfn");
const s3 = new S3Client({ maxAttempts: 3 }),
  sfn = new SFNClient({ maxAttempts: 3 });
async function resume(r) {
  if (!r.taskToken) return;
  try {
    await sfn.send(
      new SendTaskSuccessCommand({
        taskToken: r.taskToken,
        output: JSON.stringify({
          requestId: r.id,
          verified: true,
          auditHash: r.proofHash,
        }),
      }),
    );
  } catch (e) {
    if (!["TaskTimedOut", "TaskDoesNotExist", "InvalidToken"].includes(e.name))
      throw e;
  }
}
exports.handler = async (event) => {
  if (event.taskToken) {
    const r = await c.get("REQUEST", event.requestId);
    c.check(r, "Request not found", 404);
    await c.db.send(
      new c.UpdateCommand({
        TableName: c.env("TABLE_NAME"),
        Key: c.key("REQUEST", r.id),
        UpdateExpression: "SET taskToken=:token",
        ExpressionAttributeValues: { ":token": event.taskToken },
      }),
    );
    const fresh = await c.get("REQUEST", r.id);
    if (fresh.status === "DELIVERED_VERIFIED") await resume(fresh);
    return { waiting: true };
  }
  return c.http(async (e) => {
    if (e.rawPath?.endsWith("/evidence")) {
      await c.authorize(e, "ReadEvidence");
      const id = c.text(e.queryStringParameters?.requestId, "requestId");
      const audit = await c.get("AUDIT", id);
      c.check(audit?.photoKey, "No evidence is available for this delivery", 404);
      const object = await s3.send(new GetObjectCommand({ Bucket: c.env("POD_BUCKET_NAME"), Key: audit.photoKey, ...(audit.photoVersionId ? {VersionId:audit.photoVersionId} : {}) }));
      c.check(object.ContentLength <= 2000000, "Evidence exceeds the viewing limit", 413);
      const photo = Buffer.from(await object.Body.transformToByteArray());
      let photoValid = true;
      try { require("../../shared/evidence").normalizePhoto(photo.toString("base64")); } catch { photoValid = false; }
      const evidence = { requestId: audit.requestId, wardId: audit.wardId, tankerId: audit.tankerId, litersDelivered: audit.litersDelivered, deliveredAt: audit.deliveredAt, driverGps: audit.driverGps, photoHash: audit.photoHash };
      return { evidence, auditHash: audit.auditHash, integrityVerified: c.hash(photo) === audit.photoHash && matchesEvidence(evidence, audit.auditHash, audit.hashVersion), photoValid, ...(photoValid ? { photoBase64: photo.toString("base64") } : { photoError: "Stored photo is invalid or below the minimum dimensions. A matching hash does not make it valid delivery evidence." }) };
    }
    const user = await c.authorize(e, "SubmitProofOfDelivery"),
      b = c.body(e);
    const r = await c.get("REQUEST", c.text(b.requestId, "requestId"));
    c.check(r, "Request not found", 404);
    c.check(
      r.assignedDriverId === user.sub,
      "Delivery is not assigned to this driver",
      403,
    );
    if (r.status === "DELIVERED_VERIFIED") {
      await resume(r);
      return {
        success: true,
        message: "Delivery already verified",
        auditHash: r.proofHash,
      };
    }
    c.check(
      ["DISPATCHED", "ARRIVED_AT_STOP"].includes(r.status),
      "Request is not dispatched",
      409,
    );
    c.check(
      r.otpExpiresAt > Date.now(),
      "OTP expired; contact dispatcher",
      409,
    );
    c.check(
      (r.otpAttempts || 0) < 5,
      "OTP locked after repeated attempts",
      429,
    );
    const otp = c.text(b.driverOtpInput, "OTP", 6);
    c.check(/^\d{6}$/.test(otp), "Enter six digits");
    if (
      !c.crypto.timingSafeEqual(
        Buffer.from(c.hash(r.id + ":" + otp), "hex"),
        Buffer.from(r.otpHash, "hex"),
      )
    ) {
      await c.db.send(
        new c.UpdateCommand({
          TableName: c.env("TABLE_NAME"),
          Key: c.key("REQUEST", r.id),
          UpdateExpression: "ADD otpAttempts :one",
          ConditionExpression: "otpHash=:hash AND otpAttempts < :max",
          ExpressionAttributeValues: {
            ":one": 1,
            ":hash": r.otpHash,
            ":max": 5,
          },
        }),
      );
      await c.emit("UnverifiedResidentClaim", {
        requestId: r.id,
        tankerId: r.assignedTankerId,
        wardName: r.wardName,
        incidentType: "GHOST_TRIP_UNVERIFIED",
        message: "Resident OTP mismatch",
      });
      throw new c.HttpError(400, "Resident OTP mismatch");
    }
    const gps = c.coords(b.driverGps);
    c.number(b.accuracyMeters, 0, 100, "GPS accuracy");
    c.check(c.distance(gps, r.coordinates) <= 200, "Outside delivery geofence");
    const liters = c.number(
      b.litersDelivered,
      1,
      r.demandLiters,
      "delivered liters",
    );
    const tanker = await c.get("TANKER", r.assignedTankerId);
    c.check(
      tanker && liters <= tanker.currentWaterLevelLiters,
      "Insufficient recorded tanker capacity",
      409,
    );
    c.check(
      tanker.assignedRoute?.[0]?.requestId === r.id,
      "Complete the current route stop first",
      409,
    );
    const remainingStops = tanker.assignedRoute.slice(1);
    const photo = require("../../shared/evidence").normalizePhoto(
      b.photoProofBase64,
    );
    const deliveredAt = new Date().toISOString(),
      photoHash = c.hash(photo),
      photoKey = `evidence/${r.id}/${photoHash}.jpg`;
    const evidence = {
      requestId: r.id,
      wardId: r.wardId,
      tankerId: tanker.id,
      litersDelivered: liters,
      deliveredAt,
      driverGps: { lat: gps.lat, lng: gps.lng },
      photoHash,
    };
    const auditHash = evidenceHash(evidence);
    const uploaded = await s3.send(
      new PutObjectCommand({
        Bucket: c.env("POD_BUCKET_NAME"),
        Key: photoKey,
        Body: photo,
        ContentType: "image/jpeg",
        ServerSideEncryption: "AES256",
        ChecksumSHA256: c.crypto
          .createHash("sha256")
          .update(photo)
          .digest("base64"),
        Metadata: { requestid: r.id, photohash: photoHash },
      }),
    );
    try {
      await c.db.send(
        new c.TransactWriteCommand({
          TransactItems: [
            {
              Update: {
                TableName: c.env("TABLE_NAME"),
                Key: c.key("REQUEST", r.id),
                UpdateExpression:
                  "SET #s=:done, proofHash=:hash, photoKey=:photo, photoVersionId=:version, litersDelivered=:liters, deliveredAt=:at",
                ConditionExpression:
                  "#s IN (:dispatched,:arrived) AND otpAttempts < :max AND otpHash=:otpHash AND otpExpiresAt > :now",
                ExpressionAttributeNames: { "#s": "status" },
                ExpressionAttributeValues: {
                  ":done": "DELIVERED_VERIFIED",
                  ":hash": auditHash,
                  ":photo": photoKey,
                  ":version": uploaded.VersionId || "unversioned",
                  ":liters": liters,
                  ":at": deliveredAt,
                  ":dispatched": "DISPATCHED",
                  ":arrived": "ARRIVED_AT_STOP",
                  ":max": 5,
                  ":otpHash": r.otpHash,
                  ":now": Date.now(),
                },
              },
            },
            {
              Update: {
                TableName: c.env("TABLE_NAME"),
                Key: c.key("TANKER", tanker.id),
                UpdateExpression:
                  "SET #s=:idle, assignedRoute=:empty ADD currentWaterLevelLiters :minus",
                ConditionExpression:
                  "currentWaterLevelLiters >= :liters AND assignedRoute[0].requestId = :request",
                ExpressionAttributeNames: { "#s": "status" },
                ExpressionAttributeValues: {
                  ":idle": remainingStops.length ? "EN_ROUTE" : "IDLE",
                  ":empty": remainingStops,
                  ":minus": -liters,
                  ":liters": liters,
                  ":request": r.id,
                },
              },
            },
            {
              Update: {
                TableName: c.env("TABLE_NAME"),
                Key: c.key("WARD", r.wardId),
                UpdateExpression: "ADD deliveredLitersToday :liters",
                ExpressionAttributeValues: { ":liters": liters },
              },
            },
            {
              Put: {
                TableName: c.env("TABLE_NAME"),
                Item: {
                  ...c.key("AUDIT", r.id),
                  GSI1PK: c.partition("AUDIT"),
                  GSI1SK: deliveredAt,
                  ...evidence,
                  auditHash,
                  hashVersion: "sorted-json-v1",
                  photoKey,
                  photoVersionId: uploaded.VersionId,
                },
                ConditionExpression: "attribute_not_exists(PK)",
              },
            },
          ],
        }),
      );
    } catch (err) {
      if (err.name === "TransactionCanceledException")
        throw new c.HttpError(409, "Delivery changed; refresh before retrying");
      throw err;
    }
    await resume({ ...r, proofHash: auditHash });
    return {
      success: true,
      message: "Delivery verified and recorded",
      auditHash,
    };
  })(event);
};
