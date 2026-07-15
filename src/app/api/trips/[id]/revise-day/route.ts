import { persistedRevisionSchema } from "@/schemas/beta";
import { reviseDay } from "@/server/ai/day-revision";
import { ensureVisitor, hasBetaAccess } from "@/server/auth/visitor";
import { serverConfig } from "@/server/config";
import { assertDailyLimit, createRevisionJob, finishRevisionJob, getTrip, replaceDayAndBudget, saveRevision } from "@/server/database/trips";
import { apiError, HttpError, readJsonBody } from "@/server/http";

export const runtime = "nodejs";
export const maxDuration = 120;

function adjacent(day: NonNullable<Awaited<ReturnType<typeof getTrip>>["plan"]>["days"][number] | undefined) {
  if (!day) return null;
  const first = day.activities[0]; const last = day.activities[day.activities.length - 1];
  return { dayNumber: day.dayNumber, date: day.date, title: day.title, lastActivityEndTime: last?.endTime ?? null, lastActivityArea: last?.area ?? null, firstActivityStartTime: first?.startTime ?? null, firstActivityArea: first?.area ?? null };
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const startedAt = performance.now(); let jobId: string | null = null;
  try {
    if (!serverConfig.aiEnabled) throw new HttpError(503, "AI调整服务暂时关闭，请稍后再来", "AI_DISABLED");
    if (!await hasBetaAccess(serverConfig.betaAccessCode)) throw new HttpError(403, "Beta测试访问尚未验证", "BETA_ACCESS_REQUIRED");
    const body = persistedRevisionSchema.safeParse(await readJsonBody(request));
    if (!body.success) throw new HttpError(400, body.error.issues[0]?.message || "修改请求无效", "INVALID_REVISION");
    const { id } = await params; const visitor = await ensureVisitor(); const trip = await getTrip(id);
    if (trip.visitorId !== visitor.visitorId) throw new HttpError(403, "分享访客只能查看，不能修改这份攻略", "EDIT_FORBIDDEN");
    if (!trip.plan || trip.status !== "completed") throw new HttpError(409, "攻略尚未生成完成", "TRIP_NOT_READY");
    if (trip.version !== body.data.version) throw new HttpError(409, "攻略已在其他窗口更新，请刷新后重试", "VERSION_CONFLICT");
    await assertDailyLimit(visitor.visitorId, "day_revision", serverConfig.dayRevisionDailyLimit);
    const index = trip.plan.days.findIndex((day) => day.dayNumber === body.data.targetDayNumber);
    const currentDay = trip.plan.days[index];
    if (!currentDay) throw new HttpError(400, "目标日期不存在", "DAY_NOT_FOUND");
    const selectedIds = body.data.selectedActivityIds;
    if (body.data.mode === "selected_activities") {
      if (!selectedIds.length) throw new HttpError(400, "请至少选择一个需要修改的活动", "INVALID_REVISION");
      if (new Set(selectedIds).size !== selectedIds.length) throw new HttpError(400, "选择的活动不能重复", "INVALID_REVISION");
      const validIds = new Set(currentDay.activities.map((activity) => activity.id));
      if (selectedIds.some((activityId) => !validIds.has(activityId))) throw new HttpError(400, "选择的活动不属于这一天", "INVALID_REVISION");
    }
    jobId = await createRevisionJob(visitor.visitorId, id);
    const aiRequest = { schemaVersion: "0.2" as const, originalInput: trip.input, strategy: trip.plan.strategy, budget: trip.plan.budget, targetDayNumber: currentDay.dayNumber, currentDay, previousDay: adjacent(trip.plan.days[index - 1]), nextDay: adjacent(trip.plan.days[index + 1]), otherDaysCostTotal: trip.input.budget.mode === "custom" ? trip.plan.days.reduce((sum, day) => day.dayNumber === currentDay.dayNumber ? sum : sum + (day.estimatedCost ?? 0), 0) : null, instruction: body.data.instruction, mode: body.data.mode, selectedActivityIds: selectedIds };
    const result = await reviseDay(aiRequest);
    const updatedPlan = replaceDayAndBudget(trip.plan, result.updatedDay);
    await saveRevision({ tripId: id, visitorId: visitor.visitorId, expectedVersion: body.data.version, instruction: body.data.instruction, previousDay: currentDay, updatedDay: result.updatedDay, summary: result.changeSummary, updatedPlan, jobId, durationMs: Math.round(performance.now() - startedAt) });
    const originalIds=new Set(currentDay.activities.map((activity)=>activity.id));
    const modifiedActivityIds=body.data.mode==="selected_activities"?result.updatedDay.activities.filter((activity)=>selectedIds.includes(activity.id)||!originalIds.has(activity.id)).map((activity)=>activity.id):result.updatedDay.activities.map((activity)=>activity.id);
    return Response.json({ plan: updatedPlan, version: body.data.version + 1, changeSummary: result.changeSummary, modifiedActivityIds });
  } catch (error) {
    if (jobId) await finishRevisionJob(jobId, error instanceof HttpError ? error.code : "DAY_REVISION_FAILED", Math.round(performance.now() - startedAt)).catch(() => undefined);
    return apiError(error);
  }
}
