const {test}=require("node:test"),assert=require("node:assert/strict");
Object.assign(process.env,{AWS_REGION:"us-east-1",TABLE_NAME:"test",POLICY_STORE_ID:"local-cognito-rbac",ROUTE_CALCULATOR_NAME:"routes",JAL_KENDRA_NAME:"Test centre",JAL_KENDRA_LAT:"28.6",JAL_KENDRA_LNG:"77.2",OTP_FROM_EMAIL:"sender@example.org"});
const c=require("../shared/core"),p=require("../shared/planning"),d=require("../shared/demographics"),otp=require("../shared/delivery-otp"),priority=require("../shared/priority");
const {LocationClient}=require("@aws-sdk/client-location"),{SESClient}=require("@aws-sdk/client-ses");
const event=(path,body={})=>({rawPath:"/api/v1/planning/"+path,body:JSON.stringify(body),requestContext:{http:{method:"POST"},authorizer:{jwt:{claims:{sub:"resident",groups:'["Citizen"]',email:"resident@example.org",email_verified:"true"}}}}});
const record=()=>({id:"sim-1",ownerId:"resident",status:"PLANNED",otpState:"SENT",otpHash:c.hash("sim-1:123456"),otpExpiresAt:Date.now()+600000,otpAttempts:0});
function setup(t,item=record()) {
  const calls=[];
  t.mock.method(c.db,"send",async cmd=>{calls.push(cmd);return cmd.constructor.name==="GetCommand"?{Item:item}:{};});
  return calls;
}
test("route always starts at the server-configured centre and persists only a simulation",async t=>{
  const calls=setup(t);let request;
  t.mock.method(LocationClient.prototype,"send",async cmd=>{request=cmd.input;return {Summary:{Distance:12,DurationSeconds:1500},Legs:[{Geometry:{LineString:[[77.2,28.6],[77.3,28.7]]}}]};});
  const result=await p.handle(event("route",{coordinates:{lat:28.7,lng:77.3},origin:{lat:0,lng:0}}));
  assert.deepEqual(request.DeparturePosition,[77.2,28.6]);assert.equal(request.IncludeLegGeometry,true);
  assert.equal(result.durationMinutes,25);assert.equal(result.simulatedDelivery,true);
  const item=calls.find(x=>x.constructor.name==="PutCommand").input.Item;
  assert.ok(item.PK.startsWith("SIM_DELIVERY#"));assert.equal(item.kind,"SIMULATED_DELIVERY");
  assert.ok(!calls.some(x=>x.constructor.name==="TransactWriteCommand"));
});
test("missing road geometry cannot become a straight-line fake route",()=>{assert.throws(()=>p.routeResult({Summary:{Distance:1,DurationSeconds:1},Legs:[]},{},{}),/geometry/);});
test("population areas are deterministic and contain the selected point",()=>{const a=d.cell({lat:28.631,lng:77.211}),b=d.cell({lat:28.639,lng:77.219});assert.equal(a.id,b.id);assert.deepEqual(a.geometry.coordinates[0][0],[77.2,28.62]);});
test("population rejects wrong-year and missing data and keeps source provenance",()=>{
  const input={total_population:127240.22,area_km2:4.3349,population_density:29352.23,data_year:2025};
  assert.equal(d.normalize(input,{}).densityPerKm2,29352);assert.equal(d.normalize(input,{}).year,2025);
  for(const change of [{data_year:2020},{population_density:null},{area_km2:0},{total_population:NaN}])assert.throws(()=>d.normalize({...input,...change},{}));
});
test("density affects version-2 priority, while missing provider values fail closed",()=>{
  const n={daysWithoutWater:0,infants:0,elders:0},w={dryDays:0,averageTemperatureC:25};
  const low=priority.score(n,w,{status:"COMPLETE",densityPerKm2:0}),high=priority.score(n,w,{status:"COMPLETE",densityPerKm2:30000});
  assert.equal(high.score-low.score,10);assert.equal(high.version,"pilot-priority-v2");
  assert.throws(()=>priority.score(n,w,{status:"PENDING"}));assert.throws(()=>priority.score(n,{dryDays:NaN,averageTemperatureC:25}));
});
test("OTP goes only to the authenticated verified email and is never returned",async t=>{
  const calls=setup(t);let email;
  t.mock.method(SESClient.prototype,"send",async cmd=>{email=cmd.input;return {MessageId:"message"};});
  const result=await otp.handle(event("otp/send",{id:"sim-1",email:"attacker@example.org"}));
  assert.deepEqual(email.Destination.ToAddresses,["resident@example.org"]);assert.equal(result.sent,true);
  assert.ok(!JSON.stringify(result).includes("123456"));assert.equal(result.code,undefined);
  assert.match(email.Message.Body.Text.Data,/SIMULATED/);assert.match(calls[1].input.Key.PK,/LIMIT/);
  assert.ok(calls.some(x=>x.input.ExpressionAttributeValues?.[":sent"]==="SENT"));
});
test("email failure invalidates the code and cannot report success",async t=>{
  const calls=setup(t);t.mock.method(SESClient.prototype,"send",async()=>{throw Error("provider failure");});
  await assert.rejects(()=>otp.handle(event("otp/send",{id:"sim-1"})),/could not be sent/);
  assert.ok(calls.some(x=>x.input.UpdateExpression?.includes("REMOVE otpHash")&&x.input.ExpressionAttributeValues[":failed"]==="FAILED"));
});
test("OTP ownership, expiry and attempt limit are enforced",async t=>{
  for(const item of [{...record(),ownerId:"other"},{...record(),otpExpiresAt:0},{...record(),otpAttempts:5}]){
    const mock=t.mock.method(c.db,"send",async()=>({Item:item}));
    await assert.rejects(()=>otp.handle(event("otp/verify",{id:"sim-1",code:"123456"})));
    mock.mock.restore();
  }
});
test("wrong code consumes an attempt without confirming; correct code is single-use",async t=>{
  const calls=setup(t);
  await assert.rejects(()=>otp.handle(event("otp/verify",{id:"sim-1",code:"654321"})),/Incorrect/);
  assert.equal(calls.at(-1).input.UpdateExpression,"SET otpAttempts=otpAttempts+:one");
  const result=await otp.handle(event("otp/verify",{id:"sim-1",code:"123456"}));
  assert.equal(result.verifiedLiters,0);assert.equal(result.simulatedDelivery,true);
  assert.match(calls.at(-1).input.UpdateExpression,/REMOVE otpHash/);assert.match(calls.at(-1).input.ConditionExpression,/otpAttempts<:max/);
});
test("already confirmed simulation is idempotent and makes no inventory update",async t=>{
  const calls=setup(t,{...record(),status:"CONFIRMED",otpHash:undefined});
  assert.equal((await otp.handle(event("otp/verify",{id:"sim-1",code:"123456"}))).alreadyConfirmed,true);
  assert.equal(calls.length,1);
});
