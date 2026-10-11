import React from "react";

interface ShinyButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function ShinyButton({
  children,
  className = "",
  onClick,
  ...props
}: ShinyButtonProps) {
  return (
    <button
      onClick={onClick}
      {...props}
      className={`group relative inline-flex items-center justify-center px-8 py-3.5 rounded-full font-semibold text-sm tracking-wide text-white transition-all duration-300 active:scale-95 cursor-pointer overflow-hidden shadow-2xl ${className}`}
      style={{
        background: "radial-gradient(ellipse at 50% 0%, #2a1b12 0%, #0d0a08 70%, #050403 100%)",
        boxShadow: "0 10px 30px -8px rgba(234, 88, 12, 0.35), 0 0 0 1px rgba(249, 115, 22, 0.4)",
      }}
    >
      {/* Top luminous border highlight glow */}
      <div
        className="absolute inset-x-4 top-0 h-[1.5px] rounded-full transition-opacity duration-300 group-hover:opacity-100 opacity-80"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(251, 146, 60, 0.8) 25%, #ffedd5 50%, rgba(251, 146, 60, 0.8) 75%, transparent)",
        }}
      />

      {/* Subtle micro dot-grid texture on upper hemisphere */}
      <div
        className="absolute inset-x-0 top-0 h-1/2 pointer-events-none opacity-25 group-hover:opacity-40 transition-opacity"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255, 255, 255, 0.7) 1px, transparent 1px)",
          backgroundSize: "4px 4px",
        }}
      />

      {/* Inner radial spotlight on hover */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 50% 0%, rgba(249, 115, 22, 0.25) 0%, transparent 60%)",
        }}
      />

      {/* Button content */}
      <span className="relative z-10 flex items-center gap-2">
        {children}
      </span>
    </button>
  );
}
export default ShinyButton;
