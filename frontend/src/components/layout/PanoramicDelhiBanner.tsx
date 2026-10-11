import React from "react";

export const PanoramicDelhiBanner: React.FC = () => {
  return (
    <div className="relative w-full h-36 md:h-48 overflow-hidden rounded-2xl border border-slate-200/90 shadow-md bg-gradient-to-b from-sky-400 via-sky-200 to-emerald-100">
      {/* Sun & Cloud Atmosphere */}
      <div className="absolute top-4 right-16 w-14 h-14 rounded-full bg-amber-300 shadow-[0_0_40px_rgba(251,191,36,0.8)] opacity-90 animate-pulse-slow" />

      {/* Cloud Shapes */}
      <div className="absolute top-6 left-12 w-28 h-10 rounded-full bg-white/80 blur-[1px]" />
      <div className="absolute top-10 left-32 w-36 h-12 rounded-full bg-white/70 blur-[1px]" />
      <div className="absolute top-4 right-48 w-44 h-14 rounded-full bg-white/80 blur-[1px]" />

      {/* SVG Panoramic Skyline of Delhi: India Gate, Qutub Minar, Lotus Temple, Metro Viaduct & Green Canopy */}
      <svg
        className="absolute bottom-0 left-0 w-full h-full object-cover"
        viewBox="0 0 1200 240"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        {/* Background Distant Skylines & Hills */}
        <path
          d="M0 190 Q 200 160 400 180 T 800 170 T 1200 185 L 1200 240 L 0 240 Z"
          fill="#A7F3D0"
          opacity="0.6"
        />

        {/* Wind Turbines on Distant Ridge */}
        <g opacity="0.6" stroke="#047857" strokeWidth="1.5">
          {/* Turbine 1 */}
          <line x1="80" y1="180" x2="80" y2="120" />
          <line x1="80" y1="120" x2="65" y2="105" />
          <line x1="80" y1="120" x2="95" y2="105" />
          <line x1="80" y1="120" x2="80" y2="140" />

          {/* Turbine 2 */}
          <line x1="130" y1="185" x2="130" y2="135" />
          <line x1="130" y1="135" x2="118" y2="122" />
          <line x1="130" y1="135" x2="142" y2="122" />
        </g>

        {/* INDIA GATE Silhouette (Center Left) */}
        <g transform="translate(360, 105)" fill="#D97706" opacity="0.85">
          <rect x="0" y="30" width="12" height="45" rx="1" />
          <rect x="36" y="30" width="12" height="45" rx="1" />
          <path d="M 0 30 Q 24 15 48 30 Z" />
          <rect x="6" y="10" width="36" height="15" rx="1" />
          <rect x="12" y="0" width="24" height="10" rx="1" />
          <path
            d="M 12 75 A 12 18 0 0 1 36 75 Z"
            fill="#FEF3C7"
            opacity="0.7"
          />
        </g>

        {/* QUTUB MINAR Tower (Center) */}
        <g transform="translate(680, 70)" fill="#B45309" opacity="0.85">
          <polygon points="12,0 16,0 22,110 6,110" />
          <line
            x1="4"
            y1="30"
            x2="24"
            y2="30"
            stroke="#78350F"
            strokeWidth="2"
          />
          <line
            x1="6"
            y1="60"
            x2="22"
            y2="60"
            stroke="#78350F"
            strokeWidth="2"
          />
          <line
            x1="8"
            y1="85"
            x2="20"
            y2="85"
            stroke="#78350F"
            strokeWidth="2"
          />
          <circle cx="14" cy="0" r="3" fill="#D97706" />
        </g>

        {/* LOTUS TEMPLE Silhouette (Center Right) */}
        <g
          transform="translate(740, 125)"
          fill="#FFFFFF"
          opacity="0.95"
          stroke="#CBD5E1"
          strokeWidth="1"
        >
          <path
            d="M 20 50 C 15 25 35 15 40 45 C 45 15 65 25 60 50 Z"
            fill="#F8FAFC"
          />
          <path d="M 30 50 C 35 30 45 30 50 50 Z" fill="#E2E8F0" />
        </g>

        {/* Delhi Modern Highrises */}
        <g fill="#94A3B8" opacity="0.7">
          <rect x="850" y="110" width="22" height="70" />
          <rect x="880" y="95" width="28" height="85" />
          <rect x="915" y="120" width="20" height="60" />
          <rect x="945" y="85" width="24" height="95" />
          <rect x="975" y="105" width="26" height="75" />
        </g>

        {/* Solar Panels Installation */}
        <g
          transform="translate(1050, 155)"
          stroke="#0284C7"
          strokeWidth="1.5"
          fill="#0369A1"
          opacity="0.8"
        >
          <polygon points="0,20 30,5 60,10 30,25" />
          <polygon points="35,23 65,8 95,13 65,28" />
        </g>

        {/* Delhi Metro Viaduct & Express Train */}
        <g transform="translate(0, 165)">
          {/* Pillars */}
          <rect x="220" y="15" width="10" height="40" fill="#94A3B8" />
          <rect x="340" y="15" width="10" height="40" fill="#94A3B8" />
          <rect x="460" y="15" width="10" height="40" fill="#94A3B8" />
          <rect x="580" y="15" width="10" height="40" fill="#94A3B8" />
          {/* Bridge Slab */}
          <rect x="200" y="10" width="450" height="8" rx="2" fill="#64748B" />
          {/* Metro Train (White with Blue Stripe) */}
          <rect
            x="360"
            y="0"
            width="130"
            height="10"
            rx="3"
            fill="#FFFFFF"
            stroke="#CBD5E1"
            strokeWidth="0.5"
          />
          <rect x="360" y="4" width="130" height="2" fill="#0284C7" />
          <circle cx="370" cy="5" r="1.5" fill="#1E293B" />
          <circle cx="390" cy="5" r="1.5" fill="#1E293B" />
          <circle cx="410" cy="5" r="1.5" fill="#1E293B" />
          <circle cx="430" cy="5" r="1.5" fill="#1E293B" />
          <circle cx="450" cy="5" r="1.5" fill="#1E293B" />
          <circle cx="470" cy="5" r="1.5" fill="#1E293B" />
        </g>

        {/* River Yamuna / Reservoir Water Flow */}
        <path
          d="M 280 195 Q 400 185 550 190 T 750 195 L 750 205 Q 550 200 400 195 T 280 205 Z"
          fill="#38BDF8"
          opacity="0.8"
        />

        {/* Lush Green Foreground Tree Canopy & Lawns */}
        <path
          d="M0 195 Q 150 175 300 190 Q 450 180 600 188 Q 750 178 900 185 Q 1050 175 1200 190 L 1200 240 L 0 240 Z"
          fill="#10B981"
        />
        <path
          d="M0 208 Q 200 195 400 205 Q 600 198 800 204 Q 1000 198 1200 210 L 1200 240 L 0 240 Z"
          fill="#059669"
        />
      </svg>

      {/* Floating Bharat Builds Location Badge (Top Right) */}
      <div className="absolute top-3 right-3 hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/90 backdrop-blur-md border border-emerald-600/30 shadow-md text-xs font-semibold text-emerald-900">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
        <span>Delhi Jal Board Command Region</span>
        <span className="font-mono text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
          DELHI 02 / 06
        </span>
      </div>

      {/* Subtle National Tricolor Baseline */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#FF9933] via-white to-[#138808]" />
    </div>
  );
};
