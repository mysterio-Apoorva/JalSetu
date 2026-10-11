"use strict";
const crypto = require("node:crypto");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  QueryCommand,
  TransactWriteCommand,
  BatchGetCommand,
} = require("@aws-sdk/lib-dynamodb");
const {
  EventBridgeClient,
  PutEventsCommand,
} = require("@aws-sdk/client-eventbridge");
const {
  VerifiedPermissionsClient,
  IsAuthorizedCommand,
} = require("@aws-sdk/client-verifiedpermissions");
const options = { maxAttempts: 3 };
const db = DynamoDBDocumentClient.from(new DynamoDBClient(options), {
  marshallOptions: { removeUndefinedValues: true },
});
const events = new EventBridgeClient(options),
  permissions = new VerifiedPermissionsClient(options);
const env = (name) => {
  const value = process.env[name];
  if (!value || value.includes("REPLACE"))
    throw new Error(`Missing configuration: ${name}`);
  return value;
};
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const check = (condition, message, status = 400) => {
  if (!condition) throw new HttpError(status, message);
};
const number = (value, min, max, name) => {
  check(
    typeof value === "number" &&
      Number.isFinite(value) &&
      value >= min &&
      value <= max,
    `Invalid ${name}`,
  );
  return value;
};
const text = (value, name, max = 200) => {
  check(
    typeof value === "string" && value.trim().length > 0 && value.length <= max,
    `Invalid ${name}`,
  );
  return value.trim();
};
const coords = (point) => {
  check(point && typeof point === "object", "GPS coordinates required");
  number(point.lat, -90, 90, "latitude");
  number(point.lng, -180, 180, "longitude");
  return point;
};
const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");
const distance = (a, b) => {
  coords(a);
  coords(b);
  const r = (x) => (x * Math.PI) / 180;
  const x =
    Math.sin(r(b.lat - a.lat) / 2) ** 2 +
    Math.cos(r(a.lat)) *
      Math.cos(r(b.lat)) *
      Math.sin(r(b.lng - a.lng) / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(Math.max(0, 1 - x)));
};
const partition = (type) => process.env.DATA_NAMESPACE ? `${process.env.DATA_NAMESPACE}#${type}` : type;
const key = (type, id) => ({ PK: `${partition(type)}#${id}`, SK: "META" });
const get = async (type, id) =>
  (
    await db.send(
      new GetCommand({
        TableName: env("TABLE_NAME"),
        Key: key(type, id),
        ConsistentRead: true,
      }),
    )
  ).Item;
const put = (item) =>
  db.send(
    new PutCommand({
      TableName: env("TABLE_NAME"),
      Item: { ...item, ...(item.GSI1PK ? { GSI1PK: partition(item.GSI1PK) } : {}) },
      ConditionExpression: "attribute_not_exists(PK)",
    }),
  );
async function query(pk) {
  const items = [];
  let cursor;
  do {
    const page = await db.send(
      new QueryCommand({
        TableName: env("TABLE_NAME"),
        IndexName: "GSI1",
        KeyConditionExpression: "GSI1PK = :pk",
        ExpressionAttributeValues: { ":pk": partition(pk) },
        ExclusiveStartKey: cursor,
      }),
    );
    items.push(...(page.Items || []));
    cursor = page.LastEvaluatedKey;
  } while (cursor);
  return items;
}
async function ownerRequests(ownerId) {
  const result = await db.send(
    new QueryCommand({
      TableName: env("TABLE_NAME"),
      IndexName: "OwnerRequests",
      KeyConditionExpression: "ownerId = :owner",
      ExpressionAttributeValues: { ":owner": ownerId },
      ScanIndexForward: false,
      Limit: 100,
    }),
  );
  return { items: (result.Items || []).filter(item => item.PK?.startsWith(`${partition("REQUEST")}#`)), hasMore: !!result.LastEvaluatedKey };
}
async function routeRequests(fleet) {
  const ids = [
    ...new Set(
      fleet.flatMap((t) => (t.assignedRoute || []).map((s) => s.requestId)),
    ),
  ];
  const items = [];
  for (let offset = 0; offset < ids.length; offset += 100) {
    let pending = {
      [env("TABLE_NAME")]: {
        Keys: ids.slice(offset, offset + 100).map((id) => key("REQUEST", id)),
        ConsistentRead: true,
      },
    };
    for (
      let attempt = 0;
      Object.keys(pending).length && attempt < 4;
      attempt++
    ) {
      if (attempt)
        await new Promise((resolve) => setTimeout(resolve, 50 * 2 ** attempt));
      const result = await db.send(
        new BatchGetCommand({ RequestItems: pending }),
      );
      items.push(...(result.Responses?.[env("TABLE_NAME")] || []));
      pending = result.UnprocessedKeys || {};
    }
    check(
      !Object.keys(pending).length,
      "Request data temporarily unavailable",
      503,
    );
  }
  return items;
}
async function emit(type, detail, source = "jalsetu.pod") {
  const result = await events.send(
    new PutEventsCommand({
      Entries: [
        {
          EventBusName: env("EVENTS_BUS_NAME"),
          Source: source,
          DetailType: type,
          Detail: JSON.stringify(detail),
        },
      ],
    }),
  );
  if (result.FailedEntryCount) throw new Error("EventBridge rejected event");
}
function body(event) {
  try {
    check(
      !event.body ||
        typeof event.body !== "string" ||
        Buffer.byteLength(event.body) <= 3000000,
      "Request body exceeds 3 MB",
      413,
    );
    const raw = event.isBase64Encoded
      ? Buffer.from(event.body, "base64").toString()
      : event.body;
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw || {};
    check(
      parsed && typeof parsed === "object" && !Array.isArray(parsed),
      "JSON object required",
    );
    return parsed;
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new HttpError(400, "Malformed JSON body");
  }
}
const http = (fn) => async (event) => {
  try {
    const result = await fn(event);
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
      body: JSON.stringify(result),
    };
  } catch (e) {
    if (["ConditionalCheckFailedException", "TransactionCanceledException"].includes(e.name))
      e = new HttpError(409, "Record changed. Refresh and retry.");
    console.error(
      JSON.stringify({
        error: e.name,
        status: e.status || 500,
        requestId: event.requestContext?.requestId,
      }),
    );
    return {
      statusCode: e.status || 500,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
      body: JSON.stringify({
        error: e.status ? e.message : "Service unavailable. Please retry.",
      }),
    };
  }
};
async function rateLimit(subject, operation, intervalMs) {
  const now = Date.now();
  try {
    await db.send(
      new UpdateCommand({
        TableName: env("TABLE_NAME"),
        Key: key("LIMIT", subject + ":" + operation),
        UpdateExpression: "SET nextAllowedAt=:next",
        ConditionExpression:
          "attribute_not_exists(nextAllowedAt) OR nextAllowedAt <= :now",
        ExpressionAttributeValues: { ":next": now + intervalMs, ":now": now },
      }),
    );
  } catch (e) {
    if (e.name === "ConditionalCheckFailedException")
      throw new HttpError(
        429,
        "Please wait before submitting another operation.",
      );
    throw e;
  }
}
const rolePermissions = {
  Dispatcher: [
    "ReadOperations",
    "RunVrpOptimizer",
    "QueryCopilot",
    "ResolveAnomaly",
    "ReadEvidence",
    "RecordRefill",
  ],
  Citizen: ["ReadOperations", "SubmitWaterRequest", "SubmitQualityFeedback"],
  Driver: ["ReadOperations", "TransmitGpsTelemetry", "SubmitProofOfDelivery"],
  Auditor: ["ReadOperations", "ReadEvidence"],
};
async function authorize(event, action, resourceId = "network") {
  const claims = event.requestContext?.authorizer?.jwt?.claims;
  check(claims?.sub, "Authentication required", 401);
  check(!(process.env.BLOCKED_SUBJECTS || "").split(",").includes(claims.sub), "This account is not permitted to access operations", 403);
  check(!process.env.DATA_NAMESPACE || !String(claims.email || "").toLowerCase().endsWith("@jalsetu.local"), "Test accounts cannot access production operations", 403);
  let groups = claims["cognito:groups"] || claims.groups || "";
  if (typeof groups === "string") {
    try {
      groups = JSON.parse(groups);
    } catch {
      groups = groups
        .replace(/^\[|\]$/g, "")
        .split(",")
        .map((x) => x.trim());
    }
  }
  if (!Array.isArray(groups)) groups = [];
  const policyStoreId = process.env.POLICY_STORE_ID;
  if (policyStoreId && policyStoreId !== "local-cognito-rbac") {
    try {
      const principal = { entityType: "JalSetu::User", entityId: claims.sub };
      const parents = groups
        .filter((x) =>
          ["Dispatcher", "Driver", "Citizen", "Auditor"].includes(x),
        )
        .map((entityId) => ({ entityType: "JalSetu::Role", entityId }));
      const result = await permissions.send(
        new IsAuthorizedCommand({
          policyStoreId,
          principal,
          action: { actionType: "JalSetu::Action", actionId: action },
          resource: { entityType: "JalSetu::Resource", entityId: resourceId },
          entities: {
            entityList: [{ identifier: principal, attributes: {}, parents }],
          },
        }),
      );
      check(result.decision === "ALLOW", "Access denied", 403);
      return { sub: claims.sub, groups };
    } catch (err) {
      if (err instanceof HttpError) throw err;
      throw new HttpError(
        503,
        "Authorization service unavailable. Please retry.",
      );
    }
  }
  const isAllowed = groups.some((g) => rolePermissions[g]?.includes(action));
  check(isAllowed, "Access denied", 403);
  return { sub: claims.sub, groups };
}
function publicRequest(item) {
  const {
    otpHash,
    expectedOtp,
    taskToken,
    ownerId,
    PK,
    SK,
    GSI1PK,
    GSI1SK,
    ...safe
  } = item;
  return safe;
}
module.exports = {
  crypto,
  db,
  env,
  HttpError,
  check,
  number,
  text,
  coords,
  hash,
  distance,
  key,
  partition,
  get,
  put,
  query,
  ownerRequests,
  routeRequests,
  rateLimit,
  emit,
  body,
  http,
  authorize,
  publicRequest,
  GetCommand,
  PutCommand,
  UpdateCommand,
  TransactWriteCommand,
};
