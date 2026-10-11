import { usePublicDeliveries, type PublicDelivery } from "../../hooks/usePublicDeliveries";
import { useElementWidth } from "../../hooks/useElementWidth";
import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { Grid3X3, Box, RotateCcw } from "lucide-react";

interface DayDelivery {
  date: string;
  count: number;
  liters: number;
  ward: string;
  intensity: number; // 0 to 4
  height: number;    // height in px for 3D extrusion
  month: string;
  dayOfWeek: number;
}

interface ContributionSkylineProps {
  className?: string;
  deliveries?: PublicDelivery[];
  onSelectDay?: (day: DayDelivery) => void;
}

export function ContributionSkyline3D({ className, onSelectDay, deliveries: supplied }: ContributionSkylineProps) {
  const { deliveries, error, loading } = usePublicDeliveries(supplied);
  const [now, setNow] = useState(Date.now);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(timer); }, []);
  const [viewMode, setViewMode] = useState<"3d" | "grid">("3d");
  const { ref: stageRef, width: stageWidth } = useElementWidth();
  const [hoveredDay, setHoveredDay] = useState<DayDelivery | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // 3D Orbit Camera State
  const [rotation, setRotation] = useState<{ x: number; z: number }>({ x: 56, z: -40 });
  const lastMousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Aggregate only persisted public audit records, using the Delhi calendar day.
  const { weeks, stats } = useMemo(() => {
    const dateKey = (date: Date) => date.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    const today = new Date(dateKey(new Date(now)) + "T00:00:00Z");
    const start = new Date(today); start.setUTCDate(start.getUTCDate() - 363);
    const byDate = new Map<string, PublicDelivery[]>();
    const seen = new Set<string>();
    for (const delivery of deliveries) {
      if (seen.has(delivery.id) || delivery.status !== "DELIVERED_VERIFIED" || !delivery.deliveredAt || !Number.isFinite(delivery.litersDelivered) || delivery.litersDelivered! <= 0) continue;
      const at = new Date(delivery.deliveredAt);
      if (!Number.isFinite(at.getTime()) || dateKey(at) > dateKey(new Date(now))) continue;
      seen.add(delivery.id);
      const key = dateKey(at);
      byDate.set(key, [...(byDate.get(key) || []), delivery]);
    }
    const days: DayDelivery[] = Array.from({ length: 364 }, (_, index) => {
      const date = new Date(start); date.setUTCDate(start.getUTCDate() + index);
      const rows = byDate.get(dateKey(date)) || [];
      const count = rows.length;
      return { date: date.toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" }),
        count, liters: rows.reduce((sum, row) => sum + row.litersDelivered!, 0),
        ward: [...new Set(rows.map(row => row.wardId).filter(Boolean))].join(", ") || "No recorded deliveries",
        intensity: count >= 16 ? 4 : count >= 10 ? 3 : count >= 5 ? 2 : count > 0 ? 1 : 0,
        height: count ? Math.min(56, Math.max(4, Math.round(count * 2.8))) : 0,
        month: date.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }), dayOfWeek: date.getUTCDay() };
    });
    let longestStreak = 0, currentStreak = 0;
    for (const day of days) { currentStreak = day.count ? currentStreak + 1 : 0; longestStreak = Math.max(longestStreak, currentStreak); }
    const busiest = days.reduce((a, b) => b.count > a.count ? b : a);
    return { weeks: Array.from({ length: 52 }, (_, i) => days.slice(i * 7, i * 7 + 7)), stats: {
      total: days.reduce((sum, day) => sum + day.count, 0), busiestCount: busiest.count,
      busiestDate: busiest.count ? busiest.date : "No deliveries", longestStreak, currentStreak,
      dateRange: `${days[0].date} — ${days.at(-1)!.date}`,
    } };
  }, [deliveries, now]);

  // Mouse Orbit Drag Handlers
  const handleMouseDown = useCallback((e: React.PointerEvent) => {
    if (viewMode !== "3d") return;
    setIsDragging(true);
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  }, [viewMode]);

  const handleMouseMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging || viewMode !== "3d") return;
    const deltaX = e.clientX - lastMousePos.current.x;
    const deltaY = e.clientY - lastMousePos.current.y;
    lastMousePos.current = { x: e.clientX, y: e.clientY };

    setRotation((prev) => ({
      x: Math.min(80, Math.max(25, prev.x - deltaY * 0.4)),
      z: (prev.z + deltaX * 0.5) % 360,
    }));
  }, [isDragging, viewMode]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleResetOrbit = useCallback(() => {
    setRotation({ x: 56, z: -40 });
  }, []);

  // Intensity color palettes
  const getColors = (intensity: number) => {
    switch (intensity) {
      case 4:
        return {
          top: "#39d353",
          front: "#26a641",
          side: "#196c2e",
          flat: "bg-[#39d353]",
        };
      case 3:
        return {
          top: "#26a641",
          front: "#1f8838",
          side: "#14532d",
          flat: "bg-[#26a641]",
        };
      case 2:
        return {
          top: "#006d32",
          front: "#0e4429",
          side: "#082818",
          flat: "bg-[#006d32]",
        };
      case 1:
        return {
          top: "#0e4429",
          front: "#072b19",
          side: "#04160c",
          flat: "bg-[#0e4429]",
        };
      case 0:
      default:
        return {
          top: "#161b22",
          front: "#0d1117",
          side: "#05070a",
          flat: "bg-[#161b22]",
        };
    }
  };

  const monthLabels = weeks.filter((week, i) => i === 0 || week[0].month !== weeks[i - 1][0].month).map(week => week[0].month);

  return (
    <div
      className={`w-full rounded-3xl bg-[#090d16] border border-slate-800 text-slate-100 p-6 md:p-8 shadow-2xl relative overflow-hidden font-sans select-none ${
        className || ""
      }`}
      onPointerUp={handleMouseUp} onPointerCancel={handleMouseUp}
      onPointerLeave={handleMouseUp}
    >
      {/* Background cyber radial glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Bar matching user reference */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5 relative z-10">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-mono font-semibold text-emerald-400 tracking-wider uppercase">
              DELHI WATER EQUITY & ACTIVITY
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-500/30 text-emerald-300 font-mono">
              3D Skyline
            </span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight mt-1">
            {stats.total.toLocaleString()} Recorded Deliveries · Last 52 Weeks
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Delivery activity from the public audit ledger. Empty days indicate no records in the returned history.
          </p>
        </div>

        {/* View Mode Controls: 2D Grid vs 3D Cube */}
        <div className="flex items-center gap-2">
          <div className="flex bg-[#0d1117] rounded-xl p-1 border border-slate-800">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-lg transition ${
                viewMode === "grid"
                  ? "bg-slate-800 text-emerald-400 shadow"
                  : "text-slate-400 hover:text-white"
              }`}
              title="2D Matrix Grid"
            >
              <Grid3X3 size={18} />
            </button>
            <button
              onClick={() => setViewMode("3d")}
              className={`p-2 rounded-lg transition ${
                viewMode === "3d"
                  ? "bg-emerald-950 border border-emerald-500/40 text-emerald-300 shadow"
                  : "text-slate-400 hover:text-white"
              }`}
              title="3D Extruded Skyline"
            >
              <Box size={18} />
            </button>
          </div>

          <button
            onClick={handleResetOrbit}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-800 transition"
            title="Reset Orbit Angle"
          >
            <RotateCcw size={14} />
            <span className="hidden sm:inline">Reset Orbit</span>
          </button>
        </div>
      </div>

      {loading && <p role="status" className="mt-4">Loading delivery history…</p>}
      {error && <p role="alert" className="mt-4 text-amber-300">{error} Showing the last available records.</p>}
      {!loading && !error && stats.total === 0 && <p className="mt-4 text-slate-300">No verified deliveries are recorded in this period.</p>}
      {/* Main Stats Header Cards matching user screenshot */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-6 relative z-10">
        {/* 1 Year Total */}
        <div className="bg-[#0d1117]/90 border border-slate-800/80 rounded-2xl p-4">
          <span className="text-xs text-slate-400 block">52 week total</span>
          <div className="text-3xl font-black font-mono text-emerald-400 mt-0.5 tracking-tight">
            {stats.total.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400 block mt-1">
            deliveries · {stats.dateRange}
          </span>
        </div>

        {/* Busiest Day */}
        <div className="bg-[#0d1117]/90 border border-slate-800/80 rounded-2xl p-4">
          <span className="text-xs text-slate-400 block">Busiest day</span>
          <div className="text-3xl font-black font-mono text-emerald-400 mt-0.5 tracking-tight">
            {stats.busiestCount}
          </div>
          <span className="text-[11px] text-slate-400 block mt-1">
            deliveries · {stats.busiestDate}
          </span>
        </div>

        {/* Longest Streak */}
        <div className="bg-[#0d1117]/90 border border-slate-800/80 rounded-2xl p-4">
          <span className="text-xs text-slate-400 block">Longest streak</span>
          <div className="text-3xl font-black font-mono text-emerald-400 mt-0.5 tracking-tight">
            {stats.longestStreak}
          </div>
          <span className="text-[11px] text-slate-400 block mt-1">
            consecutive days with recorded deliveries
          </span>
        </div>

        {/* Current Streak */}
        <div className="bg-[#0d1117]/90 border border-slate-800/80 rounded-2xl p-4">
          <span className="text-xs text-slate-400 block">Current streak</span>
          <div className="text-3xl font-black font-mono text-emerald-400 mt-0.5 tracking-tight">
            {stats.currentStreak}
          </div>
          <span className="text-[11px] text-slate-400 block mt-1">
            consecutive days through today
          </span>
        </div>
      </div>

      {/* Interactive 3D Orbit / Grid Canvas Stage */}
      <div
        ref={stageRef}
        className={`relative w-full overflow-hidden rounded-2xl border border-slate-800/80 bg-[#060910] p-6 flex flex-col items-center justify-center transition-all ${
          viewMode === "3d" ? "cursor-grab active:cursor-grabbing min-h-[380px]" : "min-h-[260px]"
        }`}
        onPointerDown={handleMouseDown}
        onPointerMove={handleMouseMove}
        onDoubleClick={handleResetOrbit}
      >
        {/* Month labels for 2D Grid */}
        {viewMode === "grid" && (
          <div className="w-full max-w-5xl flex justify-between text-[11px] text-slate-400 mb-2 px-1 font-mono">
            {monthLabels.map((m, i) => (
              <span key={i}>{m}</span>
            ))}
          </div>
        )}

        {viewMode === "3d" ? (
          /* 3D Isometric Extruded Skyline with Orbit Rotation */
          <div
            className="w-full flex items-center justify-center"
            style={{
              perspective: "1200px",
              perspectiveOrigin: "50% 50%",
              height: "320px",
            }}
          >
            <div
              style={{
                transformStyle: "preserve-3d",
                transform: `scale(${Math.min(1, stageWidth / 780)}) rotateX(${rotation.x}deg) rotateZ(${rotation.z}deg)`,
                transition: isDragging ? "none" : "transform 0.2s ease-out",
                display: "grid",
                gridTemplateColumns: "repeat(52, 10px)",
                gap: "3.5px",
                padding: "20px",
              }}
            >
              {weeks.map((week, wIdx) => (
                <div
                  key={wIdx}
                  style={{
                    display: "grid",
                    gridTemplateRows: "repeat(7, 10px)",
                    gap: "3.5px",
                    transformStyle: "preserve-3d",
                  }}
                >
                  {week.map((day, dIdx) => {
                    const colors = getColors(day.intensity);
                    const isHovered = hoveredDay?.date === day.date;
                    const h = day.height;

                    return (
                      <div
                        key={dIdx}
                        className="relative group cursor-pointer"
                        style={{
                          width: "10px",
                          height: "10px",
                          transformStyle: "preserve-3d",
                        }}
                        role="button" tabIndex={0} aria-label={`${day.date}: ${day.count} deliveries, ${day.liters} litres`}
                        onFocus={() => setHoveredDay(day)} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setHoveredDay(day); onSelectDay?.(day); } }}
                        onMouseEnter={() => setHoveredDay(day)}
                        onClick={() => { setHoveredDay(day); onSelectDay?.(day); }}
                      >
                        {/* Base grid plate */}
                        <div
                          style={{
                            width: "10px",
                            height: "10px",
                            backgroundColor: colors.top,
                            opacity: day.count === 0 ? 0.35 : 1,
                            borderRadius: "1.5px",
                            boxShadow: isHovered
                              ? "0 0 12px #39d353, 0 0 24px #39d353"
                              : "none",
                          }}
                        />

                        {/* 3D Extrusion Pillar if count > 0 */}
                        {h > 0 && (
                          <div
                            style={{
                              position: "absolute",
                              inset: 0,
                              transformStyle: "preserve-3d",
                            }}
                          >
                            {/* Top Face */}
                            <div
                              style={{
                                position: "absolute",
                                width: "10px",
                                height: "10px",
                                backgroundColor: colors.top,
                                transform: `translateZ(${h}px)`,
                                borderRadius: "1.5px",
                                boxShadow: isHovered
                                  ? "0 0 10px #39d353"
                                  : "none",
                              }}
                            />

                            {/* Front Face (Y+) */}
                            <div
                              style={{
                                position: "absolute",
                                width: "10px",
                                height: `${h}px`,
                                backgroundColor: colors.front,
                                transform: `rotateX(-90deg) translateZ(-${h / 2}px) translateY(${h / 2 - 10}px)`,
                                transformOrigin: "bottom center",
                              }}
                            />

                            {/* Side Face (X+) */}
                            <div
                              style={{
                                position: "absolute",
                                width: `${h}px`,
                                height: "10px",
                                backgroundColor: colors.side,
                                transform: `rotateY(90deg) translateZ(${10 - h / 2}px) translateX(${h / 2}px)`,
                                transformOrigin: "right center",
                              }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Flat 2D Matrix Grid */
          <div className="w-full overflow-x-auto py-2">
            <div
              className="inline-grid gap-1 min-w-[760px]"
              style={{
                gridTemplateColumns: "repeat(52, minmax(11px, 1fr))",
              }}
            >
              {weeks.map((week, wIdx) => (
                <div key={wIdx} className="grid grid-rows-7 gap-1">
                  {week.map((day, dIdx) => {
                    const colors = getColors(day.intensity);
                    const isHovered = hoveredDay?.date === day.date;
                    return (
                      <div
                        key={dIdx}
                        className={`w-3 h-3 rounded-xs cursor-pointer transition-transform ${
                          colors.flat
                        } ${isHovered ? "ring-2 ring-emerald-300 scale-125 z-10" : "hover:scale-115"}`}
                        role="button" tabIndex={0} aria-label={`${day.date}: ${day.count} deliveries, ${day.liters} litres`}
                        onFocus={() => setHoveredDay(day)} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setHoveredDay(day); onSelectDay?.(day); } }}
                        onMouseEnter={() => setHoveredDay(day)}
                        onClick={() => { setHoveredDay(day); onSelectDay?.(day); }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Live Hover Inspection Popover */}
        {hoveredDay && (
          <div className="absolute top-4 left-4 z-20 bg-slate-900/95 border border-emerald-500/40 rounded-xl px-3.5 py-2 text-xs shadow-2xl backdrop-blur-md">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <strong className="text-white font-mono">{hoveredDay.date}</strong>
            </div>
            <div className="text-slate-300 mt-1 font-mono">
              <span className="text-emerald-400 font-bold">{hoveredDay.count} deliveries</span> ·{" "}
              {hoveredDay.liters.toLocaleString()} Liters
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Ward: <span className="text-slate-200">{hoveredDay.ward}</span> · Public ledger
            </div>
          </div>
        )}
      </div>

      {/* Bottom Footer Bar with Legend and Drag instruction matching user screenshot */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 mt-5 pt-4 border-t border-slate-800/80 font-mono">
        <div className="flex items-center gap-2 text-slate-400 text-[11px]">
          <span>Drag to orbit · double-click to reset</span>
        </div>

        {/* Less / More Legend */}
        <div className="flex items-center gap-1.5 text-[11px]">
          <span>Less</span>
          <span className="w-3 h-3 rounded-xs bg-[#161b22]" />
          <span className="w-3 h-3 rounded-xs bg-[#0e4429]" />
          <span className="w-3 h-3 rounded-xs bg-[#006d32]" />
          <span className="w-3 h-3 rounded-xs bg-[#26a641]" />
          <span className="w-3 h-3 rounded-xs bg-[#39d353]" />
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
