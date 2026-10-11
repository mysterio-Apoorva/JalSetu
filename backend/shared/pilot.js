"use strict";
const c = require("./core"), priority = require("./priority");
const {BedrockRuntimeClient,InvokeModelCommand} = require("@aws-sdk/client-bedrock-runtime");
const {S3Client,PutObjectCommand,GetObjectCommand} = require("@aws-sdk/client-s3");
const storage = new S3Client({maxAttempts:3});
async function handle(event) {
  const path=event.rawPath, method=event.requestContext.http.method;
  const user=await c.authorize(event, path.endsWith("/report") ? "SubmitWaterRequest":"ReadOperations");
  if(path.endsWith("/needs") && method==="GET") {
    const items=(await c.query("NEED")).filter(n=>Date.now()-Date.parse(n.updatedAt)<7*86400000);
    return {reports:items.map(({id,place,coordinates,weather,population,priority:rank,updatedAt})=>({id,place,coordinates,weather,population,priority:{score:rank.score,version:rank.version},updatedAt})).sort((a,b)=>b.priority.score-a.priority.score), own:items.find(n=>n.ownerId===user.sub) ? c.publicRequest(items.find(n=>n.ownerId===user.sub)) : null, imageGenerationEnabled:Number(process.env.SIMULATION_DAILY_LIMIT)>0};
  }
  if(path.endsWith("/report") && method==="POST") {
    const b=c.body(event), point=c.coords(b.coordinates);
    c.check(point.lat>=28.35 && point.lat<=28.95 && point.lng>=76.8 && point.lng<=77.4,"Select a location within the Delhi pilot area");
    const input=priority.counts(b), place=c.text(b.place,"place name",100);
    // Publish only an approximate map point, never the household's exact GPS.
    const coordinates={lat:Number(point.lat.toFixed(3)),lng:Number(point.lng.toFixed(3))};
    const [weather,population]=await Promise.all([priority.weatherAt(coordinates),require("./demographics").at(coordinates)]);
    c.check(population.status === "COMPLETE", "Population data is still processing. Refresh location data before submitting your report.",503);
    await c.rateLimit(user.sub,"need-report",60000);
    const rank=priority.score(input,weather,population), id=c.hash(user.sub).slice(0,24), now=new Date().toISOString();
    const item={...c.key("NEED",id),GSI1PK:c.partition("NEED"),GSI1SK:id,id,ownerId:user.sub,place,coordinates,...input,weather,population,priority:rank,updatedAt:now};
    await c.db.send(new c.PutCommand({TableName:c.env("TABLE_NAME"),Item:item}));
    return {report:c.publicRequest(item)};
  }
  if(path.endsWith("/simulation") && method==="POST") {
    const limit=Number(process.env.SIMULATION_DAILY_LIMIT||0);
    c.check(limit>0,"AI delivery simulation is disabled until its AWS budget is configured",503);
    const need=await c.get("NEED",c.hash(user.sub).slice(0,24));
    c.check(need,"Submit your household needs report first",409);
    const day=new Date().toISOString().slice(0,10), id=c.hash(user.sub+":"+day).slice(0,32);
    const existing=await c.get("SIMULATION",id);
    if(existing) return {id,status:existing.status};
    const item={...c.key("SIMULATION",id),id,ownerId:user.sub,status:"QUEUED",kind:"AI_GENERATED_SIMULATION",createdAt:new Date().toISOString(),place:need.place};
    try { await c.db.send(new c.TransactWriteCommand({TransactItems:[
      {Update:{TableName:c.env("TABLE_NAME"),Key:c.key("IMAGE_QUOTA",day),UpdateExpression:"ADD used :one",ConditionExpression:"attribute_not_exists(used) OR used < :limit",ExpressionAttributeValues:{":one":1,":limit":limit}}},
      {Put:{TableName:c.env("TABLE_NAME"),Item:item,ConditionExpression:"attribute_not_exists(PK)"}}
    ]})); } catch(e) {
      if(e.name!=="TransactionCanceledException")throw e;
      const replay=await c.get("SIMULATION",id);
      if(replay)return {id,status:replay.status};
      throw new c.HttpError(429,"The shared daily simulation allowance has been reached. Try again tomorrow.");
    }
    return {id,status:"QUEUED"};
  }
  if(path.endsWith("/simulation") && method==="GET") {
    const id=c.text(event.queryStringParameters?.id,"simulation ID",64), item=await c.get("SIMULATION",id);
    c.check(item?.ownerId===user.sub,"Simulation not found",404);
    if(item.status!=="COMPLETE") return {id,status:item.status,message:item.message || (Date.now()-Date.parse(item.createdAt)>180000 ? "Generation is delayed or interrupted. Contact the operator; no real delivery has been recorded." : undefined)};
    const object=await storage.send(new GetObjectCommand({Bucket:c.env("POD_BUCKET_NAME"),Key:`simulations/${id}.svg`}));
    return {id,status:item.status,kind:item.kind,imageDataUrl:`data:image/svg+xml;base64,${Buffer.from(await object.Body.transformToByteArray()).toString("base64")}`};
  }
  throw new c.HttpError(404,"Pilot route not found");
}
async function generate(item) {
  try { await c.db.send(new c.UpdateCommand({TableName:c.env("TABLE_NAME"),Key:c.key("SIMULATION",item.id),UpdateExpression:"SET #s=:running",ConditionExpression:"#s=:queued",ExpressionAttributeNames:{"#s":"status"},ExpressionAttributeValues:{":running":"RUNNING",":queued":"QUEUED"}})); }
  catch(e) { if(e.name==="ConditionalCheckFailedException") return; throw e; }
  try {
    // No automatic model retry: a timed-out invocation may already have been billed.
    const bedrock=new BedrockRuntimeClient({maxAttempts:1});
    const result=await bedrock.send(new InvokeModelCommand({modelId:"amazon.nova-canvas-v1:0",contentType:"application/json",accept:"application/json",body:JSON.stringify({taskType:"TEXT_IMAGE",textToImageParams:{text:"A staged educational simulation photograph of a generic unbranded water tanker delivering water through a hose into containers on a residential street in Delhi, India, daylight. No people, no readable registration plates, no official logos. This is a fictional delivery scene."},imageGenerationConfig:{width:512,height:512,quality:"standard",numberOfImages:1,seed:c.crypto.randomInt(0,858993460)}})}));
    const output=JSON.parse(Buffer.from(result.body).toString()), png=output.images?.[0];
    c.check(typeof png==="string" && /^[A-Za-z0-9+/=]+$/.test(png) && Buffer.from(png,"base64").subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),"Image generation returned no valid PNG",503);
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="568" viewBox="0 0 512 568"><image width="512" height="512" href="data:image/png;base64,${png}"/><rect y="512" width="512" height="56" fill="#7f1d1d"/><text x="256" y="535" text-anchor="middle" font-family="sans-serif" font-size="18" fill="white">AI-GENERATED DELIVERY SIMULATION</text><text x="256" y="557" text-anchor="middle" font-family="sans-serif" font-size="14" fill="white">Not evidence of a real water delivery</text></svg>`;
    await storage.send(new PutObjectCommand({Bucket:c.env("POD_BUCKET_NAME"),Key:`simulations/${item.id}.svg`,Body:svg,ContentType:"image/svg+xml",Metadata:{kind:"AI_GENERATED_SIMULATION"},ServerSideEncryption:"AES256"}));
    await c.db.send(new c.UpdateCommand({TableName:c.env("TABLE_NAME"),Key:c.key("SIMULATION",item.id),UpdateExpression:"SET #s=:complete",ExpressionAttributeNames:{"#s":"status"},ExpressionAttributeValues:{":complete":"COMPLETE"}}));
  } catch(e) {
    console.error("Simulation generation failed", e.name);
    await c.db.send(new c.UpdateCommand({TableName:c.env("TABLE_NAME"),Key:c.key("SIMULATION",item.id),UpdateExpression:"SET #s=:failed, message=:message",ExpressionAttributeNames:{"#s":"status"},ExpressionAttributeValues:{":failed":"FAILED",":message":"AI image generation failed. No delivery has been recorded; contact the operator before retrying."}}));
  }
}
module.exports={handle,generate};
