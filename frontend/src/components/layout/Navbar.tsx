import { useState } from "react";
import {
  Droplets,
  Map,
  Truck,
  Users,
  ShieldCheck,
  Cpu,
  RotateCcw,
  Film,
  X,
  Box,
} from "lucide-react";
import type { StakeholderRole } from "../../types";
import { LIVE_MODE } from "../../services/api";
import { rolePortals, type AuthSession } from "../../services/auth";
import MetroHero from "../ui/scroll-locked-video-hero";
interface Props {
  session: AuthSession | null;
  connected: boolean;
  onSignOut: () => void;
  currentRole: StakeholderRole;
  onSelectRole: (role: StakeholderRole) => void;
  activeAlertCount: number;
  totalVerifiedLiters: number;
  onResetDemo?: () => void;
  onTriggerGhostTripDemo?: () => void;
}
export function Navbar({
  session,
  connected,
  onSignOut,
  currentRole,
  onSelectRole,
  activeAlertCount,
  onResetDemo,
}: Props) {
  const [showHero, setShowHero] = useState(false);
  const roles = [
    { id: "DISPATCHER", label: "Command center", icon: Map },
    { id: "CITIZEN", label: "Citizen portal", icon: Users },
    { id: "DRIVER", label: "Driver workspace", icon: Truck },
    { id: "PUBLIC_BOARD", label: "Transparency", icon: ShieldCheck },
    { id: "AWS_ARCHITECTURE", label: "3D Machine", icon: Cpu },
    { id: "HEATMAP", label: "3D Skyline", icon: Box },
    { id: "LANDING", label: "Story & Intro", icon: Film },
  ] as const;
  return (
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
        <div className="header-right">
          <button
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border border-sky-400/50 bg-sky-950/20 hover:bg-sky-900/30 text-sky-800 transition"
            onClick={() => setShowHero(true)}
            title="Experience 'The City Opens' Locked Video Hero"
          >
            <Film size={13} className="text-sky-600" />
            <span>Video Hero</span>
          </button>
          {!LIVE_MODE && (
            <span className="region-label">
              New Delhi <span>•</span> Water operations
            </span>
          )}
          {!LIVE_MODE && (
            <span className="mode-pill">
              <span className="status-dot" />
              {LIVE_MODE ? "AWS mode" : "Interactive demo"}
            </span>
          )}
          {LIVE_MODE && (
            <div className="hidden md:flex items-center gap-1.5">
              <button
                type="button"
                className="px-2.5 py-1 rounded-lg text-xs font-medium border border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-300 transition cursor-pointer"
                onClick={() => onSelectRole("AWS_ARCHITECTURE")}
                title="View 3D Cybernetic Machine Architecture"
              >
                3D Machine
              </button>
              <button
                type="button"
                className="px-2.5 py-1 rounded-lg text-xs font-medium border border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-300 transition cursor-pointer"
                onClick={() => onSelectRole("HEATMAP")}
                title="View 3D Contribution Skyline"
              >
                3D Skyline
              </button>
              <button
                type="button"
                className="px-2.5 py-1 rounded-lg text-xs font-medium border border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-300 transition cursor-pointer"
                onClick={() => onSelectRole("LANDING")}
                title="View Story & Cinematic Video Hero"
              >
                Story & Intro
              </button>
            </div>
          )}
          {session && (
            <div className="auth-profile">
              <span
                className={`auth-role-badge persona-${session.roles[0].toLowerCase()}`}
              >
                {session.roles.find(
                  (role) => rolePortals[role] === currentRole,
                ) || session.roles[0]}
              </span>
              <div className="auth-profile-info">
                <span className="auth-profile-email">{session.email}</span>
                <span
                  role="status"
                  className={`auth-profile-status ${connected ? "" : "reconnecting"}`}
                >
                  {connected ? "✓ ● Live AWS Connected" : "● Connecting to AWS"}
                </span>
              </div>
              <button onClick={onSignOut}>Switch Role / Sign Out</button>
            </div>
          )}
          {!LIVE_MODE && (
            <button
              className="reset-button"
              onClick={onResetDemo}
              aria-label="Reset demo"
            >
              <RotateCcw size={16} />
            </button>
          )}
        </div>
      </div>
      <nav className="role-navigation" aria-label="Workspaces">
        {roles
          .filter(
            ({ id }) =>
              !LIVE_MODE ||
              id === "AWS_ARCHITECTURE" ||
              session?.roles.some((role) => rolePortals[role] === id),
          )
          .map(({ id, label, icon: Icon }, i) => (
            <button
              key={id}
              id={`nav-tab-${id.toLowerCase()}`}
              aria-current={currentRole === id ? "page" : undefined}
              className={`role-tab ${currentRole === id ? "selected" : ""}`}
              onClick={() => onSelectRole(id)}
            >
              <span className="tab-number">0{i + 1}</span>
              <Icon size={16} />
              <span>{label}</span>
              {id === "DISPATCHER" && activeAlertCount > 0 && (
                <span className="alert-count">{activeAlertCount}</span>
              )}
            </button>
          ))}
      </nav>
      {showHero && (
        <div className="fixed inset-0 z-[99999] bg-black">
          <button
            onClick={() => setShowHero(false)}
            className="fixed top-6 right-6 z-[100000] px-4 py-2 rounded-full bg-slate-900/90 text-white border border-white/20 text-xs font-mono font-bold tracking-wider hover:bg-slate-800 shadow-2xl flex items-center gap-2 cursor-pointer transition backdrop-blur-md"
          >
            <X size={15} /> EXIT "THE CITY OPENS"
          </button>
          <MetroHero />
        </div>
      )}
    </header>
  );
}
