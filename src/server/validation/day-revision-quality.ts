import type { DayRevisionRequest, DayRevisionResponse } from "@/types/trip";
import type { TripPlanQualityIssue } from "./trip-plan-quality";

export type DayRevisionQualityResult = { valid: boolean; issues: TripPlanQualityIssue[] };

const mainTypes = new Set(["attraction", "shopping", "entertainment"]);
const fuzzyTerms = ["某类", "相关区域", "同类博物馆", "同类场馆", "一类亲子空间", "一类的室内", "熊猫主题参观", "主题参观", "某个景点", "待定"];
function minutes(value: string) { const [hours, mins] = value.split(":").map(Number); return hours * 60 + mins; }
function add(issues: TripPlanQualityIssue[], code: TripPlanQualityIssue["code"], path: string, message: string, expected?: string | number, actual?: string | number | null) {
  issues.push({ code, path, message, ...(expected !== undefined ? { expected } : {}), ...(actual !== undefined ? { actual } : {}) });
}

export function validateDayRevisionQuality(response: DayRevisionResponse, request: DayRevisionRequest): DayRevisionQualityResult {
  const issues: TripPlanQualityIssue[] = [];
  const day = response.updatedDay;
  const input = request.originalInput;
  if (response.targetDayNumber !== request.targetDayNumber || day.dayNumber !== request.currentDay.dayNumber) add(issues, "DAY_NUMBER", "updatedDay.dayNumber", "修改后dayNumber必须保持不变", request.currentDay.dayNumber, day.dayNumber);
  if (day.date !== request.currentDay.date) add(issues, "DATE_SEQUENCE", "updatedDay.date", "修改后日期必须保持不变", request.currentDay.date ?? "null", day.date);
  if (request.mode === "selected_activities") {
    if (day.title !== request.currentDay.title) add(issues, "DAY_NUMBER", "updatedDay.title", "局部修改必须保留当天标题");
    if (day.theme !== request.currentDay.theme) add(issues, "DAY_NUMBER", "updatedDay.theme", "局部修改必须保留当天主题");
    if (day.intensity !== request.currentDay.intensity) add(issues, "DAY_NUMBER", "updatedDay.intensity", "局部修改必须保留当天强度");
    const selected = new Set(request.selectedActivityIds);
    const updatedById = new Map(day.activities.map((activity) => [activity.id, activity]));
    for (const original of request.currentDay.activities) {
      if (selected.has(original.id)) continue;
      const updated = updatedById.get(original.id);
      if (!updated || JSON.stringify(updated) !== JSON.stringify(original)) add(issues, "DAY_NUMBER", `updatedDay.activities.${original.id}`, "未选择的活动必须逐字段保持不变");
    }
    const originalIds = new Set(request.currentDay.activities.map((activity) => activity.id));
    const newActivities = day.activities.filter((activity) => !originalIds.has(activity.id));
    if (newActivities.length > selected.size) add(issues, "DAY_NUMBER", "updatedDay.activities", "新增活动数量不能超过被选活动数量");
    if (new Set(day.activities.map((activity) => activity.id)).size !== day.activities.length) add(issues, "DAY_NUMBER", "updatedDay.activities", "活动ID不能重复");
  }

  const lowEffort = ["lazy", "family"].includes(input.travelStyle) || input.priorities.includes("less_walking") || /轻松|少走|减少步行|孩子.*累|酒店附近/.test(request.instruction);
  const mainCount = day.activities.filter((activity) => mainTypes.has(activity.type)).length;
  if (["slow", "lazy", "family"].includes(input.travelStyle) && mainCount > 3) add(issues, "MAIN_ACTIVITY_LIMIT", "updatedDay.activities", "当前旅行风格每天最多3个主要活动", 3, mainCount);
  if (lowEffort && mainCount > 3) add(issues, "MAIN_ACTIVITY_LIMIT", "updatedDay.activities", "轻松修改每天最多3个主要活动", 3, mainCount);
  if (lowEffort && day.estimatedWalkingKm > 6) add(issues, "WALKING_LIMIT", "updatedDay.estimatedWalkingKm", "轻松或少走路修改每日步行不得超过6公里", 6, day.estimatedWalkingKm);

  let activityCostTotal = 0;
  for (let index = 0; index < day.activities.length; index++) {
    const activity = day.activities[index];
    const path = `updatedDay.activities.${index}`;
    const duration = minutes(activity.endTime) - minutes(activity.startTime);
    if (duration <= 0 || duration !== activity.durationMinutes) add(issues, "ACTIVITY_DURATION", `${path}.durationMinutes`, "活动时长必须等于起止时间差", duration, activity.durationMinutes);
    if (mainTypes.has(activity.type) && fuzzyTerms.some((term) => activity.name.includes(term))) add(issues, "FUZZY_PLACE", `${path}.name`, "主要活动必须使用明确可搜索地点", "明确地点", activity.name);
    const isLast = index === day.activities.length - 1;
    if (isLast && activity.transportToNext !== null) add(issues, "LAST_TRANSPORT", `${path}.transportToNext`, "最后活动交通必须为null", "null", "非null");
    if (!isLast) {
      const next = day.activities[index + 1];
      const gap = minutes(next.startTime) - minutes(activity.endTime);
      if (gap < 0) add(issues, "TIME_OVERLAP", `${path}.endTime`, "活动不得重叠", 0, gap);
      const travel = activity.transportToNext?.durationMinutes ?? 0;
      if (gap < travel) add(issues, "TRANSPORT_GAP", `${path}.transportToNext.durationMinutes`, "时间轴必须覆盖交通时间", travel, gap);
    }
    if (input.budget.mode === "custom") {
      if (activity.estimatedCost === null) add(issues, "ACTIVITY_COST_MISSING", `${path}.estimatedCost`, "自定义预算时活动费用不能为空");
      else activityCostTotal += activity.estimatedCost;
    } else if (activity.estimatedCost !== null) add(issues, "BUDGET_PRECISION", `${path}.estimatedCost`, "非自定义预算不得新增精确费用", "null", activity.estimatedCost);
  }

  if (input.budget.mode === "custom") {
    if (day.estimatedCost === null) add(issues, "DAY_COST_MISSING", "updatedDay.estimatedCost", "自定义预算时每日费用不能为空");
    else {
      if (day.estimatedCost < activityCostTotal) add(issues, "DAY_COST_UNDERCOUNT", "updatedDay.estimatedCost", "每日费用不得小于活动费用合计", activityCostTotal, day.estimatedCost);
      if ((request.otherDaysCostTotal ?? 0) + day.estimatedCost > (request.budget.estimatedTotal ?? 0)) add(issues, "BUDGET_LIMIT", "updatedDay.estimatedCost", "修改后每日费用合计不得突破原计划估算总额", (request.budget.estimatedTotal ?? 0) - (request.otherDaysCostTotal ?? 0), day.estimatedCost);
      if (request.currentDay.estimatedCost !== null && day.estimatedCost > request.currentDay.estimatedCost) add(issues, "BUDGET_LIMIT", "updatedDay.estimatedCost", "V0.1局部修改不得提高当天预算；高消费需求应在原预算内保守替换", request.currentDay.estimatedCost, day.estimatedCost);
    }
  } else if (day.estimatedCost !== null) add(issues, "BUDGET_PRECISION", "updatedDay.estimatedCost", "非自定义预算不得新增精确每日费用", "null", day.estimatedCost);

  if (request.previousDay && day.date && request.previousDay.date && request.previousDay.dayNumber !== day.dayNumber - 1) add(issues, "DAY_NUMBER", "previousDay", "前一天衔接信息不正确");
  if (request.nextDay && day.date && request.nextDay.date && request.nextDay.dayNumber !== day.dayNumber + 1) add(issues, "DAY_NUMBER", "nextDay", "后一天衔接信息不正确");
  return { valid: issues.length === 0, issues };
}
