const {test}=require("node:test"), assert=require("node:assert/strict");
const p=require("../shared/priority");
const series=()=>({time:Array.from({length:30},(_,i)=>new Date(Date.UTC(2026,8,i+1)).toISOString().slice(0,10)),precipitation_sum:Array(30).fill(0),temperature_2m_mean:Array(30).fill(35)});
test("dry spell counts backwards from yesterday and stops at rainfall threshold",()=>{const d=series();d.precipitation_sum[25]=1;const s=p.summarize(d,"2026-09-30");assert.equal(s.dryDays,4);assert.equal(s.averageTemperatureC,35);assert.equal(s.drySpellCapped,false);});
test("missing, nonfinite, stale, short and discontinuous weather cannot become a priority",()=>{
 for(const change of [d=>d.temperature_2m_mean[5]=null,d=>d.precipitation_sum[4]=NaN,d=>d.time.pop(),d=>d.time[10]=d.time[9]]){const d=series();change(d);assert.throws(()=>p.summarize(d,"2026-09-30"));}
 assert.throws(()=>p.summarize(series(),"2026-10-01"));
});
test("priority responds independently to heat, dryness, infants, elders and water outage",()=>{
 const n={daysWithoutWater:0,infants:0,elders:0},w={dryDays:0,averageTemperatureC:25};assert.equal(p.score(n,w).score,0);
 for(const key of Object.keys(n))assert.ok(p.score({...n,[key]:1},w).score>0);
 assert.equal(p.score(n,{...w,dryDays:30}).score,20);assert.equal(p.score(n,{...w,averageTemperatureC:40}).score,15);
 assert.equal(p.score({daysWithoutWater:60,infants:100,elders:100},{dryDays:30,averageTemperatureC:50}).score,100);
});
test("unknown, negative and fractional vulnerability counts are rejected",()=>{for(const infants of [undefined,null,-1,0.5,"0"])assert.throws(()=>p.counts({daysWithoutWater:1,elders:0,infants}));});
test("full dry window is labelled as a capped lower bound",()=>{assert.equal(p.summarize(series(),"2026-09-30").drySpellCapped,true);});
