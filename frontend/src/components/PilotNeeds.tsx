import { useCallback, useEffect, useState } from "react";
import { RoutePlanner } from "./RoutePlanner";
import { api } from "../services/api";
type Point = {lat:number; lng:number};
type Report = {id:string;place:string;coordinates:Point;daysWithoutWater?:number;infants?:number;elders?:number;updatedAt:string;weather:{dryDays:number;drySpellCapped:boolean;averageTemperatureC:number;endDate:string;sourceUrl:string};priority:{score:number;components:Record<string,number>}};
export function PilotNeeds({canReport}:{canReport:boolean}) {
  const [reports,setReports]=useState<Report[]>([]),[point,setPoint]=useState<Point|null>(null);
  const [place,setPlace]=useState(""),[days,setDays]=useState(""),[infants,setInfants]=useState(""),[elders,setElders]=useState("");
  const [error,setError]=useState(""),[message,setMessage]=useState(""),[busy,setBusy]=useState(false),[enabled,setEnabled]=useState(false);
  const [job,setJob]=useState<{id:string;status:string;imageDataUrl?:string;message?:string}|null>(null);
  const jobId=job?.id, jobStatus=job?.status;
  const refresh=useCallback(async()=>{const data=await api<{reports:Report[];imageGenerationEnabled:boolean}>("/needs");if(!Array.isArray(data.reports))throw new Error("Needs service returned an invalid response. Please retry later.");setReports(data.reports);setEnabled(data.imageGenerationEnabled===true);},[]);
  useEffect(()=>{let active=true; const load=()=>refresh().catch(e=>{if(active)setError(e.message);});void load();const timer=setInterval(()=>{if(!document.hidden)void load();},60000);return()=>{active=false;clearInterval(timer);};},[refresh]);
  useEffect(()=>{
    if(!jobId || !jobStatus || !["QUEUED","RUNNING"].includes(jobStatus))return;
    let active=true, inFlight=false; const start=Date.now();
    const timer=setInterval(async()=>{if(inFlight)return;inFlight=true;try{
      const result=await api<{id:string;status:string;imageDataUrl?:string;message?:string}>(`/simulation?id=${encodeURIComponent(jobId)}`);
      if(active)setJob(result);
      if(Date.now()-start>180000){clearInterval(timer);if(active)setError("Generation is taking longer than expected. Reload its status below; no extra image will be requested.");}
    }catch(e){if(active)setError((e as Error).message);}finally{inFlight=false;}},5000);
    return()=>{active=false;clearInterval(timer);};
  },[jobId,jobStatus]);
  return <section className="glossy-panel rounded-2xl p-5 space-y-4 mb-6">
    <h2 className="text-xl font-bold">Delhi water needs · public pilot</h2>
    <p className="text-sm">Real map and weather integration. Household needs are self-reported. Delivery partners are not onboarded; submitting here does not book a tanker.</p>
    <p className="text-xs text-slate-600">Reports expire from this board after 7 days. Each account has one active household report. Scores use weather through the date shown, not a live drought declaration.</p>
    {error && <p role="alert" className="text-red-800">{error}</p>}{message && <p role="status">{message}</p>}
    <RoutePlanner point={point} onPick={(p,label)=>{setPoint(p);if(label)setPlace(label.slice(0,100));}} reports={reports} canConfirm={canReport}/>
    {canReport && <form className="grid sm:grid-cols-2 gap-3" onSubmit={async e=>{
      e.preventDefault();if(!point){setError("Select your location on the map first.");return;}setBusy(true);setError("");setMessage("");
      try{await api("/needs/report",{place,coordinates:point,daysWithoutWater:Number(days),infants:Number(infants),elders:Number(elders)});await refresh();setMessage("Your household report was saved and ranked using recent weather. This is not a delivery booking.");}catch(e){setError((e as Error).message);}finally{setBusy(false);}
    }}>
      <p className="sm:col-span-2 text-sm">Click your location on the map. Its approximate location and priority will appear to signed-in users. Do not enter names or an exact home address.</p>
      <label>Locality name<input required maxLength={100} value={place} onChange={e=>setPlace(e.target.value)} className="w-full border rounded p-2" /></label>
      <label>Days without water<input required type="number" min={0} max={60} step={1} value={days} onChange={e=>setDays(e.target.value)} className="w-full border rounded p-2" /></label>
      <label>Infants under 1 year in your household<input required type="number" min={0} max={1000} step={1} value={infants} onChange={e=>setInfants(e.target.value)} className="w-full border rounded p-2" /></label>
      <label>Elders aged 60+ in your household<input required type="number" min={0} max={1000} step={1} value={elders} onChange={e=>setElders(e.target.value)} className="w-full border rounded p-2" /></label>
      <p className="text-xs sm:col-span-2">Enter actual counts, including 0 when there are none. Counts are used for priority; they are not published individually. Location: {point?`${point.lat.toFixed(3)}, ${point.lng.toFixed(3)}`:"not selected"}.</p>
      <button className="primary-action" disabled={busy}>{busy?"Fetching weather and saving…":"Save household needs report"}</button>
    </form>}
    <details><summary>How priority is calculated</summary><p className="text-sm">Version 2: outage days contribute up to 30 points at 14 days; consecutive days below 1 mm rainfall up to 15 points at 30 days; seven-day mean temperature up to 10 points from 25–40°C; infants up to 15 points at 5 people; elders up to 20 points at 5 people; WorldPop population density up to 10 points at 30,000 people/km². Values are capped. Counts and outages are resident-reported; weather and density are fetched by the server. Missing data blocks a new score. These are transparent pilot allocation weights, not a validated prediction model. Weather comes from <a href="https://open-meteo.com/en/docs" className="underline">Open-Meteo</a> (CC BY 4.0; free API for non-commercial use). Historical version-1 reports did not use population density.</p></details>
    {reports.length===0?<p>No recent household reports. No example locations or vulnerability counts have been inserted.</p>:<div className="overflow-auto"><table className="w-full text-sm text-left"><thead><tr><th>Reported locality</th><th>Priority</th><th>Dry spell</th><th>7-day average</th><th>Weather through</th></tr></thead><tbody>{reports.map(r=><tr key={r.id}><td className="py-3">{r.place}</td><td>{r.priority.score}/100</td><td>{r.weather.dryDays}{r.weather.drySpellCapped?"+":""} days</td><td>{r.weather.averageTemperatureC}°C</td><td>{r.weather.endDate}</td></tr>)}</tbody></table></div>}
    {canReport && <div className="border-t pt-4 space-y-3"><h3 className="font-bold">AI delivery-scene simulation</h3><p className="text-sm">Generates a new fictional scene for each daily simulation. It is never delivery evidence and adds zero verified litres. One simulation per account per UTC day; the operator also sets a shared daily limit.</p><button className="secondary-action" disabled={busy||!enabled} onClick={async()=>{setBusy(true);setError("");try{const result=await api<{id:string;status:string}>("/simulation",{});setJob(await api(`/simulation?id=${encodeURIComponent(result.id)}`));}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}>{enabled?"Generate / load today's simulated scene":"AI simulation awaits operator budget configuration"}</button>{job&&<p role="status">Simulation: {job.status}. {job.message}</p>}{job?.imageDataUrl&&<img className="max-w-full w-96 rounded" src={job.imageDataUrl} alt="AI-generated simulated tanker delivery. Not evidence of a real delivery."/>}</div>}
    {job && <button className="secondary-action" disabled={busy} onClick={async()=>{
      setBusy(true);setError("");try{setJob(await api(`/simulation?id=${encodeURIComponent(job.id)}`));}
      catch(e){setError((e as Error).message);}finally{setBusy(false);}
    }}>Reload simulation status</button>}
    <figure className="border-t pt-4 space-y-2">
      <img src="/simulated-delivery.png" width={1536} height={1024} loading="lazy" className="w-full max-w-2xl rounded-xl" alt="AI-generated simulation of a tanker delivering water into containers in Delhi. Not evidence of a real delivery." />
      <figcaption className="text-sm text-slate-600">AI-generated illustrative delivery scene. This image is simulated; it does not record a delivery or change water totals. Priority scores above use submitted household counts and retrieved weather data.</figcaption>
    </figure>
  </section>;
}
