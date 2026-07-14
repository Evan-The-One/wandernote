import type { DayRevisionRequest } from "@/types/trip";
import type { TripPlanQualityIssue } from "@/server/validation/trip-plan-quality";

export const DAY_REVISION_SYSTEM_PROMPT = `你是私人旅行规划助手，正在修改一份现有攻略中的单独一天。

只返回targetDayNumber、updatedDay和changeSummary，不得返回整份TripPlan。

必须遵守：
1. updatedDay.dayNumber和date与原日完全相同。
2. 只修改当天；旅行风格、优先需求、全局策略和预算口径不变。
3. 相邻活动不得重叠；下一活动startTime必须大于或等于上一活动endTime加交通分钟数；最后活动transportToNext=null。
4. slow、lazy、family每天最多3个attraction/shopping/entertainment主要活动。slow强调停留更久、深入体验且不赶路；lazy必须比slow进一步减少步行、换乘和活动数量，尽量晚出发并增加休息。用户要求轻松、少走路、孩子可能累或酒店附近时，同样最多3个主要活动且步行不超过6公里。
5. 主要活动必须是真实、明确、可搜索的地点。禁止“某类场馆”“相关区域”“同类博物馆”“一类亲子空间”“主题参观”“待定”等占位表达。
6. 非custom预算时所有activity.estimatedCost和day.estimatedCost保持null。custom预算时当天estimatedCost不得超过原当天预算，活动费用合计不得超过当天费用。
7. 日期为null时保持null，不虚构日期、天气、节假日或实时信息。
8. 只保留与相邻日期的合理衔接，不改前一天或后一天。
9. 如果用户指令不可能同时满足，例如要求同一上午安排多个相距很远地点，应采用保守可执行方案，并在changeSummary说明未机械执行冲突部分。
10. changeSummary使用1至5条简短中文，准确说明变化。`;

function compactAdjacent(day: DayRevisionRequest["previousDay"] | DayRevisionRequest["nextDay"]) {
  return day ? { dayNumber: day.dayNumber, date: day.date, title: day.title, lastActivityEndTime: day.lastActivityEndTime, lastActivityArea: day.lastActivityArea, firstActivityStartTime: day.firstActivityStartTime, firstActivityArea: day.firstActivityArea } : null;
}

export function buildDayRevisionPrompt(request: DayRevisionRequest) {
  const context = {
    targetDayNumber: request.targetDayNumber,
    instruction: request.instruction,
    constraints: {
      travelStyle: request.originalInput.travelStyle,
      priorities: request.originalInput.priorities,
      companionType: request.originalInput.companionType,
      travelers: request.originalInput.travelers,
      preferredWakeTime: request.originalInput.preferredWakeTime,
      preferredDepartureTime: request.originalInput.preferredDepartureTime,
      datePreference: request.originalInput.datePreference,
      budgetMode: request.originalInput.budget.mode,
      originalDayBudget: request.currentDay.estimatedCost,
      otherDaysCostTotal: request.otherDaysCostTotal,
      planEstimatedTotal: request.budget.estimatedTotal,
      strategy: request.strategy,
    },
    currentDay: request.currentDay,
    previousDay: compactAdjacent(request.previousDay),
    nextDay: compactAdjacent(request.nextDay),
  };
  return `根据以下必要上下文修改当天。不要引入上下文以外的旅行日期或预算口径。\n${JSON.stringify(context)}`;
}

export function buildDayRevisionRepairPrompt(raw: string, issues: TripPlanQualityIssue[] | string) {
  return `上一次单日修改未通过校验。只修复列出的问题，仍然只返回单日修改结果。\n错误：${typeof issues === "string" ? issues : JSON.stringify(issues)}\n待修复结果：${raw.slice(0, 18000)}`;
}
