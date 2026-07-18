import { createHash } from "node:crypto";
import { and, count, eq, gte, sql } from "drizzle-orm";
import { analyticsEvents, generationJobs, trips } from "@/server/database/schema";
import { ensureAnalyticsTable, recordAnalyticsEvent } from "@/server/database/analytics";
import { getDatabase } from "@/server/database/client";
import { startOfShanghaiDay } from "@/server/database/trips";
import { serverConfig } from "@/server/config";
import { HttpError } from "@/server/http";
import type { AiUsage } from "./client";

export type AiRequestType = "full_generation" | "day_revision" | "partial_revision" | "quality_repair";

function riskHash(request: Request) {
  const raw = (request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown").split(",")[0]!.trim();
  const salt = process.env.RATE_LIMIT_SALT || process.env.OPENAI_API_KEY || "local-risk-salt";
  return createHash("sha256").update(`${salt}:${raw}`).digest("hex").slice(0, 24);
}

function assertRequestRiskAllowed(request: Request, hash: string) {
  const blocked = new Set((process.env.AI_BLOCKED_RISK_HASHES || "").split(",").map((value) => value.trim()).filter(Boolean));
  if (blocked.has(hash)) throw new HttpError(403, "当前请求暂时无法处理", "RATE_LIMITED");
  const userAgent = request.headers.get("user-agent")?.trim() || "";
  const blockAutomation = process.env.AI_BLOCK_SUSPICIOUS_USER_AGENTS !== "false" && process.env.NODE_ENV === "production";
  if (blockAutomation && (!userAgent || /(?:curl|wget|python-requests|httpclient|scrapy|libwww-perl)/i.test(userAgent))) {
    throw new HttpError(403, "请使用浏览器完成旅行规划", "RATE_LIMITED");
  }
}

export function hashIdempotency(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 32);
}

export async function assertAiRequestAllowed(request: Request, visitorId: string, requestType: AiRequestType) {
  await ensureAnalyticsTable();
  const db = getDatabase();
  const sinceHour = new Date(Date.now() - 60 * 60 * 1000);
  const hash = riskHash(request);
  assertRequestRiskAllowed(request, hash);
  const [recent] = await db.select({ value: count() }).from(analyticsEvents)
    .where(and(
      eq(analyticsEvents.eventName, "ai_request_started"),
      gte(analyticsEvents.createdAt, sinceHour),
      sql`${analyticsEvents.metadata}->>'riskHash' = ${hash}`,
    ));
  if (recent.value >= serverConfig.ipHourlyLimit){
    await recordAnalyticsEvent({visitorId,eventName:"ai_rate_limited",status:"blocked",metadata:{requestType}}).catch(()=>undefined);
    throw new HttpError(429, "请求有点频繁，请稍后再试。", "RATE_LIMITED");
  }
  const [running] = await db.select({ value: count() }).from(generationJobs).where(and(eq(generationJobs.status, "running"),gte(generationJobs.createdAt,new Date(Date.now()-10*60*1000))));
  if (running.value >= serverConfig.globalConcurrentLimit)
    throw new HttpError(503, "现在体验的人有点多，请稍后再试。", "GLOBAL_CONCURRENCY_LIMIT");
  const [cost] = await db.select({ value: sql<number>`coalesce(sum((metadata->>'estimatedCostUsd')::numeric), 0)` })
    .from(analyticsEvents).where(and(eq(analyticsEvents.eventName, "ai_usage"), gte(analyticsEvents.createdAt, startOfShanghaiDay())));
  if (Number(cost.value) >= serverConfig.dailyAiHardBudgetUsd){
    await recordAnalyticsEvent({visitorId,eventName:"ai_budget_blocked",status:"blocked",metadata:{requestType}}).catch(()=>undefined);
    throw new HttpError(503, "今天的免费生成名额暂时用完了，明天再来看看。", "DAILY_AI_BUDGET_EXCEEDED");
  }
  await recordAnalyticsEvent({ visitorId, eventName: "ai_request_started", metadata: { riskHash: hash, requestType } });
  return { softBudgetReached: Number(cost.value) >= serverConfig.dailyAiSoftBudgetUsd };
}

export async function assertRevisionModeLimit(visitorId: string, mode: "full_day" | "selected_activities") {
  await ensureAnalyticsTable();
  const eventName = mode === "full_day" ? "day_revision_completed" : "partial_revision_completed";
  const limit = mode === "full_day" ? serverConfig.dayRevisionDailyLimit : serverConfig.partialRevisionDailyLimit;
  const [row] = await getDatabase().select({ value: count() }).from(analyticsEvents)
    .where(and(eq(analyticsEvents.visitorId, visitorId), eq(analyticsEvents.eventName, eventName), gte(analyticsEvents.createdAt, startOfShanghaiDay())));
  if (row.value >= limit) throw new HttpError(429, mode === "full_day"
    ? "今天的2次整天调整已经用完了，可以尝试只调整其中几个活动。"
    : "今天的局部调整次数已经用完了，明天还可以继续修改。", "DAILY_LIMIT_REACHED");
}

export async function recordAiUsage(visitorId: string, tripId: string | null, generationJobId:string, usage: AiUsage, success = true) {
  await recordAnalyticsEvent({ visitorId, tripId, eventName: "ai_usage", status: success ? "completed" : "failed", durationMs: usage.durationMs, metadata: {
    requestType: usage.requestType, model: usage.model, inputTokens: usage.inputTokens, outputTokens: usage.outputTokens,
    cachedInputTokens: usage.cachedInputTokens, reasoningTokens: usage.reasoningTokens, estimatedCostUsd: Number(usage.estimatedCostUsd.toFixed(6)),
    repairAttempt: usage.repairAttempt, generationJobId, actualCostUsd:null,
  }}).catch(() => undefined);
}

export async function findIdempotentTrip(visitorId: string, keyHash: string) {
  await ensureAnalyticsTable();
  const rows = await getDatabase().select({ tripId: analyticsEvents.tripId, metadata: analyticsEvents.metadata }).from(analyticsEvents).innerJoin(trips,eq(analyticsEvents.tripId,trips.id))
    .where(and(eq(analyticsEvents.visitorId, visitorId), eq(analyticsEvents.eventName, "generation_idempotency"), gte(analyticsEvents.createdAt, new Date(Date.now()-24*60*60*1000)),sql`${trips.status} in ('generating','completed')`)).limit(100);
  return rows.find((row) => row.metadata.keyHash === keyHash)?.tripId || null;
}

export async function recordIdempotency(visitorId: string, tripId: string, keyHash: string) {
  await recordAnalyticsEvent({ visitorId, tripId, eventName: "generation_idempotency", metadata: { keyHash } });
}
