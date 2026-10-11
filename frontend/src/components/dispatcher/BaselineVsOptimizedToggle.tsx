import React from "react";
import { OptimizationMetrics } from "../../types";
import {
  Zap,
  Clock,
  Route,
  Fuel,
  CheckCircle2,
  TrendingDown,
  Sliders,
  ShieldCheck,
} from "lucide-react";
import { formatInr } from "../../utils/formatters";

interface BaselineVsOptimizedToggleProps {
  isOptimized: boolean;
  onToggle: (optimized: boolean) => void;
  metrics: OptimizationMetrics;
}

export const BaselineVsOptimizedToggle: React.FC<
  BaselineVsOptimizedToggleProps
> = ({ isOptimized, onToggle, metrics }) => {
  const current = isOptimized ? metrics.optimized : metrics.baseline;

  return (
    <div className="glossy-card p-5 rounded-2xl border border-slate-200/90 bg-white/95 shadow-md space-y-4">
      {/* Header & Toggle Switch */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-[#D9532F]" />
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
              Dispatch scenario comparison
            </h3>
            <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-300">
              Illustrative demo scenario
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-0.5">
            Compare legacy nearest-first dispatch against AI
            vulnerability-weighted dynamic routing
          </p>
        </div>

        {/* The Hero Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
          <button
            id="btn-baseline-mode"
            onClick={() => onToggle(false)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              !isOptimized
                ? "bg-amber-500 text-white shadow-md"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>Legacy Baseline</span>
          </button>

          <button
            id="btn-optimized-mode"
            onClick={() => onToggle(true)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              isOptimized
                ? "btn-terracotta text-white shadow-md"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Zap className="w-3.5 h-3.5 fill-white" />
            <span>Priority routing (demo)</span>
          </button>
        </div>
      </div>

      {/* Hero Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {/* Metric 1: Total Route KM */}
        <div
          className={`p-4 rounded-xl border transition-all ${
            isOptimized
              ? "bg-emerald-50/70 border-emerald-300/80"
              : "bg-slate-50 border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between text-slate-600 text-xs mb-1 font-medium">
            <span className="flex items-center gap-1.5">
              <Route className="w-3.5 h-3.5 text-emerald-700" />
              <span>Total Fleet Travel</span>
            </span>
            {isOptimized && (
              <span className="text-[10px] font-bold text-emerald-800 flex items-center bg-emerald-100 px-1.5 py-0.2 rounded font-mono">
                <TrendingDown className="w-3 h-3 mr-0.5" /> -
                {metrics.optimized.kmSavedPercent}%
              </span>
            )}
          </div>
          <div className="text-2xl font-black font-mono text-slate-900">
            {current.totalKmPlanned}{" "}
            <span className="text-xs font-normal text-slate-500">km</span>
          </div>
          <div className="text-[11px] text-slate-600 mt-1 font-medium">
            {isOptimized ? (
              <span className="text-emerald-800 font-semibold">
                {metrics.heroDifference.kmSaved} km saved in Delhi
              </span>
            ) : (
              <span className="text-amber-700">Overlapping route paths</span>
            )}
          </div>
        </div>

        {/* Metric 2: Average Wait Time */}
        <div
          className={`p-4 rounded-xl border transition-all ${
            isOptimized
              ? "bg-emerald-50/70 border-emerald-300/80"
              : "bg-slate-50 border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between text-slate-600 text-xs mb-1 font-medium">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-700" />
              <span>Avg Citizen Wait</span>
            </span>
            {isOptimized && (
              <span className="text-[10px] font-bold text-emerald-800 flex items-center bg-emerald-100 px-1.5 py-0.2 rounded font-mono">
                <TrendingDown className="w-3 h-3 mr-0.5" /> -4.0 hrs
              </span>
            )}
          </div>
          <div className="text-2xl font-black font-mono text-slate-900">
            {current.avgWaitTimeHours}{" "}
            <span className="text-xs font-normal text-slate-500">hrs</span>
          </div>
          <div className="text-[11px] text-slate-600 mt-1 font-medium">
            {isOptimized ? (
              <span className="text-emerald-800 font-semibold">
                Priority to dry clusters
              </span>
            ) : (
              <span className="text-amber-700">Arbitrary dispatch queue</span>
            )}
          </div>
        </div>

        {/* Metric 3: Fleet Fuel Cost */}
        <div
          className={`p-4 rounded-xl border transition-all ${
            isOptimized
              ? "bg-orange-50/70 border-[#FDBA99]"
              : "bg-slate-50 border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between text-slate-600 text-xs mb-1 font-medium">
            <span className="flex items-center gap-1.5">
              <Fuel className="w-3.5 h-3.5 text-[#D9532F]" />
              <span>Estimated Diesel Cost</span>
            </span>
            {isOptimized && (
              <span className="text-[10px] font-bold text-[#D9532F] bg-orange-100 px-1.5 py-0.2 rounded font-mono">
                Save {formatInr(metrics.heroDifference.fuelSavingsInr)}/day
              </span>
            )}
          </div>
          <div className="text-2xl font-black font-mono text-slate-900">
            {formatInr(current.fuelEstimatedInr)}
          </div>
          <div className="text-[11px] text-slate-600 mt-1 font-medium">
            {isOptimized ? (
              <span className="text-emerald-800 font-semibold">
                {metrics.optimized.carbonReductionKg} kg CO₂ mitigated
              </span>
            ) : (
              <span className="text-amber-700">Excessive diesel burn</span>
            )}
          </div>
        </div>

        {/* Metric 4: SLA Compliance Rate */}
        <div
          className={`p-4 rounded-xl border transition-all ${
            isOptimized
              ? "bg-emerald-50/70 border-emerald-300/80"
              : "bg-slate-50 border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between text-slate-600 text-xs mb-1 font-medium">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
              <span>SLA Met Rate</span>
            </span>
            {isOptimized && (
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded font-mono">
                +{metrics.heroDifference.slaBoostPercent}%
              </span>
            )}
          </div>
          <div className="text-2xl font-black font-mono text-slate-900">
            {current.slaCompliancePercent}%
          </div>
          <div className="text-[11px] text-slate-600 mt-1 font-medium">
            {isOptimized ? (
              <span className="text-emerald-800 font-semibold">
                0 critical requests breached
              </span>
            ) : (
              <span className="text-rose-700 font-semibold">
                4 critical requests unserved
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Proof of Delivery Summary Badge */}
      <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
        <div className="flex items-center gap-2 text-slate-700 font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>
            <strong>Multi-Factor Proof of Delivery:</strong> Live mode requires
            resident OTP, GPS location and uploaded photo evidence.
          </span>
        </div>
        <span className="hidden md:inline-block font-mono text-[#D9532F] font-bold text-[11px]">
          Demo data · Not measured results
        </span>
      </div>
    </div>
  );
};
