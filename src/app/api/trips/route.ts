import { tripInputSchema } from "@/schemas/trip";
import { generateTripPlan } from "@/server/ai/client";
import { ensureVisitor, hasBetaAccess } from "@/server/auth/visitor";
import { serverConfig } from "@/server/config";
import { apiError, HttpError, readJsonBody } from "@/server/http";
import { assertDailyLimit, completeTrip, createTripAndJob, failJob } from "@/server/database/trips";
import { assertAiRequestAllowed, findIdempotentTrip, hashIdempotency, recordAiUsage, recordIdempotency } from "@/server/ai/guard";
import { recordAnalyticsEvent } from "@/server/database/analytics";

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
  let created: { tripId: string; jobId: string } | null = null;
  try {
    if (!serverConfig.aiEnabled) throw new HttpError(503, "AI生成服务暂时关闭，请稍后再来", "AI_DISABLED");
    if (!await hasBetaAccess(serverConfig.betaAccessCode)) throw new HttpError(403, "请输入有效的Beta测试访问码", "BETA_ACCESS_REQUIRED");
    const processingStartedAt = performance.now();
    const input = tripInputSchema.safeParse(await readJsonBody(request));
    if (!input.success) throw new HttpError(400, "旅行需求格式无效，请检查填写内容", "INVALID_TRIP_INPUT");
    const { visitorId } = await databaseStage(() => ensureVisitor());
    const idempotencyKey=request.headers.get("idempotency-key")?.trim();
    if(!idempotencyKey||idempotencyKey.length<16||idempotencyKey.length>100) throw new HttpError(400,"请刷新页面后重新提交","INVALID_IDEMPOTENCY_KEY");
    const keyHash=hashIdempotency(idempotencyKey); const existing=await databaseStage(()=>findIdempotentTrip(visitorId,keyHash));
    if(existing){await recordAnalyticsEvent({visitorId,tripId:existing,eventName:"idempotent_reused",status:"blocked",metadata:{}}).catch(()=>undefined);return Response.json({tripId:existing,reused:true},{status:200});}
    await databaseStage(() => assertDailyLimit(visitorId, "full_generation", serverConfig.fullGenerationDailyLimit));
    const guard=await databaseStage(()=>assertAiRequestAllowed(request,visitorId,"full_generation"));
    created = await databaseStage(() => createTripAndJob(visitorId, input.data));
    await databaseStage(()=>recordIdempotency(visitorId,created!.tripId,keyHash));
    const plan = await generateTripPlan(input.data, Math.round(performance.now() - processingStartedAt),usage=>recordAiUsage(visitorId,created!.tripId,created!.jobId,usage),!guard.softBudgetReached);
    const persistedPlan = { ...plan, tripId: created.tripId, status: "completed" as const, updatedAt: new Date().toISOString() };
    await databaseStage(() => completeTrip(created!.tripId, created!.jobId, persistedPlan, Math.round(performance.now() - startedAt)));
    return Response.json({ tripId: created.tripId }, { status: 201 });
  } catch (error) {
    if (created) await failJob(created.tripId, created.jobId, error instanceof HttpError ? error.code : "UNKNOWN_ERROR", Math.round(performance.now() - startedAt)).catch(() => undefined);
    return apiError(error);
  }
}
