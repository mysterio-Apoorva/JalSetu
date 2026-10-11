import { useEffect, useState } from "react";
import { api } from "../services/api";

export interface PublicDelivery { id: string; status: string; deliveredAt?: string; litersDelivered?: number; wardId?: string }
export function usePublicDeliveries(supplied?: PublicDelivery[]) {
  const [records, setRecords] = useState<PublicDelivery[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(supplied === undefined);
  useEffect(() => {
    if (supplied !== undefined) return;
    let active = true, inFlight = false;
    const load = async () => {
      if (inFlight || document.hidden) return;
      inFlight = true;
      try {
        const data = await api<{ deliveries: PublicDelivery[] }>("/public");
        if (!Array.isArray(data?.deliveries)) throw new Error("Delivery history is unavailable. Please retry later.");
        if (active) { setRecords(data.deliveries); setError(""); }
      } catch (e) { if (active) setError((e as Error).message); }
      finally { inFlight = false; if (active) setLoading(false); }
    };
    void load();
    const timer = setInterval(load, 30000);
    document.addEventListener("visibilitychange", load);
    return () => { active = false; clearInterval(timer); document.removeEventListener("visibilitychange", load); };
  }, [supplied]);
  return { deliveries: supplied ?? records, error, loading: supplied === undefined && loading };
}
