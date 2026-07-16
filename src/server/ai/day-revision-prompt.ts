import type { DayRevisionRequest } from "@/types/trip";
import type { TripPlanQualityIssue } from "@/server/validation/trip-plan-quality";

export const DAY_REVISION_SYSTEM_PROMPT = `你是私人旅行规划助手，正在修改一份现有攻略中的单独一天。

只返回targetDayNumber、updatedDay和changeSummary，不得返回整份TripPlan。

必须遵守：
1. updatedDay.dayNumber和date与原日完全相同。
2. 只修改当天；旅行风格、优先需求、全局策略和预算口径不变。
3. 相邻活动不得重叠；下一活动startTime必须大于或等于上一活动endTime加交通分钟数；最后活动transportToNext=null。
4. slow、lazy、family每天最多3个attraction/shopping/entertainment主要活动。slow强调停留更久、深入体验且不赶路；lazy必须比slow进一步减少步行、换乘和活动数量，尽量晚出发并增加休息。lazy只是内部枚举，所有用户可见文本只能自然地称为“轻松玩”，不得使用旧标签称呼。用户要求轻松、少走路、孩子可能累或酒店附近时，同样最多3个主要活动且步行不超过6公里。
5. 主要活动必须是真实、明确、可搜索的地点。禁止“某类场馆”“相关区域”“同类博物馆”“一类亲子空间”“主题参观”“待定”等占位表达。
6. 非custom预算时所有activity.estimatedCost和day.estimatedCost保持null。custom预算时当天estimatedCost不得超过原当天预算，活动费用合计不得超过当天费用。
7. 日期为null时保持null，不虚构日期、天气、节假日或实时信息。
8. 只保留与相邻日期的合理衔接，不改前一天或后一天。
9. 如果用户指令不可能同时满足，例如要求同一上午安排多个相距很远地点，应采用保守可执行方案，并在changeSummary说明未机械执行冲突部分。
10. changeSummary使用1至5条简短中文，准确说明变化。
11. 只有用户明确选择coffee偏好或修改指令明确要求咖啡时，才可新增咖啡正式活动，且当天最多一个；轻松和慢游不等于咖啡馆。
12. 首日12:30后出门时不得新增午餐；晚餐通常在17:30至20:00开始。`;

function compactAdjacent(day: DayRevisionRequest["previousDay"] | DayRevisionRequest["nextDay"]) {
  return day ? { dayNumber: day.dayNumber, date: day.date, title: day.title, lastActivityEndTime: day.lastActivityEndTime, lastActivityArea: day.lastActivityArea, firstActivityStartTime: day.firstActivityStartTime, firstActivityArea: day.firstActivityArea } : null;
}

export function buildDayRevisionPrompt(request: DayRevisionRequest) {
  const context = {
    targetDayNumber: request.targetDayNumber,
    instruction: request.instruction,
    mode: request.mode,
    selectedActivityIds: request.selectedActivityIds,
    constraints: {
      travelStyle: request.originalInput.travelStyle,
      priorities: request.originalInput.priorities,
      detailPreferences: request.originalInput.detailPreferences,
      destination: request.originalInput.destination,
      departureCity: request.originalInput.departureCity,
      transportPreference: request.originalInput.transportPreference,
      companionType: request.originalInput.companionType,
      travelers: request.originalInput.travelers,
      preferredWakeTime: request.originalInput.preferredWakeTime,
      preferredDepartureTime: request.originalInput.preferredDepartureTime,
      datePreference: request.originalInput.datePreference,
      budgetMode: request.originalInput.budget.mode,
      includesIntercityTransport: request.originalInput.budget.includesIntercityTransport,
      originalDayBudget: request.currentDay.estimatedCost,
      otherDaysCostTotal: request.otherDaysCostTotal,
      planEstimatedTotal: request.budget.estimatedTotal,
      strategy: request.strategy,
    },
    currentDay: request.currentDay,
    previousDay: compactAdjacent(request.previousDay),
    nextDay: compactAdjacent(request.nextDay),
  };
  const localRules = request.mode === "selected_activities" ? `\n这是局部修改：只能修改selectedActivityIds对应活动。未选活动必须逐字段原样返回，包括ID、名称、文案、类型、时间、费用和交通；不得删除或重写未选活动。被替换活动可以沿用原ID；如拆分或新建活动，必须生成不与现有ID重复的新稳定ID。若无法在不改变未选活动的前提下合理衔接，请让结果保持原样，并在changeSummary说明应改用重新安排整天。` : "";
  return `根据以下必要上下文修改当天。不要引入上下文以外的旅行日期或预算口径。${localRules}\n${JSON.stringify(context)}`;
}

export function buildDayRevisionRepairPrompt(raw: string, issues: TripPlanQualityIssue[] | string) {
  return `上一次单日修改未通过校验。只修复列出的问题，仍然只返回单日修改结果。\n错误：${typeof issues === "string" ? issues : JSON.stringify(issues)}\n待修复结果：${raw.slice(0, 18000)}`;
}
