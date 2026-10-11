import { useState } from "react";
import type { Tanker } from "../../types";
import { api } from "../../services/api";
export function RefillForm({ fleet, onRecorded }: { fleet: Tanker[]; onRecorded: () => Promise<void> }) {
  const [tankerId, setTankerId] = useState("");
  const [liters, setLiters] = useState("");
  const [receipt, setReceipt] = useState("");
  const [key, setKey] = useState(crypto.randomUUID());
  const [busy, setBusy] = useState(false), [status, setStatus] = useState("");
  if (!fleet.length) return <section className="empty-state mt-5"><strong>Depot refills</strong><p>Register a tanker before recording its refill and depot receipt.</p></section>;
  return <form className="glossy-panel p-4 rounded-xl space-y-3 mt-4" onSubmit={async e => {
    e.preventDefault(); if (busy) return; setBusy(true); setStatus("");
    try { await api("/fleet/refill", { tankerId, litersAdded: Number(liters), receiptReference: receipt, idempotencyKey: key }); setKey(crypto.randomUUID()); setLiters(""); setReceipt(""); setStatus("Refill recorded against the depot receipt."); await onRecorded(); }
    catch (error) { setStatus((error as Error).message); } finally { setBusy(false); }
  }}>
    <h3 className="font-bold">Record depot refill</h3>
    <p className="text-sm">Record a completed fill using the depot receipt. This updates recorded inventory; it is not a sensor measurement.</p>
    <div className="grid md:grid-cols-3 gap-4">
    <label className="block">Idle tanker<select required value={tankerId} onChange={e => { setTankerId(e.target.value); setKey(crypto.randomUUID()); }} className="block border rounded p-3 w-full"><option value="">Select tanker</option>{fleet.filter(t => t.status === "IDLE" && !t.assignedRoute.length).map(t => <option key={t.id} value={t.id}>{t.vehicleNumber}</option>)}</select></label>
    <label className="block">Litres added<input required type="number" min="1" step="1" value={liters} onChange={e => setLiters(e.target.value)} className="block border rounded p-3 w-full" /></label>
    <label className="block">Depot receipt reference<input required maxLength={200} value={receipt} onChange={e => setReceipt(e.target.value)} className="block border rounded p-3 w-full" /></label>
    </div>
    <button disabled={busy} className="secondary-action">{busy ? "Recording…" : "Record refill"}</button>
    {status && <p role="status">{status}</p>}
  </form>;
}
