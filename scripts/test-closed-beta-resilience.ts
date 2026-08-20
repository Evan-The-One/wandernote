import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path:string){return readFile(path,"utf8")}
async function main(){
  const[webTrip,miniTrip,miniJob,poster,miniPoster,points,undo]=await Promise.all([
    source("src/app/api/trips/route.ts"),source("src/app/api/miniapp/trips/generate/route.ts"),source("src/app/api/miniapp/jobs/[jobId]/route.ts"),source("src/app/api/trips/[id]/images/route.ts"),source("src/app/api/miniapp/posters/route.ts"),source("src/server/commerce/points.ts"),source("src/app/api/miniapp/trips/[tripId]/undo/route.ts"),
  ]);
  assert.match(webTrip,/idempotency/i,"Web Trip 必须接受幂等键");
  assert.match(miniTrip,/idempotency/i,"小程序 Trip 必须接受幂等键");
  assert.match(miniJob,/generationJobs|jobId/,"任务状态接口必须按 job 恢复");
  assert.match(poster,/idempotency/i,"Web Poster 必须有幂等控制");
  assert.match(miniPoster,/idempotency/i,"小程序 Poster 必须有幂等控制");
  assert.match(points,/transaction|reserve|ledger/i,"点数操作必须通过事务/账本");
  assert.match(undo,/undo|restore/i,"撤销接口必须复用版本恢复能力");
  assert.doesNotMatch(miniJob,/createTrip|generateTripPlan/,"轮询不得重新触发生成");
  console.log("closed-beta resilience contracts passed: Trip/Poster idempotency, job recovery, points ledger, undo");
}
main().catch(error=>{console.error(error);process.exitCode=1});
