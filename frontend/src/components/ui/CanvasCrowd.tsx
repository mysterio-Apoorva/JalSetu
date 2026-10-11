import React, { useState, useRef, useCallback } from "react";
import { ArrowRight, Volume2, Droplets } from "lucide-react";

export interface CrowdResident {
  id: string;
  name: string;
  locality: string;
  wardId: string;
  daysDry: number;
  infants: number;
  elders: number;
  householdSize: number;
  category: "CRITICAL" | "CLINICAL" | "COMMUNITY" | "RESOLVED";
  hindiQuote: string;
  englishQuote: string;
  xPercent: number; // 0 - 100 on canvas
  yPercent: number; // 0 - 100 on canvas
  avatarStyle: number;
}

const DELHI_RESIDENTS: CrowdResident[] = [
  {
    id: "res-1",
    name: "Kavita Devi",
    locality: "Sangam Vihar Block L-2",
    wardId: "WARD-01",
    daysDry: 4,
    infants: 2,
    elders: 4,
    householdSize: 8,
    category: "CRITICAL",
    hindiQuote: "चार दिन से नल में एक बूंद पानी नहीं आया। बच्चे और बुजुर्ग बीमार पड़ रहे हैं।",
    englishQuote: "Zero piped water for 4 days. Underground sump is bone dry; infants and seniors need immediate emergency supply.",
    xPercent: 50,
    yPercent: 78,
    avatarStyle: 0,
  },
  {
    id: "res-2",
    name: "Mohd. Imran",
    locality: "Seelampur Gali No. 4",
    wardId: "WARD-05",
    daysDry: 3,
    infants: 1,
    elders: 2,
    householdSize: 6,
    category: "CRITICAL",
    hindiQuote: "प्राइवेट टैंकर वाले ₹3,000 मांग रहे हैं। जल बोर्ड का सरकारी टैंकर कब आएगा?",
    englishQuote: "Private cartels charging ₹3,000 per load. Groundwater is saline; we need official municipal allocation.",
    xPercent: 32,
    yPercent: 65,
    avatarStyle: 1,
  },
  {
    id: "res-3",
    name: "Dr. Rajesh Verma",
    locality: "Mehrauli Ward 07 Clinic",
    wardId: "WARD-02",
    daysDry: 3,
    infants: 0,
    elders: 6,
    householdSize: 12,
    category: "CLINICAL",
    hindiQuote: "मुफ्त डायलिसिस और फिजियोथेरेपी क्लिनिक में पानी खत्म हो गया है।",
    englishQuote: "Charity community clinic has no running water for sanitation and sterilization. Requesting priority 5,000L drop.",
    xPercent: 68,
    yPercent: 68,
    avatarStyle: 2,
  },
  {
    id: "res-4",
    name: "Pooja Gupta",
    locality: "Dwarka Sector 8 JJ Colony",
    wardId: "WARD-03",
    daysDry: 2,
    infants: 1,
    elders: 1,
    householdSize: 5,
    category: "COMMUNITY",
    hindiQuote: "मेन लाइन रिपेयर चल रही है, कम्यूनिटी टैंक में पानी भरवा दीजिए।",
    englishQuote: "Main pipeline repair ongoing. Need morning batch delivery for 20 households in lane 3.",
    xPercent: 18,
    yPercent: 52,
    avatarStyle: 3,
  },
  {
    id: "res-5",
    name: "Anand Kumar",
    locality: "Rohini Sector 16 Pocket D",
    wardId: "WARD-04",
    daysDry: 2,
    infants: 0,
    elders: 2,
    householdSize: 4,
    category: "COMMUNITY",
    hindiQuote: "सुबह का प्रेशर बहुत कम है, सेकंड फ्लोर तक पानी नहीं चढ़ता।",
    englishQuote: "Severely reduced municipal pressure. Sump needs scheduled tanker replenishment.",
    xPercent: 82,
    yPercent: 56,
    avatarStyle: 4,
  },
  {
    id: "res-6",
    name: "Gurpreet Singh",
    locality: "Narela Industrial Area Colony",
    wardId: "WARD-06",
    daysDry: 3,
    infants: 2,
    elders: 3,
    householdSize: 7,
    category: "CRITICAL",
    hindiQuote: "लेबर क्वार्टर में 50 परिवार बिना पीने के पानी के परेशान हैं।",
    englishQuote: "Over 50 labor families without drinking water. Please route tanker DL-02 to the main chauraha.",
    xPercent: 40,
    yPercent: 44,
    avatarStyle: 5,
  },
  {
    id: "res-7",
    name: "Meera Devi",
    locality: "Mustafabad Phase 2",
    wardId: "WARD-07",
    daysDry: 1,
    infants: 1,
    elders: 3,
    householdSize: 6,
    category: "RESOLVED",
    hindiQuote: "कल 6-अंकों के OTP से टैंकर डिलीवर हुआ, अब स्थिति बेहतर है।",
    englishQuote: "Tanker arrived yesterday with verified 6-digit OTP confirmation. Piped pressure gradually recovering.",
    xPercent: 62,
    yPercent: 42,
    avatarStyle: 6,
  },
];

interface CanvasCrowdProps {
  className?: string;
  onSelectResident?: (resident: CrowdResident) => void;
}

export function CanvasCrowd({ className, onSelectResident }: CanvasCrowdProps) {
  const [activeResident, setActiveResident] = useState<CrowdResident>(DELHI_RESIDENTS[0]);
  const [filter, setFilter] = useState<"ALL" | "CRITICAL" | "CLINICAL" | "RESOLVED">("ALL");
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [isAudioSimulating, setIsAudioSimulating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Mouse move handler for interactive character eye/head tracking
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setCursorPos({ x, y });
  }, []);

  const handleSimulateAudio = () => {
    setIsAudioSimulating(true);
    setTimeout(() => setIsAudioSimulating(false), 2400);
  };

  const filteredResidents = DELHI_RESIDENTS.filter(
    (r) => filter === "ALL" || r.category === filter
  );

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className={`w-full rounded-3xl bg-[#ffffff] border border-slate-200/90 text-slate-900 shadow-2xl relative overflow-hidden font-sans select-none ${
        className || ""
      }`}
    >
      {/* Background accents */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 md:p-8 border-b border-slate-100 relative z-10 bg-white">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-slate-900 animate-pulse" />
            <span className="text-xs font-mono font-bold tracking-widest text-slate-700 uppercase">
              DELHI CITIZEN VOICES
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 font-mono text-slate-700">
              Canvas Crowd
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mt-1">
            People Behind the Numbers
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Every point on the map is a family, an elder, or a clinic. Tap any resident in the illustrated crowd to hear their story and pre-fill priority triage.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
          {(
            [
              { id: "ALL", label: "All Residents" },
              { id: "CRITICAL", label: "Critical Shortage" },
              { id: "CLINICAL", label: "Clinical Needs" },
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

      {/* Main Dense Illustrated Crowd Canvas (Skiper39 style) */}
      <div className="relative w-full h-[320px] md:h-[400px] bg-gradient-to-b from-white via-slate-50 to-slate-100/80 overflow-hidden flex items-end justify-center">
        {/* Central Floating Badge matching user screenshot */}
        <div
          className="absolute z-30 transition-all duration-300 pointer-events-none"
          style={{
            left: `${activeResident.xPercent}%`,
            top: `${Math.max(12, activeResident.yPercent - 32)}%`,
            transform: "translate(-50%, -100%)",
          }}
        >
          <div className="flex flex-col items-center">
            <div className="bg-slate-900 text-white px-3.5 py-1.5 rounded-full shadow-2xl border border-slate-700 text-xs font-mono font-bold tracking-wider uppercase flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>CROWD CANVAS</span>
            </div>
            {/* Pointer line */}
            <div className="w-0.5 h-6 bg-slate-900" />
            <div className="w-2 h-2 rounded-full bg-slate-900" />
          </div>
        </div>

        {/* Dense Illustrated SVG Crowd Art with dynamic cursor tracking */}
        <svg
          viewBox="0 0 1000 420"
          className="w-full h-full select-none"
          preserveAspectRatio="xMidYMax meet"
        >
          <defs>
            {/* Glow filter */}
            <filter id="crowdGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#0f172a" floodOpacity="0.25" />
            </filter>
          </defs>

          {/* Deep Background Silhouettes Layer */}
          <g fill="#94a3b8" opacity="0.45">
            <circle cx="80" cy="90" r="34" />
            <circle cx="160" cy="85" r="32" />
            <circle cx="240" cy="80" r="36" />
            <circle cx="320" cy="75" r="33" />
            <circle cx="400" cy="70" r="38" />
            <circle cx="480" cy="65" r="35" />
            <circle cx="560" cy="70" r="37" />
            <circle cx="640" cy="75" r="34" />
            <circle cx="720" cy="80" r="36" />
            <circle cx="800" cy="85" r="33" />
            <circle cx="880" cy="90" r="35" />
            <circle cx="950" cy="95" r="32" />
            <path d="M 30 190 Q 80 120 130 190 Z" />
            <path d="M 110 185 Q 160 115 210 185 Z" />
            <path d="M 190 180 Q 240 110 290 180 Z" />
            <path d="M 270 175 Q 320 105 370 175 Z" />
            <path d="M 350 170 Q 400 100 450 170 Z" />
            <path d="M 430 165 Q 480 95 530 165 Z" />
            <path d="M 510 170 Q 560 100 610 170 Z" />
            <path d="M 590 175 Q 640 105 690 175 Z" />
            <path d="M 670 180 Q 720 110 770 180 Z" />
            <path d="M 750 185 Q 800 115 850 185 Z" />
            <path d="M 830 190 Q 880 120 930 190 Z" />
          </g>

          {/* Midground Dense Layer */}
          <g fill="#475569" stroke="#0f172a" strokeWidth="2.5" opacity="0.85">
            {/* Person A */}
            <circle cx="120" cy="150" r="38" fill="#ffffff" />
            <path d="M 90 135 C 100 110 140 110 150 135 Z" fill="#0f172a" />
            <circle cx="108" cy="148" r="4" fill="#0f172a" />
            <circle cx="132" cy="148" r="4" fill="#0f172a" />
            <path d="M 70 290 Q 120 190 170 290 Z" fill="#ffffff" stroke="#0f172a" strokeWidth="3" />

            {/* Person B */}
            <circle cx="280" cy="140" r="42" fill="#ffffff" />
            <path d="M 245 125 C 265 95 305 95 315 125 Z" fill="#0f172a" />
            <circle cx="266" cy="138" r="4" fill="#0f172a" />
            <circle cx="294" cy="138" r="4" fill="#0f172a" />
            <path d="M 220 290 Q 280 180 340 290 Z" fill="#0f172a" stroke="#0f172a" strokeWidth="3" />

            {/* Person C */}
            <circle cx="440" cy="130" r="40" fill="#ffffff" />
            {/* Glasses */}
            <circle cx="424" cy="126" r="11" fill="none" stroke="#0f172a" strokeWidth="3" />
            <circle cx="456" cy="126" r="11" fill="none" stroke="#0f172a" strokeWidth="3" />
            <line x1="435" y1="126" x2="445" y2="126" stroke="#0f172a" strokeWidth="3" />
            <path d="M 380 290 Q 440 175 500 290 Z" fill="#ffffff" stroke="#0f172a" strokeWidth="3" />

            {/* Person D */}
            <circle cx="600" cy="135" r="44" fill="#ffffff" />
            <path d="M 570 120 C 585 90 625 90 630 120 Z" fill="#0f172a" />
            <circle cx="586" cy="132" r="4.5" fill="#0f172a" />
            <circle cx="614" cy="132" r="4.5" fill="#0f172a" />
            <path d="M 540 290 Q 600 180 660 290 Z" fill="#0f172a" stroke="#0f172a" strokeWidth="3" />

            {/* Person E */}
            <circle cx="760" cy="145" r="40" fill="#ffffff" />
            <circle cx="745" cy="140" r="4" fill="#0f172a" />
            <circle cx="775" cy="140" r="4" fill="#0f172a" />
            <path d="M 700 290 Q 760 185 820 290 Z" fill="#ffffff" stroke="#0f172a" strokeWidth="3" />

            {/* Person F */}
            <circle cx="900" cy="155" r="38" fill="#ffffff" />
            <circle cx="886" cy="150" r="4" fill="#0f172a" />
            <circle cx="914" cy="150" r="4" fill="#0f172a" />
            <path d="M 850 290 Q 900 195 950 290 Z" fill="#0f172a" stroke="#0f172a" strokeWidth="3" />
          </g>

          {/* Foreground Stylized Characters Layer (Exact Skiper39 Artwork) */}
          <g stroke="#0f172a" strokeWidth="3">
            {/* Character 1 (Left foreground) */}
            <g
              className="cursor-pointer group transition-transform duration-200"
              onClick={() => {
                setActiveResident(DELHI_RESIDENTS[3]);
                onSelectResident?.(DELHI_RESIDENTS[3]);
              }}
            >
              {/* Torso */}
              <path d="M 110 420 Q 180 230 250 420 Z" fill="#ffffff" />
              <path d="M 155 310 L 205 310" stroke="#0f172a" strokeWidth="3" />
              {/* Head */}
              <circle cx="180" cy="210" r="50" fill="#ffffff" />
              {/* Big Stylish Hair */}
              <path
                d="M 130 210 C 125 150 235 150 230 210 C 220 185 140 185 130 210 Z"
                fill="#0f172a"
              />
              {/* Face features */}
              <circle cx="162" cy="205" r="5" fill="#0f172a" />
              <circle cx="198" cy="205" r="5" fill="#0f172a" />
              <path d="M 170 230 Q 180 240 190 230" fill="none" strokeWidth="3.5" />
            </g>

            {/* Character 2 (Mid-Left foreground) */}
            <g
              className="cursor-pointer group transition-transform duration-200"
              onClick={() => {
                setActiveResident(DELHI_RESIDENTS[1]);
                onSelectResident?.(DELHI_RESIDENTS[1]);
              }}
            >
              {/* Torso */}
              <path d="M 250 420 Q 320 220 390 420 Z" fill="#0f172a" />
              {/* Head */}
              <circle cx="320" cy="200" r="52" fill="#ffffff" />
              {/* Curly hair & beard */}
              <path
                d="M 270 200 C 265 140 375 140 370 200 C 355 170 285 170 270 200 Z"
                fill="#0f172a"
              />
              <path d="M 285 220 Q 320 255 355 220 Z" fill="#0f172a" />
              {/* Eyes looking toward cursor */}
              <circle
                cx={306 + (cursorPos.x - 32) * 0.08}
                cy={195 + (cursorPos.y - 50) * 0.08}
                r="5"
                fill="#0f172a"
              />
              <circle
                cx={334 + (cursorPos.x - 32) * 0.08}
                cy={195 + (cursorPos.y - 50) * 0.08}
                r="5"
                fill="#0f172a"
              />
              <path d="M 312 214 Q 320 222 328 214" fill="none" strokeWidth="3" />
            </g>

            {/* Character 3 (CENTER SPOTLIGHT HERO - Kavita Devi / Central Persona) */}
            <g
              className="cursor-pointer group transition-transform duration-200"
              onClick={() => {
                setActiveResident(DELHI_RESIDENTS[0]);
                onSelectResident?.(DELHI_RESIDENTS[0]);
              }}
            >
              {/* Torso with coat */}
              <path d="M 410 420 Q 500 200 590 420 Z" fill="#ffffff" />
              <path d="M 450 420 L 490 280 L 510 280 L 550 420" fill="#0f172a" />
              {/* Head */}
              <circle
                cx="500"
                cy="190"
                r="56"
                fill="#ffffff"
                className="transition-all"
                strokeWidth={activeResident.id === "res-1" ? 4.5 : 3}
              />
              {/* Bandana / Headband & flowing hair */}
              <path
                d="M 444 185 C 440 120 560 120 556 185 C 540 155 460 155 444 185 Z"
                fill="#0f172a"
              />
              {/* Headband knot */}
              <circle cx="500" cy="138" r="9" fill="#0f172a" />
              {/* Sunglasses / Eyes */}
              <rect x="472" y="178" width="22" height="15" rx="5" fill="#0f172a" />
              <rect x="506" y="178" width="22" height="15" rx="5" fill="#0f172a" />
              <line x1="494" y1="184" x2="506" y2="184" strokeWidth="3" stroke="#0f172a" />
              {/* Smile / Mouth */}
              <path d="M 488 216 Q 500 228 512 216" fill="none" strokeWidth="3.5" />
            </g>

            {/* Character 4 (Mid-Right foreground) */}
            <g
              className="cursor-pointer group transition-transform duration-200"
              onClick={() => {
                setActiveResident(DELHI_RESIDENTS[2]);
                onSelectResident?.(DELHI_RESIDENTS[2]);
              }}
            >
              {/* Torso */}
              <path d="M 610 420 Q 680 220 750 420 Z" fill="#0f172a" />
              {/* Head */}
              <circle cx="680" cy="205" r="50" fill="#ffffff" />
              {/* Hair */}
              <path
                d="M 635 200 C 630 145 730 145 725 200 C 715 175 645 175 635 200 Z"
                fill="#0f172a"
              />
              {/* Classic Doctor / Elder Glasses */}
              <circle cx="664" cy="200" r="12" fill="none" stroke="#0f172a" strokeWidth="3.5" />
              <circle cx="696" cy="200" r="12" fill="none" stroke="#0f172a" strokeWidth="3.5" />
              <line x1="676" y1="200" x2="684" y2="200" strokeWidth="3.5" stroke="#0f172a" />
              <path d="M 672 225 Q 680 234 688 225" fill="none" strokeWidth="3" />
            </g>

            {/* Character 5 (Far-Right foreground) */}
            <g
              className="cursor-pointer group transition-transform duration-200"
              onClick={() => {
                setActiveResident(DELHI_RESIDENTS[4]);
                onSelectResident?.(DELHI_RESIDENTS[4]);
              }}
            >
              {/* Torso */}
              <path d="M 750 420 Q 820 230 890 420 Z" fill="#ffffff" />
              {/* Head */}
              <circle cx="820" cy="215" r="48" fill="#ffffff" />
              {/* Hair */}
              <path
                d="M 775 210 C 770 160 870 160 865 210 C 855 185 785 185 775 210 Z"
                fill="#0f172a"
              />
              <circle cx="806" cy="210" r="4.5" fill="#0f172a" />
              <circle cx="834" cy="210" r="4.5" fill="#0f172a" />
              <path d="M 812 232 Q 820 240 828 232" fill="none" strokeWidth="3" />
            </g>
          </g>
        </svg>

        {/* Floating Quick Selector Bubbles at the bottom */}
        <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-2 px-4 z-20 overflow-x-auto py-1">
          {filteredResidents.map((resident) => {
            const isSelected = activeResident.id === resident.id;
            return (
              <button
                key={resident.id}
                onClick={() => {
                  setActiveResident(resident);
                  onSelectResident?.(resident);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  isSelected
                    ? "bg-slate-900 text-white shadow-lg scale-105 border border-slate-700"
                    : "bg-white/90 text-slate-700 border border-slate-300 hover:bg-white hover:scale-102"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    resident.category === "CRITICAL"
                      ? "bg-rose-500"
                      : resident.category === "CLINICAL"
                      ? "bg-purple-500"
                      : resident.category === "RESOLVED"
                      ? "bg-emerald-500"
                      : "bg-amber-500"
                  }`}
                />
                <span>{resident.name}</span>
                <span className="text-[10px] opacity-70">({resident.locality.split(" ")[0]})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Resident Story & Callout Drawer */}
      <div className="p-6 md:p-8 bg-slate-900 text-white border-t border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-bold">{activeResident.name}</h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
              {activeResident.locality}
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${
                activeResident.category === "CRITICAL"
                  ? "bg-rose-950 text-rose-300 border border-rose-800"
                  : activeResident.category === "CLINICAL"
                  ? "bg-purple-950 text-purple-300 border border-purple-800"
                  : activeResident.category === "RESOLVED"
                  ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                  : "bg-amber-950 text-amber-300 border border-amber-800"
              }`}
            >
              {activeResident.category}
            </span>
          </div>

          {/* Hindi Voice Quote with Sound Effect */}
          <div className="flex items-start gap-2.5 bg-slate-800/80 p-3 rounded-2xl border border-slate-700/80">
            <button
              onClick={handleSimulateAudio}
              className={`p-2 rounded-xl transition ${
                isAudioSimulating ? "bg-emerald-500 text-white animate-bounce" : "bg-slate-700 text-slate-300 hover:text-white"
              }`}
              title="Listen to Hindi voice transcript"
            >
              <Volume2 size={16} />
            </button>
            <div>
              <p className="text-sm font-medium text-slate-100 italic">
                "{activeResident.hindiQuote}"
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {activeResident.englishQuote}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 font-mono">
            <span>
              Dry spell: <strong className="text-rose-400">{activeResident.daysDry} days</strong>
            </span>
            <span>·</span>
            <span>
              Infants: <strong className="text-slate-200">{activeResident.infants}</strong>
            </span>
            <span>·</span>
            <span>
              Elders: <strong className="text-slate-200">{activeResident.elders}</strong>
            </span>
            <span>·</span>
            <span>
              Household size: <strong className="text-slate-200">{activeResident.householdSize} members</strong>
            </span>
          </div>
        </div>

        {/* Action Button: Auto-fill relief request */}
        <button
          onClick={() => onSelectResident?.(activeResident)}
          className="w-full md:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-sm hover:from-emerald-400 hover:to-teal-400 shadow-xl flex items-center justify-center gap-2 transition hover:scale-102 cursor-pointer flex-shrink-0"
        >
          <Droplets size={18} />
          <span>Initiate Water Relief for {activeResident.name}</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
