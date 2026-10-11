import { LIVE_MODE } from "../../services/api";
import { TelemetryStatus } from "./TelemetryStatus";
import React, { useState } from "react";
import {
  Ward,
  Depot,
  Tanker,
  WaterRequest,
  FraudAnomaly,
  OptimizationMetrics,
} from "../../types";
import { LiveMap } from "./LiveMap";
import { MapArea3D } from "./MapArea3D";
import { BaselineVsOptimizedToggle } from "./BaselineVsOptimizedToggle";
import { AnomalyAlertBanner } from "./AnomalyAlertBanner";
import { BedrockCopilotDrawer } from "./BedrockCopilotDrawer";
import { Sparkles, Layers, Compass, Radio } from "lucide-react";
import { formatLiters } from "../../utils/formatters";

interface DispatcherDashboardProps {
  wards: Ward[];
  depots: Depot[];
  fleet: Tanker[];
  requests: WaterRequest[];
  anomalies: FraudAnomaly[];
  metrics?: OptimizationMetrics;
  isOptimizedMode: boolean;
  onToggleOptimization: (optimized: boolean) => void;
  onDismissAnomaly: (id: string) => void;
  onSelectTanker: (tanker: Tanker) => void;
  selectedTanker: Tanker | null;
}

export const DispatcherDashboard: React.FC<DispatcherDashboardProps> = ({
  wards,
  depots,
  fleet,
  requests,
  anomalies,
  metrics,
  isOptimizedMode,
  onToggleOptimization,
  onDismissAnomaly,
  onSelectTanker,
  selectedTanker,
}) => {
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"FLEET" | "REQUESTS">("FLEET");
  const [mapMode, setMapMode] = useState<"3D_RADAR" | "TACTICAL_GPS">(
    "TACTICAL_GPS",
  );

  return (
    <div className="space-y-6">
      {/* 1. Real-time Fraud Radar Banner */}
      <AnomalyAlertBanner
        anomalies={anomalies}
        onDismiss={onDismissAnomaly}
        onInspectAnomaly={(anomaly) => {
          const tanker = fleet.find((t) => t.id === anomaly.tankerId);
          if (tanker) onSelectTanker(tanker);
        }}
      />

      {/* 2. The Hero Optimization Benchmark Section */}
      {!LIVE_MODE && metrics && (
        <BaselineVsOptimizedToggle
          isOptimized={isOptimizedMode}
          onToggle={onToggleOptimization}
          metrics={metrics}
        />
      )}

      {/* 3. Main Grid: Dual Map Area & Operational Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left 8 Cols: Working Map Area (with 3D Radar vs Tactical GPS Toggle) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Map Mode Sub-header Switcher */}
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-700">
              <Radio className="w-4 h-4 text-emerald-600 animate-pulse" />
              <span>ACTIVE DISPATCH GRID</span>
            </div>

            <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-xs">
              <button
                onClick={() => setMapMode("3D_RADAR")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition ${
                  mapMode === "3D_RADAR"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Network radar</span>
              </button>
              <button
                onClick={() => setMapMode("TACTICAL_GPS")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition ${
                  mapMode === "TACTICAL_GPS"
                    ? "btn-terracotta text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Tactical GPS</span>
              </button>
            </div>
          </div>

          {/* Conditional Map Render */}
          {mapMode === "3D_RADAR" ? (
            <MapArea3D
              depots={depots}
              wards={wards}
              fleet={fleet}
              onSelectTanker={onSelectTanker}
              onSwitchToTacticalMap={() => setMapMode("TACTICAL_GPS")}
            />
          ) : (
            <LiveMap
              wards={wards}
              depots={depots}
              fleet={fleet}
              requests={requests}
              selectedTanker={selectedTanker}
              onSelectTanker={onSelectTanker}
              isOptimizedMode={isOptimizedMode}
              onSwitchTo3D={() => setMapMode("3D_RADAR")}
            />
          )}

          {/* Quick Zonal Deficit Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {wards.slice(0, 4).map((ward) => (
              <div
                key={ward.id}
                className="glossy-card p-3 rounded-xl border border-slate-200/90 text-xs"
              >
                <div className="flex items-center justify-between font-bold text-slate-900 mb-1">
                  <span className="truncate">{ward.name}</span>
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      ward.deficitSeverity === "CRITICAL"
                        ? "bg-rose-500 animate-ping"
                        : "bg-amber-500"
                    }`}
                  />
                </div>
                <div className="text-slate-500 text-[11px]">
                  Active:{" "}
                  <strong className="text-slate-800">
                    {ward.activeRequestsCount} reqs
                  </strong>
                </div>
                <div className="text-slate-500 text-[11px]">
                  Delivered:{" "}
                  <strong className="text-emerald-700">
                    {formatLiters(ward.deliveredLitersToday)}
                  </strong>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 4 Cols: Fleet Inspector & Bedrock Copilot Drawer Launcher */}
        <div className="lg:col-span-4 space-y-4">
          {/* Bedrock AI Dispatcher Copilot Card */}
          <div className="glossy-card p-4 rounded-2xl border-2 border-emerald-200/80 bg-gradient-to-br from-emerald-50/70 via-white to-sky-50/50 shadow-md">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-sm">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">
                     Bedrock AI Copilot
                  </h4>
                  <p className="text-[10px] text-emerald-700 font-mono font-medium">
                    {LIVE_MODE
                      ? "Snapshot-grounded responses"
                      : "Example responses"}
                  </p>
                </div>
              </div>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold font-mono">
                {LIVE_MODE ? "AWS MODE" : "DEMO"}
              </span>
            </div>

            <p className="text-xs text-slate-600 mb-3 leading-relaxed">
              Ask about your registered fleet and pending requests in English,
              Hindi, or Hinglish.
            </p>

            <button
              onClick={() => setIsCopilotOpen(true)}
              className="w-full py-2 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Open Natural Language Copilot</span>
            </button>
          </div>

          {/* Operational Queue Tabs (Fleet vs Requests) */}
          <div className="glossy-card rounded-2xl border border-slate-200/90 overflow-hidden shadow-sm">
            <div className="flex border-b border-slate-200 bg-slate-50/80">
              <button
                onClick={() => setActiveTab("FLEET")}
                className={`flex-1 py-2.5 text-xs font-bold transition ${
                  activeTab === "FLEET"
                    ? "bg-white text-slate-900 border-b-2 border-[#D9532F]"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Active Tankers ({fleet.length})
              </button>
              <button
                onClick={() => setActiveTab("REQUESTS")}
                className={`flex-1 py-2.5 text-xs font-bold transition ${
                  activeTab === "REQUESTS"
                    ? "bg-white text-slate-900 border-b-2 border-[#D9532F]"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Incoming Tickets ({requests.length})
              </button>
            </div>

            {/* List Body */}
            <div className="p-3 max-h-[380px] overflow-y-auto space-y-2">
              {activeTab === "FLEET"
                ? fleet.map((tanker) => {
                    const isSelected = selectedTanker?.id === tanker.id;
                    const isAnomaly = tanker.status === "ANOMALY_FLAGGED";
                    return (
                      <div
                        key={tanker.id}
                        onClick={() => onSelectTanker(tanker)}
                        className={`p-3 rounded-xl border text-xs cursor-pointer transition ${
                          isSelected
                            ? "bg-orange-50/80 border-[#FDBA99] shadow-xs"
                            : isAnomaly
                              ? "bg-rose-50 border-rose-300"
                              : "bg-white border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold font-mono text-slate-900">
                            {tanker.vehicleNumber}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                              isAnomaly
                                ? "bg-rose-100 text-rose-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {tanker.status.replace("_", " ")}
                          </span>
                        </div>
                        <div className="text-slate-600 text-[11px]">
                          Driver: <strong>{tanker.driverName}</strong> •{" "}
                          {tanker.depotName}
                        </div>
                        <p className="text-[11px] mt-1 text-slate-600"><TelemetryStatus sampledAt={tanker.telemetryAt} /></p>
                        <div className="flex items-center justify-between text-slate-500 text-[10px] mt-1 font-mono">
                          <span>Speed: {tanker.speedKmph} km/h</span>
                          <span className="text-emerald-700 font-bold">
                            {tanker.currentWaterLevelLiters.toLocaleString()} L
                            Left
                          </span>
                        </div>
                      </div>
                    );
                  })
                : requests.map((req) => (
                    <div
                      key={req.id}
                      className="p-3 rounded-xl border border-slate-200 bg-white text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">
                          {req.wardName}
                        </span>
                        <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-bold">
                          AI Score {req.urgencyScore}
                        </span>
                      </div>
                      <p className="text-slate-600 text-[11px] line-clamp-1 italic">
                        "{req.complaintText}"
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1">
                        <span>
                          {req.householdCount} homes • {req.vulnerableCount}{" "}
                          vulnerable
                        </span>
                        <span className="text-[#D9532F] font-bold">
                          {req.status}
                        </span>
                      </div>
                    </div>
                  ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bedrock AI Copilot Drawer Modal */}
      <BedrockCopilotDrawer
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        fleet={fleet}
        wards={wards}
        anomalies={anomalies}
      />
    </div>
  );
};
