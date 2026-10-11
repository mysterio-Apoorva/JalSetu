"use strict";
const c = require("./core");
const clamp = (n) => Math.max(0, Math.min(1, n));
function counts(input) {
  const result = {};
  for (const [name, max] of [["daysWithoutWater",60],["infants",1000],["elders",1000]]) {
    result[name] = c.number(input[name], 0, max, name);
    c.check(Number.isInteger(result[name]), `${name} must be a whole number`);
  }
  return result;
}
function summarize(daily, yesterday) {
  const dates = daily?.time;
  c.check(Array.isArray(dates), "Weather provider returned no daily series", 503);
  const rows = dates.map((date,i) => ({date, rain:daily.precipitation_sum?.[i], temp:daily.temperature_2m_mean?.[i]})).filter(r => r.date <= yesterday).slice(-30);
  c.check(rows.length === 30 && rows.at(-1).date === yesterday, "Complete 30-day weather history unavailable", 503);
  rows.forEach((r,i) => {
    c.check(typeof r.rain === "number" && Number.isFinite(r.rain) && r.rain >= 0 && typeof r.temp === "number" && Number.isFinite(r.temp), "Weather history contains missing values", 503);
    if (i) c.check(Date.parse(r.date)-Date.parse(rows[i-1].date) === 86400000, "Weather history contains date gaps", 503);
  });
  let dryDays = 0;
  for (let i=rows.length-1;i>=0 && rows[i].rain<1;i--) dryDays++;
  return { dryDays, drySpellCapped:dryDays===30, averageTemperatureC:Math.round(rows.slice(-7).reduce((n,r)=>n+r.temp,0)/7*10)/10,
    rainfall30DaysMm:Math.round(rows.reduce((n,r)=>n+r.rain,0)*10)/10, startDate:rows[0].date, endDate:rows.at(-1).date,
    source:"Open-Meteo archived weather model output", sourceUrl:"https://open-meteo.com/en/docs", daily:rows };
}
function score(input, weather, population) {
  const n = counts(input);
  c.check(weather && Number.isFinite(weather.dryDays) && weather.dryDays >= 0 && Number.isFinite(weather.averageTemperatureC), "Valid weather is required to calculate priority", 503);
  if (population) c.check(population.status === "COMPLETE" && Number.isFinite(population.densityPerKm2) && population.densityPerKm2 >= 0, "Population density is not ready; no score has been invented", 503);
  const components = {
    waterOutage:(population?30:35)*clamp(n.daysWithoutWater/14),
    drySpell:(population?15:20)*clamp(weather.dryDays/30),
    heat:(population?10:15)*clamp((weather.averageTemperatureC-25)/15),
    infants:15*clamp(n.infants/5),
    elders:(population?20:15)*clamp(n.elders/5),
    ...(population?{populationDensity:10*clamp(population.densityPerKm2/30000)}:{}),
  };
  return {score:Math.round(Object.values(components).reduce((a,b)=>a+b,0)), components, version:population?"pilot-priority-v2":"pilot-priority-v1",
    explanation:"Pilot allocation rule, not a validated emergency or official drought classification. Water outage and age counts are resident-reported. Infants: under 1 year; elders: 60+."};
}
async function weatherAt(point) {
  c.coords(point);
  // India local calendar; exclude today's incomplete daily aggregate.
  const yesterday = new Date(Date.now()+19800000-86400000).toISOString().slice(0,10);
  const id = `${point.lat.toFixed(2)},${point.lng.toFixed(2)}:${yesterday}`;
  const cached = await c.get("WEATHER",id);
  if (cached) return cached.weather;
  await c.rateLimit("network", "weather-fetch", 1000);
  const params = new URLSearchParams({latitude:String(point.lat),longitude:String(point.lng),past_days:"30",forecast_days:"1",daily:"temperature_2m_mean,precipitation_sum",timezone:"Asia/Kolkata"});
  let response;
  try { response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {signal:AbortSignal.timeout(12000)}); }
  catch { throw new c.HttpError(503,"Weather provider unavailable; no priority has been invented. Please retry."); }
  c.check(response.ok,"Weather provider unavailable; please retry",503);
  const weather = {...summarize((await response.json()).daily,yesterday), fetchedAt:new Date().toISOString(), coordinates:point};
  try { await c.put({...c.key("WEATHER",id),weather}); } catch (e) { if(e.name!=="ConditionalCheckFailedException") throw e; }
  return weather;
}
module.exports = {counts,summarize,score,weatherAt};
