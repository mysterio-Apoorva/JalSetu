import { ContributionSkyline3D } from "../ui/ContributionSkyline3D";

export function DedicatedSkylinePage() {
  return <div className="w-full space-y-6 pb-12">
    <ContributionSkyline3D />
    <p className="glossy-panel rounded-2xl p-5 text-sm text-slate-600">This skyline uses recorded delivery dates and litres from the public ledger. Select a day to inspect its recorded activity. Simulation confirmations contribute zero delivered litres.</p>
  </div>;
}
