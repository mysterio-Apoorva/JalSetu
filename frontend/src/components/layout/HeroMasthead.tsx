import { useState } from "react";
import { ArrowUpRight, Droplets, MapPin, ShieldCheck, Film, X } from "lucide-react";
import type { StakeholderRole } from "../../types";
import MetroHero from "../ui/scroll-locked-video-hero";
interface Props {
  onSelectRole: (role: StakeholderRole) => void;
  onTriggerGhostTripDemo: () => void;
  onResetDemo: () => void;
  activeAlertCount: number;
}
export function HeroMasthead({ onSelectRole }: Props) {
  const [showMetroHero, setShowMetroHero] = useState(false);
  const open = (role: StakeholderRole) => {
    onSelectRole(role);
    setTimeout(
      () =>
        document
          .getElementById("workspace")
          ?.scrollIntoView({ behavior: "smooth" }),
      50,
    );
  };
  return (
    <section className="water-hero">
      <div className="hero-copy">
        <div className="eyebrow">
          <span className="status-dot" /> WATER EQUITY, BY DESIGN{" "}
          <span className="hero-edition">NEW DELHI / INDIA</span>
        </div>
        <h1>
          Every drop.
          <br />
          Every delivery.
          <br />
          <span>Accounted for.</span>
        </h1>
        <p>
          A clearer path from water shortage to verified supply. Prioritize the
          communities that need it most. Dispatch smarter. Make every delivery
          count.
        </p>
        <div className="hero-actions">
          <button className="primary-action" onClick={() => open("CITIZEN")}>
            Request water <ArrowUpRight size={18} />
          </button>
          <button
            className="secondary-action"
            onClick={() => open("PUBLIC_BOARD")}
          >
            Explore water equity <ArrowUpRight size={17} />
          </button>
          <button
            className="secondary-action inline-flex items-center gap-1.5 border-sky-400/40 bg-sky-950/20 text-sky-700 hover:bg-sky-100/60"
            onClick={() => setShowMetroHero(true)}
            title="Experience the locked scroll video scrub hero"
          >
            <Film size={15} className="text-sky-600" />
            "The City Opens" Hero
          </button>
        </div>
        {showMetroHero && (
          <div className="fixed inset-0 z-[99999] bg-black">
            <button
              onClick={() => setShowMetroHero(false)}
              className="fixed top-6 right-6 z-[100000] px-4 py-2 rounded-full bg-slate-900/90 text-white border border-white/20 text-xs font-mono font-bold tracking-wider hover:bg-slate-800 shadow-2xl flex items-center gap-2 cursor-pointer transition backdrop-blur-md"
            >
              <X size={15} /> EXIT "THE CITY OPENS"
            </button>
            <MetroHero />
          </div>
        )}
        <div className="hero-caption">
          <ShieldCheck size={16} /> Resident confirmation. Location check. Photo
          evidence.
        </div>
      </div>
      <div
        className="water-visual"
        aria-label="Illustration of a verified water delivery network"
      >
        <div className="orbital orbital-one" />
        <div className="orbital orbital-two" />
        <div className="orbital orbital-three" />
        <div className="visual-coordinates">
          28.6139° N<br />
          77.2090° E
        </div>
        <div className="water-drop">
          <Droplets strokeWidth={1} />
        </div>
        <div className="visual-label">
          THE WATER CONNECTION<span>जल–सेतु</span>
        </div>
        <div className="floating-proof">
          <span className="proof-icon">
            <ShieldCheck size={20} />
          </span>
          <div>
            <small>DESIGNED FOR TRUST</small>
            <strong>Proof in every drop</strong>
          </div>
          <span className="proof-check">↗</span>
        </div>
        <div className="floating-location">
          <MapPin size={15} /> Built around communities
        </div>
        <span className="visual-index">01 — WATER INTELLIGENCE</span>
      </div>
    </section>
  );
}
