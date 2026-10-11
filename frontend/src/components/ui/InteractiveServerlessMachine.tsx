import React, { useState, useEffect } from "react";
import {
  Layers,
  Play,
  Pause,
  Box,
  Cpu,
  Sparkles,
} from "lucide-react";

interface Station {
  id: string;
  stepNum: string;
  title: string;
  subtitle: string;
  awsService: string;
  description: string;
  input: string;
  output: string;
  x: number;
  y: number;
  codeSnippet: string;
}

const STATIONS: Station[] = [
  {
    id: "triage",
    stepNum: "01",
    title: "Surge & Triage",
    subtitle: "Step 1 · Bedrock Nova Lite",
    awsService: "Amazon Bedrock & SQS FIFO",
    description: "Inbound water requests buffered through SQS FIFO. Bedrock Converse API parses unstructured complaint text, hospital distress, and household vulnerability into an integer urgency score (0-100).",
    input: "Citizen complaint text + outage days + dependent counts",
    output: "Urgency Score (0-100) & Priority Tier (CRITICAL / HIGH / BATCH)",
    x: 230,
    y: 110,
    codeSnippet: `const raw = await bedrock.send(new ConverseCommand({\n  modelId: "us.amazon.nova-lite-v1:0",\n  inferenceConfig: { temperature: 0, maxTokens: 700 }\n}));`,
  },
  {
    id: "optimizer",
    stepNum: "02",
    title: "VRP Optimizer",
    subtitle: "Step 2 · Location Road Matrix",
    awsService: "Amazon Location Service (HERE)",
    description: "Solves Capacitated Vehicle Routing Problem with Urgency Weighting. Calculates real truck road distance matrix and assigns idle tankers without double-booking or overfilling.",
    input: "Active fleet coordinates + scheduled requests",
    output: "Turn-by-turn stop sequence with ETAs and required volume",
    x: 430,
    y: 90,
    codeSnippet: `const matrix = await location.send(new CalculateRouteMatrixCommand({\n  CalculatorName: "JalSetu-Route-Calculator",\n  TravelMode: "Truck",\n  DeparturePositions: [[tanker.lng, tanker.lat]]\n}));`,
  },
  {
    id: "patrol",
    stepNum: "03",
    title: "Geofence Patrol",
    subtitle: "Step 3 · Telemetry Tracker",
    awsService: "Amazon Location Tracker & EventBridge",
    description: "Ingests driver GPS every 10 seconds. Evaluates 200m circular geofences. Exiting an assigned stop without a verified delivery automatically fires a Ghost Trip fraud alarm.",
    input: "Sampled Driver GPS (lat, lng, speed, accuracy)",
    output: "InsideDeliveryZone boolean + GeofenceExit alerts",
    x: 650,
    y: 130,
    codeSnippet: `await location.send(new BatchEvaluateGeofencesCommand({\n  CollectionName: "JalSetu-Ward-Geofences",\n  DevicePositionUpdates: [update]\n}));`,
  },
  {
    id: "proof",
    stepNum: "04",
    title: "PoD Vault",
    subtitle: "Step 4 · S3 AES-256 & 3-Way Handshake",
    awsService: "Amazon S3 & AWS Step Functions",
    description: "Settles physical delivery via 3 factors: Resident 6-digit OTP, Driver GPS <=200m, and encrypted JPEG photo proof. Computes canonical SHA-256 audit proof hash.",
    input: "Driver OTP + Delivered Liters + JPEG Base64 photo",
    output: "Immutable SHA-256 Audit Proof Hash & Water Level Settlement",
    x: 690,
    y: 280,
    codeSnippet: `const auditHash = crypto.createHash("sha256")\n  .update(requestId + wardId + tankerId + liters + photoHash)\n  .digest("hex");`,
  },
  {
    id: "ledger",
    stepNum: "05",
    title: "Audit Ledger",
    subtitle: "Step 5 · DynamoDB Single-Table",
    awsService: "Amazon DynamoDB (PAY_PER_REQUEST)",
    description: "Atomic multi-item transaction records the delivery in the immutable audit ledger, updates ward supply totals, deducts tanker inventory, and publishes to the Public Board.",
    input: "Settled delivery payload & cryptographic proof",
    output: "Committed transaction with PITR encryption & Streams event",
    x: 420,
    y: 290,
    codeSnippet: `await db.send(new TransactWriteCommand({\n  TransactItems: [\n    { Update: { TableName: TABLE, Key: key("REQUEST", id) } },\n    { Put: { TableName: TABLE, Item: auditRecord } }\n  ]\n}));`,
  },
];

type ViewMode = "overview" | "side" | "top" | "station" | "flight";
type StateMode = "assembled" | "cutaway" | "stations" | "simulate";

export function InteractiveServerlessMachine({ className }: { className?: string } = {}) {
  const [selectedStation, setSelectedStation] = useState<Station>(STATIONS[0]);
  const [viewAngle, setViewAngle] = useState<ViewMode>("overview");
  const [stateMode, setStateMode] = useState<StateMode>("stations");
  const [isSimulating, setIsSimulating] = useState(false);
  const [activeSimulationStep, setActiveSimulationStep] = useState(0);

  // Simulation animation step-through
  useEffect(() => {
    if (!isSimulating) return;
    const interval = setInterval(() => {
      setActiveSimulationStep((prev) => {
        const next = (prev + 1) % 5;
        setSelectedStation(STATIONS[next]);
        return next;
      });
    }, 2400);
    return () => clearInterval(interval);
  }, [isSimulating]);

  // Perspective transforms based on view angle
  const getPerspectiveStyle = () => {
    switch (viewAngle) {
      case "side":
        return "rotateX(55deg) rotateZ(-30deg) scale(0.9)";
      case "top":
        return "rotateX(15deg) rotateZ(0deg) scale(0.95)";
      case "station":
        return "rotateX(35deg) rotateZ(-12deg) scale(1.05)";
      case "flight":
        return "rotateX(48deg) rotateZ(18deg) scale(0.92)";
      case "overview":
      default:
        return "rotateX(40deg) rotateZ(-18deg) scale(0.98)";
    }
  };

  return (
    <div className={`w-full rounded-3xl bg-[#070a10] border border-orange-950/40 text-slate-100 p-6 md:p-8 shadow-2xl relative overflow-hidden font-sans ${className || ""}`}>
      {/* Circuit board grid background & glow */}
      <div className="absolute inset-0 bg-[radial-gradient(#d97706_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.06] pointer-events-none" />
      <div className="absolute -top-32 -left-32 w-80 h-80 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar matching user reference photo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-orange-950/50 pb-5 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-0.5 bg-orange-500 inline-block" />
            <span className="text-xs font-mono font-bold tracking-[0.25em] text-orange-400 uppercase">
              The Architecture Engine
            </span>
            <span className="text-[11px] font-mono text-slate-400 tracking-widest">
              5 MODULES / 1 SERVERLESS SYSTEM
            </span>
          </div>
          <h3 className="text-2xl font-black tracking-tight text-white mt-1 flex items-center gap-2.5">
            <span>Delhi Water Logistics Reactor</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-orange-950/80 border border-orange-500/30 text-orange-400">
              AWS Production Topology
            </span>
          </h3>
        </div>

        {/* State Mode Switcher Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 p-1 rounded-xl backdrop-blur-md">
          <button
            onClick={() => { setStateMode("assembled"); setIsSimulating(false); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              stateMode === "assembled"
                ? "bg-slate-800 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Box size={13} />
            <span>Assembled</span>
          </button>

          <button
            onClick={() => { setStateMode("cutaway"); setIsSimulating(false); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              stateMode === "cutaway"
                ? "bg-slate-800 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Layers size={13} />
            <span>Cutaway</span>
          </button>

          <button
            onClick={() => { setStateMode("stations"); setIsSimulating(false); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              stateMode === "stations" && !isSimulating
                ? "bg-orange-600 text-white shadow-md shadow-orange-900/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Cpu size={13} />
            <span>Stations</span>
          </button>

          <button
            onClick={() => {
              setStateMode("simulate");
              setIsSimulating(!isSimulating);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              isSimulating
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/40 animate-pulse"
                : "bg-orange-500/20 text-orange-300 border border-orange-500/40 hover:bg-orange-500/30"
            }`}
          >
            {isSimulating ? <Pause size={13} /> : <Play size={13} />}
            <span>{isSimulating ? "Simulating..." : "Simulate One Trip"}</span>
          </button>
        </div>
      </div>

      {/* 3D Cyber-Industrial Stage */}
      <div className="relative w-full h-[440px] md:h-[480px] my-6 flex items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-b from-[#090d16] via-[#05070d] to-[#020408] border border-orange-950/30">
        {/* Animated Perspective Stage Container */}
        <div
          className="relative w-[880px] h-[460px] transition-transform duration-700 ease-out select-none"
          style={{
            transform: getPerspectiveStyle(),
            transformStyle: "preserve-3d",
          }}
        >
          {/* Base Platform / Metallic Chassis */}
          <div className="absolute inset-x-8 inset-y-10 rounded-[32px] bg-gradient-to-br from-[#121824] via-[#0b0f19] to-[#070a12] border-2 border-slate-700/60 shadow-[0_20px_50px_rgba(0,0,0,0.9),inset_0_2px_4px_rgba(255,255,255,0.1)]">
            {/* Corner alignment markers */}
            <span className="absolute top-4 left-4 w-3 h-3 border-t-2 border-l-2 border-orange-500/60" />
            <span className="absolute top-4 right-4 w-3 h-3 border-t-2 border-r-2 border-orange-500/60" />
            <span className="absolute bottom-4 left-4 w-3 h-3 border-b-2 border-l-2 border-orange-500/60" />
            <span className="absolute bottom-4 right-4 w-3 h-3 border-b-2 border-r-2 border-orange-500/60" />

            <div className="absolute bottom-4 left-8 text-[10px] font-mono tracking-widest text-slate-500">
              JAL-SETU CHASSIS // AWS SERVERLESS CORE // AP-SOUTH-1
            </div>
          </div>

          {/* Glowing Closed-Loop Transport Track / Circuit Ring */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 880 460">
            <defs>
              <linearGradient id="neonTrack" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f97316" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#eab308" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.8" />
              </linearGradient>
              <filter id="trackGlow">
                <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Central oval highway track */}
            <path
              d="M 220 180 C 220 110, 680 110, 680 180 C 680 320, 220 320, 220 180 Z"
              fill="none"
              stroke="#1e293b"
              strokeWidth="18"
            />
            <path
              d="M 220 180 C 220 110, 680 110, 680 180 C 680 320, 220 320, 220 180 Z"
              fill="none"
              stroke="url(#neonTrack)"
              strokeWidth="3.5"
              strokeDasharray="10 12"
              filter="url(#trackGlow)"
              className="animate-[dash_20s_linear_infinite]"
            />

            {/* Connecting bus traces to station pedestals */}
            {STATIONS.map((st) => (
              <line
                key={`line-${st.id}`}
                x1={st.x}
                y1={st.y + 40}
                x2={st.x}
                y2={st.y + 70}
                stroke="#f97316"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                opacity="0.6"
              />
            ))}
          </svg>

          {/* Interactive Floating Station Cards */}
          {STATIONS.map((st, idx) => {
            const isSelected = selectedStation.id === st.id;
            const isSimActive = isSimulating && activeSimulationStep === idx;

            return (
              <div
                key={st.id}
                onClick={() => setSelectedStation(st)}
                style={{
                  left: `${st.x - 90}px`,
                  top: `${st.y - 45}px`,
                }}
                className={`absolute w-[185px] cursor-pointer rounded-2xl p-3 transition-all duration-300 backdrop-blur-md select-none group ${
                  isSimActive
                    ? "bg-orange-500/20 border-2 border-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.5)] scale-105 z-30"
                    : isSelected
                      ? "bg-slate-900/95 border-2 border-orange-500 shadow-[0_12px_28px_rgba(249,115,22,0.3)] scale-105 z-20"
                      : "bg-slate-900/80 border border-slate-700/70 hover:border-orange-500/60 hover:scale-102 z-10"
                }`}
              >
                {/* Station Step Badge */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-black text-orange-400 tracking-wider">
                    {st.stepNum}
                  </span>
                  <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest">
                    {st.awsService.split("&")[0]}
                  </span>
                </div>

                {/* Station Title */}
                <h4 className="text-sm font-black text-white mt-1 group-hover:text-orange-300 transition">
                  {st.title}
                </h4>
                <div className="text-[10px] font-medium text-slate-400 mt-0.5">
                  {st.subtitle}
                </div>

                {/* Status Indicator Pill */}
                <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[9px] font-mono">
                  <span className="text-slate-400">READY</span>
                  <span
                    className={`flex h-1.5 w-1.5 rounded-full ${
                      isSimActive
                        ? "bg-emerald-400 animate-ping"
                        : isSelected
                          ? "bg-orange-400"
                          : "bg-slate-600"
                    }`}
                  />
                </div>
              </div>
            );
          })}

          {/* 3D Physical Delivery Truck Payload Token when Simulating */}
          {isSimulating && (
            <div
              className="absolute w-10 h-10 rounded-full bg-emerald-500 border-2 border-white shadow-[0_0_24px_rgba(16,185,129,0.9)] flex items-center justify-center text-white transition-all duration-700 ease-in-out z-40"
              style={{
                left: `${STATIONS[activeSimulationStep].x - 20}px`,
                top: `${STATIONS[activeSimulationStep].y + 55}px`,
              }}
            >
              <Sparkles size={18} className="animate-spin" />
            </div>
          )}
        </div>

        {/* View Angle Switcher (Matching the reference photo bottom controls) */}
        <div className="absolute bottom-3 inset-x-0 z-20 flex items-center justify-center gap-2">
          <div className="flex items-center gap-1 bg-black/85 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-800 text-[11px] font-mono text-slate-400 shadow-xl">
            <span className="text-slate-500 uppercase tracking-widest mr-1">VIEW:</span>
            {(["overview", "side", "top", "station", "flight"] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setViewAngle(v)}
                className={`px-2.5 py-0.5 rounded-full capitalize font-semibold transition ${
                  viewAngle === v
                    ? "bg-orange-600 text-white font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Selected Station Deep Telemetry Inspector */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md relative z-10 grid md:grid-cols-3 gap-6">
        <div className="space-y-2 md:col-span-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-orange-950 text-orange-400 font-mono font-bold text-xs">
              Station {selectedStation.stepNum}
            </span>
            <span className="text-xs font-mono text-slate-400">
              {selectedStation.awsService}
            </span>
          </div>
          <h4 className="text-xl font-black text-white">{selectedStation.title}</h4>
          <p className="text-xs text-slate-300 leading-relaxed">
            {selectedStation.description}
          </p>
        </div>

        <div className="space-y-2 text-xs font-mono md:col-span-1 border-t md:border-t-0 md:border-l border-slate-800 md:pl-6 pt-3 md:pt-0">
          <div>
            <span className="text-slate-500 block uppercase tracking-wider text-[10px]">
              Input Pipeline
            </span>
            <span className="text-slate-200">{selectedStation.input}</span>
          </div>
          <div className="pt-2">
            <span className="text-slate-500 block uppercase tracking-wider text-[10px]">
              Output Contract
            </span>
            <span className="text-emerald-400">{selectedStation.output}</span>
          </div>
        </div>

        <div className="md:col-span-1 border-t md:border-t-0 md:border-l border-slate-800 md:pl-6 pt-3 md:pt-0">
          <span className="text-slate-500 block uppercase tracking-wider text-[10px] font-mono mb-1">
            Serverless Implementation
          </span>
          <pre className="bg-black/60 rounded-xl p-3 text-[11px] font-mono text-amber-300/90 overflow-x-auto border border-slate-800">
            <code>{selectedStation.codeSnippet}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
export default InteractiveServerlessMachine;
