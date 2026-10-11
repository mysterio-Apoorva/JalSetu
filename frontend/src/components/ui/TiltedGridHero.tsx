import React from "react";

export function TiltedGridHero() {
  const cards = [
    {
      title: "Community Standposts",
      subtitle: "Verified Collection Points",
      bgGradient: "from-blue-600 via-sky-500 to-cyan-400",
      icon: "💧",
      transform: "rotateY(25deg) translateZ(-40px)",
      opacity: "opacity-80",
    },
    {
      title: "Amazon Location Service",
      subtitle: "Real-time 200m Geofencing",
      bgGradient: "from-indigo-600 via-purple-600 to-pink-500",
      icon: "🛰️",
      transform: "rotateY(12deg) translateZ(-15px)",
      opacity: "opacity-95",
    },
    {
      title: "Cryptographic Handshake",
      subtitle: "3-Way Resident OTP & SHA-256",
      bgGradient: "from-amber-600 via-orange-500 to-rose-500",
      icon: "🔐",
      transform: "rotateY(0deg) scale(1.06)",
      opacity: "opacity-100 ring-2 ring-orange-400 shadow-2xl",
    },
    {
      title: "Bedrock Nova Lite Triage",
      subtitle: "Written Complaint Analysis",
      bgGradient: "from-emerald-600 via-teal-500 to-cyan-500",
      icon: "🧠",
      transform: "rotateY(-12deg) translateZ(-15px)",
      opacity: "opacity-95",
    },
    {
      title: "Public Delivery Ledger",
      subtitle: "Recorded Delivery Evidence",
      bgGradient: "from-slate-800 via-slate-700 to-slate-900",
      icon: "🏛️",
      transform: "rotateY(-25deg) translateZ(-40px)",
      opacity: "opacity-80",
    },
  ];

  return (
    <div className="relative w-full overflow-hidden py-16 px-4 flex flex-col items-center justify-center text-center bg-white/60 backdrop-blur-sm rounded-3xl border border-slate-200/80 shadow-sm my-8">
      {/* Title */}
      <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 mb-2 font-sans">
        Every frame, brought into focus.
      </h2>
      <p className="text-xs sm:text-sm text-slate-500 max-w-lg mb-12">
        Images curve in from one edge, flatten out at the centre, then fade away round the other.
      </p>

      {/* 3D Perspective Stage */}
      <div
        className="w-full max-w-6xl overflow-hidden py-8 px-2 flex items-center justify-center"
        style={{ perspective: "1000px" }}
      >
        <div className="flex items-center justify-center gap-2 sm:gap-4 flex-nowrap">
          {cards.map((card, idx) => (
            <div
              key={idx}
              className={`relative flex-shrink-0 w-36 sm:w-56 h-48 sm:h-72 rounded-2xl p-4 sm:p-5 flex flex-col justify-between text-left text-white shadow-xl transition-all duration-500 hover:scale-105 bg-gradient-to-br ${card.bgGradient} ${card.opacity}`}
              style={{
                transform: card.transform,
                transformStyle: "preserve-3d",
              }}
            >
              <div className="text-2xl sm:text-3xl">{card.icon}</div>
              <div className="space-y-1">
                <span className="text-[10px] font-mono tracking-wider uppercase opacity-80">
                  {card.subtitle}
                </span>
                <h4 className="text-xs sm:text-sm font-bold leading-tight">
                  {card.title}
                </h4>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
export default TiltedGridHero;
