"use strict";
const c=require("./core"), demographics=require("./demographics"), priority=require("./priority");
const {LocationClient,CalculateRouteCommand,SearchPlaceIndexForTextCommand}=require("@aws-sdk/client-location");
const location=new LocationClient({maxAttempts:2});
function origin() {
  const name=process.env.JAL_KENDRA_NAME, lat=process.env.JAL_KENDRA_LAT, lng=process.env.JAL_KENDRA_LNG;
  if(!name || !lat || !lng)return null;
  return {name,coordinates:c.coords({lat:Number(lat),lng:Number(lng)})};
}
function routeResult(result, start, destination) {
  const summary=result.Summary;
  c.check(summary && Number.isFinite(summary.Distance) && Number.isFinite(summary.DurationSeconds),"Road route is unavailable for this destination",503);
  const coordinates=(result.Legs||[]).flatMap(leg=>leg.Geometry?.LineString||[]);
  c.check(coordinates.length>=2 && coordinates.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)),"Routing provider returned no valid road geometry",503);
  return {origin:start,destination,distanceKm:summary.Distance,durationMinutes:Math.ceil(summary.DurationSeconds/60),geometry:{type:"LineString",coordinates},
    source:"Amazon Location / HERE",algorithm:"Fastest truck road route from provider",calculatedAt:new Date().toISOString(),simulatedDelivery:true};
}
async function handle(event) {
  const user=await c.authorize(event,"ReadOperations"), path=event.rawPath;
  if(path.endsWith("/config"))return {origin:origin(),otpEnabled:!!process.env.OTP_FROM_EMAIL,deliveryMode:"SIMULATED",census:require("./population-reference.json")};
  const b=c.body(event);
  if(path.endsWith("/search")) {
    await c.rateLimit(user.sub,"place-search",1500);
    const result=await location.send(new SearchPlaceIndexForTextCommand({IndexName:c.env("PLACE_INDEX_NAME"),Text:c.text(b.query,"destination",200),FilterCountries:["IND"],MaxResults:5,...(origin()?{BiasPosition:[origin().coordinates.lng,origin().coordinates.lat]}:{})}));
    return {places:(result.Results||[]).map(({Place})=>({label:Place.Label,coordinates:{lng:Place.Geometry.Point[0],lat:Place.Geometry.Point[1]}}))};
  }
  if(path.endsWith("/context")) {
    const point=c.coords(b.coordinates);
    await c.rateLimit(user.sub,"place-context",3000);
    const results=await Promise.allSettled([priority.weatherAt(point),demographics.at(point)]);
    const [weather,population]=results.map(r=>r.status==="fulfilled"?r.value:null);
    return {weather,population,errors:results.filter(r=>r.status==="rejected").map(r=>r.reason.message)};
  }
  if(path.endsWith("/route")) {
    const start=origin();c.check(start,"The operator must configure the Jal Kendra starting point first",503);
    const destination=c.coords(b.coordinates);
    await c.rateLimit(user.sub,"plan-route",10000);
    const result=await location.send(new CalculateRouteCommand({CalculatorName:c.env("ROUTE_CALCULATOR_NAME"),DeparturePosition:[start.coordinates.lng,start.coordinates.lat],DestinationPosition:[destination.lng,destination.lat],TravelMode:"Truck",OptimizeFor:"FastestRoute",DistanceUnit:"Kilometers",IncludeLegGeometry:true,DepartNow:true}));
    const route=routeResult(result,start,destination),id=c.crypto.randomUUID();
    await c.put({...c.key("SIM_DELIVERY",id),id,ownerId:user.sub,route,status:"PLANNED",kind:"SIMULATED_DELIVERY",createdAt:new Date().toISOString()});
    return {id,...route};
  }
  throw new c.HttpError(404,"Planning endpoint not found");
}
module.exports={handle,origin,routeResult};
