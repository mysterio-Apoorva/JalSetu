import { useState, useRef } from "react";
import {
  Truck,
  Camera,
  MapPin,
  ShieldCheck,
  Droplets,
  Languages,
  ArrowRight,
} from "lucide-react";
import type { Tanker } from "../../types";
import { LIVE_MODE } from "../../services/api";
import { GpsTracking } from "./GpsTracking";
interface Props {
  tanker: Tanker;
  onVerifyDelivery: (
    id: string,
    otp: string,
    liters: number,
    photo?: string,
  ) => Promise<{ success: boolean; message: string; auditHash?: string }>;
  onSimulateMoveToStop: () => void | Promise<void>;
}
export function DriverPortal({
  tanker,
  onVerifyDelivery,
  onSimulateMoveToStop,
}: Props) {
  const [hindi, setHindi] = useState(false),
    [otp, setOtp] = useState(""),
    [liters, setLiters] = useState(2000),
    [photo, setPhoto] = useState(""),
    [busy, setBusy] = useState(false),
    [feedback, setFeedback] = useState<{
      success: boolean;
      message: string;
      auditHash?: string;
    } | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const stop = tanker.assignedRoute[0];
  async function selectPhoto(file?: File) {
    if (!file) return;
    if (file.type !== "image/jpeg" || file.size > 2000000) {
      setFeedback({
        success: false,
        message: "Choose a JPEG photo smaller than 2 MB.",
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPhoto(String(reader.result));
    reader.onerror = () =>
      setFeedback({ success: false, message: "Could not read photo." });
    reader.readAsDataURL(file);
  }
  async function verify() {
    if (!stop) return;
    setBusy(true);
    setFeedback(null);
    try {
      const result = await onVerifyDelivery(stop.requestId, otp, liters, photo);
      setFeedback(result);
      if (result.success) {
        setOtp("");
        setPhoto("");
      }
    } catch (e) {
      setFeedback({ success: false, message: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <span className="eyebrow">DRIVER WORKSPACE</span>
          <h2 className="text-2xl font-bold text-slate-800 mt-2">
            {hindi
              ? "हर डिलीवरी, भरोसे के साथ।"
              : "Deliver water. Carry trust."}
          </h2>
        </div>
        <button className="secondary-action" onClick={() => setHindi(!hindi)}>
          <Languages size={16} />
          {hindi ? "English" : "हिंदी"}
        </button>
      </div>
      <div className="glossy-panel p-5 rounded-2xl flex justify-between items-center">
        <div className="flex gap-3 items-center">
          <span className="principle-icon">
            <Truck size={25} />
          </span>
          <div>
            <strong>{tanker.vehicleNumber}</strong>
            <p className="text-xs text-slate-500 mt-1">
              {tanker.driverName} · {tanker.depotName}
            </p>
          </div>
        </div>
        <div className="text-right">
          <strong className="text-emerald-800">
            {tanker.currentWaterLevelLiters.toLocaleString()} L
          </strong>
          <p className="text-xs text-slate-500">
            {hindi ? "दर्ज पानी की मात्रा" : "Recorded inventory"}
          </p>
        </div>
      </div>
      {feedback && (
        <div
          role="status"
          className={`rounded-xl p-4 border text-sm ${feedback.success ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-red-50 border-red-200 text-red-800"}`}
        >
          {feedback.message}
          {feedback.auditHash && (
            <code className="block break-all text-xs mt-2">
              {feedback.auditHash}
            </code>
          )}
        </div>
      )}
      {LIVE_MODE && <GpsTracking tankerId={tanker.id} />}
      {!stop ? (
        <div className="glossy-panel p-10 rounded-2xl text-center">
          <ShieldCheck className="mx-auto text-emerald-600 mb-3" />
          <h3 className="font-bold">
            {hindi ? "कोई डिलीवरी बाकी नहीं" : "All assigned stops complete"}
          </h3>
          <p className="text-sm text-slate-500 mt-2">
            New assignments will appear here.
          </p>
        </div>
      ) : (
        <div className="glossy-panel rounded-2xl p-6 space-y-5">
          <div className="flex justify-between border-b border-slate-200 pb-4">
            <div>
              <span className="eyebrow">NEXT DELIVERY</span>
              <h3 className="text-xl font-bold mt-2">{stop.wardName}</h3>
              <p className="text-xs text-slate-500 mt-1">
                {stop.requestId} · {stop.demandLiters.toLocaleString()} L
                requested
              </p>
            </div>
            <MapPin className="text-emerald-700" />
          </div>
          <button
            disabled={busy}
            className="secondary-action w-full justify-center"
            onClick={async () => {
              setBusy(true);
              try {
                await onSimulateMoveToStop();
                setFeedback({
                  success: true,
                  message: LIVE_MODE
                    ? "GPS telemetry sent to AWS."
                    : "Demo vehicle moved to delivery stop.",
                });
              } catch (e) {
                setFeedback({ success: false, message: (e as Error).message });
              } finally {
                setBusy(false);
              }
            }}
          >
            <MapPin size={16} />
            {hindi
              ? "स्थान अपडेट करें"
              : LIVE_MODE
                ? "Send current GPS location"
                : "Move to stop (demo)"}
          </button>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void verify();
            }}
            className="space-y-5"
          >
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="text-xs font-semibold text-slate-600">
                {hindi
                  ? "निवासी का 6 अंकों का OTP"
                  : "Resident confirmation code"}
                <input
                  aria-label="Resident OTP"
                  required
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  className="block w-full rounded-xl border border-slate-200 bg-white/70 p-3 mt-2 text-xl tracking-[.25em] text-slate-800"
                />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                {hindi ? "दिया गया पानी (लीटर)" : "Water delivered (liters)"}
                <input
                  aria-label="Liters delivered"
                  required
                  type="number"
                  min={1}
                  max={Math.min(
                    stop.demandLiters,
                    tanker.currentWaterLevelLiters,
                  )}
                  value={liters}
                  onChange={(e) => setLiters(Number(e.target.value))}
                  className="block w-full rounded-xl border border-slate-200 bg-white/70 p-3 mt-2 text-xl text-slate-800"
                />
              </label>
            </div>
            <input
              ref={input}
              type="file"
              accept="image/jpeg"
              capture="environment"
              aria-label="Delivery evidence photo"
              className="hidden"
              onChange={(e) => void selectPhoto(e.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => input.current?.click()}
              className="w-full rounded-xl border border-dashed border-slate-300 bg-white/60 p-6 text-center text-sm text-slate-600"
            >
              {photo ? (
                <img
                  src={photo}
                  alt="Your delivery evidence"
                  className="max-h-44 rounded-lg mx-auto"
                />
              ) : (
                <Camera className="mx-auto mb-2" />
              )}
              <span className="block mt-2">
                {hindi ? "डिलीवरी फोटो जोड़ें" : "Attach delivery photo"} ·
                JPEG, ≤ 2 MB
              </span>
            </button>
            <p className="text-xs text-slate-500 leading-relaxed">
              {LIVE_MODE
                ? "Verification requires an internet connection and accurate device location. The resident supplies the code after receiving water."
                : "Demo verification is local. Get the resident code from the Citizen portal."}
            </p>
            <button
              disabled={busy || !photo || otp.length !== 6}
              className="primary-action w-full justify-center"
            >
              <Droplets size={17} />
              {busy
                ? "Verifying…"
                : hindi
                  ? "डिलीवरी सत्यापित करें"
                  : "Verify delivery"}
              <ArrowRight size={17} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
