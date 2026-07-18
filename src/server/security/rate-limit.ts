import { and, count, eq, gte } from "drizzle-orm";
import { analyticsEvents, feedback } from "@/server/database/schema";
import { getDatabase } from "@/server/database/client";
import { HttpError } from "@/server/http";

export async function assertAnalyticsLimit(visitorId: string) {
  const [row] = await getDatabase().select({ value: count() }).from(analyticsEvents).where(and(
    eq(analyticsEvents.visitorId, visitorId),
    gte(analyticsEvents.createdAt, new Date(Date.now() - 60 * 60 * 1000)),
  ));
  if (row.value >= 180) throw new HttpError(429, "请求过于频繁", "RATE_LIMITED");
}

export async function assertFeedbackLimit(visitorId: string) {
  const [row] = await getDatabase().select({ value: count() }).from(feedback).where(and(
    eq(feedback.visitorId, visitorId),
    gte(feedback.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000)),
  ));
  if (row.value >= 30) throw new HttpError(429, "今天提交的反馈较多，请明天再试", "RATE_LIMITED");
}
