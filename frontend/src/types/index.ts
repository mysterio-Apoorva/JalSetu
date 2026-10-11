export type StakeholderRole =
  | "LANDING"
  | "DISPATCHER"
  | "CITIZEN"
  | "DRIVER"
  | "PUBLIC_BOARD"
  | "AWS_ARCHITECTURE"
  | "HEATMAP";

export type RequestStatus =
  | "PENDING_TRIAGE"
  | "SCHEDULED"
  | "DISPATCHED"
  | "ARRIVED_AT_STOP"
  | "DELIVERED_VERIFIED"
  | "GHOST_FLAGGED";

export type PriorityTier =
  "CRITICAL_EMERGENCY" | "HIGH_PRIORITY" | "STANDARD_BATCH";

export type TankerStatus =
  "IDLE" | "FILLING" | "EN_ROUTE" | "DISPENSING" | "ANOMALY_FLAGGED";

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Ward {
  servicePoint?: { address: string; coordinates: Coordinates };
  provenance?: { source: string; verifiedAt: string; verifiedBy: string };
  id: string;
  name: string;
  zone: string;
  population: number;
  groundwaterDepletionScore: number; // 0 - 100
  avgWaitHours: number;
  deficitSeverity: "CRITICAL" | "HIGH" | "MODERATE" | "LOW";
  coordinates: Coordinates;
  activeRequestsCount: number;
  deliveredLitersToday: number;
  giniIndex: number;
}

export interface Depot {
  id: string;
  name: string;
  zone: string;
  capacityLiters: number;
  activeTankersCount: number;
  coordinates: Coordinates;
}

export interface Waypoint {
  stopIndex: number;
  requestId: string;
  wardName: string;
  coordinates: Coordinates;
  demandLiters: number;
  etaMinutes: number;
  urgencyTier: PriorityTier;
  isCompleted: boolean;
  residentOtp: string;
}

export interface Tanker {
  telemetryAt?: string;
  telemetrySource?: string;
  id: string;
  vehicleNumber: string;
  driverName: string;
  driverPhone: string;
  status: TankerStatus;
  capacityLiters: number;
  currentWaterLevelLiters: number;
  currentCoordinates: Coordinates;
  assignedDepotId: string;
  depotName: string;
  assignedRoute: Waypoint[];
  currentWaypointIndex: number;
  speedKmph: number;
  anomalyWarning?: string;
  lastDwellSeconds?: number;
}

export interface WaterRequest {
  id: string;
  citizenName: string;
  phone: string;
  wardId: string;
  wardName: string;
  householdCount: number;
  daysWithoutWater: number;
  vulnerableCount: number; // elderly, children, clinic
  complaintText: string;
  voiceTranscript?: string;
  urgencyScore: number; // 0 - 100
  priorityTier: PriorityTier;
  status: RequestStatus;
  coordinates: Coordinates;
  assignedTankerId?: string;
  expectedOtp: string;
  createdAt: string;
  deliveredAt?: string;
  litersDelivered?: number;
  proofHash?: string;
  photoUrl?: string;
  rating?: number;
}

export interface FraudAnomaly {
  id: string;
  alertCode: string;
  tankerId: string;
  wardName: string;
  timestamp: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  incidentType:
    | "GHOST_TRIP_UNVERIFIED"
    | "SHORT_POUR_DURATION"
    | "ROUTE_DIVERGENCE"
    | "VALVE_TAMPER";
  message: string;
  dwellTimeSeconds: number;
  status: "ACTIVE_ALARM" | "INVESTIGATING" | "RESOLVED";
  recommendedAction: string;
  resolutionReason?: string;
  resolvedAt?: string;
}

export interface OptimizationMetrics {
  baseline: {
    totalKmPlanned: number;
    avgWaitTimeHours: number;
    fuelEstimatedInr: number;
    slaCompliancePercent: number;
    unservedUrgentRequests: number;
  };
  optimized: {
    totalKmPlanned: number;
    avgWaitTimeHours: number;
    fuelEstimatedInr: number;
    slaCompliancePercent: number;
    unservedUrgentRequests: number;
    kmSavedPercent: number;
    carbonReductionKg: number;
  };
  heroDifference: {
    kmSaved: number;
    waitTimeReductionHours: number;
    fuelSavingsInr: number;
    slaBoostPercent: number;
  };
}
