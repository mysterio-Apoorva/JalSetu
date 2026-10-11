import { useEffect, useState } from "react";
export function TelemetryStatus({ sampledAt }: { sampledAt?: string }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 15000); return () => clearInterval(timer); }, []);
  const timestamp = sampledAt ? Date.parse(sampledAt) : NaN;
  if (!Number.isFinite(timestamp)) return <span>No GPS sample received.</span>;
  return <span>GPS received: {new Date(timestamp).toLocaleString()}. {now - timestamp > 120000 ? "Stale location; contact driver." : "Browser-reported location."}</span>;
}
