import { useState } from "react";
import { api } from "../../services/api";
export function EvidenceViewer({ requestId }: { requestId: string }) {
  const [record, setRecord] = useState<{photoBase64?:string;photoValid:boolean;photoError?:string;integrityVerified:boolean;auditHash:string} | null>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const [busy,setBusy] = useState(false), [error,setError] = useState("");
  return <div className="mt-3">
    <button className="secondary-action" disabled={busy} onClick={async()=>{
      if (record) {setRecord(null); return;}
      setBusy(true); setError(""); setImageFailed(false);
      try {setRecord(await api(`/evidence?requestId=${encodeURIComponent(requestId)}`));}
      catch(e) {setError((e as Error).message);} finally {setBusy(false);}
    }}>{busy ? "Checking stored evidence…" : record ? "Close private evidence" : "Inspect private delivery evidence"}</button>
    {error && <p role="alert" className="text-red-700 mt-2">{error}</p>}
    {record && <div className="border rounded-xl p-3 mt-2">
      <p className={record.integrityVerified ? "text-emerald-800" : "text-red-700"}>{record.integrityVerified ? "Photo and record match the stored SHA-256 hashes." : "Integrity check failed. Investigate this evidence."}</p>
      {(!record.photoValid || imageFailed) && <p role="alert" className="text-red-700 mt-2">{record.photoError || "This photograph could not be validated. Investigate before accepting this evidence."}</p>}
      {record.photoValid && record.photoBase64 && !imageFailed && <img src={`data:image/jpeg;base64,${record.photoBase64}`} alt={`Private delivery evidence for ${requestId}`} onError={() => setImageFailed(true)} className="max-h-96 max-w-full mt-2 rounded-lg" />}
      <p className="text-xs mt-2">Restricted audit evidence. A matching hash establishes record integrity, not physical delivery truth.</p>
    </div>}
  </div>;
}
