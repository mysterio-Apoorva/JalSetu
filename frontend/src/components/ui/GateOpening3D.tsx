import React, { useEffect, useState } from "react";
import { useAnimationVisibility } from "../../hooks/useAnimationVisibility";
import { ShinyButton } from "./ShinyButton";
import { Lock, Unlock, Droplets, ArrowRight } from "lucide-react";

interface GateOpeningProps {
  onEnterProject?: () => void;
}

export function GateOpening3D({ onEnterProject }: GateOpeningProps) {
  const [manualOpen, setManualOpen] = useState<boolean | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const { ref, entered, reducedMotion } = useAnimationVisibility();
  const isOpen = manualOpen ?? (entered || reducedMotion);
  useEffect(() => {
    if (!isAnimating) return;
    const timer = setTimeout(() => setIsAnimating(false), 1200);
    return () => clearTimeout(timer);
  }, [isAnimating]);

  const toggleGate = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setManualOpen(!isOpen);
  };

  return (
    <div ref={ref} data-testid="automatic-gate" data-open={isOpen} className="relative w-full overflow-hidden py-8 sm:py-10 px-4 flex flex-col items-center justify-center text-center bg-[#05070c] rounded-3xl border border-orange-950/50 shadow-2xl">
      {/* Background Ambient Mist & Light */}
      <div className="absolute inset-0 bg-radial from-orange-950/20 via-[#070b14] to-[#04060a] pointer-events-none" />

      {/* Header Info */}
      <div className="relative z-10 mb-8 max-w-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-950/40 border border-orange-500/30 text-orange-400 text-xs font-mono font-semibold mb-3">
          <Droplets size={13} className="text-orange-400 animate-pulse" />
          <span>CYBERNETIC WATERWAY ACCESS PORTAL</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white font-sans">
          The Sluice Gates of Delhi
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-2">
          The gates open as you explore. An illustration of the connection between residents and water operations.
        </p>
      </div>

      {/* 3D Gate Viewport Container */}
      <div
        className="relative w-full max-w-3xl h-[340px] sm:h-[420px] rounded-2xl overflow-hidden border border-slate-800 bg-[#020306] shadow-2xl flex items-center justify-center"
        style={{ perspective: "1200px" }}
      >
        {/* Interior Chamber (Revealed when gates swing open) */}
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-radial from-sky-950/60 via-[#070e1c] to-[#03060d] p-6 text-center z-0">
          {/* Animated Water Particle Wave effect */}
          <div className="w-24 h-24 rounded-full bg-sky-500/10 border border-sky-400/30 flex items-center justify-center shadow-[0_0_50px_rgba(56,189,248,0.25)] animate-pulse mb-4">
            <Droplets size={44} className="text-sky-400" />
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white tracking-wide">
            CONNECTING EVERY DROP
          </h3>
          <p className="text-xs text-slate-300 max-w-md mt-2 font-mono">
            Report your water needs, explore road routes, and follow recorded deliveries.
          </p>
          {onEnterProject && (
            <button
              onClick={onEnterProject}
              className="mt-6 inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs tracking-wider uppercase transition shadow-lg shadow-sky-500/30 cursor-pointer"
            >
              <span>Access Command Core</span>
              <ArrowRight size={14} />
            </button>
          )}
        </div>

        {/* Hydraulic Pistons (Top & Bottom mechanical bars) */}
        <div className="absolute top-0 inset-x-0 h-8 bg-slate-900 border-b border-slate-800 z-30 flex items-center justify-between px-6">
          <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
            <span className={`w-2 h-2 rounded-full ${isOpen ? "bg-emerald-500 animate-ping" : "bg-orange-500"}`} />
            <span>{isOpen ? "GATE OPEN" : "GATE CLOSED"} · ILLUSTRATION</span>
          </div>
          <div className="text-[10px] font-mono text-slate-500">DELHI WATER NETWORK</div>
        </div>

        {/* 3D Gate Doors Container (Split 50% left / 50% right) */}
        <div className="absolute inset-0 top-8 bottom-0 flex z-20 pointer-events-none" style={{ transformStyle: "preserve-3d" }}>
          {/* Left Door */}
          <div
            className="w-1/2 h-full bg-gradient-to-r from-[#11151f] via-[#1a202c] to-[#121622] border-r border-slate-700/80 shadow-2xl relative transition-transform duration-1000 ease-out origin-left flex flex-col justify-between p-6"
            style={{
              transform: isOpen ? "rotateY(-78deg)" : "rotateY(0deg)",
              boxShadow: "inset 0 0 40px rgba(0,0,0,0.8)",
            }}
          >
            {/* Heavy Steel Reinforcement Beams */}
            <div className="space-y-4 pt-4 opacity-40">
              <div className="h-2 w-full bg-slate-800 rounded border border-slate-700" />
              <div className="h-2 w-full bg-slate-800 rounded border border-slate-700" />
              <div className="h-2 w-full bg-slate-800 rounded border border-slate-700" />
            </div>

            {/* Door Status Emblem */}
            <div className="self-center p-4 rounded-2xl bg-black/50 border border-slate-700 text-slate-400 flex flex-col items-center gap-2">
              <div className="font-mono text-[10px] tracking-widest text-orange-400">GATE-A [WEST]</div>
              {isOpen ? <Unlock size={22} className="text-emerald-400" /> : <Lock size={22} className="text-orange-400" />}
            </div>

            <div className="font-mono text-[9px] text-slate-600 tracking-wider">
              HEAVY SLUICE REINFORCED TITANIUM
            </div>
          </div>

          {/* Right Door */}
          <div
            className="w-1/2 h-full bg-gradient-to-l from-[#11151f] via-[#1a202c] to-[#121622] border-l border-slate-700/80 shadow-2xl relative transition-transform duration-1000 ease-out origin-right flex flex-col justify-between p-6"
            style={{
              transform: isOpen ? "rotateY(78deg)" : "rotateY(0deg)",
              boxShadow: "inset 0 0 40px rgba(0,0,0,0.8)",
            }}
          >
            {/* Heavy Steel Reinforcement Beams */}
            <div className="space-y-4 pt-4 opacity-40">
              <div className="h-2 w-full bg-slate-800 rounded border border-slate-700" />
              <div className="h-2 w-full bg-slate-800 rounded border border-slate-700" />
              <div className="h-2 w-full bg-slate-800 rounded border border-slate-700" />
            </div>

            {/* Door Status Emblem */}
            <div className="self-center p-4 rounded-2xl bg-black/50 border border-slate-700 text-slate-400 flex flex-col items-center gap-2">
              <div className="font-mono text-[10px] tracking-widest text-orange-400">GATE-B [EAST]</div>
              {isOpen ? <Unlock size={22} className="text-emerald-400" /> : <Lock size={22} className="text-orange-400" />}
            </div>

            <div className="font-mono text-[9px] text-slate-600 tracking-wider self-end">
              AUTOMATIC INTERLOCK 3-WAY SECURE
            </div>
          </div>
        </div>
      </div>

      {/* Control Button (Shiny Button) */}
      <div className="relative z-10 mt-8 flex items-center gap-4">
        <ShinyButton onClick={toggleGate} disabled={isAnimating}>
          <span>{isOpen ? "SEAL THE GATES" : "OPEN THE GATES (3D)"}</span>
          <ArrowRight size={15} className={`transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
        </ShinyButton>
      </div>
    </div>
  );
}
export default GateOpening3D;
