import React from "react";
import { FraudAnomaly } from "../../types";
import { ShieldAlert, X, Eye } from "lucide-react";
import { formatTimeAgo } from "../../utils/formatters";

interface AnomalyAlertBannerProps {
  anomalies: FraudAnomaly[];
  onDismiss: (id: string) => void;
  onInspectAnomaly: (anomaly: FraudAnomaly) => void;
}

export const AnomalyAlertBanner: React.FC<AnomalyAlertBannerProps> = ({
  anomalies,
  onDismiss,
  onInspectAnomaly,
}) => {
  const activeAlarms = anomalies.filter((a) => a.status === "ACTIVE_ALARM");

  if (activeAlarms.length === 0) return null;

  const topAlarm = activeAlarms[0];

  return (
    <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-3 animate-pulse-slow">
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-xl bg-rose-600 text-white flex-shrink-0 shadow-sm">
          <ShieldAlert className="w-5 h-5 text-white" />
        </div>

        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-200 text-rose-900 border border-rose-300">
              🚨 Fraud Sentinel: {topAlarm.alertCode}
            </span>
            <span className="text-[11px] font-mono text-rose-800 font-bold">
              Tanker {topAlarm.tankerId}
            </span>
            <span className="text-[11px] text-slate-500">
              • {formatTimeAgo(topAlarm.timestamp)}
            </span>
          </div>

          <p className="text-xs text-rose-950 font-medium leading-relaxed">
            {topAlarm.message}
          </p>

          <p className="text-[11px] text-rose-800">
            <strong>Recommended Action:</strong> {topAlarm.recommendedAction}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end md:self-center">
        <button
          onClick={() => onInspectAnomaly(topAlarm)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-sm"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Locate tanker</span>
        </button>

        <button
          aria-label="Resolve alert with investigation notes"
          onClick={() => onDismiss(topAlarm.id)}
          className="p-1.5 rounded-lg text-rose-600 hover:text-rose-900 hover:bg-rose-200 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
