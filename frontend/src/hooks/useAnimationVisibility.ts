import { useEffect, useRef, useState } from "react";

/** Decorative animation runs only when visible and the user permits motion. */
export function useAnimationVisibility() {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    const update = () => { setReducedMotion(preference.matches); setActive(visible && !document.hidden && !preference.matches); };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) setEntered(true); update(); }, { threshold: 0.15 });
    if (ref.current) observer.observe(ref.current);
    update();
    preference.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);
    return () => { observer.disconnect(); preference.removeEventListener("change", update); document.removeEventListener("visibilitychange", update); };
  }, []);
  return { ref, active, reducedMotion, entered };
}
