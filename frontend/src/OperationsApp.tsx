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

import { Droplets } from "lucide-react";

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

  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const sync = () => {
      setHash(window.location.hash);
      setAuthOpen(["#auth", "#signin", "#signup"].includes(window.location.hash));
    };
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  if (!session && location.pathname === "/public") {
    return (
      <main className="p-4">
        <a href="/" className="secondary-action inline-flex mb-4">Staff / resident sign in</a>
        <PublicTransparencyBoard wards={[]} requests={[]} anomalies={[]} />
      </main>
    );
  }

  if (!session) {
    if (authOpen || notice) {
      return (
        <AuthModal
          key={hash}
          initialTab={hash === "#signup" ? "register" : "login"}
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
          {["#architecture", "#skyline"].includes(hash) ? <>
            <a className="secondary-action inline-flex" href="#">Back to home</a>
            {hash === "#architecture" ? <DedicatedMachinePage /> : <DedicatedSkylinePage />}
          </> : <LandingPage
            onNavigate={(next) => {
              if (next === "PUBLIC_BOARD") { window.location.assign("/public"); return; }
              window.location.hash = next === "AWS_ARCHITECTURE" ? "#architecture" : next === "HEATMAP" ? "#skyline" : "#signin";
              setAuthOpen(!["AWS_ARCHITECTURE", "HEATMAP"].includes(next));
            }}
            onOpenAuth={(tab) => {
              window.location.hash = tab === "signup" ? "#signup" : "#signin";
              setAuthOpen(true);
            }}
          />}
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
  const [wards, setWards] = useState<Ward[]>([]), [depots, setDepots] = useState<Depot[]>([]);
  const [fleet, setFleet] = useState<Tanker[]>([]), [requests, setRequests] = useState<WaterRequest[]>([]);
  const [anomalies, setAnomalies] = useState<FraudAnomaly[]>([]), [selected, setSelected] = useState<Tanker | null>(null);
  const [connected, setConnected] = useState(false), [limited, setLimited] = useState(false);
  const [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    const data = await api("/snapshot");
    if (auth.getSession()?.subject !== session.subject) return;
    if (!data || ![data.wards, data.depots, data.fleet, data.anomalies, data.requests].every(Array.isArray)) {
      throw new Error("Workspace service returned an invalid response. Retrying automatically.");
    }
    setWards(data.wards); setDepots(data.depots); setFleet(data.fleet); setAnomalies(data.anomalies);
    setSelected(previous => data.fleet.find((t: Tanker) => t.id === previous?.id) || null);
    setRequests(previous => data.requests.map((r: WaterRequest) => ({ ...r, expectedOtp: previous.find(p => p.id === r.id)?.expectedOtp || "" })));
    setLimited(!!data.requestHistoryLimited); setConnected(true); setError("");
  }, [session.subject]);
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
  const currentGps = () => new Promise<GeolocationPosition>((resolve, reject) => (navigator.geolocation ? navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }) : reject(new Error("Location is unavailable in this browser. Use HTTPS and allow location access."))));
  const tanker = fleet.find(t => t.assignedRoute.length > 0) || fleet[0];
  const changeRole = (next: StakeholderRole) => {
    if (["AWS_ARCHITECTURE", "LANDING", "HEATMAP", "PUBLIC_BOARD"].includes(next) || session.roles.some(group => rolePortals[group] === next)) setRole(next);
  };
  return <div className="min-h-screen flex flex-col blueprint-grid text-slate-900">
    <Navbar session={session} connected={connected && !notice} onSignOut={() => void signOut()} currentRole={role} onSelectRole={changeRole}
      activeAlertCount={anomalies.filter(a => a.status === "ACTIVE_ALARM").length} totalVerifiedLiters={requests.reduce((n, r) => n + (r.litersDelivered || 0), 0)} />
    <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 space-y-6">
      {(role === "DISPATCHER" || notice || !connected) && <section className="connection-panel glossy-panel rounded-2xl p-5">
        <strong>AWS workspace</strong><p className="text-xs text-slate-500 mt-1">{notice || (connected ? "Signed in securely. Data refreshes every 15 seconds." : "Connecting to your authorized AWS workspace…")}</p>
        {connected && role === "DISPATCHER" && <button disabled={busy} className="secondary-action mt-3" onClick={async () => {
          setBusy(true); try { await api("/optimize", {}); await refresh(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
        }}>Dispatch pending requests</button>}
      </section>}
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
      {limited && <p className="rounded-xl bg-amber-50 p-4 text-sm">Showing your latest 100 requests. Contact operations for older records.</p>}
      <div className="workspace" id="workspace">
        {connected && role === "CITIZEN" && <PilotNeeds canReport={session.roles.includes("Citizen")} />}
        <div className="workspace-heading"><div><span className="eyebrow">THE OPERATIONS DESK</span><h2>Water moves. Trust follows.</h2></div><span className="workspace-note">One network. Every stakeholder.</span></div>
        {role === "DISPATCHER" && connected && <>
          <DispatcherDashboard wards={wards} depots={depots} fleet={fleet} requests={requests} anomalies={anomalies} isOptimizedMode onToggleOptimization={() => {}} selectedTanker={selected} onSelectTanker={setSelected} onDismissAnomaly={async id => {
            const reason = window.prompt("Record your investigation and reason for resolving this alert:"); if (!reason?.trim()) return;
            try { await api("/anomalies/resolve", { anomalyId: id, reason }); await refresh(); } catch (e) { setError((e as Error).message); }
          }} />
          <RefillForm fleet={fleet} onRecorded={refresh} />
        </>}
        {role === "CITIZEN" && connected && wards.length > 0 && <CitizenPortal wards={wards} requests={requests} onSubmitRequest={async input => {
          const data = await api("/requests", input);
          setRequests(previous => [data.request, ...previous.filter(r => r.id !== data.request.id)]);
        }} onRateDelivery={async (id, rating) => { await api("/requests/rating", { requestId: id, rating }); setRequests(previous => previous.map(r => r.id === id ? { ...r, rating } : r)); }} />}
        {role === "DRIVER" && connected && tanker && <DriverPortal key={`${tanker.id}:${tanker.assignedRoute[0]?.requestId || "idle"}`} tanker={tanker} onSimulateMoveToStop={async () => {
          const p = await currentGps(); await api("/telemetry", { tankerId: tanker.id, coordinates: { lat: p.coords.latitude, lng: p.coords.longitude }, accuracyMeters: p.coords.accuracy, speedKmph: Math.max(0, (p.coords.speed || 0) * 3.6), sampledAt: new Date(p.timestamp).toISOString() }); await refresh();
        }} onVerifyDelivery={async (requestId, driverOtpInput, litersDelivered, photo) => {
          const p = await currentGps();
          const result = await api("/delivery/verify", { requestId, driverOtpInput, litersDelivered, photoProofBase64: photo?.split(",")[1], driverGps: { lat: p.coords.latitude, lng: p.coords.longitude }, accuracyMeters: p.coords.accuracy });
          await refresh(); return result;
        }} />}
        {role === "PUBLIC_BOARD" && <PublicTransparencyBoard wards={wards} requests={requests} anomalies={anomalies} canReadEvidence={session.roles.includes("Auditor")} />}
        {role === "AWS_ARCHITECTURE" && <DedicatedMachinePage />}
        {role === "LANDING" && <LandingPage onNavigate={changeRole} />}
        {role === "HEATMAP" && <DedicatedSkylinePage />}
        {!connected && !["AWS_ARCHITECTURE", "PUBLIC_BOARD", "LANDING", "HEATMAP"].includes(role) && <p className="glossy-panel p-10 rounded-2xl">Waiting for your authorized AWS workspace. Connection retries automatically.</p>}
        {connected && role === "CITIZEN" && !wards.length && <p className="glossy-panel p-10 rounded-2xl">No verified service areas are available yet. Water requests open after the operator supplies verified collection points.</p>}
        {connected && role === "DRIVER" && !tanker && <p className="glossy-panel p-10 rounded-2xl">No tanker is assigned to this account.</p>}
      </div>
    </main>
    <footer className="site-footer"><span className="footer-brand">jal—setu <span>जल–सेतु</span></span><span>Connecting communities to accountable water supply.</span><span>Built with AWS · Designed for Delhi</span></footer>
  </div>;
}
