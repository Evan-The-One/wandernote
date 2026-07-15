import assert from "node:assert/strict";
import { tripInputSchema, tripPlanSchema } from "../src/schemas/trip";
import { validateTripPlanQuality } from "../src/server/validation/trip-plan-quality";
import { validateDayRevisionQuality } from "../src/server/validation/day-revision-quality";
import { sanitizeUserFacingData } from "../src/lib/sanitize-user-facing-text";

const baseInput = tripInputSchema.parse({ schemaVersion: "0.2", destination: { city: "杭州", country: "中国" }, days: 1, travelStyle: "fast_paced", datePreference: { type: "undecided", startDate: null, approximateText: null }, budget: { mode: "unrestricted", amount: null, scope: null, includesAccommodation: null, includesIntercityTransport: null, currency: "CNY" }, priorities: ["great_food", "culture"], departureCity: null, travelers: { adults: 1, children: 0 }, transportPreference: "mixed", dayTripPreference: false, additionalRequirements: null });
assert.equal(baseInput.companionType, "solo"); assert.equal(baseInput.travelers.seniors, 0); assert.equal(baseInput.preferredDepartureTime, null);
assert.equal(tripInputSchema.safeParse({ ...baseInput, preferredWakeTime: "10:00", preferredDepartureTime: "09:30" }).success, false);

const activities = ["西湖断桥", "浙江省博物馆孤山馆区", "河坊街", "京杭大运河杭州段"].map((name, index) => ({ id: String(index), type: "attraction" as const, startTime: `${String(8 + index * 2).padStart(2,"0")}:00`, endTime: `${String(9 + index * 2).padStart(2,"0")}:30`, name, area: index < 2 ? "西湖" : "上城", reason: "明确可搜索地点", durationMinutes: 90, estimatedCost: null, transportToNext: index === 3 ? null : { method: "public_transport" as const, durationMinutes: 30, description: "公共交通前往" }, tips: [], photoTips: [] }));
const plan = tripPlanSchema.parse({ schemaVersion: "0.2", tripId: "test", status: "completed", title: "杭州一日", summary: "紧凑游览", destination: baseInput.destination, strategy: { pace: "紧凑", recommendedStayArea: "湖滨", stayReason: "交通方便", transportAdvice: "公共交通" }, budget: { mode: "unrestricted", currency: "CNY", estimateType: "none", userBudgetAmount: null, userBudgetScope: null, includesAccommodation: null, includesIntercityTransport: null, estimatedTotal: null, estimatedRange: null, dailyCostTotal: null, unallocatedCost: null, unallocatedExplanation: null, includedItems: [], excludedItems: [], notes: "未提供具体预算" }, days: [{ dayNumber: 1, date: null, title: "高效打卡", theme: "经典人文", intensity: "intense", estimatedWalkingKm: 8, estimatedCost: null, activities, dayTips: [] }], generalTips: [], dataDisclaimer: "不含实时信息", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
assert.equal(validateTripPlanQuality(plan, baseInput).valid, true);
const sparse = { ...plan, days: [{ ...plan.days[0], activities: plan.days[0].activities.slice(0, 3).map((activity, index) => ({ ...activity, transportToNext: index === 2 ? null : activity.transportToNext })) }] };
assert.equal(validateTripPlanQuality(sparse, baseInput).issues.some((item) => item.code === "MAIN_ACTIVITY_MINIMUM"), true);
const crowded = { ...plan, days: [{ ...plan.days[0], activities: [...plan.days[0].activities, ...plan.days[0].activities.slice(0,3).map((activity,index)=>({ ...activity, id:`extra-${index}`, startTime:`${16+index*2}:00`, endTime:`${17+index*2}:30`, transportToNext:index===2?null:activity.transportToNext }))] }] };
assert.equal(validateTripPlanQuality(crowded, baseInput).issues.some((item) => item.code === "MAIN_ACTIVITY_LIMIT"), true);
const parents = tripInputSchema.parse({ ...baseInput, companionType: "parents", travelers: { adults: 1, children: 0, seniors: 2 } });
assert.equal(validateTripPlanQuality(sparse, parents).issues.some((item) => item.code === "MAIN_ACTIVITY_MINIMUM"), false);
const partialRequest = { schemaVersion:"0.2" as const, originalInput:baseInput, strategy:plan.strategy, budget:plan.budget, targetDayNumber:1, currentDay:plan.days[0], previousDay:null, nextDay:null, otherDaysCostTotal:null, instruction:"替换第二个活动", mode:"selected_activities" as const, selectedActivityIds:["1"] };
const partialDay = { ...plan.days[0], activities:plan.days[0].activities.map((activity)=>activity.id==="1"?{...activity,name:"中国丝绸博物馆"}:activity) };
assert.equal(validateDayRevisionQuality({targetDayNumber:1,updatedDay:partialDay,changeSummary:["替换选中活动"]},partialRequest).valid,true);
const tamperedDay = { ...partialDay, activities:partialDay.activities.map((activity)=>activity.id==="0"?{...activity,name:"未授权修改"}:activity) };
assert.equal(validateDayRevisionQuality({targetDayNumber:1,updatedDay:tamperedDay,changeSummary:["错误修改"]},partialRequest).valid,false);
const legacyLabel = `\u61d2\u4eba`;
const sanitizedPlan = sanitizeUserFacingData({ title: `${legacyLabel}旅行`, summary: `适合${legacyLabel}的路线`, nested: [`${legacyLabel}模式`] });
assert.equal(JSON.stringify(sanitizedPlan).includes(legacyLabel), false);
console.log("Core upgrade contract tests passed (migration defaults, time rules, fast-paced density and exceptions).");
