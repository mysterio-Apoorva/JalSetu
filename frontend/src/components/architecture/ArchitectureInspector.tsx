import { useState } from "react";
import {
  Cloud,
  Database,
  Workflow,
  ShieldCheck,
  MapPin,
  HardDrive,
  Radio,
  Sparkles,
  Server,
  ArrowRight,
} from "lucide-react";
const services = [
  {
    name: "API Gateway",
    icon: Cloud,
    step: "01 / INGEST",
    description:
      "HTTP endpoints validate JWTs using your configured identity provider. Public transparency exposes only aggregate and audit-safe fields.",
    path: "backend/api-gateway/openapi.yaml",
  },
  {
    name: "AWS Lambda",
    icon: Server,
    step: "02 / EXECUTE",
    description:
      "Six existing service boundaries: request intake, urgency classifier, route optimizer, telemetry, delivery verification and fraud detection.",
    path: "backend/lambdas/",
  },
  {
    name: "Amazon SQS",
    icon: Workflow,
    step: "03 / BUFFER",
    description:
      "DynamoDB Streams forwards durable requests to a FIFO queue. Retries preserve ordering and failed messages move to a dead-letter queue.",
    path: "backend/lambdas/citizen-request-intake/index.js",
  },
  {
    name: "Amazon Bedrock",
    icon: Sparkles,
    step: "04 / PRIORITIZE",
    description:
      "Converse calls classify multilingual text and answer operational questions from database snapshots. Model failures are surfaced, never silently presented as AI success.",
    path: "backend/lambdas/bedrock-urgency-classifier/index.js",
  },
  {
    name: "Step Functions",
    icon: Workflow,
    step: "05 / ORCHESTRATE",
    description:
      "Classify, dispatch, and wait for a real verified-delivery callback. Workflow execution names deduplicate SQS retries.",
    path: "backend/step-functions/delivery-verification-workflow.asl.json",
  },
  {
    name: "Amazon Location",
    icon: MapPin,
    step: "06 / LOCATE",
    description:
      "Road route matrices guide capacity-aware assignment. Trackers persist vehicle positions and geofence collections evaluate telemetry.",
    path: "backend/lambdas/geofence-telemetry-processor/index.js",
  },
  {
    name: "Amazon DynamoDB",
    icon: Database,
    step: "07 / RECORD",
    description:
      "The single table stores operational records and the audit ledger. Conditional transactions prevent duplicate settlement and conflicting assignments.",
    path: "backend/shared/core.js",
  },
  {
    name: "Amazon S3",
    icon: HardDrive,
    step: "08 / EVIDENCE",
    description:
      "Private, encrypted, versioned JPEG evidence. SHA-256 checksums link photo content to a delivery record. Versioning is not a regulatory WORM guarantee.",
    path: "backend/lambdas/pod-verification-handler/index.js",
  },
  {
    name: "Amazon EventBridge",
    icon: Radio,
    step: "09 / INVESTIGATE",
    description:
      "OTP mismatches and departures without proof trigger idempotent alerts for human review. Physical flow and valve sensors are not connected.",
    path: "backend/lambdas/fraud-sentinel-anomaly-detector/index.js",
  },
  {
    name: "Amazon Cognito authorization",
    icon: ShieldCheck,
    step: "10 / AUTHORIZE",
    description:
      "API Gateway verifies Cognito JWTs. Server role permissions and record ownership restrict each operation. If an external policy store is configured, authorization fails closed when it is unavailable.",
    path: "backend/shared/core.js",
  },
];
export function ArchitectureInspector() {
  const [selected, setSelected] = useState(0);
  const item = services[selected];
  return (
    <section className="space-y-5 pb-8">
      <div>
        <span className="eyebrow">UNDER THE SURFACE</span>
        <h2 className="text-3xl font-bold text-slate-800 mt-2">
          One connected water network.
        </h2>
        <p className="text-sm text-slate-500 mt-3 max-w-2xl">
          The existing serverless architecture, connected end to end. Select a
          service to explore its responsibility.
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {services.map((s, i) => (
          <button
            key={s.name}
            onClick={() => setSelected(i)}
            aria-pressed={i === selected}
            className={`text-left rounded-2xl p-4 border ${i === selected ? "bg-emerald-900 text-white border-emerald-900" : "glossy-panel text-slate-600"}`}
          >
            <s.icon size={23} />
            <span className="block text-[9px] font-mono opacity-60 mt-4">
              {s.step}
            </span>
            <strong className="block text-xs mt-2">{s.name}</strong>
          </button>
        ))}
      </div>
      <div className="glossy-panel p-7 rounded-2xl">
        <item.icon className="text-emerald-700 mb-4" />
        <h3 className="text-xl font-bold">{item.name}</h3>
        <p className="text-sm text-slate-600 leading-relaxed my-3 max-w-3xl">
          {item.description}
        </p>
        <code className="block text-xs break-all text-slate-500">
          {item.path}
        </code>
      </div>
      <div className="flex flex-wrap gap-3 items-center text-xs text-slate-500 p-4">
        Request
        <ArrowRight size={14} />
        Triage
        <ArrowRight size={14} />
        Dispatch
        <ArrowRight size={14} />
        Resident + GPS + Photo
        <ArrowRight size={14} />
        Verified record
      </div>
      <p className="text-xs text-slate-500">
        Deployment source: infra/template.yaml. Service availability and AWS
        charges depend on your region, account and usage. The interface does not
        claim a live connection until your configured API responds.
      </p>
    </section>
  );
}
