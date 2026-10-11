import React from "react";
import { Code, Monitor, GraduationCap, Briefcase, Flame, Rocket, Star, MessageSquare, Check, Package } from "lucide-react";

export function CommunityArchHero() {
  return (
    <div className="relative w-full overflow-hidden py-16 px-4 flex flex-col items-center justify-center text-center bg-white/70 backdrop-blur-sm rounded-3xl border border-slate-200/80 shadow-sm my-8">
      {/* Background Soft Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-b from-sky-100/40 via-amber-50/30 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Arch Curve Visualization Container */}
      <div className="relative w-full max-w-4xl h-[280px] sm:h-[320px] flex items-center justify-center">
        {/* SVG Concentric Arches */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 800 340"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Outer Arch */}
          <path
            d="M 100 320 C 100 120, 700 120, 700 320"
            stroke="#E2E8F0"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
          {/* Inner Arch */}
          <path
            d="M 180 320 C 180 170, 620 170, 620 320"
            stroke="#CBD5E1"
            strokeWidth="1.5"
          />
        </svg>

        {/* Floating Avatars & Activity Badges along the arch */}

        {/* Outer Left Badge: Release Shipped */}
        <div className="absolute top-[160px] left-[8%] sm:left-[14%] flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/90 text-emerald-800 text-[11px] font-semibold border border-emerald-300 shadow-sm animate-pulse">
          <Check size={12} className="text-emerald-600" />
          <span>Resident confirmation</span>
        </div>

        {/* Left Avatar: Resident */}
        <div className="absolute top-[180px] left-[20%] sm:left-[24%] -translate-x-1/2 flex flex-col items-center">
          <div className="w-11 h-11 rounded-full ring-4 ring-amber-100 bg-amber-400 overflow-hidden shadow-md flex items-center justify-center text-lg">
            👩🏽
          </div>
        </div>

        {/* Top-Left Activity: Rocket */}
        <div className="absolute top-[80px] left-[28%] sm:left-[32%] flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-xs shadow-md">
          <Rocket size={13} className="text-rose-500" />
          <span className="font-bold text-slate-700 text-[11px]">Route</span>
        </div>

        {/* Top-Left Inner: Fire Flame */}
        <div className="absolute top-[140px] left-[32%] sm:left-[35%] flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-[10px] shadow-sm">
          <Flame size={12} className="text-orange-500" />
          <span className="font-semibold text-slate-700">Need</span>
        </div>

        {/* Top-Center Badge: Active Discussions */}
        <div className="absolute top-[40px] left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 border border-slate-200 text-xs font-medium text-slate-700 shadow-sm">
          <MessageSquare size={13} className="text-sky-500" />
          <span>Household requests</span>
        </div>

        {/* Center Node Avatar: Dispatcher */}
        <div className="absolute top-[110px] left-1/2 -translate-x-1/2">
          <div className="w-9 h-9 rounded-full ring-4 ring-sky-100 bg-sky-500 overflow-hidden shadow-md flex items-center justify-center text-sm text-white font-bold">
            👨🏾
          </div>
        </div>

        {/* Top-Right Star Rating */}
        <div className="absolute top-[80px] right-[28%] sm:right-[32%] flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-xs shadow-md">
          <Star size={13} className="text-amber-500 fill-amber-400" />
          <span className="font-bold text-slate-700 text-[11px]">Review</span>
        </div>

        {/* Center-Right: Package Deliveries */}
        <div className="absolute top-[135px] right-[32%] sm:right-[35%] flex items-center justify-center w-8 h-8 rounded-xl bg-white border border-slate-200 shadow-sm">
          <Package size={14} className="text-amber-600" />
        </div>

        {/* Right Avatar: Tanker Driver */}
        <div className="absolute top-[115px] right-[20%] sm:right-[22%] flex flex-col items-center">
          <div className="w-12 h-12 rounded-full ring-4 ring-purple-100 bg-purple-600 overflow-hidden shadow-md flex items-center justify-center text-xl">
            🧔🏽
          </div>
        </div>

        {/* Outer Right Badge: Completed Checks */}
        <div className="absolute top-[180px] right-[18%] sm:right-[20%] w-7 h-7 rounded-full bg-emerald-200/90 text-emerald-800 border border-emerald-400 flex items-center justify-center shadow-sm">
          <Check size={14} className="text-emerald-700 stroke-[3]" />
        </div>

        {/* Far Right Counter */}
        <div className="absolute top-[170px] right-[10%] sm:right-[12%] flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-[10px] text-slate-600 shadow-sm">
          <span>💧 Water</span>
        </div>
      </div>

      {/* Main Metric Counters (Report | Route | Verify) */}
      <div className="relative z-10 flex items-center justify-center gap-8 sm:gap-16 pt-2 pb-6">
        <div>
          <div className="text-xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-mono">
            Report
          </div>
          <div className="text-xs font-semibold text-slate-500 mt-0.5">
            Household needs
          </div>
        </div>
        <div className="w-px h-10 bg-slate-200" />
        <div>
          <div className="text-xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-mono">
            Route
          </div>
          <div className="text-xs font-semibold text-slate-500 mt-0.5">
            Road planning
          </div>
        </div>
        <div className="w-px h-10 bg-slate-200" />
        <div>
          <div className="text-xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-mono">
            Verify
          </div>
          <div className="text-xs font-semibold text-slate-500 mt-0.5">
            Delivery evidence
          </div>
        </div>
      </div>

      {/* Heading */}
      <h2 className="relative z-10 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mb-8">
        Where Citizens, Drivers & Municipalities Connect
      </h2>

      {/* Bottom Category Filter Pills */}
      <div className="relative z-10 flex flex-wrap items-center justify-center gap-3">
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200/90 hover:border-slate-300 text-xs font-medium text-slate-700 shadow-sm transition">
          <Code size={14} className="text-slate-500" />
          <span>Open Ledger</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200/90 hover:border-slate-300 text-xs font-medium text-slate-700 shadow-sm transition">
          <Monitor size={14} className="text-sky-600" />
          <span>Real-time Fleet</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200/90 hover:border-slate-300 text-xs font-medium text-slate-700 shadow-sm transition">
          <GraduationCap size={14} className="text-emerald-600" />
          <span>Civic Verification</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200/90 hover:border-slate-300 text-xs font-medium text-slate-700 shadow-sm transition">
          <Briefcase size={14} className="text-amber-600" />
          <span>Driver Registry</span>
        </div>
      </div>
    </div>
  );
}
export default CommunityArchHero;
