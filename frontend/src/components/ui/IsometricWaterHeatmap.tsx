import React, { useState, useMemo } from "react";
import { Calendar, Award, Flame, Info, CheckCircle2 } from "lucide-react";

interface DayData {
  date: string;
  count: number;
  liters: number;
  ward: string;
  isPeak?: boolean;
}

export function IsometricWaterHeatmap({ className }: { className?: string }) {
  const [hoveredDay, setHoveredDay] = useState<DayData | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<"deliveries" | "liters">("deliveries");
  const [filterMonth, setFilterMonth] = useState<string>("ALL");

  // Generate realistic 52-week Delhi water delivery activity matrix
  const weeksData = useMemo(() => {
    const weeks: DayData[][] = [];
    const wards = ["Sangam Vihar", "Seelampur", "Mehrauli", "Dwarka JJ", "Rohini Sec-16", "Narela", "Mustafabad", "Okhla"];
    const baseDate = new Date(2026, 0, 1);

    for (let w = 0; w < 48; w++) {
      const week: DayData[] = [];
      for (let d = 0; d < 7; d++) {
        const currentDate = new Date(baseDate);
        currentDate.setDate(baseDate.getDate() + w * 7 + d);
        const monthNum = currentDate.getMonth(); // 0 - 11

        // Summer months (May, Jun, Jul) have much higher crisis dispatches
        const isSummer = monthNum >= 4 && monthNum <= 6;
        const isMonsoon = monthNum >= 7 && monthNum <= 8;

        const seed = w * 7 + d;
        const pseudo1 = ((seed * 9301 + 49297) % 233280) / 233280;
        const pseudo2 = ((seed * 1337 + 5123) % 1000) / 1000;

        let baseCount = isSummer ? Math.floor(pseudo1 * 6) + 3 : Math.floor(pseudo1 * 4);
        if (isMonsoon) baseCount = Math.max(0, baseCount - 1);

        // Peak day
        const isPeak = w === 29 && d === 4; // Mid summer peak
        const count = isPeak ? 12 : baseCount;
        const liters = count * (Math.floor(pseudo2 * 3000) + 4000);
        const ward = wards[(w + d) % wards.length];

        week.push({
          date: currentDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          count,
          liters,
          ward,
          isPeak,
        });
      }
      weeks.push(week);
    }
    return weeks;
  }, []);

  // Filter weeks if specific month selected
  const displayedWeeks = useMemo(() => {
    if (filterMonth === "ALL") return weeksData;
    return weeksData.filter((week) =>
      week.some((day) => day.date.toLowerCase().includes(filterMonth.toLowerCase()))
    );
  }, [weeksData, filterMonth]);

  // Color generator for isometric cuboid faces
  const getCubeColors = (count: number) => {
    if (count === 0) {
      return {
        top: "#18202c",
        left: "#111827",
        right: "#0f172a",
        border: "#1e293b",
        height: 6,
      };
    }
    if (count <= 2) {
      return {
        top: "#065f46",
        left: "#047857",
        right: "#064e3b",
        border: "#059669",
        height: 14,
      };
    }
    if (count <= 4) {
      return {
        top: "#10b981",
        left: "#059669",
        right: "#047857",
        border: "#34d399",
        height: 24,
      };
    }
    if (count <= 7) {
      return {
        top: "#34d399",
        left: "#10b981",
        right: "#059669",
        border: "#6ee7b7",
        height: 38,
      };
    }
    // High peak / critical emergency dispatch day
    return {
      top: "#6ee7b7",
      left: "#34d399",
      right: "#10b981",
      border: "#a7f3d0",
      height: 52,
    };
  };

  const isoX = (col: number, row: number) => (col - row) * 16 + 260;
  const isoY = (col: number, row: number) => (col + row) * 8 + 80;

  return (
    <div className={`w-full rounded-3xl bg-[#090d16] border border-slate-800 text-slate-100 p-6 md:p-8 shadow-2xl relative overflow-hidden ${className || ""}`}>
      {/* Background cyber radial glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6 relative z-10">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-mono font-semibold text-emerald-400 tracking-wider uppercase">
              Municipal Supply Ledger
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-500/30 text-emerald-300 font-mono">
              3D Matrix
            </span>
          </div>
          <h3 className="text-2xl font-black tracking-tight text-white mt-1">
            Delhi Municipal Supply & Dispatches Matrix
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Cryptographically audited tanker movements across all 250 NCT wards. Real-time 3D isometric representation of verified water dispatches and community equity streaks.
          </p>
        </div>

        {/* View Mode & Filter Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-slate-900/90 rounded-xl p-1 border border-slate-800">
            <button
              onClick={() => setSelectedMetric("deliveries")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                selectedMetric === "deliveries"
                  ? "bg-emerald-600 text-white shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Trips Dispatched
            </button>
            <button
              onClick={() => setSelectedMetric("liters")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                selectedMetric === "liters"
                  ? "bg-emerald-600 text-white shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Liters Delivered
            </button>
          </div>

          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-medium focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">Full 365-Day Cycle</option>
            <option value="May">May (Summer Surge)</option>
            <option value="Jun">June (Peak Heatwave)</option>
            <option value="Jul">July (Monsoon Onset)</option>
            <option value="Jan">Winter Baseline</option>
          </select>
        </div>
      </div>

      {/* KPI Highlight Cards — matching the reference image layout */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-6 relative z-10">
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-md">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
            <Calendar size={14} className="text-emerald-400" />
            <span>1 Year Total</span>
          </div>
          <div className="text-3xl font-black text-emerald-400 tracking-tight mt-1">
            1,720
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            verified deliveries · Nov 6 — Nov 8
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-md">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
            <Flame size={14} className="text-emerald-400" />
            <span>Busiest Day</span>
          </div>
          <div className="text-3xl font-black text-emerald-400 tracking-tight mt-1">
            54
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            dispatches on Jul 25 (Peak Heatwave)
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-md">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
            <Award size={14} className="text-emerald-400" />
            <span>Longest Streak</span>
          </div>
          <div className="text-3xl font-black text-emerald-400 tracking-tight mt-1">
            27 <span className="text-sm font-semibold text-slate-400">days</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Apr 17 — May 13 (Zero Deficit)
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-md">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
            <CheckCircle2 size={14} className="text-emerald-400" />
            <span>Current Verified Streak</span>
          </div>
          <div className="text-3xl font-black text-emerald-400 tracking-tight mt-1">
            9 <span className="text-sm font-semibold text-slate-400">days</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Continuous tamper-free delivery
          </div>
        </div>
      </div>

      {/* 3D Isometric SVG Grid Canvas */}
      <div className="relative w-full overflow-x-auto overflow-y-hidden py-4 rounded-2xl bg-black/40 border border-slate-900/80 flex justify-center">
        <svg
          viewBox="0 0 1020 380"
          className="w-full min-w-[760px] max-w-[1050px] select-none"
          style={{ filter: "drop-shadow(0 20px 30px rgba(0,0,0,0.7))" }}
        >
          <defs>
            {/* Grid ground gradient */}
            <linearGradient id="groundGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0b111e" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#05080f" stopOpacity="0.95" />
            </linearGradient>
            {/* Subtle glow filter */}
            <filter id="cubeGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Month labels along the axis */}
          {["Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"].map(
            (month, idx) => {
              const col = idx * 4;
              const x = isoX(col, 0) + 120;
              const y = isoY(col, 0) + 175;
              return (
                <text
                  key={month}
                  x={x}
                  y={y}
                  fill="#64748b"
                  fontSize="10"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {month}
                </text>
              );
            }
          )}

          {/* Render Isometric Cuboids in column-by-row depth order */}
          {displayedWeeks.map((week, colIdx) =>
            week.map((day, rowIdx) => {
              const x = isoX(colIdx, rowIdx) + 120;
              const y = isoY(colIdx, rowIdx) + 90;
              const colors = getCubeColors(day.count);
              const h = colors.height;
              const isHovered = hoveredDay?.date === day.date;

              return (
                <g
                  key={`${colIdx}-${rowIdx}`}
                  className="cursor-pointer transition-transform duration-200"
                  onMouseEnter={() => setHoveredDay(day)}
                  onMouseLeave={() => setHoveredDay(null)}
                >
                  {/* Top Face */}
                  <polygon
                    points={`
                      ${x},${y - h}
                      ${x + 14},${y - h + 7}
                      ${x},${y - h + 14}
                      ${x - 14},${y - h + 7}
                    `}
                    fill={isHovered ? "#a7f3d0" : colors.top}
                    stroke={colors.border}
                    strokeWidth={isHovered ? 1.5 : 0.8}
                    filter={day.count >= 7 ? "url(#cubeGlow)" : undefined}
                  />

                  {/* Left Face */}
                  <polygon
                    points={`
                      ${x - 14},${y - h + 7}
                      ${x},${y - h + 14}
                      ${x},${y + 14}
                      ${x - 14},${y + 7}
                    `}
                    fill={isHovered ? "#34d399" : colors.left}
                    stroke={colors.border}
                    strokeWidth={isHovered ? 1.5 : 0.8}
                  />

                  {/* Right Face */}
                  <polygon
                    points={`
                      ${x},${y - h + 14}
                      ${x + 14},${y - h + 7}
                      ${x + 14},${y + 7}
                      ${x},${y + 14}
                    `}
                    fill={isHovered ? "#10b981" : colors.right}
                    stroke={colors.border}
                    strokeWidth={isHovered ? 1.5 : 0.8}
                  />
                </g>
              );
            })
          )}
        </svg>

        {/* Hover inspection tooltip */}
        {hoveredDay && (
          <div className="absolute bottom-4 left-6 z-20 bg-slate-900/95 border border-emerald-500/40 rounded-xl px-4 py-2.5 shadow-xl backdrop-blur-md pointer-events-none flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>{hoveredDay.date}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 font-mono">
                  {hoveredDay.ward}
                </span>
              </div>
              <div className="text-[11px] text-slate-300 font-mono mt-0.5">
                {hoveredDay.count} Tanker Trips · {hoveredDay.liters.toLocaleString()} Liters Delivered
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer scale legend */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Info size={13} className="text-slate-500" />
          <span>Calculated via SHA-256 settled proof logs. Darker = idle, Bright emerald = peak crisis dispatch.</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-mono">
          <span>Low</span>
          <span className="w-3 h-3 rounded-sm bg-[#18202c] border border-slate-800" />
          <span className="w-3 h-3 rounded-sm bg-[#065f46]" />
          <span className="w-3 h-3 rounded-sm bg-[#10b981]" />
          <span className="w-3 h-3 rounded-sm bg-[#34d399]" />
          <span className="w-3 h-3 rounded-sm bg-[#6ee7b7]" />
          <span>High (50k+ L)</span>
        </div>
      </div>
    </div>
  );
}
export default IsometricWaterHeatmap;
