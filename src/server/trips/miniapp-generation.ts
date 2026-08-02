import { createHmac } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { generateTripPlan } from "@/server/ai/client";
import { assertAiRequestAllowed, findIdempotentTrip, hashIdempotency, recordAiUsage, recordIdempotency } from "@/server/ai/guard";
import { resolveGenerationAccess } from "@/server/auth/generation-access";
import { getDatabase } from "@/server/database/client";
import { generationJobs, visitors } from "@/server/database/schema";
import { assertDailyLimit, completeTrip, createTripAndJob, failJob } from "@/server/database/trips";
import { serverConfig } from "@/server/config";
import { HttpError } from "@/server/http";
import type { TripInput } from "@/types/trip";

export async function miniappVisitor(userId:string){const secret=process.env.VISITOR_SESSION_SECRET||process.env.AUTH_SECRET;if(!secret)throw new HttpError(503,"身份服务暂不可用","IDENTITY_UNAVAILABLE");const sessionId=`mini:${createHmac("sha256",secret).update(userId).digest("hex")}`;const db=getDatabase();await db.insert(visitors).values({sessionId}).onConflictDoUpdate({target:visitors.sessionId,set:{lastSeenAt:new Date()}});const[row]=await db.select({visitorId:visitors.id}).from(visitors).where(eq(visitors.sessionId,sessionId)).limit(1);return row!.visitorId;}
export async function prepareMiniappGeneration(request:Request,userId:string,input:TripInput,idempotencyKey:string){
  if(!serverConfig.aiEnabled)throw new HttpError(503,"生成服务暂时关闭","AI_DISABLED");
  const visitorId=await miniappVisitor(userId);
  const keyHash=hashIdempotency(idempotencyKey);
  const existingTripId=await findIdempotentTrip(visitorId,keyHash);
  if(existingTripId){
    const [job]=await getDatabase().select({id:generationJobs.id,status:generationJobs.status}).from(generationJobs).where(eq(generationJobs.tripId,existingTripId)).orderBy(desc(generationJobs.createdAt)).limit(1);
    return{tripId:existingTripId,jobId:job?.id??null,reused:true,run:async()=>undefined};
  }
  const access=await resolveGenerationAccess(userId);
  if(access.enforceDailyFullGenerationLimit)await assertDailyLimit(visitorId,"full_generation",serverConfig.fullGenerationDailyLimit);
  const guard=await assertAiRequestAllowed(request,visitorId,"full_generation");
  const created=await createTripAndJob(visitorId,input,userId);
  await recordIdempotency(visitorId,created.tripId,keyHash);
  return{...created,reused:false,run:async()=>{const started=performance.now();try{const plan=await generateTripPlan(input,0,usage=>recordAiUsage(visitorId,created.tripId,created.jobId,usage,true,access.mode),!guard.softBudgetReached);await completeTrip(created.tripId,created.jobId,{...plan,tripId:created.tripId,status:"completed",updatedAt:new Date().toISOString()},Math.round(performance.now()-started));}catch(error){await failJob(created.tripId,created.jobId,error instanceof HttpError?error.code:"UNKNOWN_ERROR",Math.round(performance.now()-started));}}};
}
