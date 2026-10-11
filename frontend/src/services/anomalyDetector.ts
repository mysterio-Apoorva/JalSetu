import { FraudAnomaly } from "../types";

export function evaluateDeliveryAnomaly(
  tankerId: string,
  wardName: string,
  isOtpValid: boolean,
  dwellTimeSeconds: number,
  litersClaimed: number,
  distanceMeters: number,
): FraudAnomaly | null {
  const anomalies: string[] = [];

  if (!isOtpValid) {
    anomalies.push("Zero resident OTP confirmation matched");
  }

  if (distanceMeters > 200) {
    anomalies.push(
      `Driver location is ${distanceMeters}m outside assigned ward boundary`,
    );
  }

  if (litersClaimed > 4000 && dwellTimeSeconds < 120) {
    anomalies.push(
      `Rapid discharge anomaly: claimed ${litersClaimed}L in only ${dwellTimeSeconds}s (minimum physical time 480s)`,
    );
  }

  if (anomalies.length === 0) {
    return null;
  }

  return {
    id: `ALR-${Date.now().toString().slice(-4)}`,
    alertCode: !isOtpValid ? "FRAUD-GHOST-TRIP" : "TELEMETRY-SHORT-POUR",
    tankerId,
    wardName,
    timestamp: new Date().toISOString(),
    severity: !isOtpValid || distanceMeters > 300 ? "CRITICAL" : "HIGH",
    incidentType: !isOtpValid ? "GHOST_TRIP_UNVERIFIED" : "SHORT_POUR_DURATION",
    message: anomalies.join("; "),
    dwellTimeSeconds,
    status: "ACTIVE_ALARM",
    recommendedAction:
      "Lock driver dispatch authorization, halt fuel credit, and notify Zonal Vigilance Officer.",
  };
}
