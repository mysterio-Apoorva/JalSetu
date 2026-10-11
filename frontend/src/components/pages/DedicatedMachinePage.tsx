import React from "react";
import { MachineArchitecture3D } from "../ui/MachineArchitecture3D";
import { HardDrive, KeyRound, Terminal, Lock } from "lucide-react";

export function DedicatedMachinePage() {
  return (
    <div className="w-full space-y-10 pb-20">
      {/* 3D Interactive Cybernetic Machine Component */}
      <MachineArchitecture3D />

      {/* Deep-Dive Security & Proof-of-Delivery Architecture Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: 3-Way Handshake Anti-Corruption */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 text-white shadow-xl space-y-3">
          <div className="p-3 w-fit rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <KeyRound size={22} />
          </div>
          <h3 className="text-lg font-bold">1. Resident OTP Handshake</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            The driver cannot unilaterally mark a trip complete. The resident must share their dynamic 6-digit OTP, which is hashed with SHA-256 and matched against the database item in Amazon DynamoDB.
          </p>
          <div className="text-[11px] font-mono text-emerald-400 pt-2 border-t border-slate-800">
            Deduplicated · 10-Minute Expiry · Single Use
          </div>
        </div>

        {/* Card 2: Amazon Location Geofencing */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 text-white shadow-xl space-y-3">
          <div className="p-3 w-fit rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
            <Lock size={22} />
          </div>
          <h3 className="text-lg font-bold">2. 200m GPS Geofence Bounding</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Amazon Location Service tracker streams driver coordinates. The verification Lambda rejects any delivery confirmation if the driver’s device is outside the registered 200-meter drop-off polygon.
          </p>
          <div className="text-[11px] font-mono text-orange-400 pt-2 border-t border-slate-800">
            Haversine Distance Check · Reject Spoofed GPS
          </div>
        </div>

        {/* Card 3: Amazon S3 SHA-256 Evidence */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 text-white shadow-xl space-y-3">
          <div className="p-3 w-fit rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
            <HardDrive size={22} />
          </div>
          <h3 className="text-lg font-bold">3. S3 Photographic Fingerprint</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            The driver uploads a discharge photo. The file magic numbers (JPEG headers) are verified, and an immutable SHA-256 hash is computed and stored in the municipal audit ledger for civic verification.
          </p>
          <div className="text-[11px] font-mono text-purple-400 pt-2 border-t border-slate-800">
            KMS-Encrypted Bucket · Versioned Object Store
          </div>
        </div>
      </div>

      {/* CloudFormation & SAM Specification Overview */}
      <div className="rounded-3xl bg-[#070b12] border border-orange-950/60 p-6 md:p-8 text-white space-y-4">
        <div className="flex items-center gap-2 text-xs font-mono text-orange-400">
          <Terminal size={15} />
          <span>AWS SAM TEMPLATE PARITY (infra/template.yaml)</span>
        </div>
        <h4 className="text-xl font-bold">Production Infrastructure Specifications</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono text-slate-300 pt-2">
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-slate-500 block text-[10px]">AUTH STACK</span>
            <strong>Amazon Cognito</strong>
            <div className="text-[10px] text-slate-400 mt-1">us-east-1_ko5ROUcaz</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-slate-500 block text-[10px]">AI ENGINE</span>
            <strong>Amazon Bedrock</strong>
            <div className="text-[10px] text-slate-400 mt-1">us.amazon.nova-lite-v1:0</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-slate-500 block text-[10px]">EVENT BUS</span>
            <strong>Amazon EventBridge</strong>
            <div className="text-[10px] text-slate-400 mt-1">JalSetu-Operations</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-slate-500 block text-[10px]">DATABASE</span>
            <strong>Amazon DynamoDB</strong>
            <div className="text-[10px] text-slate-400 mt-1">JalSetu-Core (PITR On)</div>
          </div>
        </div>
      </div>
    </div>
  );
}
