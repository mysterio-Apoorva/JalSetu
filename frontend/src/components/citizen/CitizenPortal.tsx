import { api, LIVE_MODE } from "../../services/api";
import React, { useState } from "react";
import { Ward, WaterRequest, PriorityTier } from "../../types";
import {
  Droplet,
  Mic,
  MicOff,
  Send,
  Sparkles,
  ShieldCheck,
  KeyRound,
  Star,
} from "lucide-react";
import { classifyWaterComplaint } from "../../services/bedrockClassifier";
import { CitizenCrowdCanvas, type CitizenPersona } from "../ui/CitizenCrowdCanvas";

interface CitizenPortalProps {
  wards: Ward[];
  requests: WaterRequest[];
  onSubmitRequest: (newReq: Partial<WaterRequest>) => Promise<void>;
  onRateDelivery: (reqId: string, rating: number) => Promise<void>;
}

export const CitizenPortal: React.FC<CitizenPortalProps> = ({
  wards,
  requests,
  onSubmitRequest,
  onRateDelivery,
}) => {
  const [selectedWardId, setSelectedWardId] = useState(wards[0].id);
  const [citizenName, setCitizenName] = useState(
    import.meta.env.PROD || LIVE_MODE ? "" : "Anil Aggarwal (RWA)",
  );
  const [phone, setPhone] = useState(import.meta.env.PROD || LIVE_MODE ? "" : "+91 98102 33445");
  const [householdCount, setHouseholdCount] = useState(1);
  const [selectedRequest, setSelectedRequest] = useState("");
  const [recoveredCodes, setRecoveredCodes] = useState<Record<string, string>>(
    {},
  );
  const [recovering, setRecovering] = useState(false);
  const [daysWithoutWater, setDaysWithoutWater] = useState(LIVE_MODE ? 0 : 3);
  const [vulnerableCount, setVulnerableCount] = useState(LIVE_MODE ? 0 : 4);
  const [complaintText, setComplaintText] = useState(
    import.meta.env.PROD || LIVE_MODE ? "" : "Piped supply broken since 3 days. Community water tank is empty, senior citizens need drinking water urgently.",
  );
  const [submitError, setSubmitError] = useState("");
  const [requestKey, setRequestKey] = useState(crypto.randomUUID());
  const [isRecording, setIsRecording] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Active trackable request (the latest one or REQ-101)
  const activeTrackedRequest =
    (LIVE_MODE
      ? requests.find((r) => r.id === selectedRequest) || requests[0]
      : requests.find((r) => r.phone === phone)) ||
    (!LIVE_MODE ? requests[0] : undefined);

  const handleSimulateVoiceNote = () => {
    setIsRecording(true);
    setTimeout(() => {
      setIsRecording(false);
      const hindiTranscript =
        "हमारे संगम विहार ब्लॉक एल में चार दिन से पानी नहीं आ रहा। घर में बुजुर्ग और बच्चे हैं, जल्दी टैंकर भेजिए। (4 days zero water in Sangam Vihar, elderly & children need emergency tanker).";
      setComplaintText(hindiTranscript);
      setDaysWithoutWater(4);
      setVulnerableCount(6);

      // Trigger Bedrock NLP classification immediately
      const result = classifyWaterComplaint(hindiTranscript, 4, 6);
      setAiAnalysisResult(result);
    }, 1500);
  };

  const handleAnalyzeText = () => {
    const result = classifyWaterComplaint(
      complaintText,
      daysWithoutWater,
      vulnerableCount,
    );
    setAiAnalysisResult(result);
  };

  const handleSelectPersona = (p: CitizenPersona) => {
    setCitizenName(p.name);
    setComplaintText(p.quote);
    setDaysWithoutWater(p.daysDry);
    setVulnerableCount(p.elders + p.infants);
    setHouseholdCount(Math.max(1, p.infants + p.elders + 2));
    const matchedWard = wards.find(
      (w) =>
        w.id === p.wardId ||
        w.name.toLowerCase().includes(p.locality.toLowerCase()) ||
        p.locality.toLowerCase().includes(w.name.toLowerCase()),
    );
    if (matchedWard) setSelectedWardId(matchedWard.id);
    const result = classifyWaterComplaint(
      p.quote,
      p.daysDry,
      p.elders + p.infants,
    );
    setAiAnalysisResult(result);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const classification = import.meta.env.PROD ? undefined : (aiAnalysisResult ||
      classifyWaterComplaint(complaintText, daysWithoutWater, vulnerableCount));
    const wardObj = wards.find((w) => w.id === selectedWardId) || wards[0];

    setSubmitError("");
    try {
      await onSubmitRequest({
        idempotencyKey: requestKey,
        citizenName,
        phone,
        wardId: wardObj.id,
        wardName: wardObj.name,
        householdCount,
        daysWithoutWater,
        vulnerableCount,
        complaintText,
        urgencyScore: classification?.urgencyScore,
        priorityTier: classification?.priorityTier as PriorityTier,
        coordinates: wardObj.coordinates,
      } as Partial<WaterRequest>);
      setRequestKey(crypto.randomUUID());

      setIsSubmitting(false);
      setAiAnalysisResult(null);
    } catch (e) {
      setSubmitError((e as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header Banner */}
      <div className="glossy-card p-5 rounded-2xl border border-slate-200/90 bg-white/95 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-800 uppercase mb-1">
            <span>CITIZEN & RWA PORTAL</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
            <span>WATER OPERATIONS</span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Transparent Water Tanker Request
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Fairness-first AI triage on Amazon Bedrock. Verified deliveries
            secured with a 6-digit dynamic OTP.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-emerald-50 px-3.5 py-2 rounded-xl border border-emerald-200 text-xs">
          <ShieldCheck className="w-5 h-5 text-emerald-700 flex-shrink-0" />
          <div className="text-[11px] text-emerald-950 font-medium">
            <strong>Resident confirmation:</strong> Tankers cannot mark delivery
            completed without your resident OTP.
          </div>
        </div>
      </div>

      {/* Interactive Delhi Community Crowd Canvas */}
      <CitizenCrowdCanvas onSelectPersona={handleSelectPersona} className="w-full shadow-md" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: File a Water Request Form */}
        <div className="lg:col-span-7 space-y-5">
          <div className="glossy-card p-5 rounded-2xl border border-slate-200/90 bg-white/95 shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Droplet className="w-4 h-4 text-[#D9532F]" />
                <span>Submit Water Need</span>
              </h3>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                AI Urgency Scoring
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {submitError && (
                <p role="alert" className="text-red-700">
                  {submitError}
                </p>
              )}

              {/* Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="citizen-name"
                    className="block text-slate-700 font-semibold mb-1"
                  >
                    Requester / RWA Name
                  </label>
                  <input
                    id="citizen-name"
                    type="text"
                    value={citizenName}
                    onChange={(e) => setCitizenName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-[#D9532F]"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="citizen-phone"
                    className="block text-slate-700 font-semibold mb-1"
                  >
                    Contact mobile number
                  </label>
                  <input
                    id="citizen-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-[#D9532F]"
                    required
                  />
                </div>
              </div>

              {/* Ward Selection */}
              <label className="block font-semibold">
                Households requesting water (1–50)
                <input
                  type="number"
                  min="1"
                  max="50"
                  step="1"
                  required
                  value={householdCount}
                  onChange={(e) => setHouseholdCount(Number(e.target.value))}
                  className="w-full border rounded-xl px-3 py-3 mt-1"
                />
                <span className="block font-normal mt-1">
                  Requested volume: {householdCount * 200} litres (200 litres
                  per household). Submit separate requests for larger
                  communities.
                </span>
              </label>
              <div>
                <label
                  htmlFor="citizen-ward"
                  className="block text-slate-700 font-semibold mb-1"
                >
                  Select Ward / Colony
                </label>
                <select
                  id="citizen-ward"
                  value={selectedWardId}
                  onChange={(e) => setSelectedWardId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-[#D9532F]"
                >
                  {wards.map((ward) => (
                    <option key={ward.id} value={ward.id}>
                      {ward.name} ({ward.zone}) — Deficit:{" "}
                      {ward.deficitSeverity}
                    </option>
                  ))}
                </select>
                {LIVE_MODE && <p className="mt-2 text-sm text-slate-700">Collection point: {wards.find(w => w.id === selectedWardId)?.servicePoint?.address || "Not yet verified. Contact operations before requesting delivery."} Water is delivered at this shared point.</p>}
              </div>

              {/* Days Without Water Slider */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-slate-700 font-semibold">
                    Consecutive Days Without Piped Water:
                  </span>
                  <strong className="text-base font-bold font-mono text-[#D9532F]">
                    {daysWithoutWater} Days
                  </strong>
                </div>
                <input
                  type={LIVE_MODE ? "number" : "range"}
                  aria-label="Days without water"
                  min="0"
                  max={LIVE_MODE ? "60" : "7"}
                  required
                  value={daysWithoutWater}
                  onChange={(e) => setDaysWithoutWater(Number(e.target.value))}
                  className="w-full accent-[#D9532F] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>Enter actual days without supply</span>
                  <span>4 Days (Critical Deficit)</span>
                  <span>7+ Days (Emergency)</span>
                </div>
              </div>

              {/* Vulnerable Dependents */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-slate-700 font-semibold">
                    Vulnerable Residents (Elderly / Infants / Clinics):
                  </span>
                  <strong className="text-base font-bold font-mono text-purple-700">
                    {vulnerableCount} Persons
                  </strong>
                </div>
                <input
                  type={LIVE_MODE ? "number" : "range"}
                  aria-label="Vulnerable residents"
                  min="0"
                  max={LIVE_MODE ? "1000" : "15"}
                  required
                  value={vulnerableCount}
                  onChange={(e) => setVulnerableCount(Number(e.target.value))}
                  className="w-full accent-purple-600 cursor-pointer"
                />
              </div>

              {/* Multilingual Voice Note or Text Box */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="citizen-complaint"
                    className="text-slate-700 font-semibold"
                  >
                    Complaint Details (Hindi / English)
                  </label>
                  {import.meta.env.DEV && <button
                    type="button"
                    hidden={LIVE_MODE}
                    onClick={handleSimulateVoiceNote}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                      isRecording
                        ? "bg-rose-600 text-white animate-pulse"
                        : "bg-purple-100 hover:bg-purple-200 text-purple-800 border border-purple-300"
                    }`}
                  >
                    {isRecording ? (
                      <MicOff className="w-3.5 h-3.5" />
                    ) : (
                      <Mic className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {isRecording
                        ? "Listening in Hindi..."
                        : "Simulate Hindi Voice Note"}
                    </span>
                  </button>}
                </div>

                <textarea
                  required
                  id="citizen-complaint"
                  rows={3}
                  value={complaintText}
                  onChange={(e) => setComplaintText(e.target.value)}
                  placeholder="Describe emergency, e.g. 'Piped water line broke 3 days ago...'"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#D9532F]"
                />
              </div>

              {/* AI Analysis Preview Box */}
              {aiAnalysisResult && (
                <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-900 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-purple-600" />
                      <span>Local triage preview (not Bedrock)</span>
                    </span>
                    <span className="font-mono font-bold text-sm text-[#D9532F]">
                      Score: {aiAnalysisResult.urgencyScore}/100
                    </span>
                  </div>
                  <div className="text-[11px] text-purple-950 font-medium">
                    Priority Tier:{" "}
                    <strong className="text-[#D9532F]">
                      {aiAnalysisResult.priorityTier}
                    </strong>
                  </div>
                  <div className="text-[11px] text-slate-600 italic">
                    "{aiAnalysisResult.keyConcerns.join(", ")}"
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-2 flex items-center gap-3">
                {import.meta.env.DEV && <button
                  type="button"
                  hidden={LIVE_MODE}
                  onClick={handleAnalyzeText}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition"
                >
                  Preview urgency
                </button>}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 btn-terracotta flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold tracking-wide shadow-md"
                >
                  <Send className="w-4 h-4" />
                  <span>
                    {isSubmitting
                      ? "Triage Enqueueing..."
                      : "Request Emergency Tanker"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right 5 Cols: Live Delivery ETA & Resident OTP Display */}
        <div className="lg:col-span-5 space-y-5">
          {LIVE_MODE && requests.length > 0 && (
            <label className="block text-sm font-semibold">
              Your requests
              <select
                className="w-full rounded-xl border p-3 mt-2"
                value={activeTrackedRequest?.id || ""}
                onChange={(e) => setSelectedRequest(e.target.value)}
              >
                {requests.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.wardName} — {r.status} — {r.id}
                  </option>
                ))}
              </select>
            </label>
          )}
          {!activeTrackedRequest ? (
            <div className="glossy-card p-6 rounded-2xl text-sm text-slate-500">
              Your request and private delivery code will appear here after
              submission.
            </div>
          ) : (
            <>
              {/* Active Ticket Status Card */}
              <div className="glossy-card p-5 rounded-2xl border-2 border-emerald-300/80 bg-gradient-to-b from-emerald-50/60 to-white shadow-md space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-2 border-b border-emerald-200/80 pb-3">
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] uppercase font-mono font-bold text-emerald-800 tracking-wider">
                      Live Dispatch Ticket
                    </span>
                    <h4 className="font-mono font-black text-slate-900 text-lg break-all">
                      {activeTrackedRequest.id}
                    </h4>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    {activeTrackedRequest.status}
                  </span>
                </div>

                {/* Resident 6-Digit Verification OTP */}
                <div className="p-4 rounded-xl bg-white border border-emerald-200 text-center space-y-1 shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center justify-center gap-1">
                    <KeyRound className="w-3.5 h-3.5 text-[#D9532F]" />
                    <span>Your Secure Proof-of-Delivery OTP</span>
                  </span>
                  <div className="text-3xl font-black font-mono tracking-widest text-slate-900 py-1">
                    {activeTrackedRequest.status === "DELIVERED_VERIFIED"
                      ? "Completed"
                      : recoveredCodes[activeTrackedRequest.id] ||
                        activeTrackedRequest.expectedOtp ||
                        "Generate a new code"}
                  </div>
                  {LIVE_MODE &&
                    activeTrackedRequest.status !== "DELIVERED_VERIFIED" && (
                      <button
                        type="button"
                        disabled={recovering}
                        className="secondary-action"
                        onClick={async () => {
                          setRecovering(true);
                          setSubmitError("");
                          try {
                            const result = await api<{ expectedOtp: string }>(
                              "/requests/otp",
                              { requestId: activeTrackedRequest.id },
                            );
                            setRecoveredCodes((prev) => ({
                              ...prev,
                              [activeTrackedRequest.id]: result.expectedOtp,
                            }));
                          } catch (e) {
                            setSubmitError((e as Error).message);
                          } finally {
                            setRecovering(false);
                          }
                        }}
                      >
                        {recovering
                          ? "Generating…"
                          : "Generate replacement code"}
                      </button>
                    )}
                  <p className="text-xs text-slate-500">
                    A replacement invalidates the previous code. Codes expire
                    after 24 hours and are shown here, not sent by SMS.
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Give this 6-digit code to the tanker driver{" "}
                    <strong>ONLY AFTER</strong> water is discharged into your
                    community tank.
                  </p>
                </div>

                {/* Live ETA Tracker */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Assigned Tanker:</span>
                    <strong className="font-mono text-slate-900">
                      {activeTrackedRequest.assignedTankerId ||
                        "Awaiting dispatch"}
                    </strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Driver Contact:</span>
                    <strong className="text-slate-900">
                      Available from your dispatcher
                    </strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Estimated Arrival:</span>
                    <strong className="text-emerald-700 font-bold font-mono">
                      {LIVE_MODE ? "See dispatch status" : "22 minutes (demo)"}
                    </strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Destination Colony:</span>
                    <strong className="text-slate-900">
                      {activeTrackedRequest.wardName}
                    </strong>
                  </div>
                </div>

                {/* Interactive Rating Simulation */}
                <div className="pt-3 border-t border-emerald-200/80">
                  <span className="text-xs font-bold text-slate-800 block mb-1.5">
                    Rate Previous Tanker Delivery Quality:
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        disabled={
                          activeTrackedRequest.status !== "DELIVERED_VERIFIED"
                        }
                        onClick={() => {
                          void onRateDelivery(
                            activeTrackedRequest.id,
                            star,
                          ).catch((e) => setSubmitError(e.message));
                        }}
                        aria-label={`Rate delivery ${star} stars`}
                        className="p-1 rounded hover:scale-110 transition"
                      >
                        <Star className="w-5 h-5 fill-amber-400 text-amber-500" />
                      </button>
                    ))}
                    <span className="text-xs text-slate-500 ml-2">
                      {activeTrackedRequest.rating
                        ? `${activeTrackedRequest.rating} / 5 Your rating`
                        : "Rate your delivery"}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
