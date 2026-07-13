import { tripInputSchema } from "@/schemas/trip";
import { generateTripPlan } from "@/server/ai/client";
import { ensureVisitor, hasBetaAccess } from "@/server/auth/visitor";
import { serverConfig } from "@/server/config";
import { apiError, HttpError, readJsonBody } from "@/server/http";
import { assertDailyLimit, completeTrip, createTripAndJob, failJob } from "@/server/database/trips";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  const startedAt = performance.now();
  let created: { tripId: string; jobId: string } | null = null;
  try {
    if (!serverConfig.aiEnabled) throw new HttpError(503, "AI生成服务暂时关闭，请稍后再来", "AI_DISABLED");
    if (!await hasBetaAccess(serverConfig.betaAccessCode)) throw new HttpError(403, "请输入有效的Beta测试访问码", "BETA_ACCESS_REQUIRED");
    const processingStartedAt = performance.now();
    const input = tripInputSchema.safeParse(await readJsonBody(request));
    if (!input.success) throw new HttpError(400, input.error.issues[0]?.message || "旅行需求格式无效", "INVALID_TRIP_INPUT");
    const { visitorId } = await ensureVisitor();
    await assertDailyLimit(visitorId, "full_generation", serverConfig.fullGenerationDailyLimit);
    created = await createTripAndJob(visitorId, input.data);
    const plan = await generateTripPlan(input.data, Math.round(performance.now() - processingStartedAt));
    const persistedPlan = { ...plan, tripId: created.tripId, status: "completed" as const, updatedAt: new Date().toISOString() };
    await completeTrip(created.tripId, created.jobId, persistedPlan, Math.round(performance.now() - startedAt));
    return Response.json({ tripId: created.tripId }, { status: 201 });
  } catch (error) {
    if (created) await failJob(created.tripId, created.jobId, error instanceof HttpError ? error.code : "AI_GENERATION_FAILED", Math.round(performance.now() - startedAt)).catch(() => undefined);
    return apiError(error);
  }
}
