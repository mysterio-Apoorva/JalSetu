"use strict";
const c = require("./core");
const YEAR = 2025;
const BASE = "https://api.worldpop.org/v2";

function cell(point) {
  c.coords(point);
  c.check(Math.abs(point.lat) < 85 && Math.abs(point.lng) < 179.98, "Population lookup is unavailable at this location");
  const west = Math.floor(point.lng * 50) / 50, south = Math.floor(point.lat * 50) / 50;
  const east = +(west + 0.02).toFixed(2), north = +(south + 0.02).toFixed(2);
  return { id: `${YEAR}:${west.toFixed(2)}:${south.toFixed(2)}`, geometry: { type: "Polygon", coordinates: [[[west,south],[east,south],[east,north],[west,north],[west,south]]] } };
}
async function request(path, body) {
  let response;
  try {
    response = await fetch(BASE + path, {method: body ? "POST" : "GET", headers: {"Content-Type":"application/json"}, ...(body ? {body:JSON.stringify(body)} : {}), signal:AbortSignal.timeout(15000)});
    c.check(response.ok, "Population provider unavailable; no population has been invented", 503);
    return await response.json();
  } catch(e) { if(e instanceof c.HttpError)throw e; throw new c.HttpError(503,"Population provider unavailable. Please retry."); }
}
function normalize(result, geometry) {
  c.check(result && result.data_year === YEAR, "Population provider returned the wrong dataset year", 503);
  for(const k of ["total_population","area_km2","population_density"]) c.check(typeof result[k] === "number" && Number.isFinite(result[k]) && result[k]>=0, "Population provider returned missing values",503);
  c.check(result.area_km2>0, "Population provider returned an empty area",503);
  return {population:Math.round(result.total_population),densityPerKm2:Math.round(result.population_density),areaKm2:result.area_km2,year:YEAR,geometry,
    source:"WorldPop Global 2, modeled population estimate",sourceUrl:"https://api.worldpop.org/v2/",license:"CC BY 4.0",retrievedAt:new Date().toISOString()};
}
async function at(point) {
  const grid=cell(point), cached=await c.get("DEMOGRAPHICS",grid.id);
  if(cached?.data)return {status:"COMPLETE",...cached.data};
  if(cached?.taskId){
    c.check(/^[a-zA-Z0-9-]{1,80}$/.test(cached.taskId),"Invalid population job",503);
    const job=await request(`/tasks/${cached.taskId}`);
    if(job.status === "success") {
      const data=normalize(job.result,grid.geometry);
      await c.db.send(new c.UpdateCommand({TableName:c.env("TABLE_NAME"),Key:c.key("DEMOGRAPHICS",grid.id),UpdateExpression:"SET #data=:data",ExpressionAttributeNames:{"#data":"data"},ExpressionAttributeValues:{":data":data}}));
      return {status:"COMPLETE",...data};
    }
    const elapsed=Date.now()-Date.parse(cached.createdAt);
    if(job.status!=="failure" && elapsed<600000) return {status:"PENDING",year:YEAR,geometry:grid.geometry,message:"WorldPop is calculating population for this area. Refresh in a few seconds."};
    c.check(elapsed>=60000,"Population calculation failed at the provider. Retry in one minute; no density value has been invented.",503);
  }
  // Coordinate-based cache and admission control avoid resubmitting the same cell.
  await c.rateLimit("population-cell",grid.id,60000);
  await c.rateLimit("network","population-submit",1500);
  const job=await request("/population",{geojson:grid.geometry,year:YEAR,resolution:"100m"});
  c.check(typeof job.task_id === "string" && /^[a-zA-Z0-9-]{1,80}$/.test(job.task_id),"Population provider did not create a valid job",503);
  const item={...c.key("DEMOGRAPHICS",grid.id),taskId:job.task_id,createdAt:new Date().toISOString()};
  if(cached?.taskId) await c.db.send(new c.PutCommand({TableName:c.env("TABLE_NAME"),Item:item,ConditionExpression:"taskId=:old",ExpressionAttributeValues:{":old":cached.taskId}}));
  else await c.put(item);
  return {status:"PENDING",year:YEAR,geometry:grid.geometry,message:"Population calculation started. Refresh in a few seconds."};
}
module.exports={at,cell,normalize};
