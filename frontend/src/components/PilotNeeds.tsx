import { useCallback, useEffect, useState } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, useMapEvents } from "react-leaflet";
import { api } from "../services/api";
type Point = {lat:number; lng:number};
type Report = {id:string;place:string;coordinates:Point;daysWithoutWater?:number;infants?:number;elders?:number;updatedAt:string;weather:{dryDays:number;drySpellCapped:boolean;averageTemperatureC:number;endDate:string;sourceUrl:string};priority:{score:number;components:Record<string,number>}};
function Picker({onPick}:{onPick:(p:Point)=>void}) { useMapEvents({click:e=>onPick({lat:e.latlng.lat,lng:e.latlng.lng})}); return null; }
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
    <MapContainer center={[28.63,77.18]} zoom={11} style={{height:360,width:"100%",zIndex:0}}>
      <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' />
      {canReport && <Picker onPick={setPoint} />}
      {point && <CircleMarker center={[point.lat,point.lng]} radius={9} pathOptions={{color:"#2563eb"}}><Popup>Selected location</Popup></CircleMarker>}
      {reports.map(r=><CircleMarker key={r.id} center={[r.coordinates.lat,r.coordinates.lng]} radius={8+r.priority.score/10} pathOptions={{color:r.priority.score>=60?"#b91c1c":"#b45309"}}><Popup>{r.place} · priority {r.priority.score}/100 · resident report</Popup></CircleMarker>)}
    </MapContainer>
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
    <details><summary>How priority is calculated</summary><p className="text-sm">Outage days: up to 35 points at 14 days. Consecutive days with rainfall below 1 mm: up to 20 points at 30 days. Seven-day average temperature: 0–15 points from 25–40°C. Infants and elders: each up to 15 points at 5 people. Values above these thresholds are capped. These are transparent pilot weights, not an official or clinically validated allocation policy. Weather is archived model output from <a href="https://open-meteo.com/en/docs" className="underline">Open-Meteo</a> (CC BY 4.0). The free API is for non-commercial use.</p></details>
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
