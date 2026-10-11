// Read-only public-board load probe. This does not simulate authenticated workflows.
import { writeFileSync, mkdirSync } from "node:fs";
import { config } from "./aws-config.mjs";
const users = Number(process.argv[2] || 1000);
if (!Number.isInteger(users) || users < 1 || users > 1000) throw new Error("Choose 1–1000 simulated sessions");
const url = new URL("/api/v1/public", config.VITE_API_BASE_URL);
const samples = [], statuses = {};
let failures = 0, stopped = false;
const start = performance.now();
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
console.log(`Read-only probe: ${users} sessions, two polls 30 seconds apart, staggered over 30 seconds. Target: ${url.origin}`);
const progress = setInterval(()=>console.log(`Completed ${samples.length}; failed ${failures}`),10000);
await Promise.all(Array.from({length:users},async(_,index)=>{
  await pause(index * 30000 / users);
  for(let poll=0;poll<2 && !stopped;poll++){
    const before=performance.now();
    let status="network";
    try {
      const response=await fetch(url,{signal:AbortSignal.timeout(15000)});
      status=String(response.status);
      const data=await response.json();
      if(!response.ok || !Array.isArray(data.wards) || !Array.isArray(data.deliveries)) failures++;
    } catch { failures++; }
    statuses[status]=(statuses[status]||0)+1;
    samples.push(performance.now()-before);
    if(samples.length>=100 && failures/samples.length > .2) stopped=true;
    if(!poll) await pause(Math.max(0,30000-(performance.now()-before)));
  }
}));
clearInterval(progress);
samples.sort((a,b)=>a-b);
const percentile=p=>Math.round(samples[Math.min(samples.length-1,Math.ceil(samples.length*p)-1)] || 0);
const report={timestamp:new Date().toISOString(),scope:"Public GET only, existing small dataset; not authenticated or physical delivery capacity",users,requests:samples.length,failures,statuses,aborted:stopped,durationSeconds:Math.round((performance.now()-start)/1000),p50ms:percentile(.5),p95ms:percentile(.95),p99ms:percentile(.99)};
mkdirSync(".runtime",{recursive:true});writeFileSync(".runtime/public-load.json",JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
if(stopped || failures>samples.length*.01) process.exitCode=1;
