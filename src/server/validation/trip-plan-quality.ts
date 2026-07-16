import type { Activity, TripInput, TripPlan } from "@/types/trip";

export type TripPlanQualityCode =
  | "DAY_COUNT" | "DAY_NUMBER" | "DATE_MISSING" | "DATE_UNEXPECTED" | "DATE_SEQUENCE"
  | "ACTIVITY_DURATION" | "TIME_OVERLAP" | "TRANSPORT_GAP" | "LAST_TRANSPORT"
  | "DAY_COST_MISSING" | "ACTIVITY_COST_MISSING" | "DAY_COST_UNDERCOUNT" | "BUDGET_MODE"
  | "BUDGET_PRECISION" | "BUDGET_LIMIT" | "BUDGET_RECONCILIATION" | "BUDGET_EXPLANATION"
  | "FUZZY_PLACE" | "MAIN_ACTIVITY_LIMIT" | "MAIN_ACTIVITY_MINIMUM" | "WALKING_LIMIT" | "DEPARTURE_TIME"
  | "DUPLICATE_ACTIVITY" | "REPEATED_LOCATION" | "TOO_MANY_CITIES" | "UNREALISTIC_TRANSFER" | "PROVINCE_TRIP_NOT_EXPANDED" | "TRANSFER_DAY_MISCLASSIFIED" | "STYLE_CONSTRAINT_CONFLICT" | "COMPANION_CONSTRAINT_CONFLICT";

export type TripPlanQualityIssue = {
  code: TripPlanQualityCode;
  path: string;
  message: string;
  expected?: string | number;
  actual?: string | number | null;
  severity?: "repairable" | "warning" | "fatal";
  stage?: "schema" | "schedule" | "route" | "budget" | "preference";
};

export type TripPlanQualityResult = { valid: boolean; issues: TripPlanQualityIssue[] };

const mainActivityTypes = new Set<Activity["type"]>(["attraction", "shopping", "entertainment"]);
const fuzzyPlaceTerms = ["某类", "相关区域", "同类博物馆", "同类场馆", "一类亲子空间", "一类的室内", "熊猫主题参观", "主题参观", "某个景点", "待定"];

function minutes(value: string) {
  const [hours, mins] = value.split(":").map(Number);
  return hours * 60 + mins;
}

function addDays(date: string, offset: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + offset);
  return value.toISOString().slice(0, 10);
}

function timeFromMinutes(total: number) {
  const bounded = Math.max(0, Math.min(total, 23 * 60 + 59));
  return `${String(Math.floor(bounded / 60)).padStart(2, "0")}:${String(bounded % 60).padStart(2, "0")}`;
}

/** Corrects arithmetic fields deterministically; semantic quality rules remain unchanged. */
export function normalizeTripPlanForQuality(plan: TripPlan, input: TripInput): TripPlan {
  const days = plan.days.map((day, dayIndex) => {
    let previousEnd = -1;
    const activities = day.activities.map((activity, activityIndex) => {
      const declaredDuration = Math.max(1, activity.durationMinutes);
      let start = minutes(activity.startTime);
      if (activityIndex > 0) {
        const previousTransport = day.activities[activityIndex - 1]?.transportToNext?.durationMinutes ?? 0;
        start = Math.max(start, previousEnd + previousTransport);
      }
      const originalDuration = minutes(activity.endTime) - minutes(activity.startTime);
      const duration = originalDuration > 0 ? originalDuration : declaredDuration;
      const end = start + duration;
      previousEnd = end;
      return {
        ...activity,
        startTime: timeFromMinutes(start),
        endTime: timeFromMinutes(end),
        durationMinutes: duration,
        estimatedCost: input.budget.mode === "custom" ? activity.estimatedCost : null,
        transportToNext: activityIndex === day.activities.length - 1 ? null : activity.transportToNext,
      };
    });
    return {
      ...day,
      dayNumber: dayIndex + 1,
      date: input.datePreference.type === "exact" ? addDays(input.datePreference.startDate!, dayIndex) : null,
      estimatedCost: input.budget.mode === "custom" ? day.estimatedCost : null,
      activities,
    };
  });
  const budget = input.budget.mode === "custom" ? plan.budget : {
    ...plan.budget,
    mode: input.budget.mode,
    estimateType: plan.budget.estimateType === "range" && plan.budget.estimatedRange ? "range" as const : "none" as const,
    userBudgetAmount: null,
    userBudgetScope: null,
    includesAccommodation: null,
    includesIntercityTransport: null,
    estimatedTotal: null,
    estimatedRange: plan.budget.estimateType === "range" ? plan.budget.estimatedRange : null,
    dailyCostTotal: null,
    unallocatedCost: null,
    unallocatedExplanation: null,
  };
  return { ...plan, days, budget };
}

function issue(code: TripPlanQualityCode, path: string, message: string, expected?: string | number, actual?: string | number | null): TripPlanQualityIssue {
  const warningCodes: TripPlanQualityCode[] = ["MAIN_ACTIVITY_MINIMUM"];
  const repairableCodes: TripPlanQualityCode[] = ["DAY_NUMBER","DATE_MISSING","DATE_UNEXPECTED","DATE_SEQUENCE","ACTIVITY_DURATION","TRANSPORT_GAP","LAST_TRANSPORT","DAY_COST_UNDERCOUNT","BUDGET_RECONCILIATION","BUDGET_EXPLANATION"];
  const severity = warningCodes.includes(code) ? "warning" : repairableCodes.includes(code) ? "repairable" : "fatal";
  const stage = code.includes("BUDGET") || code.includes("COST") ? "budget" : code.includes("TIME") || code.includes("DURATION") || code.includes("TRANSPORT") ? "schedule" : code.includes("PLACE") || code.includes("CITY") || code.includes("LOCATION") || code.includes("TRANSFER") ? "route" : "preference";
  return { code, path, message, severity, stage, ...(expected !== undefined ? { expected } : {}), ...(actual !== undefined ? { actual } : {}) };
}

export function validateTripPlanQuality(plan: TripPlan, input: TripInput): TripPlanQualityResult {
  const issues: TripPlanQualityIssue[] = [];
  const lowEffortRequested = ["lazy", "family"].includes(input.travelStyle)
    || input.priorities.includes("less_walking")
    || /不想太累|少走路|减少步行|轻松一点/.test(input.additionalRequirements ?? "");
  const fastPacedException = ["parents", "with_children", "extended_family", "other"].includes(input.companionType)
    || Boolean(input.preferredDepartureTime && minutes(input.preferredDepartureTime) >= 10 * 60 + 30)
    || /到达|返程|长途|老人|孩子|行动不便|晚出发/.test(input.additionalRequirements ?? "");
  if (plan.days.length !== input.days) issues.push(issue("DAY_COUNT", "days", "攻略天数必须与输入一致", input.days, plan.days.length));

  for (let index = 0; index < plan.days.length; index++) {
    const day = plan.days[index];
    const dayPath = `days.${index}`;
    if (day.dayNumber !== index + 1) issues.push(issue("DAY_NUMBER", `${dayPath}.dayNumber`, "dayNumber必须从1连续递增", index + 1, day.dayNumber));
    if (input.datePreference.type === "exact") {
      const expectedDate = addDays(input.datePreference.startDate!, index);
      if (!day.date) issues.push(issue("DATE_MISSING", `${dayPath}.date`, "已确定日期时每日date不能为空", expectedDate, null));
      else if (day.date !== expectedDate) issues.push(issue("DATE_SEQUENCE", `${dayPath}.date`, "每日日期必须连续", expectedDate, day.date));
    } else if (day.date !== null) issues.push(issue("DATE_UNEXPECTED", `${dayPath}.date`, "未提供具体日期时每日date必须为null", "null", day.date));

    const mainCount = day.activities.filter((activity) => mainActivityTypes.has(activity.type)).length;
    if (input.travelStyle === "slow" && mainCount > 4) issues.push(issue("MAIN_ACTIVITY_LIMIT", `${dayPath}.activities`, "慢慢逛每天最多4个主要活动", 4, mainCount));
    if (["lazy", "family"].includes(input.travelStyle) && mainCount > 3) issues.push(issue("MAIN_ACTIVITY_LIMIT", `${dayPath}.activities`, "轻松玩和历史亲子模式每天最多3个主要活动", 3, mainCount));
    const transferDay=/转场|抵达|返程|入住/.test(`${day.title}${day.theme}${day.dayTips.join(" ")}`);
    if (input.travelStyle === "fast_paced" && !fastPacedException && !transferDay && mainCount < 4) issues.push(issue("MAIN_ACTIVITY_MINIMUM", `${dayPath}.activities`, "特种兵普通完整游玩日不能只有两三个主要活动", 4, mainCount));
    if (input.travelStyle === "fast_paced" && mainCount > 6) issues.push(issue("MAIN_ACTIVITY_LIMIT", `${dayPath}.activities`, "特种兵也不能为了凑数量安排超过6个主要活动", 6, mainCount));
    if (lowEffortRequested && mainCount > 3) issues.push(issue("MAIN_ACTIVITY_LIMIT", `${dayPath}.activities`, "用户明确要求轻松或少走路时每天最多3个主要活动", 3, mainCount));
    if (lowEffortRequested && day.estimatedWalkingKm > 6) issues.push(issue("WALKING_LIMIT", `${dayPath}.estimatedWalkingKm`, "用户明确要求轻松或少走路时每日步行不得超过6公里", 6, day.estimatedWalkingKm));

    let activityCostTotal = 0;
    const seenNames = new Set<string>();
    const firstMain = day.activities.find((activity) => mainActivityTypes.has(activity.type));
    if (input.preferredDepartureTime && firstMain && minutes(firstMain.startTime) < minutes(input.preferredDepartureTime)) issues.push(issue("DEPARTURE_TIME", `${dayPath}.activities`, "首个主要活动不得早于用户希望出门时间", input.preferredDepartureTime, firstMain.startTime));
    for (let activityIndex = 0; activityIndex < day.activities.length; activityIndex++) {
      const activity = day.activities[activityIndex];
      const activityPath = `${dayPath}.activities.${activityIndex}`;
      const normalizedName=activity.name.replace(/\s+/g,"").toLowerCase();
      if(seenNames.has(normalizedName)) issues.push(issue("DUPLICATE_ACTIVITY",`${activityPath}.name`,"同一天不能重复安排相同地点",undefined,activity.name));
      seenNames.add(normalizedName);
      const actualDuration = minutes(activity.endTime) - minutes(activity.startTime);
      if (actualDuration <= 0 || actualDuration !== activity.durationMinutes) issues.push(issue("ACTIVITY_DURATION", `${activityPath}.durationMinutes`, "活动时长必须与起止时间一致", actualDuration, activity.durationMinutes));
      if (mainActivityTypes.has(activity.type) && fuzzyPlaceTerms.some((term) => activity.name.includes(term))) issues.push(issue("FUZZY_PLACE", `${activityPath}.name`, "核心活动必须使用明确、真实、可搜索的地点或街区", "明确地点", activity.name));

      const isLast = activityIndex === day.activities.length - 1;
      if (isLast && activity.transportToNext !== null) issues.push(issue("LAST_TRANSPORT", `${activityPath}.transportToNext`, "最后一个活动的transportToNext必须为null", "null", "非null"));
      if (!isLast) {
        const next = day.activities[activityIndex + 1];
        const gap = minutes(next.startTime) - minutes(activity.endTime);
        if (gap < 0) issues.push(issue("TIME_OVERLAP", `${activityPath}.endTime`, "活动时间不得重叠", 0, gap));
        const transport = activity.transportToNext?.durationMinutes ?? 0;
        if (gap < transport) issues.push(issue("TRANSPORT_GAP", `${activityPath}.transportToNext.durationMinutes`, "下一活动开始时间必须覆盖交通时间", transport, gap));
      }

      if (input.budget.mode === "custom") {
        if (activity.estimatedCost === null) issues.push(issue("ACTIVITY_COST_MISSING", `${activityPath}.estimatedCost`, "自定义预算时活动费用不能为空"));
        else activityCostTotal += activity.estimatedCost;
      } else if (activity.estimatedCost !== null) issues.push(issue("BUDGET_PRECISION", `${activityPath}.estimatedCost`, "非自定义预算不得生成精确活动费用", "null", activity.estimatedCost));
    }

    if (input.budget.mode === "custom") {
      if (day.estimatedCost === null) issues.push(issue("DAY_COST_MISSING", `${dayPath}.estimatedCost`, "自定义预算时每日费用不能为空"));
      else if (day.estimatedCost < activityCostTotal) issues.push(issue("DAY_COST_UNDERCOUNT", `${dayPath}.estimatedCost`, "每日费用不得小于活动费用合计", activityCostTotal, day.estimatedCost));
    } else if (day.estimatedCost !== null) issues.push(issue("BUDGET_PRECISION", `${dayPath}.estimatedCost`, "非自定义预算不得生成精确每日费用", "null", day.estimatedCost));
  }
  if(input.destination.scope==="multi_city_region"){
    const areas=new Set(plan.days.flatMap(day=>day.activities.filter(activity=>mainActivityTypes.has(activity.type)).map(activity=>activity.area.split(/[·｜\/]/)[0].trim())).filter(Boolean));
    if(input.days>=6&&areas.size<2) issues.push(issue("PROVINCE_TRIP_NOT_EXPANDED","days","用户选择省内多地，但行程没有形成至少两个明确落脚区域",2,areas.size));
    const maxStops=input.days<=3?1:input.days<=5?2:input.travelStyle==="fast_paced"?3:2;
    if(areas.size>maxStops+2) issues.push(issue("TOO_MANY_CITIES","days","多地路线涉及过多片区，可能频繁转场",maxStops,areas.size));
  }

  const budget = plan.budget;
  if (budget.mode !== input.budget.mode) issues.push(issue("BUDGET_MODE", "budget.mode", "输出预算模式必须与输入一致", input.budget.mode, budget.mode));
  if (input.budget.mode !== "custom") {
    if (budget.estimateType === "exact" || budget.estimatedTotal !== null || budget.dailyCostTotal !== null || budget.unallocatedCost !== null) issues.push(issue("BUDGET_PRECISION", "budget", "非自定义预算只能使用区间或无金额承诺，不能提供精确总额"));
    if (budget.estimateType === "range" && (!budget.estimatedRange || budget.estimatedRange.min > budget.estimatedRange.max)) issues.push(issue("BUDGET_RECONCILIATION", "budget.estimatedRange", "预算区间必须完整且最小值不大于最大值"));
  } else {
    const allowedTotal = input.budget.scope === "per_person" ? input.budget.amount! * (input.travelers.adults + input.travelers.children) : input.budget.amount!;
    const dailyTotal = plan.days.reduce((sum, day) => sum + (day.estimatedCost ?? 0), 0);
    if (budget.estimateType !== "exact" || budget.estimatedTotal === null) issues.push(issue("BUDGET_PRECISION", "budget.estimatedTotal", "自定义预算必须给出可核对的精确估算"));
    else {
      if (budget.estimatedTotal > allowedTotal) issues.push(issue("BUDGET_LIMIT", "budget.estimatedTotal", "估算总额不得超过用户预算口径", allowedTotal, budget.estimatedTotal));
      if (budget.dailyCostTotal !== dailyTotal) issues.push(issue("BUDGET_RECONCILIATION", "budget.dailyCostTotal", "dailyCostTotal必须等于每日费用合计", dailyTotal, budget.dailyCostTotal));
      const difference = budget.estimatedTotal - dailyTotal;
      if (difference < 0 || budget.unallocatedCost !== difference) issues.push(issue("BUDGET_RECONCILIATION", "budget.unallocatedCost", "总额与每日费用的差额必须准确记录", difference, budget.unallocatedCost));
      if (difference > 0 && !budget.unallocatedExplanation?.trim()) issues.push(issue("BUDGET_EXPLANATION", "budget.unallocatedExplanation", "存在预算差额时必须解释用途"));
    }
    if (budget.userBudgetAmount !== input.budget.amount || budget.userBudgetScope !== input.budget.scope || budget.includesAccommodation !== input.budget.includesAccommodation || budget.includesIntercityTransport !== input.budget.includesIntercityTransport) issues.push(issue("BUDGET_MODE", "budget", "输出必须原样保留用户的预算金额、口径和包含项"));
  }
  return { valid: issues.every(item=>item.severity==="warning"), issues };
}

export function formatQualityIssues(issues: TripPlanQualityIssue[]) {
  return issues.map((item) => `[${item.code}] ${item.path}: ${item.message}${item.expected !== undefined ? `；期望=${item.expected}` : ""}${item.actual !== undefined ? `；实际=${item.actual}` : ""}`).join("\n");
}
