import {after} from "next/server";
import {and,eq} from "drizzle-orm";
import {z} from "zod";
import {generateTripPlan} from "@/server/ai/client";
import {assertAiRequestAllowed,recordAiUsage} from "@/server/ai/guard";
import {resolveGenerationAccess} from "@/server/auth/generation-access";
import {currentMiniappUser,readMiniappJson} from "@/server/auth/miniapp";
import {serverConfig} from "@/server/config";
import {getDatabase} from "@/server/database/client";
import {generationJobs,trips} from "@/server/database/schema";
import {assertDailyLimit,completeFullReplan,createFullReplanJob,finishRevisionJob} from "@/server/database/trips";
import {apiError,HttpError} from "@/server/http";
import {miniappVisitor} from "@/server/trips/miniapp-generation";

export const runtime="nodejs";export const maxDuration=120;
const schema=z.object({version:z.number().int().positive()});
export async function POST(request:Request,{params}:{params:Promise<{tripId:string}>}){
  try{
    if(!serverConfig.aiEnabled)throw new HttpError(503,"生成服务暂时关闭","AI_DISABLED");
    const user=await currentMiniappUser(request),body=schema.parse(await readMiniappJson(request)),{tripId}=await params,requestId=request.headers.get("idempotency-key")?.trim();
    if(!requestId||requestId.length<16||requestId.length>128)throw new HttpError(400,"请重新提交","INVALID_IDEMPOTENCY_KEY");
    const[row]=await getDatabase().select().from(trips).where(and(eq(trips.id,tripId),eq(trips.userId,user.id))).limit(1);
    if(!row||!row.currentPlanJson)throw new HttpError(404,"没有找到这份行程","TRIP_NOT_FOUND");
    const visitorId=await miniappVisitor(user.id),access=await resolveGenerationAccess(user.id);
    if(access.enforceDailyFullGenerationLimit)await assertDailyLimit(visitorId,"full_generation",serverConfig.fullGenerationDailyLimit);
    const guard=await assertAiRequestAllowed(request,visitorId,"full_generation");
    const prepared=await createFullReplanJob({tripId,visitorId,expectedVersion:body.version,requestId});
    if(!prepared.reused)after(async()=>{const started=performance.now();try{const generated=await generateTripPlan(row.inputJson,0,usage=>recordAiUsage(visitorId,tripId,prepared.job.id,usage,true,access.mode),!guard.softBudgetReached);const plan={...generated,tripId,status:"completed" as const,updatedAt:new Date().toISOString()};await completeFullReplan({tripId,jobId:prepared.job.id,expectedVersion:body.version,plan,userId:user.id,requestId,durationMs:Math.round(performance.now()-started)});}catch(error){await finishRevisionJob(prepared.job.id,error instanceof HttpError?error.code:"FULL_REPLAN_FAILED",Math.round(performance.now()-started));}});
    const[job]=await getDatabase().select({status:generationJobs.status}).from(generationJobs).where(eq(generationJobs.id,prepared.job.id)).limit(1);
    return Response.json({jobId:prepared.job.id,tripId,status:job?.status??"running",reused:prepared.reused},{status:prepared.reused?200:202,headers:{"cache-control":"no-store"}});
  }catch(error){return apiError(error)}
}
