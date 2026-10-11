import { useEffect, useRef, useState, type CSSProperties } from "react";
import heroPoster from "../../assets/hero.png";

export interface MetroHeroProps {
  videoSrc?: string;
  title?: string;
  scrollHint?: string;
  tagline?: string;
  signature?: { name: string; url: string } | false;
  scrubDistance?: number;
  ctaLabel?: string;
  onCta?: () => void;
  className?: string;
  style?: CSSProperties;
  onComplete?: () => void;
}

const DEFAULT_VIDEO = "https://cdn.21st.dev/assets/mirror/21/21a77eac28eacbb7e142016eefeaa0b4a766619e51113629a3bc6df6af066c0f.mp4";

// Playback never takes ownership of document scrolling or keyboard navigation.
export default function MetroHero({ videoSrc = DEFAULT_VIDEO, title = "THE CITY OPENS",
  scrollHint = "SCROLL TO EXPLORE", tagline = "Every drop. Every delivery. Accounted for.",
  ctaLabel, onCta, className = "", style, onComplete }: MetroHeroProps) {
  const section = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const element = video.current, container = section.current;
    if (!element || !container || failed) return;
    let visible = true;
    let active = true;
    const sync = () => {
      if (paused || document.hidden || !visible) { element.pause(); return; }
      void element.play().catch(() => { if (active) setPaused(true); });
    };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
    observer.observe(container);
    document.addEventListener("visibilitychange", sync);
    return () => { active = false; observer.disconnect(); document.removeEventListener("visibilitychange", sync); element.pause(); };
  }, [paused, failed, videoSrc]);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPaused(preference.matches);
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);

  return <div ref={section} className={`relative w-full overflow-hidden bg-slate-950 ${className}`}
    style={{ minHeight: "min(740px, 90svh)", ...style }} data-testid="landing-animation">
    <img src={heroPoster} alt="" className="absolute inset-0 w-full h-full object-cover" />
    {!failed && <video ref={video} src={videoSrc} muted playsInline loop preload="metadata" poster={heroPoster}
      onPlaying={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={onComplete}
      onError={() => { setFailed(true); setPlaying(false); }} aria-hidden="true"
      className="absolute inset-0 w-full h-full object-cover pointer-events-none" />}
    <div className="absolute inset-0 bg-gradient-to-b from-slate-950/50 via-slate-950/25 to-slate-950/95" />
    <div className="relative z-10 flex min-h-[560px] flex-col items-center justify-center px-6 pt-16 pb-36 text-center text-white">
      <p className="text-xs tracking-[0.25em] uppercase text-emerald-300 mb-4">Delhi water access</p>
      <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight">{title}</h1>
      <p className="mt-5 max-w-xl text-lg sm:text-2xl text-slate-100">{tagline}</p>
      {ctaLabel && <button type="button" onClick={onCta} className="mt-8 rounded-full bg-orange-600 hover:bg-orange-500 px-6 py-3 font-bold">{ctaLabel} →</button>}
      <p className="mt-8 text-[10px] tracking-widest text-slate-300">{scrollHint}</p>
    </div>
    {!failed && <button type="button" onClick={() => setPaused(value => !value)} aria-pressed={paused}
      className="absolute top-4 right-4 z-20 rounded-full border border-white/30 bg-slate-950/80 px-4 py-2 text-xs text-white">
      {playing ? "Pause animation" : "Play animation"}
    </button>}
  </div>;
}
