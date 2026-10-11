import { ArrowRight, Droplets, MapPin, Truck, ShieldCheck, Cpu } from "lucide-react";
import MetroHero from "../ui/scroll-locked-video-hero";
import { GateOpening3D } from "../ui/GateOpening3D";
import { CommunityArchHero } from "../ui/CommunityArchHero";
import { TiltedGridHero } from "../ui/TiltedGridHero";
import { ProductTimeline } from "../ui/ProductTimeline";
import { ContributionSkyline3D } from "../ui/ContributionSkyline3D";
import type { CrowdResident } from "../ui/CanvasCrowd";
import type { StakeholderRole } from "../../types";

interface LandingPageProps {
  onNavigate: (role: StakeholderRole) => void;
  onSelectResidentForRequest?: (resident: CrowdResident) => void;
  onOpenAuth?: (tab?: "signin" | "signup") => void;
}
export function LandingPage({ onNavigate, onOpenAuth }: LandingPageProps) {
  return <div className="landing-page">
    <section className="landing-hero">
      <MetroHero title="THE CITY OPENS" tagline="Every drop. Every delivery. Accounted for."
        scrollHint="Explore the water network" ctaLabel="Create your account"
        onCta={() => onOpenAuth ? onOpenAuth("signup") : onNavigate("CITIZEN")} />
      <div className="hero-context">
        <div><Droplets size={22} /><p><strong>Water access, connected.</strong><span>Household needs. Road routes. Verified deliveries.</span></p></div>
        <button onClick={() => onNavigate("PUBLIC_BOARD")}>Explore the public ledger <ArrowRight size={18} /></button>
      </div>
    </section>
    <ProductTimeline />
    <CommunityArchHero />
    <TiltedGridHero />
    <GateOpening3D onEnterProject={() => onOpenAuth ? onOpenAuth("signup") : onNavigate("CITIZEN")} />
    <section className="landing-ledger" aria-label="Recorded water deliveries">
      <div className="section-intro"><span className="section-kicker">Open delivery records</span><h2>See the water that reached people.</h2>
        <p>Explore verified delivery activity from the public ledger. Only recorded deliveries contribute to these totals.</p></div>
      <ContributionSkyline3D onSelectDay={() => onNavigate("PUBLIC_BOARD")} />
      <button className="secondary-action mt-4" onClick={() => onNavigate("PUBLIC_BOARD")}>Open transparency board <ArrowRight size={16} /></button>
    </section>
    <section className="story-section workspace-launchpad" aria-labelledby="workspace-title">
      <div className="section-intro"><span className="section-kicker">Your place in the network</span><h2 id="workspace-title">A workspace for the work you do.</h2><p>Sign in to access the tools assigned to your role, or explore the public records.</p></div>
      <div className="workspace-card-grid">
        {[
          { role: "CITIZEN" as const, icon: Droplets, title: "Citizen portal", text: "Report household needs and follow your water requests.", action: "Report water needs" },
          { role: "DISPATCHER" as const, icon: MapPin, title: "Command center", text: "Coordinate requests, road routes, and fleet assignments.", action: "Open command center" },
          { role: "DRIVER" as const, icon: Truck, title: "Driver workspace", text: "View your stops and record delivery evidence.", action: "Open driver workspace" },
          { role: "PUBLIC_BOARD" as const, icon: ShieldCheck, title: "Public ledger", text: "Review recorded deliveries and water distribution.", action: "View public records" },
        ].map(({role, icon: Icon, title, text, action}) => <button className="workspace-link-card" key={role} onClick={() => onNavigate(role)}>
          <Icon size={25} /><h3>{title}</h3><p>{text}</p><span>{action}<ArrowRight size={16} /></span>
        </button>)}
      </div>
      <button className="architecture-link" onClick={() => onNavigate("AWS_ARCHITECTURE")}><Cpu size={20} /><span>Curious how it works? Explore the animated AWS architecture.</span><ArrowRight size={18} /></button>
    </section>
  </div>;
}
