import { Tanker, FraudAnomaly, OptimizationMetrics } from "../types";

export const INITIAL_FLEET: Tanker[] = [
  {
    id: "DL-01-TK-101",
    vehicleNumber: "DL 1GB 4920",
    driverName: "Rameshwar Yadav",
    driverPhone: "+91 98110 55441",
    status: "EN_ROUTE",
    capacityLiters: 10000,
    currentWaterLevelLiters: 7500,
    currentCoordinates: { lat: 28.514, lng: 77.218 }, // en route to Sangam Vihar
    assignedDepotId: "DEPOT-02",
    depotName: "Mehrauli Emergency Booster Depot",
    speedKmph: 28.4,
    currentWaypointIndex: 0,
    assignedRoute: [
      {
        stopIndex: 1,
        requestId: "REQ-101",
        wardName: "Sangam Vihar Block L-2",
        coordinates: { lat: 28.5035, lng: 77.243 },
        demandLiters: 4000,
        etaMinutes: 12,
        urgencyTier: "CRITICAL_EMERGENCY",
        isCompleted: false,
        residentOtp: "482910",
      },
      {
        stopIndex: 2,
        requestId: "REQ-103",
        wardName: "Mehrauli Ward 07 Slum Pocket",
        coordinates: { lat: 28.5295, lng: 77.181 },
        demandLiters: 3500,
        etaMinutes: 38,
        urgencyTier: "CRITICAL_EMERGENCY",
        isCompleted: false,
        residentOtp: "519283",
      },
    ],
  },
  {
    id: "DL-02-TK-204",
    vehicleNumber: "DL 2CA 8831",
    driverName: "Satish Kumar",
    driverPhone: "+91 98731 22991",
    status: "DISPENSING",
    capacityLiters: 12000,
    currentWaterLevelLiters: 9000,
    currentCoordinates: { lat: 28.673, lng: 77.275 }, // at Seelampur stop
    assignedDepotId: "DEPOT-01",
    depotName: "Wazirabad Water Works Booster Station",
    speedKmph: 0.0,
    currentWaypointIndex: 0,
    lastDwellSeconds: 420,
    assignedRoute: [
      {
        stopIndex: 1,
        requestId: "REQ-102",
        wardName: "Seelampur Gali No. 4",
        coordinates: { lat: 28.673, lng: 77.275 },
        demandLiters: 5000,
        etaMinutes: 0,
        urgencyTier: "CRITICAL_EMERGENCY",
        isCompleted: false,
        residentOtp: "739104",
      },
    ],
  },
  {
    id: "DL-03-TK-308",
    vehicleNumber: "DL 3SZ 1928",
    driverName: "Vikram Chautala",
    driverPhone: "+91 99102 44102",
    status: "ANOMALY_FLAGGED",
    capacityLiters: 9000,
    currentWaterLevelLiters: 1000,
    currentCoordinates: { lat: 28.5845, lng: 77.062 }, // off-route near commercial hotel zone
    assignedDepotId: "DEPOT-03",
    depotName: "Dwarka Sector 6 Water Distribution Center",
    speedKmph: 0.0,
    currentWaypointIndex: 0,
    anomalyWarning:
      "GHOST_TRIP_DETECTED: Tanker emptied 8,000L in 90 seconds without resident OTP verification",
    lastDwellSeconds: 90,
    assignedRoute: [
      {
        stopIndex: 1,
        requestId: "REQ-104",
        wardName: "Dwarka Sector 8 JJ Colony",
        coordinates: { lat: 28.581, lng: 77.0745 },
        demandLiters: 4500,
        etaMinutes: 0,
        urgencyTier: "HIGH_PRIORITY",
        isCompleted: false,
        residentOtp: "620194",
      },
    ],
  },
  {
    id: "DL-04-TK-412",
    vehicleNumber: "DL 4ET 6619",
    driverName: "Jagdish Meena",
    driverPhone: "+91 98188 90123",
    status: "FILLING",
    capacityLiters: 10000,
    currentWaterLevelLiters: 10000,
    currentCoordinates: { lat: 28.653, lng: 77.1915 }, // at Karol Bagh Depot
    assignedDepotId: "DEPOT-04",
    depotName: "Karol Bagh Zonal Command Station",
    speedKmph: 0.0,
    currentWaypointIndex: 0,
    assignedRoute: [],
  },
];

export const INITIAL_ANOMALIES: FraudAnomaly[] = [
  {
    id: "ALR-8801",
    alertCode: "FRAUD-GHOST-TRIP",
    tankerId: "DL-03-TK-308",
    wardName: "Dwarka Sector 8 / Commercial Cluster",
    timestamp: "2026-10-09T09:12:00.000Z",
    severity: "CRITICAL",
    incidentType: "GHOST_TRIP_UNVERIFIED",
    message:
      "Tanker water volume dropped from 9,000L to 1,000L with ZERO resident OTP inputs. Unscheduled commercial diversion suspected.",
    dwellTimeSeconds: 90,
    status: "ACTIVE_ALARM",
    recommendedAction:
      "Freeze driver digital credentials, lock municipal fuel allowance, and dispatch zonal vigilance officer.",
  },
  {
    id: "ALR-8802",
    alertCode: "TELEMETRY-SHORT-POUR",
    tankerId: "DL-02-TK-204",
    wardName: "Wazirabad Bypass Transit",
    timestamp: "2026-10-09T07:45:00.000Z",
    severity: "MEDIUM",
    incidentType: "SHORT_POUR_DURATION",
    message:
      "Rapid valve pressure spike detected during transit. Resolved as sensor calibration check.",
    dwellTimeSeconds: 45,
    status: "RESOLVED",
    recommendedAction: "Sensor verified; regular delivery continued.",
  },
];

export const INITIAL_OPTIMIZATION_METRICS: OptimizationMetrics = {
  baseline: {
    totalKmPlanned: 342.6,
    avgWaitTimeHours: 5.8,
    fuelEstimatedInr: 14200,
    slaCompliancePercent: 58.4,
    unservedUrgentRequests: 4,
  },
  optimized: {
    totalKmPlanned: 184.2,
    avgWaitTimeHours: 1.8,
    fuelEstimatedInr: 7850,
    slaCompliancePercent: 96.2,
    unservedUrgentRequests: 0,
    kmSavedPercent: 46.2,
    carbonReductionKg: 198.5,
  },
  heroDifference: {
    kmSaved: 158.4,
    waitTimeReductionHours: 4.0,
    fuelSavingsInr: 6350,
    slaBoostPercent: 37.8,
  },
};
