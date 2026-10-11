import { api, LIVE_MODE } from "../../services/api";
import React, { useState, useEffect } from "react";
import { Ward, WaterRequest, FraudAnomaly } from "../../types";
import {
  ShieldCheck,
  Scale,
  Droplet,
  CheckCircle2,
  AlertTriangle,
  Download,
  Lock,
} from "lucide-react";
import { formatLiters } from "../../utils/formatters";
import { EvidenceViewer } from "./EvidenceViewer";
import { ContributionSkyline3D } from "../ui/ContributionSkyline3D";

interface PublicTransparencyBoardProps {
  wards: Ward[];
  requests: WaterRequest[];
  anomalies: FraudAnomaly[];
  canReadEvidence?: boolean;
}

export const PublicTransparencyBoard: React.FC<
  PublicTransparencyBoardProps
> = ({ wards: initialWards, requests: initialRequests, anomalies, canReadEvidence = false }) => {
  const [publicData, setPublicData] = useState<{
    wards: Ward[];
    deliveries: WaterRequest[];
    anomalyCount?: number;
  } | null>(null);
  const [error, setError] = useState("");
  const wards = publicData?.wards || initialWards;
  const requests = publicData?.deliveries || initialRequests;
  useEffect(() => {
    if (!LIVE_MODE) return;
    let mounted = true;
    const refresh = () =>
      api("/public")
        .then((data) => {
          if (!Array.isArray(data?.wards) || !Array.isArray(data?.deliveries)) throw new Error("Public service returned invalid data. Please retry later.");
          if (mounted) {
            setPublicData(data);
            setError("");
          }
        })
        .catch((e) => {
          if (mounted) setError(e.message);
        });
    void refresh();
    const timer = setInterval(refresh, 30000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);
  const [selectedZone, setSelectedZone] = useState<string>("ALL");

  const verifiedDeliveries = requests.filter(
    (r) => r.status === "DELIVERED_VERIFIED",
  );
  const totalVerifiedLiters = verifiedDeliveries.reduce(
    (acc, curr) => acc + (curr.litersDelivered || 0),
    0,
  );
  const ghostTripsCaught = publicData?.anomalyCount ?? anomalies.length;

  const filteredWards =
    selectedZone === "ALL"
      ? wards
      : wards.filter((w) =>
          w.zone.toLowerCase().includes(selectedZone.toLowerCase()),
        );

  // Average Gini fairness score
  const perCapita = wards
    .filter((w) => w.population > 0)
    .map((w) => (w.deliveredLitersToday || 0) / w.population)
    .sort((a, b) => a - b);
  const total = perCapita.reduce((a, b) => a + b, 0);
  const avgGini =
    total > 0
      ? (
          (2 * perCapita.reduce((a, b, i) => a + (i + 1) * b, 0)) /
            (perCapita.length * total) -
          (perCapita.length + 1) / perCapita.length
        ).toFixed(2)
      : "N/A";
  const exportAudit = () => {
    const rows = [
      ["Ward", "Zone", "Population", "Verified liters"],
      ...wards.map((w) => [
        w.name,
        w.zone,
        w.population,
        w.deliveredLitersToday || 0,
      ]),
    ];
    const csv = rows
      .map((row) =>
        row.map((x) => '"' + String(x).replace(/"/g, '""') + '"').join(","),
      )
      .join("\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "jalsetu-water-equity.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}

      {/* Header Banner */}
      <div className="glossy-card p-6 rounded-2xl border border-slate-200/90 bg-white/95 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
            <span>Water delivery transparency</span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Delhi Public Water Equity & Shortage Board
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Recorded water distribution and SHA-256 delivery evidence. Figures are cumulative recorded totals.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={exportAudit}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-xs font-bold transition shadow-xs"
          >
            <Download className="w-4 h-4 text-[#D9532F]" />
            <span>Export ward CSV</span>
          </button>
        </div>
      </div>

      {/* Hero Transparency KPI Cards */}
      {LIVE_MODE && publicData && wards.length === 0 && <p role="status" className="glossy-panel p-5 rounded-xl">No verified service areas have been onboarded. Water requests and delivery operations are not available until the operator supplies verified records.</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {/* Metric 1: Verified Water Dispensed */}
        <div className="glossy-card p-4 rounded-xl border border-slate-200/90 bg-white/95 shadow-xs">
          <div className="text-slate-500 text-xs font-medium flex items-center justify-between mb-1">
            <span>Verified Water Delivered</span>
            <Droplet className="w-4 h-4 text-[#D9532F]" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900">
            {totalVerifiedLiters.toLocaleString()}{" "}
            <span className="text-xs font-normal text-slate-500">Liters</span>
          </div>
          <p className="text-xs text-emerald-700 mt-1 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Resident-confirmed delivery records
          </p>
        </div>

        {/* Metric 2: Municipal Gini Index */}
        <div className="glossy-card p-4 rounded-xl border border-slate-200/90 bg-white/95 shadow-xs">
          <div className="text-slate-500 text-xs font-medium flex items-center justify-between mb-1">
            <span>Gini Equity Coefficient</span>
            <Scale className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-2xl font-black font-mono text-emerald-700">
            {avgGini}{" "}
            <span className="text-xs font-normal text-slate-500">/ 1.0</span>
          </div>
          <p className="text-xs text-emerald-800 mt-1 font-semibold">
            Per-capita supply across wards; lower is more equal
          </p>
        </div>

        {/* Metric 3: Ghost Trips Caught */}
        <div className="glossy-card p-4 rounded-xl border border-slate-200/90 bg-white/95 shadow-xs">
          <div className="text-slate-500 text-xs font-medium flex items-center justify-between mb-1">
            <span>Alerts recorded for investigation</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black font-mono text-rose-700">
            {ghostTripsCaught}{" "}
            <span className="text-xs font-normal text-slate-500">Flags</span>
          </div>
          <p className="text-xs text-rose-700 mt-1 font-semibold">
            Flags require investigation; not findings of fraud
          </p>
        </div>

        {/* Metric 4: Tamper-Proof Cryptographic Ledgers */}
        <div className="glossy-card p-4 rounded-xl border border-slate-200/90 bg-white/95 shadow-xs">
          <div className="text-slate-500 text-xs font-medium flex items-center justify-between mb-1">
            <span>Delivery Evidence Records</span>
            <Lock className="w-4 h-4 text-purple-700" />
          </div>
          <div className="text-2xl font-black font-mono text-purple-700">
            {verifiedDeliveries.length}{" "}
            <span className="text-xs font-normal text-slate-500">Hashes</span>
          </div>
          <p className="text-xs text-slate-600 mt-1 font-semibold">
            SHA-256 evidence hashes
          </p>
        </div>
      </div>

      {/* 3D Isometric 365-Day Water Contribution & Equity Matrix */}
      <ContributionSkyline3D deliveries={requests} className="w-full shadow-lg" />

      <div className="glossy-panel rounded-2xl p-5">
        <h3 className="font-bold text-slate-800">Verified delivery ledger</h3>
        <p className="text-xs text-slate-500 my-2">
          Hashes bind recorded evidence. They do not independently prove sensor
          accuracy.
        </p>
        {verifiedDeliveries.length === 0 ? (
          <p className="text-sm text-slate-500">No verified deliveries yet.</p>
        ) : (
          verifiedDeliveries.map((r) => (
            <div key={r.id} className="border-t border-slate-200 py-3 text-xs">
              <strong>{r.id}</strong>
              <span className="ml-3">
                {r.litersDelivered?.toLocaleString()} L
              </span>
              <code className="block break-all text-slate-500 mt-1">
                {r.proofHash}
              </code>
              {LIVE_MODE && canReadEvidence && <EvidenceViewer requestId={r.id} />}
            </div>
          ))
        )}
      </div>
      {/* Ward Deficit & Equity Heatmap Table */}
      {canReadEvidence && <section className="glossy-panel rounded-2xl p-5">
        <h3 className="font-bold">Restricted investigation records</h3>
        {anomalies.length === 0 ? <p className="text-sm mt-2">No alert records.</p> : anomalies.map(a => <article key={a.id} className="border-t py-3 mt-2 text-sm">
          <strong>{a.alertCode} · {a.status}</strong>
          <p>{a.tankerId} · {a.wardName}</p><p>{a.message}</p>
          {a.resolutionReason && <p className="mt-2">Resolution: {a.resolutionReason}{a.resolvedAt ? ` (${new Date(a.resolvedAt).toLocaleString()})` : ""}</p>}
        </article>)}
      </section>}
      <div className="glossy-card rounded-2xl border border-slate-200/90 overflow-hidden shadow-sm bg-white">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70">
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm">
              Ward-by-Ward Resource Allocation Ledger
            </h3>
            <p className="text-xs text-slate-500">
              Recorded allocation by registered service area. Population and deficit categories come from operations data.
            </p>
          </div>

          {/* Filter Zone */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-500 font-medium">Zone Filter:</span>
            {["ALL", "South", "West", "North", "East"].map((zone) => (
              <button
                key={zone}
                onClick={() => setSelectedZone(zone)}
                className={`px-2.5 py-1 rounded-lg font-bold text-xs transition ${
                  selectedZone === zone
                    ? "bg-slate-900 text-white"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {zone}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {filteredWards.length === 0 ? <div className="p-4"><div className="empty-state"><strong>No service areas to show</strong><p>{wards.length ? "Choose another zone to see registered service areas." : "Verified service areas will appear here after onboarding."}</p></div></div> : <table className="ward-ledger-table w-full text-left text-xs">
            <thead className="bg-slate-100/80 text-slate-700 uppercase font-mono text-xs tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-3.5">Ward / Settlement</th>
                <th className="p-3.5">Zone</th>
                <th className="p-3.5">Deficit Level</th>
                <th className="p-3.5">Population</th>
                <th className="p-3.5">Recorded Deliveries</th>
                <th className="p-3.5">Liters / person</th>
                <th className="p-3.5">Cryptographic Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredWards.map((ward) => {
                const isCritical = ward.deficitSeverity === "CRITICAL";
                return (
                  <tr key={ward.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-3.5 font-bold text-slate-900">
                      {ward.name}
                    </td>
                    <td className="p-3.5 text-slate-600">{ward.zone}</td>
                    <td className="p-3.5">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-bold ${
                          isCritical
                            ? "bg-rose-100 text-rose-800 border border-rose-200"
                            : ward.deficitSeverity === "HIGH"
                              ? "bg-amber-100 text-amber-900 border border-amber-200"
                              : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        }`}
                      >
                        {ward.deficitSeverity}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-slate-700">
                      {ward.population.toLocaleString()}
                    </td>
                    <td className="p-3.5 font-mono font-bold text-emerald-700">
                      {formatLiters(ward.deliveredLitersToday)}
                    </td>
                    <td className="p-3.5 font-mono font-bold text-slate-900">
                      {ward.population
                        ? (
                            (ward.deliveredLitersToday || 0) / ward.population
                          ).toFixed(2)
                        : "N/A"}
                    </td>
                    <td className="p-3.5 font-mono text-xs text-purple-700">
                      {
                        requests.filter(
                          (r) => r.wardId === ward.id && r.proofHash,
                        ).length
                      }{" "}
                      records
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>}
        </div>
      </div>
    </div>
  );
};
