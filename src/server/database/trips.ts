import { and, count, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { getDatabase } from "./client";
import { dayRevisions, feedback, generationJobs, trips } from "./schema";
import { dayPlanSchema, tripInputSchema, tripPlanSchema } from "@/schemas/trip";
import type { DayPlan, TripInput, TripPlan } from "@/types/trip";
import { HttpError } from "@/server/http";

export function startOfUtcDay() {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

export async function assertDailyLimit(visitorId: string, type: "full_generation" | "day_revision", limit: number) {
  const db = getDatabase();
  const [row] = await db.select({ value: count() }).from(generationJobs).where(and(eq(generationJobs.visitorId, visitorId), eq(generationJobs.type, type), gte(generationJobs.createdAt, startOfUtcDay())));
  if (row.value >= limit) throw new HttpError(429, type === "full_generation" ? "今天的攻略生成次数已用完，请明天再来" : "今天的行程调整次数已用完，请明天再来", "DAILY_LIMIT_REACHED");
}

export async function createTripAndJob(visitorId: string, input: TripInput) {
  const db = getDatabase();
  try {
    return await db.transaction(async (tx) => {
      const [trip] = await tx.insert(trips).values({ visitorId, inputJson: input }).returning({ id: trips.id });
      const [job] = await tx.insert(generationJobs).values({ visitorId, tripId: trip.id, type: "full_generation", status: "running" }).returning({ id: generationJobs.id });
      return { tripId: trip.id, jobId: job.id };
    });
  } catch (error) {
    if (String(error).includes("generation_jobs_one_running_full_per_visitor")) throw new HttpError(409, "已有一份攻略正在生成，请稍候", "GENERATION_IN_PROGRESS");
    throw error;
  }
}

export async function completeTrip(tripId: string, jobId: string, plan: TripPlan, durationMs: number) {
  const db = getDatabase();
  await db.transaction(async (tx) => {
    await tx.update(trips).set({ status: "completed", currentPlanJson: plan, updatedAt: new Date() }).where(eq(trips.id, tripId));
    await tx.update(generationJobs).set({ status: "completed", durationMs, completedAt: new Date() }).where(eq(generationJobs.id, jobId));
  });
}

export async function failJob(tripId: string, jobId: string, code: string, durationMs: number) {
  const db = getDatabase();
  await db.transaction(async (tx) => {
    await tx.update(trips).set({ status: "failed", updatedAt: new Date() }).where(eq(trips.id, tripId));
    await tx.update(generationJobs).set({ status: "failed", durationMs, errorCode: code, completedAt: new Date() }).where(eq(generationJobs.id, jobId));
  });
}

export async function getTrip(id: string) {
  const db = getDatabase();
  const [row] = await db.select().from(trips).where(eq(trips.id, id)).limit(1);
  if (!row) throw new HttpError(404, "没有找到这份旅行攻略", "TRIP_NOT_FOUND");
  const input = tripInputSchema.safeParse(row.inputJson);
  const plan = row.currentPlanJson ? tripPlanSchema.safeParse(row.currentPlanJson) : null;
  if (!input.success || (row.status === "completed" && !plan?.success)) throw new HttpError(500, "攻略数据暂时无法读取", "INVALID_STORED_TRIP");
  return { ...row, input: input.data, plan: plan?.success ? plan.data : null };
}

export async function getRecentTrip(visitorId: string) {
  const db = getDatabase();
  const [row] = await db.select({ id: trips.id }).from(trips).where(and(eq(trips.visitorId, visitorId), eq(trips.status, "completed"))).orderBy(desc(trips.updatedAt)).limit(1);
  return row?.id ?? null;
}

export async function hasUndoRevision(tripId: string) {
  const [row] = await getDatabase().select({ id: dayRevisions.id }).from(dayRevisions).where(and(eq(dayRevisions.tripId, tripId), isNull(dayRevisions.undoneAt))).orderBy(desc(dayRevisions.createdAt)).limit(1);
  return Boolean(row);
}

export function replaceDayAndBudget(plan: TripPlan, updatedDay: DayPlan) {
  const oldDay = plan.days.find((day) => day.dayNumber === updatedDay.dayNumber);
  if (!oldDay) throw new HttpError(400, "目标日期不存在", "DAY_NOT_FOUND");
  const updatedDailyTotal = plan.budget.dailyCostTotal !== null && oldDay.estimatedCost !== null && updatedDay.estimatedCost !== null
    ? plan.budget.dailyCostTotal - oldDay.estimatedCost + updatedDay.estimatedCost : plan.budget.dailyCostTotal;
  const budget = plan.budget.mode === "custom" && plan.budget.estimatedTotal !== null && updatedDailyTotal !== null
    ? { ...plan.budget, dailyCostTotal: updatedDailyTotal, unallocatedCost: Math.max(0, plan.budget.estimatedTotal - updatedDailyTotal), unallocatedExplanation: plan.budget.estimatedTotal > updatedDailyTotal ? "剩余预算用于住宿、交通或临时支出。" : null }
    : plan.budget;
  return tripPlanSchema.parse({ ...plan, days: plan.days.map((day) => day.dayNumber === updatedDay.dayNumber ? updatedDay : day), budget, updatedAt: new Date().toISOString() });
}

export async function saveRevision(args: { tripId: string; visitorId: string; expectedVersion: number; instruction: string; previousDay: DayPlan; updatedDay: DayPlan; summary: string[]; updatedPlan: TripPlan; jobId: string; durationMs: number }) {
  const db = getDatabase();
  await db.transaction(async (tx) => {
    const [updated] = await tx.update(trips).set({ currentPlanJson: args.updatedPlan, version: sql`${trips.version} + 1`, updatedAt: new Date() }).where(and(eq(trips.id, args.tripId), eq(trips.visitorId, args.visitorId), eq(trips.version, args.expectedVersion))).returning({ version: trips.version });
    if (!updated) throw new HttpError(409, "攻略已在其他窗口更新，请刷新后重试", "VERSION_CONFLICT");
    await tx.insert(dayRevisions).values({ tripId: args.tripId, dayNumber: args.updatedDay.dayNumber, instruction: args.instruction, previousDayJson: args.previousDay, updatedDayJson: args.updatedDay, changeSummaryJson: args.summary, planVersion: updated.version });
    await tx.update(generationJobs).set({ status: "completed", durationMs: args.durationMs, completedAt: new Date() }).where(eq(generationJobs.id, args.jobId));
  });
}

export async function undoLatestRevision(tripId: string, visitorId: string, expectedVersion: number) {
  const db = getDatabase();
  return db.transaction(async (tx) => {
    const [trip] = await tx.select().from(trips).where(and(eq(trips.id, tripId), eq(trips.visitorId, visitorId), eq(trips.version, expectedVersion))).limit(1);
    if (!trip) throw new HttpError(409, "攻略已更新或你没有编辑权限，请刷新后重试", "VERSION_CONFLICT");
    const plan = tripPlanSchema.safeParse(trip.currentPlanJson);
    if (!plan.success) throw new HttpError(409, "当前攻略无法撤销", "UNDO_UNAVAILABLE");
    const [revision] = await tx.select().from(dayRevisions).where(and(eq(dayRevisions.tripId, tripId), isNull(dayRevisions.undoneAt))).orderBy(desc(dayRevisions.createdAt)).limit(1);
    if (!revision) throw new HttpError(409, "没有可撤销的最近修改", "UNDO_UNAVAILABLE");
    const previousDay = dayPlanSchema.parse(revision.previousDayJson);
    const restored = replaceDayAndBudget(plan.data, previousDay);
    const [updated] = await tx.update(trips).set({ currentPlanJson: restored, version: sql`${trips.version} + 1`, updatedAt: new Date() }).where(and(eq(trips.id, tripId), eq(trips.version, expectedVersion))).returning({ version: trips.version });
    if (!updated) throw new HttpError(409, "攻略已在其他窗口更新，请刷新后重试", "VERSION_CONFLICT");
    await tx.update(dayRevisions).set({ undoneAt: new Date() }).where(eq(dayRevisions.id, revision.id));
    return { plan: restored, version: updated.version };
  });
}

export async function createRevisionJob(visitorId: string, tripId: string) {
  const db = getDatabase();
  const [job] = await db.insert(generationJobs).values({ visitorId, tripId, type: "day_revision", status: "running" }).returning({ id: generationJobs.id });
  return job.id;
}

export async function finishRevisionJob(jobId: string, code: string, durationMs: number) {
  await getDatabase().update(generationJobs).set({ status: "failed", errorCode: code, durationMs, completedAt: new Date() }).where(eq(generationJobs.id, jobId));
}

export async function saveFeedback(tripId: string, visitorId: string, rating: "helpful" | "usable" | "not_helpful", issueTags: string[], comment: string | null) {
  await getDatabase().insert(feedback).values({ tripId, visitorId, rating, issueTagsJson: issueTags, comment });
}
