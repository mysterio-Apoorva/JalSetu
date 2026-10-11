const c = require("../../shared/core");
const {
  LocationClient,
  CalculateRouteMatrixCommand,
} = require("@aws-sdk/client-location");
const location = new LocationClient({ maxAttempts: 3 });
async function optimize() {
  const pending = (await c.query("REQUEST"))
    .filter((r) => r.status === "SCHEDULED")
    .sort(
      (a, b) =>
        b.urgencyScore - a.urgencyScore ||
        a.createdAt.localeCompare(b.createdAt),
    )
    .slice(0, 50);
  const fleet = (await c.query("TANKER"))
    .filter(
      (t) => t.status === "IDLE" && t.driverId && t.currentWaterLevelLiters > 0,
    )
    .slice(0, 10);
  const assignments = [],
    plans = [],
    assigned = new Set();
  for (const tanker of fleet) {
    let remaining = tanker.currentWaterLevelLiters,
      position = tanker.currentCoordinates,
      duration = 0;
    const stops = [],
      selected = [],
      legs = [];
    while (stops.length < 10) {
      const candidates = pending
        .filter(
          (r) =>
            !assigned.has(r.id) &&
            !selected.some((x) => x.id === r.id) &&
            r.demandLiters <= remaining,
        )
        .slice(0, 10);
      if (!candidates.length) break;
      const matrix = await location.send(
        new CalculateRouteMatrixCommand({
          CalculatorName: c.env("ROUTE_CALCULATOR_NAME"),
          DeparturePositions: [[position.lng, position.lat]],
          DestinationPositions: candidates.map((r) => [
            r.coordinates.lng,
            r.coordinates.lat,
          ]),
          TravelMode: "Truck",
          DistanceUnit: "Kilometers",
        }),
      );
      const ranked = candidates
        .map((r, i) => ({ r, leg: matrix.RouteMatrix?.[0]?.[i] }))
        .filter(
          (x) =>
            x.leg &&
            !x.leg.Error &&
            Number.isFinite(x.leg.DurationSeconds) &&
            Number.isFinite(x.leg.Distance),
        )
        .sort(
          (a, b) =>
            Math.floor(b.r.urgencyScore / 20) -
              Math.floor(a.r.urgencyScore / 20) ||
            a.leg.DurationSeconds - b.leg.DurationSeconds,
        );
      if (!ranked.length) break;
      const { r, leg } = ranked[0];
      duration += leg.DurationSeconds;
      stops.push({
        stopIndex: stops.length + 1,
        requestId: r.id,
        wardName: r.wardName,
        coordinates: r.coordinates,
        demandLiters: r.demandLiters,
        etaMinutes: Math.ceil(duration / 60),
        urgencyTier: r.priorityTier,
        isCompleted: false,
      });
      selected.push(r);
      legs.push(leg);
      remaining -= r.demandLiters;
      position = r.coordinates;
      duration += 600;
    }
    if (!stops.length) continue;
    const TransactItems = selected.map((r, i) => ({
      Update: {
        TableName: c.env("TABLE_NAME"),
        Key: c.key("REQUEST", r.id),
        UpdateExpression:
          "SET #s=:dispatch, assignedTankerId=:t, assignedDriverId=:d, etaMinutes=:eta",
        ConditionExpression: "#s=:ready",
        ExpressionAttributeNames: { "#s": "status" },
        ExpressionAttributeValues: {
          ":dispatch": "DISPATCHED",
          ":t": tanker.id,
          ":d": tanker.driverId,
          ":eta": stops[i].etaMinutes,
          ":ready": "SCHEDULED",
        },
      },
    }));
    TransactItems.push({
      Update: {
        TableName: c.env("TABLE_NAME"),
        Key: c.key("TANKER", tanker.id),
        UpdateExpression: "SET #s=:route, assignedRoute=:stops",
        ConditionExpression:
          "#s=:idle AND currentWaterLevelLiters = :available",
        ExpressionAttributeNames: { "#s": "status" },
        ExpressionAttributeValues: {
          ":route": "EN_ROUTE",
          ":stops": stops,
          ":idle": "IDLE",
          ":available": tanker.currentWaterLevelLiters,
        },
      },
    });
    try {
      await c.db.send(new c.TransactWriteCommand({ TransactItems }));
      selected.forEach((r, i) => {
        assigned.add(r.id);
        assignments.push({
          requestId: r.id,
          tankerId: tanker.id,
          distanceKm: legs[i].Distance,
          etaMinutes: stops[i].etaMinutes,
        });
      });
      plans.push({
        tankerId: tanker.id,
        stops,
        scheduledLiters: tanker.currentWaterLevelLiters - remaining,
      });
    } catch (e) {
      if (e.name !== "TransactionCanceledException") throw e;
    }
  }
  return {
    algorithm: "capacity-constrained urgency-banded nearest-road heuristic",
    assignments,
    plans,
    unassigned: pending.length - assigned.size,
  };
}
exports.handler = async (event) =>
  event.requestContext
    ? c.http(async (e) => {
        await c.authorize(e, "RunVrpOptimizer");
        return optimize();
      })(event)
    : optimize();
