import {useEffect,useRef,useState} from "react";
import {CircleMarker,MapContainer,Polygon,Polyline,Popup,TileLayer,useMap,useMapEvents} from "react-leaflet";
import {api} from "../services/api";
type Point={lat:number;lng:number};
type Place={label:string;coordinates:Point};
type Route={id:string;origin:{name:string;coordinates:Point};destination:Point;distanceKm:number;durationMinutes:number;geometry:{coordinates:[number,number][]};source:string;algorithm:string};
type Config={origin:Route["origin"]|null;otpEnabled:boolean;census:{year:number;sourceUrl:string;scope:string;districts:{name:string;population:number;densityPerKm2:number}[]}};
type Context={weather:{dryDays:number;drySpellCapped:boolean;averageTemperatureC:number;rainfall30DaysMm:number;endDate:string;sourceUrl:string}|null;population:{status:string;population?:number;densityPerKm2?:number;areaKm2?:number;year:number;sourceUrl?:string;geometry?:{coordinates:[number,number][][]};message?:string}|null;errors:string[]};
type Report={id:string;place:string;coordinates:Point;priority:{score:number}};
function MapSelection({onPick}:{onPick:(point:Point)=>void}) {useMapEvents({click:e=>onPick({lat:e.latlng.lat,lng:e.latlng.lng})});return null;}
function View({point,route}:{point:Point|null;route:Route|null}) {
  const map=useMap();
  useEffect(()=>{if(route)map.fitBounds(route.geometry.coordinates.map(([lng,lat])=>[lat,lng] as [number,number]),{padding:[30,30]});else if(point)map.panTo([point.lat,point.lng]);},[map,point,route]);
  return null;
}
export function RoutePlanner({point,onPick,reports,canConfirm}:{point:Point|null;onPick:(point:Point,label?:string)=>void;reports:Report[];canConfirm:boolean}) {
  const [config,setConfig]=useState<Config|null>(null),[query,setQuery]=useState(""),[places,setPlaces]=useState<Place[]>([]);
  const [lat,setLat]=useState(""),[lng,setLng]=useState(""),[route,setRoute]=useState<Route|null>(null),[context,setContext]=useState<Context|null>(null);
  const [error,setError]=useState(""),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[code,setCode]=useState(""),[sent,setSent]=useState(false),[confirmed,setConfirmed]=useState(false);
  const [refresh,setRefresh]=useState(0);
  const selection=point?`${point.lat},${point.lng}`:"";
  const latest=useRef(selection);
  useEffect(()=>{latest.current=selection;},[selection]);
  useEffect(()=>{let active=true;api<Config>("/planning/config").then(data=>{if(active)setConfig(data);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[]);
  function choose(next:Point,label?:string) {
    if(busy)return;
    latest.current=`${next.lat},${next.lng}`;
    setRoute(null);setSent(false);setConfirmed(false);setCode("");setMessage("");
    setContext(null);setLat(String(next.lat));setLng(String(next.lng));onPick(next,label);
  }
  useEffect(()=>{
    if(!point)return;
    let active=true,timer:ReturnType<typeof setTimeout>|undefined;const start=Date.now();
    const load=async()=>{try{
      const result=await api<Context>("/planning/context",{coordinates:{lat:+point.lat.toFixed(3),lng:+point.lng.toFixed(3)}});
      if(!active)return;setContext(result);
      if(result.population?.status==="PENDING"&&Date.now()-start<120000)timer=setTimeout(load,6000);
    }catch(e){if(active)setError((e as Error).message);}};
    // Avoid sending a lookup for each click while the user is still choosing.
    timer=setTimeout(load,500);
    return()=>{active=false;clearTimeout(timer);};
  },[point,refresh]);
  async function task(work:()=>Promise<void>) {setBusy(true);setError("");try{await work();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  return <div className="space-y-3">
    <h3 className="font-bold">Jal Kendra route planner</h3>
    <p className="text-sm">Delivery is simulated. Roads, route distance, weather and sourced population estimates are real service results. {config?.origin?`Every route starts at ${config.origin.name}.`:"The operator must configure the fixed Jal Kendra starting point before routes can be calculated."}</p>
    <form className="flex gap-2" onSubmit={e=>{e.preventDefault();void task(async()=>{const result=await api<{places:Place[]}>("/planning/search",{query});setPlaces(result.places);if(!result.places.length)setMessage("No matching places. Select the map or enter coordinates.");});}}>
      <label className="flex-1">Destination address or locality<input required value={query} onChange={e=>setQuery(e.target.value)} maxLength={200} className="block w-full border rounded p-2" /></label>
      <button className="secondary-action self-end" disabled={busy}>Find place</button>
    </form>
    {places.length>0&&<ul className="space-y-2">{places.map((p,i)=><li key={i}><button className="secondary-action text-left" disabled={busy} onClick={()=>{choose(p.coordinates,p.label);setPlaces([]);}}>{p.label}</button></li>)}</ul>}
    <form className="flex flex-wrap gap-2 items-end" onSubmit={e=>{e.preventDefault();choose({lat:Number(lat),lng:Number(lng)});}}>
      <label>Destination latitude<input className="block border rounded p-2 w-36" required type="number" step="any" min={-84.99} max={84.99} value={lat} onChange={e=>setLat(e.target.value)} /></label>
      <label>Destination longitude<input className="block border rounded p-2 w-36" required type="number" step="any" min={-179.97} max={179.97} value={lng} onChange={e=>setLng(e.target.value)} /></label>
      <button className="secondary-action" disabled={busy}>Use coordinates</button>
    </form>
    <MapContainer center={[28.63,77.18]} zoom={11} style={{height:400,width:"100%",zIndex:0}}>
      <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' />
      <MapSelection onPick={choose}/><View point={point} route={route}/>
      {config?.origin&&<CircleMarker center={[config.origin.coordinates.lat,config.origin.coordinates.lng]} radius={10} pathOptions={{color:"#047857"}}><Popup>Start: {config.origin.name}</Popup></CircleMarker>}
      {point&&<CircleMarker center={[point.lat,point.lng]} radius={9} pathOptions={{color:"#2563eb"}}><Popup>Selected destination</Popup></CircleMarker>}
      {reports.map(r=><CircleMarker key={r.id} center={[r.coordinates.lat,r.coordinates.lng]} radius={8+r.priority.score/10} pathOptions={{color:r.priority.score>=60?"#b91c1c":"#b45309"}}><Popup>{r.place} · priority {r.priority.score}/100 · resident report</Popup></CircleMarker>)}
      {context?.population?.geometry&&<Polygon positions={context.population.geometry.coordinates[0].map(([x,y])=>[y,x] as [number,number])} pathOptions={{color:"#9333ea",fillOpacity:0.1}}><Popup>WorldPop population sampling area (2025)</Popup></Polygon>}
      {route&&<Polyline positions={route.geometry.coordinates.map(([x,y])=>[y,x] as [number,number])} pathOptions={{color:"#0369a1",weight:5}}/>}
    </MapContainer>
    {error&&<p role="alert" className="text-red-800">{error}</p>}
    {message&&<p role="status">{message}</p>}
    <div className="flex flex-wrap gap-2">
      <button className="primary-action" disabled={busy||!point||!config?.origin} onClick={()=>void task(async()=>{const key=selection;const result=await api<Route>("/planning/route",{coordinates:point});if(latest.current===key){setRoute(result);setSent(false);setConfirmed(false);setCode("");setMessage("");}})}>Calculate road route</button>
      <button className="secondary-action" disabled={!point||busy} onClick={()=>{setContext(null);setError("");setRefresh(n=>n+1);}}>Refresh location data</button>
    </div>
    {route&&<div className="rounded-xl bg-sky-50 p-4"><strong>{route.distanceKm.toFixed(1)} km · approximately {route.durationMinutes} minutes</strong><p className="text-sm">{route.algorithm} from {route.origin.name}. Source: {route.source}. Travel time is an estimate; vehicle dimensions and live road closures may change suitability.</p>
      {canConfirm&&<div className="mt-3 space-y-2"><p className="text-sm">Confirm this simulated delivery using a real code sent to your verified account email. Confirmation adds zero real delivered litres.</p>
        <button className="secondary-action" disabled={busy||confirmed||!config?.otpEnabled} onClick={()=>void task(async()=>{const result=await api<{destination:string}>("/planning/otp/send",{id:route.id});setSent(true);setMessage(`A real confirmation code was emailed to ${result.destination}. It expires in 10 minutes. Wait one minute before resending.`);})}>{config?.otpEnabled?(sent?"Resend email code":"Email confirmation code"):"OTP email awaits sender verification"}</button>
        {sent&&!confirmed&&<form className="flex flex-wrap gap-2" onSubmit={e=>{e.preventDefault();void task(async()=>{await api("/planning/otp/verify",{id:route.id,code});setConfirmed(true);setCode("");setMessage("Email code verified. Simulated delivery confirmed; no real water delivery recorded.");});}}><label>Email confirmation code<input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,""))} className="block border rounded p-2"/></label><button disabled={busy} className="primary-action self-end">Confirm simulation</button></form>}
      </div>}
    </div>}
    {point&&!context&&<p role="status">Loading real weather and population data…</p>}
    {context&&<div className="grid sm:grid-cols-2 gap-3">
      <div className="border rounded-xl p-3"><h4 className="font-bold">Recent weather</h4>{context.weather?<><p>{context.weather.averageTemperatureC}°C seven-day mean · {context.weather.dryDays}{context.weather.drySpellCapped?"+":""} consecutive dry days</p><p>{context.weather.rainfall30DaysMm} mm rain over 30 days. Through {context.weather.endDate}.</p><a className="underline text-sm" href={context.weather.sourceUrl} target="_blank" rel="noreferrer">Open-Meteo model data</a></>:<p>Weather unavailable. No replacement values are used.</p>}</div>
      <div className="border rounded-xl p-3"><h4 className="font-bold">Population density</h4>{context.population?.status==="COMPLETE"?<><p>{context.population.densityPerKm2?.toLocaleString()} people/km²</p><p>Estimated {context.population.population?.toLocaleString()} people in {context.population.areaKm2?.toFixed(2)} km², dataset year {context.population.year}.</p><a className="underline text-sm" href={context.population.sourceUrl} target="_blank" rel="noreferrer">WorldPop Global 2 · CC BY 4.0</a><p className="text-xs">Modeled estimate within the purple grid area, not a live census or exact household count.</p></>:<p>{context.population?.message||"Population unavailable. No density value is invented."}</p>}</div>
      {context.errors.map((text,i)=><p role="alert" className="text-red-800 sm:col-span-2" key={i}>{text}</p>)}
    </div>}
    {config?.census&&<details><summary>Official district population comparison · Census {config.census.year}</summary><p className="text-xs my-2">{config.census.scope}</p><div className="overflow-auto"><table className="w-full text-left text-sm"><thead><tr><th>2011 district</th><th>Population</th><th>People/km²</th></tr></thead><tbody>{config.census.districts.map(d=><tr key={d.name}><td>{d.name}</td><td>{d.population.toLocaleString()}</td><td>{d.densityPerKm2.toLocaleString()}</td></tr>)}</tbody></table></div><a className="underline text-sm" href={config.census.sourceUrl} target="_blank" rel="noreferrer">Official Delhi statistical abstract, Table 12.8</a></details>}
  </div>;
}
