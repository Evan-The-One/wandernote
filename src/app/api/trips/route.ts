import { createHash, randomBytes } from "node:crypto";
import { tripInputSchema } from "@/schemas/trip";
import { generateTripPlan } from "@/server/ai/client";
import { ensureVisitor, hasBetaAccess } from "@/server/auth/visitor";
import { serverConfig } from "@/server/config";
import { apiError, HttpError, readJsonBody } from "@/server/http";
import { assertDailyLimit, completeTrip, createTripAndJob, failJob } from "@/server/database/trips";
import { assertAiRequestAllowed, findIdempotentTrip, hashIdempotency, recordAiUsage, recordIdempotency } from "@/server/ai/guard";
import { recordAnalyticsEvent } from "@/server/database/analytics";
import { currentUser } from "@/server/auth/user";

export const runtime = "nodejs";
export const maxDuration = 120;

async function databaseStage<T>(operation: () => Promise<T>) {
  try { return await operation(); }
  catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(500, "攻略暂时无法保存，请稍后重试", "DATABASE_ERROR");
  }
}

export async function POST(request: Request) {
  const startedAt = performance.now();
  const requestId = randomBytes(6).toString("hex");
  let stage = "request_validation";
  let created: { tripId: string; jobId: string } | null = null;
  let principalType: "anonymous" | "user" = "anonymous";
  try {
    if (!serverConfig.aiEnabled) throw new HttpError(503, "AI生成服务暂时关闭，请稍后再来", "AI_DISABLED");
    if (!await hasBetaAccess(serverConfig.betaAccessCode)) throw new HttpError(403, "请输入有效的Beta测试访问码", "BETA_ACCESS_REQUIRED");
    const processingStartedAt = performance.now();
    const input = tripInputSchema.safeParse(await readJsonBody(request));
    if (!input.success) throw new HttpError(400, "旅行需求格式无效，请检查填写内容", "INVALID_TRIP_INPUT");
    stage = "visitor_identity";
    const { visitorId } = await databaseStage(() => ensureVisitor());
    const user = await databaseStage(() => currentUser());
    principalType = user ? "user" : "anonymous";
    const idempotencyKey=request.headers.get("idempotency-key")?.trim();
    if(!idempotencyKey||idempotencyKey.length<16||idempotencyKey.length>100) throw new HttpError(400,"请刷新页面后重新提交","INVALID_IDEMPOTENCY_KEY");
    const keyHash=hashIdempotency(idempotencyKey); const existing=await databaseStage(()=>findIdempotentTrip(visitorId,keyHash));
    if(existing){await recordAnalyticsEvent({visitorId,tripId:existing,eventName:"idempotent_reused",status:"blocked",metadata:{}}).catch(()=>undefined);return Response.json({tripId:existing,reused:true},{status:200});}
    stage = "quota_guard";
    await databaseStage(() => assertDailyLimit(visitorId, "full_generation", serverConfig.fullGenerationDailyLimit));
    const guard=await databaseStage(()=>assertAiRequestAllowed(request,visitorId,"full_generation"));
    stage = "job_creation";
    created = await databaseStage(() => createTripAndJob(visitorId, input.data, user?.id ?? null));
    await databaseStage(()=>recordIdempotency(visitorId,created!.tripId,keyHash));
    console.info("trip_generation_started", JSON.stringify({ requestId, generationJobId:created.jobId, tripId:created.tripId, principalType, principalHash:createHash("sha256").update(user?.id || visitorId).digest("hex").slice(0,12), stage:"model_request" }));
    stage = "model_request";
    const plan = await generateTripPlan(input.data, Math.round(performance.now() - processingStartedAt),usage=>recordAiUsage(visitorId,created!.tripId,created!.jobId,usage),!guard.softBudgetReached);
    const persistedPlan = { ...plan, tripId: created.tripId, status: "completed" as const, updatedAt: new Date().toISOString() };
    stage = "database_persist";
    await databaseStage(() => completeTrip(created!.tripId, created!.jobId, persistedPlan, Math.round(performance.now() - startedAt)));
    console.info("trip_generation_completed", JSON.stringify({ requestId, generationJobId:created.jobId, tripId:created.tripId, principalType, durationMs:Math.round(performance.now()-startedAt) }));
    return Response.json({ tripId: created.tripId, requestId }, { status: 201, headers:{"x-request-id":requestId} });
  } catch (error) {
    const code=error instanceof HttpError ? error.code : "GENERATION_UNKNOWN";
    if (created) await failJob(created.tripId, created.jobId, code, Math.round(performance.now() - startedAt)).catch(() => undefined);
    console.warn("trip_generation_failed",JSON.stringify({requestId,generationJobId:created?.jobId||null,tripId:created?.tripId||null,principalType,stage,errorCode:code,durationMs:Math.round(performance.now()-startedAt)}));
    return apiError(error,{requestId,stage});
  }
}
