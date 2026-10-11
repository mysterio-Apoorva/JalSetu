const c = require("../../shared/core");
exports.handler = async (event) => {
  const detail = event.detail || event;
  const id = "ALR-" + c.hash(event.id || JSON.stringify(detail)).slice(0, 24);
  const now = new Date().toISOString();
  c.check(detail.tankerId, "Anomaly tankerId is required");
  const alert = {
    ...c.key("ANOMALY", id),
    GSI1PK: "ANOMALY",
    GSI1SK: now,
    id,
    tankerId: detail.tankerId,
    wardName: detail.wardName || "Unknown",
    timestamp: now,
    severity: "HIGH",
    status: "ACTIVE_ALARM",
    incidentType: detail.incidentType || "ROUTE_DIVERGENCE",
    alertCode: event["detail-type"] || "DELIVERY_ANOMALY",
    message: detail.message || "Delivery requires investigation",
    dwellTimeSeconds: detail.dwellTimeSeconds || 0,
    recommendedAction: "Review telemetry and evidence before taking action.",
  };
  try {
    await c.put(alert);
  } catch (e) {
    if (e.name !== "ConditionalCheckFailedException") throw e;
  }
  return { anomalyLogged: true, id };
};
