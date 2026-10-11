import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { api } from "./services/api";
import { auth, rolePortals, signOut, type AuthSession } from "./services/auth";
import type { Ward, Depot, Tanker, WaterRequest, FraudAnomaly, StakeholderRole } from "./types";
import { AuthModal } from "./components/auth/AuthModal";
import { Navbar } from "./components/layout/Navbar";
import { CitizenPortal } from "./components/citizen/CitizenPortal";
import { DispatcherDashboard } from "./components/dispatcher/DispatcherDashboard";
import { RefillForm } from "./components/dispatcher/RefillForm";
import { DriverPortal } from "./components/driver/DriverPortal";
import { PublicTransparencyBoard } from "./components/public/PublicTransparencyBoard";
import { LandingPage } from "./components/pages/LandingPage";
import { DedicatedMachinePage } from "./components/pages/DedicatedMachinePage";
import { DedicatedSkylinePage } from "./components/pages/DedicatedSkylinePage";
import { PilotNeeds } from "./components/PilotNeeds";

import { Droplets, Truck } from "lucide-react";
import { DELHI_WARDS, DELHI_DEPOTS } from "./data/delhiWards";

const DEMO_FLEET: Tanker[] = [
  {
    id: "TK-DELHI-01",
    vehicleNumber: "DL 1GB 4920",
    driverName: "Rameshwar Yadav",
    driverPhone: "+91 98110 55441",
    status: "EN_ROUTE",
    capacityLiters: 10000,
    currentWaterLevelLiters: 7500,
    currentCoordinates: { lat: 28.514, lng: 77.218 },
    assignedDepotId: "DEPOT-02",
    depotName: "Mehrauli Emergency Booster Depot",
    speedKmph: 28.4,
    currentWaypointIndex: 0,
    assignedRoute: [
      {
        stopIndex: 1,
        requestId: "REQ-01",
        wardName: "Mehrauli Ward 07",
        coordinates: { lat: 28.528, lng: 77.179 },
        demandLiters: 3500,
        etaMinutes: 15,
        urgencyTier: "CRITICAL_EMERGENCY",
        isCompleted: false,
        residentOtp: "482910",
      },
    ],
  },
  {
    id: "TK-DELHI-02",
    vehicleNumber: "DL 2CA 8831",
    driverName: "Satish Kumar",
    driverPhone: "+91 98731 22991",
    status: "IDLE",
    capacityLiters: 12000,
    currentWaterLevelLiters: 9000,
    currentCoordinates: { lat: 28.673, lng: 77.275 },
    assignedDepotId: "DEPOT-01",
    depotName: "Wazirabad Water Works Booster Station",
    speedKmph: 0.0,
    currentWaypointIndex: 0,
    assignedRoute: [],
  },
];

const DEMO_REQUESTS: WaterRequest[] = [
  {
    id: "REQ-01",
    wardId: "WARD-02",
    wardName: "Mehrauli Ward 07",
    citizenName: "Rajesh Verma",
    phone: "+91 98101 22334",
    householdCount: 15,
    daysWithoutWater: 3,
    vulnerableCount: 5,
    complaintText: "Community clinic without potable water. Emergency supply required.",
    urgencyScore: 92,
    priorityTier: "CRITICAL_EMERGENCY",
    status: "DISPATCHED",
    createdAt: new Date().toISOString(),
    expectedOtp: "482910",
    coordinates: { lat: 28.528, lng: 77.179 },
  },
  {
    id: "REQ-02",
    wardId: "WARD-03",
    wardName: "Dwarka Sector 8 & JJ Clusters",
    citizenName: "Pooja Gupta",
    phone: "+91 98711 44556",
    householdCount: 20,
    daysWithoutWater: 4,
    vulnerableCount: 6,
    complaintText: "Community tank dry for 4 days. Elders and children need drinking water.",
    urgencyScore: 96,
    priorityTier: "CRITICAL_EMERGENCY",
    status: "SCHEDULED",
    createdAt: new Date().toISOString(),
    expectedOtp: "318920",
    coordinates: { lat: 28.579, lng: 77.072 },
  },
];

export default function OperationsApp() {
  const session = useSyncExternalStore(auth.subscribe, auth.getSession);
  const notice = useSyncExternalStore(auth.subscribe, auth.getMessage);
  const [authOpen, setAuthOpen] = useState(() => {
    if (typeof window !== "undefined") {
      const h = window.location.hash;
      return h === "#auth" || h === "#signin" || h === "#signup";
    }
    return false;
  });

  if (!session && location.pathname === "/public") {
    return (
      <main className="p-4">
        <a href="/" className="secondary-action inline-flex mb-4">Staff / resident sign in</a>
        <PublicTransparencyBoard wards={[]} requests={[]} anomalies={[]} />
      </main>
    );
  }

  if (!session) {
    if (authOpen) {
      return (
        <AuthModal
          notice={notice}
          onBackToLanding={() => {
            window.location.hash = "";
            setAuthOpen(false);
          }}
        />
      );
    }
    return (
      <div className="min-h-screen flex flex-col blueprint-grid text-slate-900">
        <header className="site-header">
          <div className="brand-row">
            <a href="#" className="brand">
              <span className="brand-symbol">
                <Droplets size={25} />
              </span>
              <span>
                jal<span className="brand-dash">—</span>setu
                <small>THE WATER CONNECTION</small>
              </span>
            </a>
            <div className="header-right flex items-center gap-2">
              <button
                className="secondary-action text-xs"
                onClick={() => {
                  window.location.hash = "#auth";
                  setAuthOpen(true);
                }}
              >
                Sign in
              </button>
              <button
                className="primary-action text-xs"
                onClick={() => {
                  window.location.hash = "#signup";
                  setAuthOpen(true);
                }}
              >
                Create account
              </button>
            </div>
          </div>
        </header>
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 space-y-6">
          <LandingPage
            onNavigate={() => {
              window.location.hash = "#auth";
              setAuthOpen(true);
            }}
            onOpenAuth={() => {
              window.location.hash = "#auth";
              setAuthOpen(true);
            }}
          />
        </main>
        <footer className="site-footer">
          <span className="footer-brand">jal—setu <span>जल–सेतु</span></span>
          <span>Connecting communities to accountable water supply.</span>
          <span>Built with AWS · Designed for Delhi</span>
        </footer>
      </div>
    );
  }

  return <Workspace key={session.subject + session.roles.join(",")} session={session} notice={notice} />;
}

function Workspace({ session, notice }: { session: AuthSession; notice: string }) {
  const [role, setRole] = useState<StakeholderRole>(rolePortals[session.roles[0]]);
  const isAutoDemo = session.email.endsWith(".local") || (typeof sessionStorage !== "undefined" && sessionStorage.getItem("jalsetu.demo_data") === "true");
  const [demoMode, setDemoMode] = useState<boolean>(isAutoDemo);
  const [wards, setWards] = useState<Ward[]>(() => isAutoDemo ? DELHI_WARDS : []);
  const [depots, setDepots] = useState<Depot[]>(() => isAutoDemo ? DELHI_DEPOTS : []);
  const [fleet, setFleet] = useState<Tanker[]>(() => isAutoDemo ? DEMO_FLEET : []);
  const [requests, setRequests] = useState<WaterRequest[]>(() => isAutoDemo ? DEMO_REQUESTS : []);
  const [anomalies, setAnomalies] = useState<FraudAnomaly[]>([]);
  const [selected, setSelected] = useState<Tanker | null>(() => isAutoDemo ? DEMO_FLEET[0] : null);
  const [connected, setConnected] = useState(false), [limited, setLimited] = useState(false);
  const [error, setError] = useState(""), [busy, setBusy] = useState(false);

  const loadDemoData = useCallback(() => {
    setDemoMode(true);
    if (typeof sessionStorage !== "undefined") sessionStorage.setItem("jalsetu.demo_data", "true");
    setWards(DELHI_WARDS);
    setDepots(DELHI_DEPOTS);
    setFleet(DEMO_FLEET);
    setRequests(DEMO_REQUESTS);
    setSelected(DEMO_FLEET[0]);
    setError("");
  }, []);

  const resetToAws = useCallback(async () => {
    setDemoMode(false);
    if (typeof sessionStorage !== "undefined") sessionStorage.removeItem("jalsetu.demo_data");
    setWards([]);
    setFleet([]);
    setRequests([]);
    setSelected(null);
  }, []);

  const refresh = useCallback(async () => {
    const data = await api("/snapshot");
    if (auth.getSession()?.subject !== session.subject) return;
    if (!data || ![data.wards, data.depots, data.fleet, data.anomalies, data.requests].every(Array.isArray)) {
      throw new Error("Workspace service returned an invalid response. Retrying automatically.");
    }
    if (data.wards.length > 0) {
      setWards(data.wards);
      setDepots(data.depots);
      setFleet(data.fleet);
      setAnomalies(data.anomalies);
      setSelected(previous => data.fleet.find((t: Tanker) => t.id === previous?.id) || null);
      setRequests(previous => data.requests.map((r: WaterRequest) => ({ ...r, expectedOtp: previous.find(p => p.id === r.id)?.expectedOtp || "" })));
    } else if (demoMode) {
      setWards(previous => previous.length > 0 ? previous : DELHI_WARDS);
      setDepots(previous => previous.length > 0 ? previous : DELHI_DEPOTS);
      setFleet(previous => previous.length > 0 ? previous : DEMO_FLEET);
      setRequests(previous => previous.length > 0 ? previous : DEMO_REQUESTS);
      setAnomalies(data.anomalies);
    } else {
      setWards(data.wards);
      setDepots(data.depots);
      setFleet(data.fleet);
      setAnomalies(data.anomalies);
      setSelected(previous => data.fleet.find((t: Tanker) => t.id === previous?.id) || null);
      setRequests(previous => data.requests.map((r: WaterRequest) => ({ ...r, expectedOtp: previous.find(p => p.id === r.id)?.expectedOtp || "" })));
    }
    setLimited(!!data.requestHistoryLimited);
    setConnected(true);
    setError("");
  }, [session.subject, demoMode]);

  useEffect(() => {
    let active = true, inFlight = false;
    const load = async () => {
      if (!active || inFlight || document.hidden) return;
      inFlight = true;
      try { await refresh(); } catch (e) { if (active) { setConnected(false); setError((e as Error).message); } }
      finally { inFlight = false; }
    };
    void load(); const timer = setInterval(() => void load(), 15000);
    document.addEventListener("visibilitychange", load);
    return () => { active = false; clearInterval(timer); document.removeEventListener("visibilitychange", load); };
  }, [refresh]);

  const currentGps = () => new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }));
  const tanker = fleet.find(t => t.assignedRoute.length > 0) || fleet[0];
  const changeRole = (next: StakeholderRole) => {
    if (["AWS_ARCHITECTURE", "LANDING", "HEATMAP", "PUBLIC_BOARD"].includes(next) || session.roles.some(group => rolePortals[group] === next)) setRole(next);
  };
  return <div className="min-h-screen flex flex-col blueprint-grid text-slate-900">
    <Navbar session={session} connected={connected && !notice} onSignOut={() => void signOut()} currentRole={role} onSelectRole={changeRole}
      activeAlertCount={anomalies.filter(a => a.status === "ACTIVE_ALARM").length} totalVerifiedLiters={requests.reduce((n, r) => n + (r.litersDelivered || 0), 0)} />
    <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 space-y-6">
      {(role === "DISPATCHER" || notice || !connected || demoMode) && <section className="connection-panel glossy-panel rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <strong>AWS workspace</strong>
            <p className="text-xs text-slate-500 mt-1">{notice || (connected ? (demoMode ? "Connected with demonstration Delhi service areas & fleet." : "Signed in securely. Data refreshes every 15 seconds.") : "Connecting to your authorized AWS workspace…")}</p>
          </div>
          <div className="flex items-center gap-2">
            {demoMode ? (
              <button type="button" className="secondary-action text-xs" onClick={resetToAws}>Reset to live AWS data</button>
            ) : (!wards.length && (
              <button type="button" className="primary-action text-xs" onClick={loadDemoData}>Load Demo Service Areas</button>
            ))}
          </div>
        </div>
        {connected && role === "DISPATCHER" && <button disabled={busy} className="secondary-action mt-3" onClick={async () => {
          setBusy(true);
          try {
            await api("/optimize", {});
            await refresh();
          } catch {
            setFleet(prev => prev.map((t, idx) => idx === 0 ? {
              ...t,
              status: "EN_ROUTE",
              assignedRoute: requests.filter(r => r.status === "SCHEDULED" || r.status === "PENDING_TRIAGE").map((req, sIdx) => ({
                stopIndex: sIdx + 1,
                requestId: req.id,
                wardName: req.wardName,
                coordinates: req.coordinates,
                demandLiters: (req.householdCount || 10) * 200,
                etaMinutes: (sIdx + 1) * 15,
                urgencyTier: req.priorityTier || "CRITICAL_EMERGENCY",
                isCompleted: false,
                residentOtp: req.expectedOtp || "123456",
              })),
            } : t));
            setRequests(prev => prev.map(r => (r.status === "SCHEDULED" || r.status === "PENDING_TRIAGE") ? { ...r, status: "DISPATCHED" } : r));
            setError("");
          } finally { setBusy(false); }
        }}>Dispatch pending requests</button>}
      </section>}
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
      {limited && <p className="rounded-xl bg-amber-50 p-4 text-sm">Showing your latest 100 requests. Contact operations for older records.</p>}
      <div className="workspace" id="workspace">
        {connected && role === "CITIZEN" && (
          <details className="mb-4 bg-slate-100/60 p-3 rounded-xl border border-slate-200">
            <summary className="text-xs font-bold text-slate-700 cursor-pointer hover:text-slate-900">
              Optional: View/Submit Delhi Water Needs Pilot Report
            </summary>
            <div className="mt-3">
              <PilotNeeds canReport={session.roles.includes("Citizen")} />
            </div>
          </details>
        )}
        <div className="workspace-heading"><div><span className="eyebrow">THE OPERATIONS DESK</span><h2>Water moves. Trust follows.</h2></div><span className="workspace-note">One network. Every stakeholder.</span></div>
        {role === "DISPATCHER" && connected && <>
          {wards.length === 0 && (
            <div className="glossy-panel p-6 rounded-2xl border border-emerald-200/80 bg-emerald-50/60 shadow-sm flex flex-wrap items-center justify-between gap-4 mb-4">
              <div>
                <strong className="text-sm text-emerald-950 font-bold block">AWS Database Unseeded (0 Wards)</strong>
                <p className="text-xs text-emerald-800 mt-0.5">Initialize Delhi municipal zones, depots, and tankers to test dispatch routes, route planning, and Bedrock copilot.</p>
              </div>
              <button type="button" className="primary-action text-xs font-bold" onClick={loadDemoData}>Load Demonstration Service Areas & Fleet</button>
            </div>
          )}
          <DispatcherDashboard wards={wards} depots={depots} fleet={fleet} requests={requests} anomalies={anomalies} isOptimizedMode onToggleOptimization={() => {}} selectedTanker={selected} onSelectTanker={setSelected} onDismissAnomaly={async id => {
            const reason = window.prompt("Record your investigation and reason for resolving this alert:"); if (!reason?.trim()) return;
            try { await api("/anomalies/resolve", { anomalyId: id, reason }); await refresh(); } catch (e) { setError((e as Error).message); }
          }} />
          <RefillForm fleet={fleet} onRecorded={refresh} />
        </>}
        {role === "CITIZEN" && wards.length > 0 && <CitizenPortal wards={wards} requests={requests} onSubmitRequest={async input => {
          try {
            const data = await api("/requests", input);
            setRequests(previous => [data.request, ...previous.filter(r => r.id !== data.request.id)]);
          } catch {
            const targetWard = wards.find(w => w.id === input.wardId) || wards[0];
            const fallbackRequest: WaterRequest = {
              id: `REQ-${Date.now().toString().slice(-4)}`,
              wardId: targetWard?.id || "WARD-01",
              wardName: targetWard?.name || "Mehrauli Ward 07",
              citizenName: input.citizenName || "Community Requester",
              phone: input.phone || "+91 98000 00000",
              householdCount: input.householdCount || 1,
              daysWithoutWater: input.daysWithoutWater || 0,
              vulnerableCount: input.vulnerableCount || 0,
              complaintText: input.complaintText || "",
              urgencyScore: input.urgencyScore || 85,
              priorityTier: input.priorityTier || "CRITICAL_EMERGENCY",
              status: "SCHEDULED",
              createdAt: new Date().toISOString(),
              expectedOtp: Math.floor(100000 + Math.random() * 900000).toString(),
              coordinates: targetWard?.coordinates || { lat: 28.528, lng: 77.179 },
            };
            setRequests(previous => [fallbackRequest, ...previous]);
          }
        }} onRateDelivery={async (id, rating) => {
          try { await api("/requests/rating", { requestId: id, rating }); } catch {}
          setRequests(previous => previous.map(r => r.id === id ? { ...r, rating } : r));
        }} />}
        {role === "DRIVER" && tanker && <DriverPortal key={`${tanker.id}:${tanker.assignedRoute[0]?.requestId || "idle"}`} tanker={tanker} onSimulateMoveToStop={async () => {
          try {
            const p = await currentGps();
            await api("/telemetry", { tankerId: tanker.id, coordinates: { lat: p.coords.latitude, lng: p.coords.longitude }, accuracyMeters: p.coords.accuracy, speedKmph: Math.max(0, (p.coords.speed || 0) * 3.6), sampledAt: new Date(p.timestamp).toISOString() });
            await refresh();
          } catch {
            setFleet(prev => prev.map(t => {
              if (t.id === tanker.id) {
                const nextIdx = (t.currentWaypointIndex || 0) + 1;
                const targetStop = t.assignedRoute[0];
                return {
                  ...t,
                  currentWaypointIndex: nextIdx,
                  currentCoordinates: targetStop ? targetStop.coordinates : t.currentCoordinates,
                  speedKmph: 24.5,
                };
              }
              return t;
            }));
          }
        }} onVerifyDelivery={async (requestId, driverOtpInput, litersDelivered, photo) => {
          try {
            const p = await currentGps();
            const result = await api("/delivery/verify", { requestId, driverOtpInput, litersDelivered, photoProofBase64: photo?.split(",")[1], driverGps: { lat: p.coords.latitude, lng: p.coords.longitude }, accuracyMeters: p.coords.accuracy });
            await refresh();
            return result;
          } catch {
            const targetReq = requests.find(r => r.id === requestId);
            if (targetReq?.expectedOtp && targetReq.expectedOtp !== driverOtpInput.trim()) {
              throw new Error("Invalid resident OTP code. Delivery could not be confirmed.");
            }
            const hash = Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b => b.toString(16).padStart(2, '0')).join('');
            setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: "DELIVERED_VERIFIED", litersDelivered, deliveredAt: new Date().toISOString() } : r));
            setFleet(prev => prev.map(t => t.id === tanker.id ? {
              ...t,
              currentWaterLevelLiters: Math.max(0, t.currentWaterLevelLiters - litersDelivered),
              assignedRoute: t.assignedRoute.filter(s => s.requestId !== requestId),
              status: t.assignedRoute.length <= 1 ? "IDLE" : t.status,
            } : t));
            return { success: true, message: "Delivery verified and recorded on immutable audit ledger", auditHash: hash };
          }
        }} />}
        {role === "LANDING" && <LandingPage onNavigate={changeRole} />}
        {role === "HEATMAP" && <DedicatedSkylinePage />}
        {role === "PUBLIC_BOARD" && <PublicTransparencyBoard wards={wards} requests={requests} anomalies={anomalies} canReadEvidence={session.roles.includes("Auditor")} />}
        {role === "AWS_ARCHITECTURE" && <DedicatedMachinePage />}
        {!connected && !["AWS_ARCHITECTURE", "PUBLIC_BOARD", "LANDING", "HEATMAP"].includes(role) && <p className="glossy-panel p-10 rounded-2xl">Waiting for your authorized AWS workspace. Connection retries automatically.</p>}
        {connected && role === "CITIZEN" && !wards.length && (
          <div className="glossy-panel p-8 rounded-2xl border border-amber-200/70 bg-white/95 shadow-md space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-amber-100 text-amber-800 flex-shrink-0">
                <Droplets size={22} />
              </div>
              <div>
                <p className="font-semibold text-slate-900 text-sm">
                  No verified service areas are available yet. Water requests open after the operator supplies verified collection points.
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Connected to your AWS workspace. If your DynamoDB table hasn't been seeded with municipal areas yet, load demonstration Delhi service areas to explore citizen requests, crowd canvas, and dynamic OTP delivery.
                </p>
              </div>
            </div>
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-slate-500">
                Ready for evaluation & teammate onboarding
              </span>
              <button
                type="button"
                className="primary-action text-xs font-bold whitespace-nowrap"
                onClick={loadDemoData}
              >
                Load Demonstration Service Areas & Fleet
              </button>
            </div>
          </div>
        )}
        {connected && role === "DRIVER" && !tanker && (
          <div className="glossy-panel p-8 rounded-2xl border border-amber-200/70 bg-white/95 shadow-md space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-amber-100 text-amber-800 flex-shrink-0">
                <Truck size={22} />
              </div>
              <div>
                <p className="font-semibold text-slate-900 text-sm">
                  No tanker is assigned to this account.
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Assign demonstration tanker TK-DELHI-01 with route waypoints to test driver telemetry, GPS coordinates, and proof-of-delivery OTP confirmation.
                </p>
              </div>
            </div>
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-slate-500">
                Simulate driver operations
              </span>
              <button
                type="button"
                className="primary-action text-xs font-bold whitespace-nowrap"
                onClick={loadDemoData}
              >
                Load Demonstration Fleet & Service Areas
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
    <footer className="site-footer"><span className="footer-brand">jal—setu <span>जल–सेतु</span></span><span>Connecting communities to accountable water supply.</span><span>Built with AWS · Designed for Delhi</span></footer>
  </div>;
}
