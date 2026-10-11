const c = require("../../shared/core");
const {
  LocationClient,
  BatchUpdateDevicePositionCommand,
  BatchEvaluateGeofencesCommand,
} = require("@aws-sdk/client-location");
const location = new LocationClient({ maxAttempts: 3 });
exports.handler = c.http(async (event) => {
  const user = await c.authorize(event, "TransmitGpsTelemetry"),
    b = c.body(event);
  const t = await c.get("TANKER", c.text(b.tankerId, "tankerId"));
  c.check(
    t && t.driverId === user.sub,
    "Tanker is not assigned to this driver",
    403,
  );
  const p = c.coords(b.coordinates);
  const speed = c.number(b.speedKmph, 0, 160, "speed");
  // Browser GPS cannot attest to physical valve or flow-meter readings.
  c.check(
    b.waterLevelLiters === undefined && b.valveStatus === undefined,
    "Sensor readings require a trusted device integration; this endpoint accepts GPS only",
  );
  const now = new Date();
  const sampledAt = b.sampledAt ? new Date(b.sampledAt) : now;
  c.check(
    Number.isFinite(sampledAt.getTime()) &&
      Math.abs(now.getTime() - sampledAt.getTime()) <= 60000,
    "GPS sample must be less than one minute old",
  );
  c.check(
    !t.telemetryAt || sampledAt.getTime() > Date.parse(t.telemetryAt),
    "Stale GPS sample",
    409,
  );
  const update = {
    DeviceId: t.id,
    Position: [p.lng, p.lat],
    SampleTime: sampledAt,
    Accuracy: {
      Horizontal: c.number(b.accuracyMeters, 0, 200, "GPS accuracy"),
    },
  };
  const tracked = await location.send(
    new BatchUpdateDevicePositionCommand({
      TrackerName: c.env("TRACKER_NAME"),
      Updates: [update],
    }),
  );
  c.check(!tracked.Errors?.length, "Location tracker rejected telemetry", 502);
  const evaluated = await location.send(
    new BatchEvaluateGeofencesCommand({
      CollectionName: c.env("GEOFENCE_COLLECTION_NAME"),
      DevicePositionUpdates: [update],
    }),
  );
  c.check(!evaluated.Errors?.length, "Geofence evaluation failed", 502);
  const target = t.assignedRoute?.[0];
  const meters = target ? c.distance(p, target.coordinates) : null;
  await c.db.send(
    new c.UpdateCommand({
      TableName: c.env("TABLE_NAME"),
      Key: c.key("TANKER", t.id),
      UpdateExpression:
        "SET currentCoordinates=:p, speedKmph=:s, telemetryAt=:time, telemetrySource=:source",
      ConditionExpression:
        "driverId=:driver AND (attribute_not_exists(telemetryAt) OR telemetryAt < :time)",
      ExpressionAttributeValues: {
        ":p": p,
        ":s": speed,
        ":time": sampledAt.toISOString(),
        ":source": "DRIVER_BROWSER_GPS",
        ":driver": user.sub,
      },
    }),
  );
  if (
    target &&
    meters > 200 &&
    c.distance(t.currentCoordinates, target.coordinates) <= 200
  ) {
    const request = await c.get("REQUEST", target.requestId);
    if (request && request.status !== "DELIVERED_VERIFIED")
      await c.emit(
        "GeofenceExitWithoutPoD",
        {
          tankerId: t.id,
          wardName: target.wardName,
          incidentType: "GHOST_TRIP_UNVERIFIED",
          message: "Vehicle left the assigned stop without a verified delivery",
        },
        "jalsetu.telemetry",
      );
  }
  return {
    accepted: true,
    distanceMeters: meters,
    insideDeliveryZone: meters !== null && meters <= 200,
  };
});
