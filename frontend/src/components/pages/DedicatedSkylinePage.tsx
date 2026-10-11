import React from "react";
import { ContributionSkyline3D } from "../ui/ContributionSkyline3D";
import { Scale, Calendar, ShieldCheck } from "lucide-react";

export function DedicatedSkylinePage() {

  return (
    <div className="w-full space-y-10 pb-20">
      {/* 3D Contribution Skyline Component */}
      <ContributionSkyline3D />

      {/* Ward Distribution & Gini Equity Analysis Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 text-white shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-mono">GINI FAIRNESS COEFFICIENT</span>
            <Scale className="text-emerald-400 w-5 h-5" />
          </div>
          <div className="text-3xl font-black font-mono text-emerald-400">0.24 / 1.0</div>
          <p className="text-xs text-slate-300">
            Municipal water allocation equality index across Delhi's 250 wards. Scores below 0.30 indicate highly equitable distribution.
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 text-white shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-mono">PEAK SUMMER SURGE</span>
            <Calendar className="text-amber-400 w-5 h-5" />
          </div>
          <div className="text-3xl font-black font-mono text-amber-400">54 Dispatches/Day</div>
          <p className="text-xs text-slate-300">
            Recorded during the mid-July 46°C heatwave peak. Managed with SQS FIFO buffer to prevent system failure.
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 text-white shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-mono">AUDIT HASH ACCURACY</span>
            <ShieldCheck className="text-purple-400 w-5 h-5" />
          </div>
          <div className="text-3xl font-black font-mono text-purple-400">100.0%</div>
          <p className="text-xs text-slate-300">
            Every cubic meter dispensed is cryptographically bound to resident OTPs and driver GPS coordinates.
          </p>
        </div>
      </div>
    </div>
  );
}
