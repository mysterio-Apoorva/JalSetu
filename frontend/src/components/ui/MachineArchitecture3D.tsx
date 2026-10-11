import { useAnimationVisibility } from "../../hooks/useAnimationVisibility";
import { useElementWidth } from "../../hooks/useElementWidth";
import React, { useState, useEffect, useRef } from "react";
import {
  Layers,
  Play,
  Pause,
  Box,
  Cpu,
  ShieldCheck,
  Truck,
} from "lucide-react";

interface Station {
  id: string;
  stepNum: string;
  name: string;
  role: string;
  stepLabel: string;
  awsService: string;
  resourceName: string;
  description: string;
  security: string;
  input: string;
  output: string;
  trackAngleDeg: number; // position on track 0-360
  x: number;
  y: number;
}

const STATIONS: Station[] = [
  {
    id: "01",
    stepNum: "01",
    name: "Intake",
    role: "Intake & Auth",
    stepLabel: "Step 1 · intake",
    awsService: "Amazon API Gateway + Cognito",
    resourceName: "backend/lambdas/citizen-request-intake/index.js",
    description:
      "Validates incoming requests with Amazon Cognito JWT bearer tokens. Enforces fail-closed role-based access control and rate-limits surge traffic before downstream invocation.",
    security: "Cognito User Pool IDP, JWT Signature Verification, API Gateway Throttling",
    input: "Citizen mobile grievance with resident telephone & locality pin",
    output: "Authenticated, normalized JSON event with idempotency UUID",
    trackAngleDeg: 30,
    x: 210,
    y: 130,
  },
  {
    id: "02",
    stepNum: "02",
    name: "Queue",
    role: "Queue & Buffer",
    stepLabel: "Step 2 · queue",
    awsService: "Amazon SQS FIFO + DLQ",
    resourceName: "backend/sqs/resource.yaml",
    description:
      "Deduplicates queue sends using MessageDeduplicationId; consumers handle retries idempotently. Buffers burst requests during heatwave crises and isolates toxic payloads into an encrypted Dead-Letter Queue.",
    security: "Server-Side Encryption, FIFO Message Grouping, DLQ Retries",
    input: "Burst citizen requests during peak heatwaves",
    output: "Ordered, deduplicated batch payloads routed to triage workers",
    trackAngleDeg: 100,
    x: 390,
    y: 110,
  },
  {
    id: "03",
    stepNum: "03",
    name: "Triage",
    role: "Bedrock AI Triage",
    stepLabel: "Step 3 · triage",
    awsService: "Amazon Bedrock (Nova Lite)",
    resourceName: "backend/lambdas/bedrock-urgency-classifier/index.js",
    description:
      "Classifies written operational complaints using outage duration and reported vulnerability. The separate household pilot uses its versioned priority formula.",
    security: "IAM Service Role, Validated Model Output",
    input: "Written complaint + outage days + vulnerable residents",
    output: "Normalized urgency score, triage tier, and priority justification",
    trackAngleDeg: 190,
    x: 620,
    y: 160,
  },
  {
    id: "04",
    stepNum: "04",
    name: "Delivery",
    role: "Verification Core",
    stepLabel: "Step 4 · proof",
    awsService: "AWS Step Functions + Location",
    resourceName: "backend/lambdas/pod-verification-handler/index.js",
    description:
      "Executes the anti-corruption 3-way delivery handshake: verifies resident dynamic OTP, bounds driver GPS within the 200m geofence, and validates S3 discharge photographic proof.",
    security: "State Machine Deduplication, Single-Use OTP Hashes, S3 SHA-256 Checksum",
    input: "Driver arrival telemetry, 6-digit OTP input, and photo proof",
    output: "Verified delivery callback token settling the physical dispatch",
    trackAngleDeg: 280,
    x: 670,
    y: 290,
  },
  {
    id: "05",
    stepNum: "05",
    name: "Ledger",
    role: "Audit Ledger",
    stepLabel: "Step 5 · audit",
    awsService: "Amazon DynamoDB Single Table",
    resourceName: "backend/shared/audit.js",
    description:
      "Atomic ACID transactions settle water inventory and record cryptographic delivery hashes. TransactWriteItems prevents double-counting and ensures tamper-evident civic transparency.",
    security: "Point-in-Time Recovery (PITR), At-Rest KMS Encryption, ConditionExpressions",
    input: "Settled delivery payload & cryptographic proof",
    output: "Committed transaction with PITR encryption & Streams event",
    trackAngleDeg: 350,
    x: 350,
    y: 330,
  },
];

type ViewMode = "overview" | "side" | "top" | "station" | "flight";
type StateMode = "assembled" | "cutaway" | "stations" | "simulate";

export function MachineArchitecture3D({ className }: { className?: string }) {
  const [selectedStation, setSelectedStation] = useState<Station>(STATIONS[0]);
  const [viewAngle, setViewAngle] = useState<ViewMode>("overview");
  const [stateMode, setStateMode] = useState<StateMode>("stations");
  const [isSimulating, setIsSimulating] = useState(true);
  const { ref, active } = useAnimationVisibility();
  const angle = useRef(0);
  const { ref: stageRef, width: stageWidth } = useElementWidth();
  const stageScale = Math.min(1, stageWidth / 900);
  const [tankerPositionDeg, setTankerPositionDeg] = useState(0);

  useEffect(() => {
    if (!active || !isSimulating) return;
    let frame = 0, last = 0;
    const loop = (time: number) => {
      const elapsed = last ? Math.min(time - last, 80) : 0;
      last = time;
      angle.current = (angle.current + elapsed * 0.035) % 360;
      setTankerPositionDeg(angle.current);
      const station = STATIONS.find(s => Math.abs(((s.trackAngleDeg - angle.current + 540) % 360) - 180) < 25);
      if (station) setSelectedStation(station);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [active, isSimulating]);

  // View Angle Transforms matching Image 3
  const getPerspectiveStyle = () => {
    switch (viewAngle) {
      case "side":
        return "rotateX(62deg) rotateZ(-36deg) scale(0.92)";
      case "top":
        return "rotateX(20deg) rotateZ(0deg) scale(0.96)";
      case "station":
        return "rotateX(38deg) rotateZ(-14deg) scale(1.08)";
      case "flight":
        return "rotateX(48deg) rotateZ(22deg) scale(0.95)";
      case "overview":
      default:
        return "rotateX(42deg) rotateZ(-20deg) scale(1)";
    }
  };

  // Convert track angle (0-360) to oval coordinates on the circuit board
  const getTankerCoords = (angleDeg: number) => {
    const rad = (angleDeg * Math.PI) / 180;
    const a = 280; // oval width radius
    const b = 120; // oval height radius
    const centerX = 500;
    const centerY = 240;
    return {
      x: centerX + a * Math.cos(rad),
      y: centerY + b * Math.sin(rad),
    };
  };

  const tankerPos = getTankerCoords(tankerPositionDeg);

  return (
    <div ref={ref} data-testid="architecture-animation" data-animating={active && isSimulating}
      className={`w-full rounded-3xl bg-[#05080e] border border-orange-950/50 text-slate-100 p-6 md:p-8 shadow-2xl relative overflow-hidden font-sans select-none ${
        className || ""
      }`}
    >
      {/* Background cyber grid & glow */}
      <div className="absolute inset-0 bg-[radial-gradient(#d97706_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.06] pointer-events-none" />
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar matching exact user reference (Image 3) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-orange-950/60 pb-5 relative z-10">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-0.5 bg-orange-500 inline-block" />
            <span className="text-xs font-mono font-bold tracking-[0.25em] text-orange-400 uppercase">
              THE MACHINE WE BUILT
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight mt-1">
            5 MODULES / 1 SERVERLESS SYSTEM
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Animated architecture walkthrough. This illustration does not represent live dispatch activity.
          </p>
        </div>

        {/* Live Status indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-950/50 border border-orange-500/40 text-orange-300 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-orange-400 animate-ping" />
            <span>{active && isSimulating ? "WALKTHROUGH PLAYING" : "WALKTHROUGH PAUSED"}</span>
          </div>
        </div>
      </div>

      {/* 3D Interactive Cybernetic Machine Stage */}
      <div ref={stageRef} style={{ height: Math.max(220, 520 * stageScale) }} className="relative w-full flex items-center justify-center overflow-hidden my-6 bg-[#070b12] rounded-2xl border border-slate-800/80">
        {/* The 3D Canvas Transform Container */}
        <div
          className="relative w-full h-full flex items-center justify-center transition-all duration-700 ease-out"
          style={{
            perspective: "1200px",
            transform: `scale(${stageScale}) ${getPerspectiveStyle()}`,
            transformStyle: "preserve-3d",
          }}
        >
          {/* Main 3D Metallic Circuit Board / Industrial Platform Tray */}
          <div
            className="relative shrink-0 w-[780px] h-[480px] rounded-[36px] bg-[#0c121d] border-2 border-slate-700 shadow-2xl transition-all duration-500"
            style={{
              boxShadow:
                "0 30px 60px rgba(0,0,0,0.9), inset 0 2px 4px rgba(255,255,255,0.1), 0 0 40px rgba(217,119,6,0.15)",
            }}
          >
            {/* Metallic rim highlights */}
            <div className="absolute inset-2 rounded-[28px] border border-orange-500/20 pointer-events-none" />
            <div className="absolute top-4 left-6 text-[10px] font-mono text-slate-400 tracking-widest">
              JALSETU · WATER OPERATIONS · ARCHITECTURE WALKTHROUGH
            </div>

            {/* SVG Circuit Tracks & Conveyor Path */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 780 480">
              <defs>
                <linearGradient id="circuitTrack" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#d97706" stopOpacity="0.2" />
                </linearGradient>
              </defs>

              {/* Outer oval conveyor track */}
              <ellipse
                cx="390"
                cy="240"
                rx="290"
                ry="130"
                fill="none"
                stroke="#1e293b"
                strokeWidth="18"
              />
              <ellipse
                cx="390"
                cy="240"
                rx="290"
                ry="130"
                fill="none"
                stroke="#334155"
                strokeWidth="4"
                strokeDasharray="8 8"
              />

              {/* Glowing active power line */}
              <ellipse
                cx="390"
                cy="240"
                rx="275"
                ry="115"
                fill="none"
                stroke="url(#circuitTrack)"
                strokeWidth="2.5"
                opacity={isSimulating ? 0.9 : 0.5}
              />

              {/* Track connectors to stations */}
              <line x1="210" y1="130" x2="270" y2="170" stroke="#f59e0b" strokeWidth="2" strokeDasharray="3 3" />
              <line x1="390" y1="110" x2="390" y2="135" stroke="#f59e0b" strokeWidth="2" strokeDasharray="3 3" />
              <line x1="620" y1="160" x2="560" y2="190" stroke="#f59e0b" strokeWidth="2" strokeDasharray="3 3" />
              <line x1="670" y1="290" x2="590" y2="280" stroke="#f59e0b" strokeWidth="2" strokeDasharray="3 3" />
              <line x1="350" y1="330" x2="380" y2="350" stroke="#f59e0b" strokeWidth="2" strokeDasharray="3 3" />
            </svg>

            {/* Simulated Animated Water Tanker Driving On Track */}
            <div
              className="absolute z-30 transition-transform duration-75 pointer-events-none"
              style={{
                left: `${tankerPos.x - 110}px`,
                top: `${tankerPos.y}px`,
                transform: `translate(-50%, -50%) rotate(${tankerPositionDeg + 90}deg)`,
              }}
            >
              <div className="flex items-center gap-1 bg-orange-500 text-slate-950 p-1.5 rounded-lg shadow-xl border border-white">
                <Truck size={14} className="fill-current" />
                <span className="text-[9px] font-mono font-bold">DL-01</span>
              </div>
            </div>

            {/* Central Hardware Module Chasis */}
            <div className="absolute top-[180px] left-[270px] w-[240px] h-[120px] rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-700/80 shadow-inner flex flex-col items-center justify-center p-3 text-center">
              <span className="text-[9px] font-mono text-orange-400 uppercase tracking-widest">
                VERIFIED PIPELINE CORE
              </span>
              <strong className="text-xs text-white mt-1">JalSetu Event Engine</strong>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-[10px] font-mono text-emerald-400">AUDIT WORKFLOW</span>
              </div>
            </div>

            {/* 3D Hardware Station Nodes with Interactive Popups */}
            {STATIONS.map((station) => {
              const isSelected = selectedStation.id === station.id;

              return (
                <div
                  key={station.id}
                  role="button" tabIndex={0} aria-label={`Inspect ${station.role}`}
                  onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedStation(station); setIsSimulating(false); } }}
                  onClick={() => { setSelectedStation(station); setIsSimulating(false); }}
                  className="absolute cursor-pointer transition-all duration-300 z-20 group"
                  style={{
                    left: `${station.x}px`,
                    top: `${station.y}px`,
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  {/* Floating Cyber Card matching user screenshot */}
                  <div
                    className={`rounded-2xl p-3 border transition-all duration-300 w-[142px] ${
                      isSelected
                        ? "bg-slate-900/95 border-orange-500 text-white shadow-2xl scale-105"
                        : "bg-[#0b1019]/90 border-slate-800 text-slate-300 hover:border-slate-600 hover:scale-102"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-orange-400 font-bold">
                        {station.stepNum}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {station.stepLabel}
                      </span>
                    </div>
                    <strong className="block text-sm font-bold text-white mt-1">
                      {station.name}
                    </strong>
                    <span className="block text-[11px] text-slate-400 font-mono mt-0.5">
                      {station.role}
                    </span>
                  </div>

                  {/* Physical Hardware Socket on the board */}
                  <div
                    className={`w-6 h-6 mx-auto mt-1 rounded-full border-2 flex items-center justify-center transition-all ${
                      isSelected
                        ? "bg-orange-500 border-white shadow-[0_0_15px_#f59e0b]"
                        : "bg-slate-800 border-slate-600 group-hover:border-orange-400"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-white" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Mode Tabs & Camera Controls matching user reference (Image 3) */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4 border-t border-orange-950/60 relative z-10">
        {/* Left: Mode Buttons [Assembled] [Cutaway] [Stations] [One order] */}
        <div className="flex flex-wrap items-center gap-2 bg-[#090e18] p-1.5 rounded-2xl border border-slate-800">
          {(
            [
              { id: "assembled", label: "Assembled", icon: Box },
              { id: "cutaway", label: "Cutaway", icon: Layers },
              { id: "stations", label: "Stations", icon: Cpu },
              { id: "simulate", label: "One order", icon: Play },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              onClick={() => {
                setStateMode(m.id);
                if (m.id === "simulate") setIsSimulating(true);
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                stateMode === m.id
                  ? "bg-orange-500 text-slate-950 shadow-lg"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <m.icon size={15} />
              <span>{m.label}</span>
            </button>
          ))}
        </div>

        {/* Right: Camera View Controls (Overview, Side, Top, Station, Flight) */}
        <div className="flex flex-wrap justify-center items-center gap-4 text-xs font-mono text-slate-400">
          <span className="text-[11px] text-slate-400 uppercase tracking-wider">VIEW</span>
          {(["overview", "side", "top", "station", "flight"] as const).map((angle) => (
            <button
              key={angle}
              onClick={() => setViewAngle(angle)}
              className={`capitalize transition relative pb-1 ${
                viewAngle === angle ? "text-white font-bold" : "text-slate-400 hover:text-white"
              }`}
            >
              {angle}
              {viewAngle === angle && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-orange-500" />
              )}
            </button>
          ))}

          <span className="text-slate-700">|</span>

          {/* Play / Pause Toggle Button */}
          <button
            onClick={() => setIsSimulating((prev) => !prev)}
            className="p-1.5 rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition"
            title={isSimulating ? "Pause Simulation" : "Play Simulation"}
          >
            {isSimulating ? <Pause size={14} /> : <Play size={14} />}
          </button>
        </div>
      </div>

      <nav className="architecture-station-list" aria-label="Architecture steps">
        {STATIONS.map(station => <button key={station.id} aria-pressed={selectedStation.id === station.id}
          onClick={() => { setSelectedStation(station); setIsSimulating(false); }}>
          <span>Step {station.stepNum}</span>{station.role}
        </button>)}
      </nav>

      {/* Selected Station Deep-Dive Drawer */}
      <div className="mt-6 rounded-2xl bg-[#090e18] border border-orange-900/40 p-6 md:p-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-orange-400">
              <span>STATION {selectedStation.stepNum}</span>
              <span>·</span>
              <span className="text-white font-bold">{selectedStation.awsService}</span>
            </div>
            <h3 className="text-xl font-bold text-white mt-1">
              {selectedStation.name}: {selectedStation.role}
            </h3>
            <code className="text-xs text-slate-400 font-mono mt-0.5 block break-all">
              {selectedStation.resourceName}
            </code>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-mono text-emerald-400">
            <ShieldCheck size={16} />
            <span>{selectedStation.security}</span>
          </div>
        </div>

        <p className="text-sm text-slate-300 mt-4 leading-relaxed max-w-4xl">
          {selectedStation.description}
        </p>

        {/* Live Code Snippet & I/O Telemetry */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
          <div className="bg-[#05080e] p-4 rounded-xl border border-slate-800">
            <span className="text-[11px] font-mono text-orange-400 block mb-2">
              IMPLEMENTATION SOURCE
            </span>
            <pre className="text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed">
              <a href={`https://github.com/mysterio-Apoorva/JalSetu/blob/main/${selectedStation.resourceName}`} target="_blank" rel="noreferrer" className="underline whitespace-normal break-all">Read the implementation in the project repository</a>
            </pre>
          </div>

          <div className="bg-[#05080e] p-4 rounded-xl border border-slate-800 space-y-3">
            <div>
              <span className="text-[11px] font-mono text-slate-400 block">INPUT PAYLOAD</span>
              <p className="text-xs text-slate-200 mt-0.5 font-mono">{selectedStation.input}</p>
            </div>
            <div>
              <span className="text-[11px] font-mono text-emerald-400 block">OUTPUT SETTLEMENT</span>
              <p className="text-xs text-emerald-200 mt-0.5 font-mono">{selectedStation.output}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
