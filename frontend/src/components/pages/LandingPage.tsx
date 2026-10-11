import React from "react";
import { ArrowRight, ShieldCheck, Droplets, MapPin, Cpu, Truck } from "lucide-react";
import MetroHero from "../ui/scroll-locked-video-hero";
import { GateOpening3D } from "../ui/GateOpening3D";
import { CommunityArchHero } from "../ui/CommunityArchHero";
import { TiltedGridHero } from "../ui/TiltedGridHero";
import { ProductTimeline } from "../ui/ProductTimeline";
import { CanvasCrowd, type CrowdResident } from "../ui/CanvasCrowd";
import { ContributionSkyline3D } from "../ui/ContributionSkyline3D";
import { ShinyButton } from "../ui/ShinyButton";
import type { StakeholderRole } from "../../types";

interface LandingPageProps {
  onNavigate: (role: StakeholderRole) => void;
  onSelectResidentForRequest?: (resident: CrowdResident) => void;
  onOpenAuth?: (tab?: "signin" | "signup") => void;
}

export function LandingPage({ onNavigate, onSelectResidentForRequest, onOpenAuth }: LandingPageProps) {
  const handleResidentSelect = (resident: CrowdResident) => {
    onSelectResidentForRequest?.(resident);
    onNavigate("CITIZEN");
  };

  return (
    <div className="w-full space-y-16 pb-20">
      {/* ─────────────────────────────────────────────────────────────
          SECTION 1: THE CITY OPENS — CINEMATIC VIDEO HERO (Ref Image 4)
      ───────────────────────────────────────────────────────────── */}
      <section className="relative rounded-3xl overflow-hidden border border-slate-800 shadow-2xl bg-black">
        <MetroHero
          title="THE CITY OPENS"
          tagline="Every drop. Every delivery. Accounted for."
          scrollHint="SCROLL TO ENTER THE WATER GRID"
          scrubDistance={2800}
        />

        {/* Action banner at bottom of hero */}
        <div className="absolute bottom-6 inset-x-4 md:inset-x-12 z-20 flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-950/80 backdrop-blur-xl border border-white/10 text-white shadow-2xl">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Droplets size={20} />
            </span>
            <div>
              <strong className="text-sm block">JalSetu: Delhi Municipal Water Grid</strong>
              <span className="text-xs text-slate-400">Verifiable, anti-cartel serverless water logistics</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => (onOpenAuth ? onOpenAuth("signup") : onNavigate("DISPATCHER"))}
              className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-xs font-black transition flex items-center gap-1.5 shadow-lg cursor-pointer"
            >
              <span>Get Started / Sign Up</span>
              <ArrowRight size={14} />
            </button>
            <button
              onClick={() => onNavigate("DISPATCHER")}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition flex items-center gap-1.5 shadow-lg cursor-pointer"
            >
              <span>Command Center</span>
              <ArrowRight size={14} />
            </button>
            <button
              onClick={() => onNavigate("AWS_ARCHITECTURE")}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition flex items-center gap-1.5 border border-slate-700 cursor-pointer"
            >
              <Cpu size={14} className="text-orange-400" />
              <span>Explore 3D Machine</span>
            </button>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 2: 3D GATE OPENING HYDRAULIC PORTAL
      ───────────────────────────────────────────────────────────── */}
      <section className="w-full">
        <GateOpening3D onEnterProject={() => (onOpenAuth ? onOpenAuth("signup") : onNavigate("DISPATCHER"))} />
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 3: COMMUNITY ARCH HERO — BUILDERS SHIP TOGETHER (Ref Image 1)
      ───────────────────────────────────────────────────────────── */}
      <section className="w-full">
        <CommunityArchHero />
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 4: TILTED GRID PERSPECTIVE GALLERY (Ref Image 4)
      ───────────────────────────────────────────────────────────── */}
      <section className="w-full">
        <TiltedGridHero />
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 5: PRODUCT STORYLINE TIMELINE (Ref Image 3)
      ───────────────────────────────────────────────────────────── */}
      <section className="w-full">
        <ProductTimeline />
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 6: CANVAS CROWD — DIVERSE DELHI CITIZENS (Ref Image 1)
      ───────────────────────────────────────────────────────────── */}
      <section className="w-full">
        <div className="mb-4">
          <span className="text-xs font-mono font-bold tracking-widest text-emerald-700 uppercase">
            COMMUNITY FIRST · ZERO PHANTOM TRIPS
          </span>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1 font-sans">
            Every Voice in Delhi Accounted For
          </h2>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            From Sangam Vihar to Seelampur, resident grievances are triaged by Amazon Bedrock AI and secured with single-use OTPs. Tap any neighbor in the crowd below to test automated relief pre-fill:
          </p>
        </div>

        <CanvasCrowd onSelectResident={handleResidentSelect} />
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 7: 3D CONTRIBUTION SKYLINE — EQUITY MATRIX (Ref Image 2 & 5)
      ───────────────────────────────────────────────────────────── */}
      <section className="w-full">
        <div className="mb-4">
          <span className="text-xs font-mono font-bold tracking-widest text-emerald-700 uppercase">
            MUNICIPAL VOLUMETRIC ACTIVITY · 365 DAYS
          </span>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1 font-sans">
            3D Verified Water Supply Skyline
          </h2>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Orbit the true 3D isometric extruded grid below to inspect deliveries, summer crisis spikes, and uninterrupted community water streaks:
          </p>
        </div>

        <ContributionSkyline3D
          onSelectDay={() => {
            onNavigate("PUBLIC_BOARD");
          }}
        />
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 8: SYSTEM LAUNCHPAD & DEDICATED DESTINATIONS (Shiny Buttons)
      ───────────────────────────────────────────────────────────── */}
      <section className="rounded-3xl bg-slate-900 text-white p-8 md:p-12 border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl mb-8">
          <span className="text-xs font-mono font-bold text-orange-400 tracking-widest uppercase">
            STANDALONE WORKSPACES
          </span>
          <h2 className="text-3xl font-extrabold tracking-tight mt-1">
            Choose Your Operational Workspace
          </h2>
          <p className="text-sm text-slate-400 mt-2">
            Each role operates with isolated permissions, cryptographic audit guarantees, and real-time AWS event synchronization.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
          {/* Card 1: 3D Architecture Machine */}
          <div
            onClick={() => onNavigate("AWS_ARCHITECTURE")}
            className="p-6 rounded-2xl bg-slate-950/80 border border-orange-500/40 hover:border-orange-400 transition-all cursor-pointer group shadow-xl hover:-translate-y-1"
          >
            <div className="p-3 w-fit rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30 mb-4">
              <Cpu size={24} />
            </div>
            <strong className="text-lg font-bold block text-white group-hover:text-orange-300">
              3D Architecture Engine
            </strong>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              The 5-module cybernetic simulator: API Gateway, SQS FIFO, Bedrock AI, Step Functions, DynamoDB.
            </p>
            <span className="inline-flex items-center gap-1.5 text-xs text-orange-400 font-bold mt-4">
              <span>Inspect 3D Machine</span>
              <ArrowRight size={14} />
            </span>
          </div>

          {/* Card 2: Command Center */}
          <div
            onClick={() => onNavigate("DISPATCHER")}
            className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-emerald-500/50 transition-all cursor-pointer group shadow-xl hover:-translate-y-1"
          >
            <div className="p-3 w-fit rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mb-4">
              <MapPin size={24} />
            </div>
            <strong className="text-lg font-bold block text-white group-hover:text-emerald-300">
              Command Center
            </strong>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              OpenStreetMap live telemetry cartography, radar fleet sweeps, VRP route optimization, and ward triage.
            </p>
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-bold mt-4">
              <span>Open Radar Map</span>
              <ArrowRight size={14} />
            </span>
          </div>

          {/* Card 3: Citizen Portal */}
          <div
            onClick={() => onNavigate("CITIZEN")}
            className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-sky-500/50 transition-all cursor-pointer group shadow-xl hover:-translate-y-1"
          >
            <div className="p-3 w-fit rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 mb-4">
              <Droplets size={24} />
            </div>
            <strong className="text-lg font-bold block text-white group-hover:text-sky-300">
              Citizen & RWA Portal
            </strong>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Hindi voice note intake, Bedrock urgency classification, and dynamic 6-digit OTP confirmation.
            </p>
            <span className="inline-flex items-center gap-1.5 text-xs text-sky-400 font-bold mt-4">
              <span>Request Water</span>
              <ArrowRight size={14} />
            </span>
          </div>

          {/* Card 4: Driver Workspace */}
          <div
            onClick={() => onNavigate("DRIVER")}
            className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-purple-500/50 transition-all cursor-pointer group shadow-xl hover:-translate-y-1"
          >
            <div className="p-3 w-fit rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 mb-4">
              <Truck size={24} />
            </div>
            <strong className="text-lg font-bold block text-white group-hover:text-purple-300">
              Driver Handshake
            </strong>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Amazon Location geofence validation, 6-digit resident OTP check, and S3 camera photographic evidence.
            </p>
            <span className="inline-flex items-center gap-1.5 text-xs text-purple-400 font-bold mt-4">
              <span>Start Run</span>
              <ArrowRight size={14} />
            </span>
          </div>
        </div>

        {/* Global CTA button with ShinyButton styling */}
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-6 pt-8 border-t border-slate-800/80">
          <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
            <ShieldCheck size={16} className="text-emerald-400" />
            <span>PROTECTED BY AMAZON COGNITO RBAC & CEDAR POLICIES</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <ShinyButton onClick={() => (onOpenAuth ? onOpenAuth("signup") : onNavigate("DISPATCHER"))}>
              <span>Enter Operations / Sign Up</span>
              <ArrowRight size={15} />
            </ShinyButton>
            <button
              onClick={() => onNavigate("PUBLIC_BOARD")}
              className="px-4 py-2.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition cursor-pointer"
            >
              <span>View Public Civic Ledger</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
export default LandingPage;
