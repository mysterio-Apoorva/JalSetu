import { api, LIVE_MODE } from "./services/api";
import React, {
  useState,
  useEffect,
  useSyncExternalStore,
  useCallback,
} from "react";
import {
  StakeholderRole,
  Ward,
  Depot,
  Tanker,
  WaterRequest,
  FraudAnomaly,
  OptimizationMetrics,
} from "./types";
import { DELHI_WARDS, DELHI_DEPOTS } from "./data/delhiWards";
import { INITIAL_REQUESTS } from "./data/mockRequests";
import {
  INITIAL_FLEET,
  INITIAL_ANOMALIES,
  INITIAL_OPTIMIZATION_METRICS,
} from "./data/mockFleet";
import { Navbar } from "./components/layout/Navbar";
import { HeroMasthead } from "./components/layout/HeroMasthead";

import { HackathonTrackCards } from "./components/layout/HackathonTrackCards";
import { DispatcherDashboard } from "./components/dispatcher/DispatcherDashboard";
import { RefillForm } from "./components/dispatcher/RefillForm";
import { CitizenPortal } from "./components/citizen/CitizenPortal";
import { DriverPortal } from "./components/driver/DriverPortal";
import { PublicTransparencyBoard } from "./components/public/PublicTransparencyBoard";
import { LandingPage } from "./components/pages/LandingPage";
import { DedicatedMachinePage } from "./components/pages/DedicatedMachinePage";
import { DedicatedSkylinePage } from "./components/pages/DedicatedSkylinePage";

import { auth, rolePortals, signOut, type AuthSession } from "./services/auth";
import { AuthModal } from "./components/auth/AuthModal";

export const App: React.FC = () => {
  const session = useSyncExternalStore(auth.subscribe, auth.getSession);
  const notice = useSyncExternalStore(auth.subscribe, auth.getMessage);
  if (LIVE_MODE && !session && location.pathname === "/public")
    return (
      <main className="p-4">
        <a href="/" className="secondary-action inline-flex items-center mb-4">
          Staff / resident sign in
        </a>
        <PublicTransparencyBoard wards={[]} requests={[]} anomalies={[]} />
      </main>
    );
  if (LIVE_MODE && !session) return <AuthModal notice={notice} />;
  return (
    <Workspace
      key={session ? session.subject + session.roles.join(",") : "demo"}
      session={session}
      notice={notice}
    />
  );
};
const Workspace = ({
  session,
  notice,
}: {
  session: AuthSession | null;
  notice: string;
}) => {
  const [currentRole, setCurrentRole] = useState<StakeholderRole>(
    session ? rolePortals[session.roles[0]] : "DISPATCHER",
  );
  const [wards, setWards] = useState<Ward[]>(LIVE_MODE ? [] : DELHI_WARDS);
  const [depots, setDepots] = useState<Depot[]>(LIVE_MODE ? [] : DELHI_DEPOTS);
  const [fleet, setFleet] = useState<Tanker[]>(LIVE_MODE ? [] : INITIAL_FLEET);
  const [requests, setRequests] = useState<WaterRequest[]>(
    LIVE_MODE ? [] : INITIAL_REQUESTS,
  );
  const [anomalies, setAnomalies] = useState<FraudAnomaly[]>(
    LIVE_MODE ? [] : INITIAL_ANOMALIES,
  );
  const [metrics, setMetrics] = useState<OptimizationMetrics>(
    INITIAL_OPTIMIZATION_METRICS,
  );
  const [isOptimizedMode, setIsOptimizedMode] = useState(true);
  const [selectedTanker, setSelectedTanker] = useState<Tanker | null>(
    LIVE_MODE ? null : INITIAL_FLEET[0],
  );

  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [historyLimited, setHistoryLimited] = useState(false);
  const subject = session?.subject;
  const refresh = useCallback(async () => {
    const data = await api("/snapshot");
    if (LIVE_MODE && auth.getSession()?.subject !== subject) return;
    setWards(data.wards);
    setHistoryLimited(!!data.requestHistoryLimited);
    setDepots(data.depots);
    setFleet(data.fleet);
    setSelectedTanker(
      (prev) => data.fleet.find((t: Tanker) => t.id === prev?.id) || null,
    );
    setRequests((prev) =>
      data.requests.map((r: WaterRequest) => ({
        ...r,
        expectedOtp: prev.find((p) => p.id === r.id)?.expectedOtp || "",
      })),
    );
    setAnomalies(data.anomalies);
    setConnected(true);
    setError("");
  }, [subject]);
  useEffect(() => {
    if (!LIVE_MODE || !subject) return;
    let active = true;
    let inFlight = false;
    const load = async () => {
      if (inFlight || document.hidden || !active) return;
      inFlight = true;
      try { await refresh(); } catch (e) {
        if (active) {
          setConnected(false);
          setError((e as Error).message);
        }
      } finally { inFlight = false; }
    };
    void load();
    document.addEventListener("visibilitychange", load);
    const timer = setInterval(() => {
      void load();
    }, 15000);
    return () => {
      active = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", load);
    };
  }, [subject, refresh]);
  const selectRole = (role: StakeholderRole) => {
    if (
      !LIVE_MODE ||
      role === "AWS_ARCHITECTURE" ||
      session?.roles.some((group) => rolePortals[group] === role)
    )
      setCurrentRole(role);
  };

  // Handler: Switch Baseline vs AI-Optimized Mode
  const handleToggleOptimization = (optimized: boolean) => {
    setIsOptimizedMode(optimized);
  };

  // Handler: Citizen Submits New Water Crisis Request
  const handleSubmitCitizenRequest = async (
    newReqData: Partial<WaterRequest>,
  ) => {
    if (LIVE_MODE) {
      const data = await api("/requests", {
        ...newReqData,
        idempotencyKey:
          (newReqData as Partial<WaterRequest> & { idempotencyKey?: string })
            .idempotencyKey || crypto.randomUUID(),
      });
      setRequests((prev) => [
        data.request,
        ...prev.filter((r) => r.id !== data.request.id),
      ]);
      return;
    }
    const requestId = `REQ-${Date.now().toString().slice(-4)}`;
    const fullRequest: WaterRequest = {
      id: requestId,
      citizenName: newReqData.citizenName || "Citizen",
      phone: newReqData.phone || "+91 98000 00000",
      wardId: newReqData.wardId || "WARD-01",
      wardName: newReqData.wardName || "Sangam Vihar",
      householdCount: newReqData.householdCount || 20,
      daysWithoutWater: newReqData.daysWithoutWater || 3,
      vulnerableCount: newReqData.vulnerableCount || 2,
      complaintText: newReqData.complaintText || "Water required",
      urgencyScore: newReqData.urgencyScore || 85,
      priorityTier: newReqData.priorityTier || "CRITICAL_EMERGENCY",
      status: "PENDING_TRIAGE",
      coordinates: newReqData.coordinates || { lat: 28.503, lng: 77.242 },
      expectedOtp:
        newReqData.expectedOtp ||
        Math.floor(100000 + Math.random() * 900000).toString(),
      createdAt: new Date().toISOString(),
    };

    setRequests((prev) => [fullRequest, ...prev]);

    // Update Ward active count
    setWards((prev) =>
      prev.map((w) =>
        w.id === fullRequest.wardId
          ? { ...w, activeRequestsCount: w.activeRequestsCount + 1 }
          : w,
      ),
    );

    // Auto-triage and assign to Tanker DL-01 if urgent
    setTimeout(() => {
      setRequests((prev) =>
        prev.map((r) =>
          r.id === requestId
            ? { ...r, status: "DISPATCHED", assignedTankerId: "DL-01-TK-101" }
            : r,
        ),
      );
    }, 1200);
  };

  // Handler: Driver Multi-Factor Delivery Verification (3-way handshake)
  const handleVerifyDelivery = async (
    requestId: string,
    driverOtpInput: string,
    litersDelivered: number,
    photoProofUrl?: string,
  ) => {
    if (LIVE_MODE) {
      try {
        const position = await new Promise<GeolocationPosition>(
          (resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 15000,
              maximumAge: 0,
            }),
        );
        const result = await api("/delivery/verify", {
          requestId,
          driverOtpInput,
          litersDelivered,
          photoProofBase64: photoProofUrl?.split(",")[1],
          driverGps: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
          accuracyMeters: position.coords.accuracy,
        });
        await refresh();
        return result;
      } catch (e) {
        return { success: false, message: (e as Error).message };
      }
    }
    const targetReq = requests.find((r) => r.id === requestId);
    if (!targetReq) {
      return { success: false, message: "Request ID not found" };
    }

    if (targetReq.status === "DELIVERED_VERIFIED")
      return { success: false, message: "This delivery is already complete." };
    if (
      !photoProofUrl ||
      !Number.isFinite(litersDelivered) ||
      litersDelivered <= 0
    )
      return {
        success: false,
        message: "Add a photo and a valid delivered volume.",
      };
    const isOtpValid =
      String(driverOtpInput).trim() === String(targetReq.expectedOtp).trim();

    if (!isOtpValid) {
      // Trigger Fraud Sentinel Anomaly Alarm
      const newAnomaly: FraudAnomaly = {
        id: `ALR-${Date.now().toString().slice(-4)}`,
        alertCode: "FRAUD-GHOST-TRIP-DETECTED",
        tankerId: targetReq.assignedTankerId || "DL-01-TK-101",
        wardName: targetReq.wardName,
        timestamp: new Date().toISOString(),
        severity: "CRITICAL",
        incidentType: "GHOST_TRIP_UNVERIFIED",
        message: `Driver attempted to finalize delivery for ${targetReq.wardName} with INVALID resident OTP. Commercial diversion suspected.`,
        dwellTimeSeconds: 65,
        status: "ACTIVE_ALARM",
        recommendedAction:
          "Freeze driver credentials and alert Delhi Jal Board Vigilance Cell.",
      };

      setAnomalies((prev) => [newAnomaly, ...prev]);

      // Flag tanker status
      setFleet((prev) =>
        prev.map((t) =>
          t.id === (targetReq.assignedTankerId || "DL-01-TK-101")
            ? {
                ...t,
                status: "ANOMALY_FLAGGED",
                anomalyWarning: newAnomaly.message,
              }
            : t,
        ),
      );

      return {
        success: false,
        message:
          "🚨 CRITICAL FRAUD ALARM: Resident OTP mismatch! Delivery rejected and flagged on dispatcher radar.",
        fraudTriggered: true,
      };
    }

    // Success: Cryptographic SHA-256 Hash generated
    const auditHash = Array.from(
      new Uint8Array(
        await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(
            `${requestId}|${targetReq.wardId}|${litersDelivered}|${Date.now()}`,
          ),
        ),
      ),
    )
      .map((x) => x.toString(16).padStart(2, "0"))
      .join("");

    // Update Request to Verified
    setRequests((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? {
              ...r,
              status: "DELIVERED_VERIFIED",
              deliveredAt: new Date().toISOString(),
              litersDelivered,
              proofHash: auditHash,
              photoUrl: photoProofUrl,
            }
          : r,
      ),
    );

    // Update Tanker Route
    setFleet((prev) =>
      prev.map((t) => {
        if (t.id === (targetReq.assignedTankerId || "DL-01-TK-101")) {
          const remainingWaypoints = t.assignedRoute.slice(1);
          return {
            ...t,
            currentWaterLevelLiters: Math.max(
              0,
              t.currentWaterLevelLiters - litersDelivered,
            ),
            assignedRoute: remainingWaypoints,
            status: remainingWaypoints.length > 0 ? "EN_ROUTE" : "IDLE",
          };
        }
        return t;
      }),
    );

    // Update Ward delivered water
    setWards((prev) =>
      prev.map((w) =>
        w.id === targetReq.wardId
          ? {
              ...w,
              activeRequestsCount: Math.max(0, w.activeRequestsCount - 1),
              deliveredLitersToday: w.deliveredLitersToday + litersDelivered,
            }
          : w,
      ),
    );

    return {
      success: true,
      message: "Demo delivery recorded locally. No AWS call was made.",
      auditHash,
    };
  };

  // Handler: Trigger Demo Ghost Trip for Judges
  const handleTriggerGhostTripDemo = () => {
    if (LIVE_MODE) return;
    const ghostAnomaly: FraudAnomaly = {
      id: `ALR-${Date.now().toString().slice(-4)}`,
      alertCode: "FRAUD-GHOST-TRIP-CAUGHT",
      tankerId: "DL-03-TK-308",
      wardName: "Dwarka Sector 8 Commercial Zone",
      timestamp: new Date().toISOString(),
      severity: "CRITICAL",
      incidentType: "GHOST_TRIP_UNVERIFIED",
      message:
        "Tanker DL-03 discharged 8,000L in 90 seconds without resident OTP input. Commercial diversion flagged by AWS EventBridge.",
      dwellTimeSeconds: 90,
      status: "ACTIVE_ALARM",
      recommendedAction:
        "Freeze driver digital credentials and dispatch vigilance squad.",
    };

    setAnomalies((prev) => [ghostAnomaly, ...prev]);
    setFleet((prev) =>
      prev.map((t) =>
        t.id === "DL-03-TK-308"
          ? {
              ...t,
              status: "ANOMALY_FLAGGED",
              anomalyWarning: ghostAnomaly.message,
            }
          : t,
      ),
    );
    setCurrentRole("DISPATCHER");
  };

  // Reset Demo
  const handleResetDemo = () => {
    setWards(DELHI_WARDS);
    setDepots(DELHI_DEPOTS);
    setFleet(INITIAL_FLEET);
    setRequests(INITIAL_REQUESTS);
    setAnomalies(INITIAL_ANOMALIES);
    setMetrics(INITIAL_OPTIMIZATION_METRICS);
    setIsOptimizedMode(true);
    setSelectedTanker(INITIAL_FLEET[0]);
  };

  const totalVerifiedLiters = requests
    .filter((r) => r.status === "DELIVERED_VERIFIED")
    .reduce((acc, curr) => acc + (curr.litersDelivered || 4000), 0);

  const activeDriverTanker =
    fleet.find((t) => t.assignedRoute.length > 0) || fleet[0];

  return (
    <div className="min-h-screen flex flex-col blueprint-grid text-slate-900 selection:bg-[#D9532F]/20 selection:text-[#D9532F]">
      {/* Stakeholder workspace navigation */}
      <Navbar
        session={session}
        connected={connected && !notice}
        onSignOut={() => {
          void signOut();
        }}
        currentRole={currentRole}
        onSelectRole={selectRole}
        activeAlertCount={
          anomalies.filter((a) => a.status === "ACTIVE_ALARM").length
        }
        totalVerifiedLiters={totalVerifiedLiters}
        onResetDemo={handleResetDemo}
        onTriggerGhostTripDemo={handleTriggerGhostTripDemo}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 space-y-6">
        {/* JAL-SETU introduction */}
        {!LIVE_MODE && (
          <HeroMasthead
            onSelectRole={selectRole}
            onTriggerGhostTripDemo={handleTriggerGhostTripDemo}
            onResetDemo={handleResetDemo}
            activeAlertCount={
              anomalies.filter((a) => a.status === "ACTIVE_ALARM").length
            }
          />
        )}
        {/* Panoramic Illustrated Delhi Landmark Skyline Banner (Image 5 style) */}

        {/* 3 Glossy Hackathon Track Cards (Image 2 style) */}
        {!LIVE_MODE && <HackathonTrackCards />}

        {/* Active Stakeholder View Container */}
        {LIVE_MODE && (currentRole === "DISPATCHER" || notice || !connected) && (
          <section className="connection-panel glossy-panel rounded-2xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <strong>AWS workspace</strong>
                <p className="text-xs text-slate-500 mt-1">
                  {notice ||
                    (connected
                      ? "Signed in securely. Data refreshes every 15 seconds."
                      : "Connecting to your authorized AWS workspace…")}
                </p>
              </div>
            </div>
            {connected && currentRole === "DISPATCHER" && (
              <button
                className="secondary-action mt-3"
                onClick={async () => {
                  try {
                    setLoading(true);
                    await api("/optimize", {});
                    await refresh();
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
              >
                Dispatch pending requests
              </button>
            )}
          </section>
        )}
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            {error}
          </div>
        )}
        {historyLimited && (
          <p className="rounded-xl bg-amber-50 p-4 text-sm">
            Showing your latest 100 requests. Contact operations for older
            records.
          </p>
        )}
        {!LIVE_MODE && (
          <div className="text-xs text-slate-500 flex flex-wrap items-center justify-between gap-3">
            <span>
              Demo dataset · Metrics and locations are illustrative. No AWS
              services are called.
            </span>
            <button
              className="secondary-action"
              onClick={handleTriggerGhostTripDemo}
            >
              Test fraud alert
            </button>
          </div>
        )}
        <div className="workspace" id="workspace">
          <div className="workspace-heading">
            <div>
              <span className="eyebrow">THE OPERATIONS DESK</span>
              <h2>Water moves. Trust follows.</h2>
            </div>
            <span className="workspace-note">
              One network. Every stakeholder.
            </span>
          </div>
          {currentRole === "DISPATCHER" && (!LIVE_MODE || connected) && (
            <DispatcherDashboard
              wards={wards}
              depots={depots}
              fleet={fleet}
              requests={requests}
              anomalies={anomalies}
              metrics={metrics}
              isOptimizedMode={isOptimizedMode}
              onToggleOptimization={handleToggleOptimization}
              onDismissAnomaly={async (id) => {
                if (LIVE_MODE) {
                  const reason = window.prompt(
                    "Record your investigation and reason for resolving this alert:",
                  );
                  if (!reason?.trim()) return;
                  try {
                    await api("/anomalies/resolve", { anomalyId: id, reason });
                    await refresh();
                  } catch (e) {
                    setError((e as Error).message);
                  }
                } else setAnomalies((prev) => prev.filter((a) => a.id !== id));
              }}
              onSelectTanker={setSelectedTanker}
              selectedTanker={selectedTanker}
            />
          )}

          {currentRole === "CITIZEN" && wards.length > 0 && (
            <CitizenPortal
              wards={wards}
              requests={requests}
              onSubmitRequest={handleSubmitCitizenRequest}
              onRateDelivery={async (reqId, rating) => {
                if (LIVE_MODE)
                  await api("/requests/rating", { requestId: reqId, rating });
                setRequests((prev) =>
                  prev.map((r) => (r.id === reqId ? { ...r, rating } : r)),
                );
              }}
            />
          )}
          {LIVE_MODE && connected && currentRole === "DISPATCHER" && <RefillForm fleet={fleet} onRecorded={refresh} />}

          {currentRole === "DRIVER" && activeDriverTanker && (
            <DriverPortal
              tanker={activeDriverTanker}
              onVerifyDelivery={handleVerifyDelivery}
              onSimulateMoveToStop={async () => {
                if (!LIVE_MODE) {
                  const stop = activeDriverTanker.assignedRoute[0];
                  if (stop)
                    setFleet((prev) =>
                      prev.map((t) =>
                        t.id === activeDriverTanker.id
                          ? { ...t, currentCoordinates: stop.coordinates }
                          : t,
                      ),
                    );
                  return;
                }
                const p = await new Promise<GeolocationPosition>(
                  (resolve, reject) =>
                    navigator.geolocation.getCurrentPosition(resolve, reject, {
                      enableHighAccuracy: true,
                      timeout: 15000,
                      maximumAge: 0,
                    }),
                );
                await api("/telemetry", {
                  tankerId: activeDriverTanker.id,
                  coordinates: {
                    lat: p.coords.latitude,
                    lng: p.coords.longitude,
                  },
                  accuracyMeters: p.coords.accuracy,
                  speedKmph: Math.max(0, (p.coords.speed || 0) * 3.6),
                  sampledAt: new Date(p.timestamp).toISOString(),
                });
                await refresh();
              }}
            />
          )}

          {currentRole === "PUBLIC_BOARD" && (
            <PublicTransparencyBoard
              wards={wards}
              requests={requests}
              anomalies={anomalies}
              canReadEvidence={session?.roles.includes("Auditor")}
            />
          )}

          {LIVE_MODE &&
            !connected &&
            currentRole !== "AWS_ARCHITECTURE" &&
            currentRole !== "PUBLIC_BOARD" && (
              <div className="glossy-panel p-10 rounded-2xl text-center text-slate-500">
                Waiting for your authorized AWS workspace. Connection retries
                automatically.
              </div>
            )}
          {LIVE_MODE &&
            connected &&
            currentRole === "CITIZEN" &&
            wards.length === 0 && (
              <div className="glossy-panel p-10 rounded-2xl text-center text-slate-500">
                No service areas are available yet. Contact water operations.
              </div>
            )}
          {LIVE_MODE &&
            connected &&
            currentRole === "DRIVER" &&
            !activeDriverTanker && (
              <div className="glossy-panel p-10 rounded-2xl text-center text-slate-500">
                No tanker is assigned to this account.
              </div>
            )}
          {currentRole === "LANDING" && (
            <LandingPage onNavigate={setCurrentRole} />
          )}
          {currentRole === "HEATMAP" && <DedicatedSkylinePage />}
          {currentRole === "AWS_ARCHITECTURE" && <DedicatedMachinePage />}
        </div>
      </main>

      <footer className="site-footer">
        <span className="footer-brand">
          jalSetu <span>जल–सेतु</span>
        </span>
        <span>Connecting communities to accountable water supply.</span>
        <span>Built with AWS · Designed for Delhi</span>
      </footer>
    </div>
  );
};

export default App;
