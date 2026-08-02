import { and, count, desc, eq, gte, inArray, isNull, sql } from "drizzle-orm";
import { getDatabase, withDatabaseTransaction } from "./client";
import { dayRevisions, feedback, generationJobs, trips, tripVersions } from "./schema";
import { dayPlanSchema, tripInputSchema, tripPlanSchema } from "@/schemas/trip";
import type { DayPlan, TripInput, TripPlan } from "@/types/trip";
import { HttpError } from "@/server/http";
import { sanitizeUnrequestedHotels } from "@/server/validation/trip-plan-quality";

export function startOfShanghaiDay(now = new Date()) {
  const shanghai = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  shanghai.setUTCHours(0, 0, 0, 0);
  return new Date(shanghai.getTime() - 8 * 60 * 60 * 1000);
}

export async function assertDailyLimit(visitorId: string, type: "full_generation" | "day_revision", limit: number) {
  const db = getDatabase();
  const jobTypes=type==="full_generation"?["full_generation","full_replan"] as const:["day_revision"] as const;
  const [row] = await db.select({ value: count() }).from(generationJobs).where(and(eq(generationJobs.visitorId, visitorId), inArray(generationJobs.type,[...jobTypes]), eq(generationJobs.status, "completed"), gte(generationJobs.createdAt, startOfShanghaiDay())));
  if (row.value >= limit) throw new HttpError(429, type === "full_generation" ? "今天的2次免费生成已经用完了，明天再来看看。" : "今天的2次整天调整已经用完了，可以尝试只调整其中几个活动。", "DAILY_LIMIT_REACHED");
}

export async function createTripAndJob(visitorId: string, input: TripInput, userId: string | null = null) {
  try {
    return await withDatabaseTransaction(async (tx) => {
      const [trip] = await tx.insert(trips).values({ visitorId, userId, inputJson: input }).returning({ id: trips.id });
      const [job] = await tx.insert(generationJobs).values({ visitorId, tripId: trip.id, type: "full_generation", status: "running" }).returning({ id: generationJobs.id });
      return { tripId: trip.id, jobId: job.id };
    });
  } catch (error) {
    if (String(error).includes("generation_jobs_one_running_full_per_visitor")) throw new HttpError(409, "已有一份攻略正在生成，请稍候", "GENERATION_IN_PROGRESS");
    throw error;
  }
}

export async function completeTrip(tripId: string, jobId: string, plan: TripPlan, durationMs: number) {
  await withDatabaseTransaction(async (tx) => {
    const [trip]=await tx.select({version:trips.version,userId:trips.userId}).from(trips).where(eq(trips.id,tripId)).limit(1);
    if(!trip)throw new HttpError(404,"没有找到这份旅行攻略","TRIP_NOT_FOUND");
    const [version]=await tx.insert(tripVersions).values({tripId,versionNumber:trip.version,changeType:"initial_generation",tripPlanSnapshot:plan,createdByUserId:trip.userId,requestId:`initial:${jobId}`}).onConflictDoNothing({target:[tripVersions.tripId,tripVersions.versionNumber]}).returning({id:tripVersions.id});
    const versionId=version?.id??(await tx.select({id:tripVersions.id}).from(tripVersions).where(and(eq(tripVersions.tripId,tripId),eq(tripVersions.versionNumber,trip.version))).limit(1))[0]?.id;
    await tx.update(trips).set({ status: "completed", currentPlanJson: plan,currentVersionId:versionId, updatedAt: new Date() }).where(eq(trips.id, tripId));
    await tx.update(generationJobs).set({ status: "completed", durationMs, completedAt: new Date() }).where(eq(generationJobs.id, jobId));
  });
}

export async function failJob(tripId: string, jobId: string, code: string, durationMs: number) {
  await withDatabaseTransaction(async (tx) => {
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
  return { ...row, input: input.data, plan: plan?.success ? sanitizeUnrequestedHotels(plan.data, input.data).plan : null };
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

export async function saveRevision(args: { tripId: string; visitorId: string; expectedVersion: number; instruction: string; previousDay: DayPlan; updatedDay: DayPlan; summary: string[]; updatedPlan: TripPlan; jobId: string; durationMs: number; mode?:"full_day"|"selected_activities"; createdByUserId?:string|null; requestId?:string }) {
  await withDatabaseTransaction(async (tx) => {
    const [current]=await tx.select({currentVersionId:trips.currentVersionId,userId:trips.userId}).from(trips).where(and(eq(trips.id,args.tripId),eq(trips.visitorId,args.visitorId),eq(trips.version,args.expectedVersion))).limit(1);
    if(!current)throw new HttpError(409,"攻略已在其他窗口更新，请刷新后重试","VERSION_CONFLICT");
    const requestId=args.requestId??`revision:${args.jobId}`;
    const [newVersion]=await tx.insert(tripVersions).values({tripId:args.tripId,versionNumber:args.expectedVersion+1,parentVersionId:current.currentVersionId,changeType:args.mode==="selected_activities"?"activity_revision":"day_revision",tripPlanSnapshot:args.updatedPlan,changeSummary:args.summary,createdByUserId:args.createdByUserId??current.userId,requestId}).onConflictDoNothing({target:[tripVersions.tripId,tripVersions.requestId]}).returning({id:tripVersions.id});
    if(!newVersion)throw new HttpError(409,"这次修改已经提交，请刷新查看","REQUEST_DUPLICATED");
    const [updated] = await tx.update(trips).set({ currentPlanJson: args.updatedPlan,currentVersionId:newVersion.id, version: sql`${trips.version} + 1`, updatedAt: new Date() }).where(and(eq(trips.id, args.tripId), eq(trips.visitorId, args.visitorId), eq(trips.version, args.expectedVersion))).returning({ version: trips.version });
    if (!updated) throw new HttpError(409, "攻略已在其他窗口更新，请刷新后重试", "VERSION_CONFLICT");
    await tx.insert(dayRevisions).values({ tripId: args.tripId, dayNumber: args.updatedDay.dayNumber, instruction: args.instruction, previousDayJson: args.previousDay, updatedDayJson: args.updatedDay, changeSummaryJson: args.summary, planVersion: updated.version });
    await tx.update(generationJobs).set({ status: "completed", durationMs: args.durationMs, completedAt: new Date() }).where(eq(generationJobs.id, args.jobId));
  });
}

export async function undoLatestRevision(tripId: string, visitorId: string, expectedVersion: number) {
  return withDatabaseTransaction(async (tx) => {
    const [trip] = await tx.select().from(trips).where(and(eq(trips.id, tripId), eq(trips.visitorId, visitorId), eq(trips.version, expectedVersion))).limit(1);
    if (!trip) throw new HttpError(409, "攻略已更新或你没有编辑权限，请刷新后重试", "VERSION_CONFLICT");
    const plan = tripPlanSchema.safeParse(trip.currentPlanJson);
    if (!plan.success) throw new HttpError(409, "当前攻略无法撤销", "UNDO_UNAVAILABLE");
    if(trip.currentVersionId){
      const[current]=await tx.select().from(tripVersions).where(eq(tripVersions.id,trip.currentVersionId)).limit(1);
      if(!current||current.changeType==="initial_generation"||current.changeType==="undo_restore"||!current.parentVersionId)throw new HttpError(409,"没有可撤销的最近修改","UNDO_UNAVAILABLE");
      const[parent]=await tx.select().from(tripVersions).where(eq(tripVersions.id,current.parentVersionId)).limit(1);
      if(!parent)throw new HttpError(409,"历史版本暂时无法读取","UNDO_UNAVAILABLE");
      const restored=tripPlanSchema.parse(parent.tripPlanSnapshot),nextNumber=expectedVersion+1;
      const[newVersion]=await tx.insert(tripVersions).values({tripId,versionNumber:nextNumber,parentVersionId:current.id,changeType:"undo_restore",tripPlanSnapshot:restored,changeSummary:["撤销最近一次修改"],createdByUserId:trip.userId,requestId:`undo:${current.id}:${nextNumber}`}).returning({id:tripVersions.id});
      const[updated]=await tx.update(trips).set({currentPlanJson:restored,currentVersionId:newVersion.id,version:sql`${trips.version} + 1`,updatedAt:new Date()}).where(and(eq(trips.id,tripId),eq(trips.version,expectedVersion))).returning({version:trips.version});
      if(!updated)throw new HttpError(409,"攻略已在其他窗口更新，请刷新后重试","VERSION_CONFLICT");
      return{plan:restored,version:updated.version};
    }
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

export async function createFullReplanJob(args:{tripId:string;visitorId:string;expectedVersion:number;requestId:string}){
  return withDatabaseTransaction(async tx=>{
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${args.tripId}))`);
    const[trip]=await tx.select().from(trips).where(and(eq(trips.id,args.tripId),eq(trips.visitorId,args.visitorId),eq(trips.version,args.expectedVersion))).limit(1);
    if(!trip)throw new HttpError(409,"攻略已更新，请刷新后再试","VERSION_CONFLICT");
    const[existing]=await tx.select().from(generationJobs).where(and(eq(generationJobs.tripId,args.tripId),eq(generationJobs.requestId,args.requestId))).limit(1);
    if(existing)return{job:existing,trip,reused:true};
    const[job]=await tx.insert(generationJobs).values({visitorId:args.visitorId,tripId:args.tripId,type:"full_replan",status:"running",requestId:args.requestId}).returning();
    return{job,trip,reused:false};
  });
}

export async function completeFullReplan(args:{tripId:string;jobId:string;expectedVersion:number;plan:TripPlan;userId:string;requestId:string;durationMs:number}){
  return withDatabaseTransaction(async tx=>{
    const[current]=await tx.select({currentVersionId:trips.currentVersionId}).from(trips).where(and(eq(trips.id,args.tripId),eq(trips.version,args.expectedVersion))).limit(1);
    if(!current)throw new HttpError(409,"攻略已在其他设备更新","VERSION_CONFLICT");
    const[next]=await tx.insert(tripVersions).values({tripId:args.tripId,versionNumber:args.expectedVersion+1,parentVersionId:current.currentVersionId,changeType:"full_replan",tripPlanSnapshot:args.plan,changeSummary:["重新安排整份行程"],createdByUserId:args.userId,requestId:args.requestId}).onConflictDoNothing({target:[tripVersions.tripId,tripVersions.requestId]}).returning({id:tripVersions.id});
    if(!next)return;
    const[updated]=await tx.update(trips).set({currentPlanJson:args.plan,currentVersionId:next.id,version:sql`${trips.version} + 1`,updatedAt:new Date()}).where(and(eq(trips.id,args.tripId),eq(trips.version,args.expectedVersion))).returning({id:trips.id});
    if(!updated)throw new HttpError(409,"攻略已在其他设备更新","VERSION_CONFLICT");
    await tx.update(generationJobs).set({status:"completed",durationMs:args.durationMs,completedAt:new Date()}).where(eq(generationJobs.id,args.jobId));
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
