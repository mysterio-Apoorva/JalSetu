import React, { useState } from "react";
import { ArrowRight } from "lucide-react";

export interface CitizenPersona {
  id: string;
  name: string;
  locality: string;
  wardId: string;
  daysDry: number;
  infants: number;
  elders: number;
  tag: "CRITICAL" | "CLINICAL" | "COMMUNITY" | "RESOLVED";
  avatarSvgIndex: number;
  quote: string;
}

const CITIZEN_PERSONAS: CitizenPersona[] = [
  {
    id: "cit-1",
    name: "Kavita Devi (RWA)",
    locality: "Sangam Vihar Block L-2",
    wardId: "WARD-01",
    daysDry: 4,
    infants: 2,
    elders: 4,
    tag: "CRITICAL",
    avatarSvgIndex: 0,
    quote: "Piped water pressure dropped to zero 4 days ago. Our community underground tank is dry, and elders in our lane need drinking water urgently.",
  },
  {
    id: "cit-2",
    name: "Mohd. Imran",
    locality: "Seelampur Gali No. 4",
    wardId: "WARD-05",
    daysDry: 3,
    infants: 1,
    elders: 2,
    tag: "CRITICAL",
    avatarSvgIndex: 1,
    quote: "Zero tanker arrival despite multiple helpline reports. Local groundwater is saline and non-potable for cooking.",
  },
  {
    id: "cit-3",
    name: "Rajesh Verma",
    locality: "Mehrauli Ward 07 Slum Pocket",
    wardId: "WARD-02",
    daysDry: 3,
    infants: 0,
    elders: 5,
    tag: "CLINICAL",
    avatarSvgIndex: 2,
    quote: "Local free physiotherapy and dialysis clinic has no running water. Requesting emergency 5,000L replenishment.",
  },
  {
    id: "cit-4",
    name: "Pooja Gupta",
    locality: "Dwarka Sector 8 JJ Colony",
    wardId: "WARD-03",
    daysDry: 2,
    infants: 1,
    elders: 1,
    tag: "COMMUNITY",
    avatarSvgIndex: 3,
    quote: "Pipeline repair ongoing on the arterial road. Need scheduled morning batch tanker for 20 households.",
  },
  {
    id: "cit-5",
    name: "Anand Kumar",
    locality: "Rohini Sector 16 Pocket D",
    wardId: "WARD-04",
    daysDry: 2,
    infants: 0,
    elders: 1,
    tag: "COMMUNITY",
    avatarSvgIndex: 4,
    quote: "Low municipal pressure in the morning. Need tanker refill for community underground sump.",
  },
  {
    id: "cit-6",
    name: "Gurpreet Singh",
    locality: "Narela Industrial Slum Cluster",
    wardId: "WARD-06",
    daysDry: 4,
    infants: 2,
    elders: 2,
    tag: "CRITICAL",
    avatarSvgIndex: 5,
    quote: "Tanker lines are 400m long with frequent disputes. Need transparent route ETA so families don't wait in heat.",
  },
  {
    id: "cit-7",
    name: "Meera Devi",
    locality: "Mustafabad Phase 2",
    wardId: "WARD-07",
    daysDry: 1,
    infants: 1,
    elders: 3,
    tag: "RESOLVED",
    avatarSvgIndex: 6,
    quote: "Tanker arrived yesterday with verified 6-digit OTP confirmation. Piped pressure still recovering.",
  },
];

export interface CitizenCrowdCanvasProps {
  onSelectPersona?: (persona: CitizenPersona) => void;
  className?: string;
}

export function CitizenCrowdCanvas({ onSelectPersona, className }: CitizenCrowdCanvasProps) {
  const [selectedId, setSelectedId] = useState<string>("cit-1");
  const [filter, setFilter] = useState<"ALL" | "CRITICAL" | "CLINICAL" | "RESOLVED">("ALL");

  const filteredPersonas = CITIZEN_PERSONAS.filter(
    (p) => filter === "ALL" || p.tag === filter
  );

  const activePersona =
    CITIZEN_PERSONAS.find((p) => p.id === selectedId) || CITIZEN_PERSONAS[0];

  return (
    <div className={`w-full rounded-3xl bg-white border border-slate-200/90 shadow-xl p-6 md:p-8 relative overflow-hidden font-sans ${className || ""}`}>
      {/* Background graphic accents */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-orange-500" />
            <span className="text-xs font-mono font-bold tracking-widest text-orange-600 uppercase">
              Community Canvas
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 font-mono text-slate-700">
              Delhi Resident Voices
            </span>
          </div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            People Behind the Numbers
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Behind every tanker request is an elderly neighbor, an infant, or a neighborhood clinic. Tap any resident to view their community report and auto-fill priority triage.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl">
          {(
            [
              { id: "ALL", label: "All Residents" },
              { id: "CRITICAL", label: "Critical (3+ Days)" },
              { id: "CLINICAL", label: "Clinical Distress" },
              { id: "RESOLVED", label: "Verified Served" },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              onClick={() => setFilter(item.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                filter === item.id
                  ? "bg-slate-900 text-white shadow"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Crowd Illustrated Canvas Stage */}
      <div className="relative my-6 rounded-2xl bg-gradient-to-b from-slate-50 to-slate-100/60 border border-slate-200 p-4 md:p-6 overflow-hidden">
        {/* Crowd Vector Drawing - Black & White Illustrated Crowd */}
        <div className="relative w-full h-[220px] md:h-[260px] flex items-end justify-center overflow-hidden">
          <svg
            viewBox="0 0 1000 320"
            className="w-full h-full select-none"
            preserveAspectRatio="xMidYMax meet"
          >
            {/* Background silhouettes */}
            <g fill="#cbd5e1" opacity="0.6">
              <circle cx="120" cy="80" r="38" />
              <circle cx="280" cy="70" r="42" />
              <circle cx="450" cy="65" r="40" />
              <circle cx="620" cy="75" r="44" />
              <circle cx="790" cy="70" r="39" />
              <circle cx="920" cy="85" r="41" />
              <path d="M 60 180 Q 120 110 180 180 Z" />
              <path d="M 220 170 Q 280 90 340 170 Z" />
              <path d="M 390 160 Q 450 85 510 160 Z" />
              <path d="M 560 175 Q 620 95 680 175 Z" />
              <path d="M 730 165 Q 790 90 850 165 Z" />
              <path d="M 860 185 Q 920 105 980 185 Z" />
            </g>

            {/* Midground illustrated citizens */}
            <g fill="#1e293b" stroke="#0f172a" strokeWidth="2.5">
              {/* Person 1 */}
              <circle cx="180" cy="140" r="42" fill="#ffffff" />
              <path d="M 160 135 Q 180 150 200 135" fill="none" strokeWidth="3" />
              <circle cx="168" cy="125" r="4" fill="#0f172a" />
              <circle cx="192" cy="125" r="4" fill="#0f172a" />
              <path d="M 120 280 Q 180 190 240 280 Z" fill="#ffffff" stroke="#0f172a" />

              {/* Person 2 */}
              <circle cx="340" cy="120" r="46" fill="#ffffff" />
              <path d="M 315 110 Q 340 85 365 110" fill="none" strokeWidth="6" strokeLinecap="round" />
              <circle cx="328" cy="115" r="4.5" fill="#0f172a" />
              <circle cx="352" cy="115" r="4.5" fill="#0f172a" />
              <path d="M 326 130 Q 340 142 354 130" fill="none" strokeWidth="3" />
              <path d="M 270 280 Q 340 170 410 280 Z" fill="#0f172a" />

              {/* Person 3 (Center foreground spotlight) */}
              <circle cx="500" cy="110" r="50" fill="#ffffff" strokeWidth="3" />
              {/* Glasses */}
              <circle cx="482" cy="105" r="12" fill="none" strokeWidth="3" />
              <circle cx="518" cy="105" r="12" fill="none" strokeWidth="3" />
              <line x1="494" y1="105" x2="506" y2="105" strokeWidth="3" />
              <path d="M 488 132 Q 500 145 512 132" fill="none" strokeWidth="3" />
              <path d="M 425 290 Q 500 165 575 290 Z" fill="#ffffff" stroke="#0f172a" strokeWidth="3" />

              {/* Person 4 */}
              <circle cx="660" cy="125" r="46" fill="#ffffff" />
              <circle cx="648" cy="120" r="4.5" fill="#0f172a" />
              <circle cx="672" cy="120" r="4.5" fill="#0f172a" />
              <path d="M 645 138 Q 660 148 675 138" fill="none" strokeWidth="3" />
              <path d="M 595 280 Q 660 175 725 280 Z" fill="#0f172a" />

              {/* Person 5 */}
              <circle cx="820" cy="135" r="44" fill="#ffffff" />
              <circle cx="808" cy="130" r="4" fill="#0f172a" />
              <circle cx="832" cy="130" r="4" fill="#0f172a" />
              <path d="M 808 145 Q 820 155 832 145" fill="none" strokeWidth="3" />
              <path d="M 760 280 Q 820 185 880 280 Z" fill="#ffffff" stroke="#0f172a" />
            </g>
          </svg>

          {/* Interactive Persona Avatars floating row */}
          <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-2 md:gap-3 px-4 z-10 overflow-x-auto py-2">
            {filteredPersonas.map((persona) => {
              const isSelected = selectedId === persona.id;
              return (
                <button
                  key={persona.id}
                  onClick={() => setSelectedId(persona.id)}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl transition-all duration-200 border ${
                    isSelected
                      ? "bg-slate-900 text-white border-orange-500 shadow-xl scale-105"
                      : "bg-white/95 text-slate-800 border-slate-200 hover:border-slate-400 hover:scale-102"
                  }`}
                >
                  <div className="relative">
                    <div
                      className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm ${
                        isSelected
                          ? "bg-orange-500 text-white"
                          : "bg-slate-100 text-slate-800"
                      }`}
                    >
                      {persona.name.slice(0, 2).toUpperCase()}
                    </div>
                    {persona.tag === "CRITICAL" && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-white" />
                    )}
                    {persona.tag === "CLINICAL" && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-purple-500 rounded-full border-2 border-white" />
                    )}
                    {persona.tag === "RESOLVED" && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
                    )}
                  </div>
                  <span className="text-[11px] font-bold max-w-[70px] truncate text-center">
                    {persona.name.split(" ")[0]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected Citizen Voice Card */}
      <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-2 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-base text-slate-900">
              {activePersona.name}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200/80 font-mono text-slate-700 font-semibold">
              {activePersona.locality}
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                activePersona.tag === "CRITICAL"
                  ? "bg-rose-100 text-rose-800 border border-rose-300"
                  : activePersona.tag === "CLINICAL"
                    ? "bg-purple-100 text-purple-800 border border-purple-300"
                    : activePersona.tag === "RESOLVED"
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                      : "bg-amber-100 text-amber-800 border border-amber-300"
              }`}
            >
              {activePersona.tag}
            </span>
          </div>

          <p className="text-sm italic text-slate-700 leading-relaxed font-serif">
            "{activePersona.quote}"
          </p>

          <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-600 pt-1">
            <span>
              Outage:{" "}
              <strong className="text-rose-700 font-bold">
                {activePersona.daysDry} Days
              </strong>
            </span>
            <span>•</span>
            <span>
              Infants: <strong>{activePersona.infants}</strong>
            </span>
            <span>•</span>
            <span>
              Elders (60+): <strong>{activePersona.elders}</strong>
            </span>
          </div>
        </div>

        {onSelectPersona && (
          <button
            onClick={() => onSelectPersona(activePersona)}
            className="self-start md:self-center px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center gap-2 shadow-md transition whitespace-nowrap"
          >
            <span>Triage This Need</span>
            <ArrowRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
export default CitizenCrowdCanvas;
