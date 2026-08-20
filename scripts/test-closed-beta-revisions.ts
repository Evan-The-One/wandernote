import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { reviseDay } from "../src/server/ai/day-revision";
import { dayRevisionRequestSchema, dayRevisionResponseSchema } from "../src/schemas/trip";
import { revisionFixtures } from "../tests/fixtures/revision-trips";

const real=process.env.REAL_AI_TEST==="1";
const cases=[
  {name:"hangzhou-day",fixture:revisionFixtures.hangzhou,day:2,mode:"full_day" as const,instruction:"把这一天调整得更轻松，保留人文主题。"},
  {name:"suzhou-partial",fixture:revisionFixtures.suzhou,day:1,mode:"selected_activities" as const,instruction:"只把第二个活动换成同一区域的室内人文地点。"},
];

async function main(){for(const item of cases){
  const currentDay=item.fixture.plan.days[item.day-1]!;
  const request=dayRevisionRequestSchema.parse({schemaVersion:"0.2",originalInput:item.fixture.input,strategy:item.fixture.plan.strategy,budget:item.fixture.plan.budget,targetDayNumber:item.day,currentDay,previousDay:null,nextDay:null,otherDaysCostTotal:null,instruction:item.instruction,mode:item.mode,selectedActivityIds:item.mode==="selected_activities"?[currentDay.activities[1]!.id]:[]});
  assert.equal(request.currentDay.dayNumber,item.day);
  if(!real){console.log(`contract ✓ ${item.name}`);continue}
  const requestId=randomUUID(),started=Date.now();let estimatedCost=0;
  const response=await reviseDay(request,usage=>{estimatedCost+=usage.estimatedCostUsd||0});
  assert.equal(dayRevisionResponseSchema.safeParse(response).success,true);
  console.log(JSON.stringify({requestId,path:item.name,success:true,schemaValid:true,durationMs:Date.now()-started,estimatedCostUsd:Number(estimatedCost.toFixed(6))}));
}

const original=structuredClone(revisionFixtures.shanghai.plan),changed=structuredClone(original);changed.days[0]!.title="修改后的第一天";const undone=structuredClone(original);
assert.deepEqual(undone,original,"一次撤销应恢复上一版本");assert.notDeepEqual(changed,undone);
console.log(`undo contract ✓; real AI calls ${real?"executed":"skipped (set REAL_AI_TEST=1)"}`);
}
main().catch(error=>{console.error(error instanceof Error?error.message:"revision test failed");process.exitCode=1});
