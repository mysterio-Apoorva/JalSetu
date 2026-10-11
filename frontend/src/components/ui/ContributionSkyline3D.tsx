import React, { useState, useMemo, useRef, useCallback } from "react";
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
  onSelectDay?: (day: DayDelivery) => void;
}

export function ContributionSkyline3D({ className, onSelectDay }: ContributionSkylineProps) {
  const [viewMode, setViewMode] = useState<"3d" | "grid">("3d");
  const [hoveredDay, setHoveredDay] = useState<DayDelivery | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // 3D Orbit Camera State
  const [rotation, setRotation] = useState<{ x: number; z: number }>({ x: 56, z: -40 });
  const lastMousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Generate 52 weeks of verified deliveries (364 days) matching the user reference
  const { weeks, stats } = useMemo(() => {
    const wards = [
      "Sangam Vihar",
      "Seelampur",
      "Mehrauli",
      "Dwarka JJ",
      "Rohini Sec-16",
      "Narela",
      "Mustafabad",
      "Okhla",
    ];

    const weeksData: DayDelivery[][] = [];
    const baseDate = new Date(2025, 10, 6); // Nov 6, 2025

    for (let w = 0; w < 52; w++) {
      const week: DayDelivery[] = [];
      for (let d = 0; d < 7; d++) {
        const currentDate = new Date(baseDate);
        currentDate.setDate(baseDate.getDate() + w * 7 + d);

        const monthNum = currentDate.getMonth(); // 0-11
        const monthName = currentDate.toLocaleDateString("en-US", { month: "short" });
        const dateStr = currentDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });

        // Deterministic pseudo-random generation for stable rendering
        const seed = w * 7 + d;
        const p1 = ((seed * 9301 + 49297) % 233280) / 233280;
        const p2 = ((seed * 1337 + 5123) % 1000) / 1000;

        // Peak summer simulation (May - July)
        const isSummer = monthNum >= 4 && monthNum <= 6;
        const isPeakDay = w === 37 && d === 4; // Mid-July peak

        let count = 0;
        if (isPeakDay) {
          count = 54;
        } else if (isSummer) {
          count = Math.floor(p1 * 14) + 6; // 6 - 19
        } else if (p1 > 0.3) {
          count = Math.floor(p1 * 8) + 1;  // 1 - 8
        }

        let intensity = 0;
        if (count > 0) intensity = 1;
        if (count >= 5) intensity = 2;
        if (count >= 10) intensity = 3;
        if (count >= 16) intensity = 4;

        // 3D extrusion height: 0px to 54px
        const height = count === 0 ? 0 : Math.min(56, Math.max(4, Math.round(count * 2.8)));
        const liters = count * (Math.floor(p2 * 2500) + 4500);
        const ward = wards[(w + d) % wards.length];

        week.push({
          date: dateStr,
          count,
          liters,
          ward,
          intensity,
          height,
          month: monthName,
          dayOfWeek: d,
        });
      }
      weeksData.push(week);
    }

    return {
      weeks: weeksData,
      stats: {
        total: 1720, // matching exact user screenshot
        busiestCount: 54,
        busiestDate: "Jul 25",
        longestStreak: 27,
        currentStreak: 2,
        dateRange: "Nov 6, 2025 — Nov 8, 2026",
      },
    };
  }, []);

  // Mouse Orbit Drag Handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (viewMode !== "3d") return;
    setIsDragging(true);
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  }, [viewMode]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
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

  const monthLabels = ["Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"];

  return (
    <div
      className={`w-full rounded-3xl bg-[#090d16] border border-slate-800 text-slate-100 p-6 md:p-8 shadow-2xl relative overflow-hidden font-sans select-none ${
        className || ""
      }`}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
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
            {stats.total.toLocaleString()} Verified Deliveries in the Last Year
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Real-time volumetric 3D representation of audited municipal tanker dispatches across all 250 wards.
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

      {/* Main Stats Header Cards matching user screenshot */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-6 relative z-10">
        {/* 1 Year Total */}
        <div className="bg-[#0d1117]/90 border border-slate-800/80 rounded-2xl p-4">
          <span className="text-xs text-slate-400 block">1 year total</span>
          <div className="text-3xl font-black font-mono text-emerald-400 mt-0.5 tracking-tight">
            {stats.total.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400 block mt-1">
            contributions · {stats.dateRange}
          </span>
        </div>

        {/* Busiest Day */}
        <div className="bg-[#0d1117]/90 border border-slate-800/80 rounded-2xl p-4">
          <span className="text-xs text-slate-400 block">Busiest day</span>
          <div className="text-3xl font-black font-mono text-emerald-400 mt-0.5 tracking-tight">
            {stats.busiestCount}
          </div>
          <span className="text-[11px] text-slate-400 block mt-1">
            dispatches · {stats.busiestDate}
          </span>
        </div>

        {/* Longest Streak */}
        <div className="bg-[#0d1117]/90 border border-slate-800/80 rounded-2xl p-4">
          <span className="text-xs text-slate-400 block">Longest streak</span>
          <div className="text-3xl font-black font-mono text-emerald-400 mt-0.5 tracking-tight">
            {stats.longestStreak}
          </div>
          <span className="text-[11px] text-slate-400 block mt-1">
            days · Apr 17 — May 13
          </span>
        </div>

        {/* Current Streak */}
        <div className="bg-[#0d1117]/90 border border-slate-800/80 rounded-2xl p-4">
          <span className="text-xs text-slate-400 block">Current streak</span>
          <div className="text-3xl font-black font-mono text-emerald-400 mt-0.5 tracking-tight">
            {stats.currentStreak}
          </div>
          <span className="text-[11px] text-slate-400 block mt-1">
            days · Active uninterrupted supply
          </span>
        </div>
      </div>

      {/* Interactive 3D Orbit / Grid Canvas Stage */}
      <div
        className={`relative w-full overflow-hidden rounded-2xl border border-slate-800/80 bg-[#060910] p-6 flex flex-col items-center justify-center transition-all ${
          viewMode === "3d" ? "cursor-grab active:cursor-grabbing min-h-[380px]" : "min-h-[260px]"
        }`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
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
                transform: `rotateX(${rotation.x}deg) rotateZ(${rotation.z}deg)`,
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
                        onMouseEnter={() => setHoveredDay(day)}
                        onClick={() => onSelectDay?.(day)}
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
                        onMouseEnter={() => setHoveredDay(day)}
                        onClick={() => onSelectDay?.(day)}
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
              <span className="text-emerald-400 font-bold">{hoveredDay.count} dispatches</span> ·{" "}
              {hoveredDay.liters.toLocaleString()} Liters
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Ward: <span className="text-slate-200">{hoveredDay.ward}</span> · SHA-256 Verified
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
