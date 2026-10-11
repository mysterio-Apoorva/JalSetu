import React from "react";

export function ProductTimeline() {
  const milestones = [
    {
      date: "2024 November",
      title: "Stage 01: Cryptographic Handshake",
      description: "Mathematical solution to water diversion: 6-digit dynamic OTP hashed with SHA-256, eliminating ghost trips.",
      direction: "up",
    },
    {
      date: "2025 March",
      title: "Stage 02: AWS Step Functions Pipeline",
      description: "Full state machine orchestration coordinating intake, triage, geofence bounding, and driver dispatch.",
      direction: "down",
    },
    {
      date: "2025 July",
      title: "Stage 03: Bedrock Nova Lite & SQS FIFO",
      description: "Generative AI multi-lingual urgency triage processing Hindi voice notes with zero dropped requests during 46°C heatwave.",
      direction: "up",
    },
    {
      date: "2025 November",
      title: "Stage 04: Public Equity Ledger",
      description: "Immutable civic transparency dashboard verifying 100% of delivered liters across Delhi's 250 municipal wards.",
      direction: "down",
    },
  ];

  return (
    <div className="relative w-full overflow-hidden bg-[#07090e] text-white py-16 px-6 sm:px-12 rounded-3xl border border-slate-800 shadow-2xl my-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-16 gap-4">
        <div>
          <span className="text-[11px] font-mono font-bold tracking-widest text-orange-400 uppercase">
            Product Architecture & Evolution
          </span>
          <h2 className="text-3xl font-extrabold tracking-tight mt-1 text-slate-100 font-sans">
            Product Storyline
          </h2>
        </div>
        <div className="font-mono text-xs text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800 w-fit">
          2024 — 2026
        </div>
      </div>

      {/* Horizontal Timeline Container */}
      <div className="relative w-full overflow-x-auto pb-8 pt-10">
        <div className="min-w-[850px] relative px-8">
          {/* Main Horizontal Timeline Bar */}
          <div className="absolute top-1/2 left-4 right-4 h-[1.5px] bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 -translate-y-1/2" />

          {/* Timeline Nodes Grid */}
          <div className="grid grid-cols-4 gap-8 relative z-10">
            {milestones.map((item, index) => {
              const isUp = item.direction === "up";
              return (
                <div key={index} className="flex flex-col items-start relative">
                  {/* For UP nodes: text is above line */}
                  {isUp && (
                    <div className="mb-6 space-y-1.5 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />
                        <span className="text-xs font-mono font-bold text-orange-400">
                          {item.date}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-100">
                        {item.title}
                      </h3>
                      <p className="text-[11px] text-slate-400 leading-relaxed max-w-[200px]">
                        {item.description}
                      </p>
                    </div>
                  )}

                  {/* Vertical connector line */}
                  <div
                    className={`w-[1px] bg-orange-500/70 ${
                      isUp ? "h-8 mb-0" : "h-8 mt-0 self-start"
                    }`}
                  />

                  {/* Node Dot on the horizontal line */}
                  <div className="relative -my-1.5">
                    <div className="w-3.5 h-3.5 rounded-full bg-orange-500 ring-4 ring-[#07090e] shadow-lg shadow-orange-500/50" />
                  </div>

                  {/* For DOWN nodes: text is below line */}
                  {!isUp && (
                    <div className="mt-8 space-y-1.5 pt-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                        <span className="text-xs font-mono font-bold text-amber-400">
                          {item.date}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-100">
                        {item.title}
                      </h3>
                      <p className="text-[11px] text-slate-400 leading-relaxed max-w-[200px]">
                        {item.description}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
export default ProductTimeline;
