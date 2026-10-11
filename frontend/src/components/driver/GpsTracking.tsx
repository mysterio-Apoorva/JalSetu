import { useEffect, useState } from "react";
import { api } from "../../services/api";

export function GpsTracking({ tankerId }: { tankerId: string }) {
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState("Location sharing is off.");
  useEffect(() => {
    if (!enabled) return;
    if (!navigator.geolocation) {
      return;
    }
    let active = true,
      sending = false,
      lastSent = 0;
    const watch = navigator.geolocation.watchPosition(
      async (position) => {
        if (!active || sending || Date.now() - lastSent < 15000) return;
        if (position.coords.accuracy > 200) {
          setStatus("GPS accuracy is poor. Move to an open area.");
          return;
        }
        sending = true;
        try {
          await api("/telemetry", {
            tankerId,
            coordinates: {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            },
            accuracyMeters: position.coords.accuracy,
            speedKmph: Math.max(0, (position.coords.speed || 0) * 3.6),
            sampledAt: new Date(position.timestamp).toISOString(),
          });
          lastSent = Date.now();
          if (active)
            setStatus(
              `GPS updated at ${new Date(lastSent).toLocaleTimeString()}. Accuracy ±${Math.round(position.coords.accuracy)} m.`,
            );
        } catch (e) {
          if (active) setStatus((e as Error).message);
        } finally {
          sending = false;
        }
      },
      (error) => {
        if (!active) return;
        setStatus(error.message);
        if (error.code === error.PERMISSION_DENIED) setEnabled(false);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );
    return () => {
      active = false;
      navigator.geolocation.clearWatch(watch);
    };
  }, [enabled, tankerId]);
  return (
    <section className="glossy-panel p-4 rounded-2xl space-y-2">
      <button
        className="secondary-action"
        aria-pressed={enabled}
        onClick={() => {
          if (!navigator.geolocation) { setStatus("GPS is unavailable in this browser."); return; }
          setEnabled(!enabled);
          setStatus(enabled ? "Location sharing is off." : "Waiting for an accurate GPS position…");
        }}
      >
        {enabled ? "Stop location sharing" : "Start location sharing"}
      </button>
      <p role="status" className="text-sm">
        {status}
      </p>
      <p className="text-xs text-slate-500">
        Keep this screen open during your route. Your browser shares GPS at most
        once every 15 seconds. Water volume is recorded inventory; no physical
        flow sensor is connected.
      </p>
    </section>
  );
}
