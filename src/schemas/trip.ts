import { z } from "zod";

export const travelStyleSchema = z.enum(["fast_paced", "slow", "lazy", "food", "romantic", "family"]);
export const prioritySchema = z.enum([
  "great_food", "photogenic", "less_walking", "avoid_crowds", "hidden_gems", "must_see",
  "family_friendly", "hotel_experience", "nightlife", "value_for_money", "late_start", "culture", "nature",
]);
export const detailPreferenceSchema = z.enum(["coffee", "shopping", "hidden_gems", "avoid_queues", "nightlife", "hotel_experience", "more_indoor", "local_experience"]);
export const transportPreferenceSchema = z.enum(["mixed", "public_transport", "taxi", "walking", "driving"]);
export const companionTypeSchema = z.enum(["undecided", "solo", "friends", "partner", "with_children", "other", "couple", "parents", "extended_family"]);
const halfHourTimeSchema = z.string().regex(/^([01]\d|2[0-3]):(00|30)$/, "请选择半小时刻度的时间").nullable();

export const datePreferenceSchema = z.object({
  type: z.enum(["undecided", "approximate", "exact"]),
  startDate: z.string().nullable(),
  approximateText: z.string().trim().max(80).nullable(),
}).superRefine((value, context) => {
  if (value.type === "exact" && !value.startDate) context.addIssue({ code: "custom", path: ["startDate"], message: "请选择具体出发日期" });
  if (value.type === "approximate" && !value.approximateText) context.addIssue({ code: "custom", path: ["approximateText"], message: "请填写大概出行时间" });
});

export const budgetPreferenceSchema = z.object({
  mode: z.enum(["unrestricted", "economy", "moderate", "comfortable", "custom"]),
  amount: z.number().positive().max(1_000_000).nullable(),
  scope: z.enum(["total", "per_person"]).nullable(),
  includesAccommodation: z.boolean().nullable(),
  includesIntercityTransport: z.boolean().nullable(),
  currency: z.literal("CNY"),
}).superRefine((value, context) => {
  if (value.mode !== "custom") return;
  if (!value.amount) context.addIssue({ code: "custom", path: ["amount"], message: "请输入自定义预算金额" });
  if (!value.scope) context.addIssue({ code: "custom", path: ["scope"], message: "请选择总预算或人均预算" });
  if (value.includesAccommodation === null) context.addIssue({ code: "custom", path: ["includesAccommodation"], message: "请选择预算是否包含住宿" });
  if (value.includesIntercityTransport === null) context.addIssue({ code: "custom", path: ["includesIntercityTransport"], message: "请选择预算是否包含往返大交通" });
});

export const tripInputSchema = z.object({
  schemaVersion: z.literal("0.2"),
  destination: z.object({
    city: z.string().trim().min(1, "请输入目的地").max(40),
    country: z.string().default("中国"),
    type: z.enum(["city", "province", "region", "attraction", "unknown"]).default("unknown"),
    scope: z.enum(["single_city", "province_capital", "multi_city_region"]).default("single_city"),
    provinceName: z.string().trim().max(20).nullable().default(null),
  }),
  days: z.number().int().min(1).max(7),
  travelStyle: travelStyleSchema,
  datePreference: datePreferenceSchema,
  budget: budgetPreferenceSchema,
  priorities: z.array(prioritySchema).max(3, "最多选择三项优先需求").default([]),
  detailPreferences: z.array(detailPreferenceSchema).max(3, "最多再选三个细节偏好").default([]),
  departureCity: z.string().trim().max(40).nullable().default(null),
  companionType: companionTypeSchema.default("undecided"),
  travelers: z.object({ adults: z.number().int().min(1).max(8).default(1), children: z.number().int().min(0).max(7).default(0), seniors: z.number().int().min(0).max(7).default(0) }).default({ adults: 1, children: 0, seniors: 0 }),
  preferredWakeTime: halfHourTimeSchema.default(null),
  preferredDepartureTime: halfHourTimeSchema.default(null),
  transportPreference: transportPreferenceSchema.default("mixed"),
  dayTripPreference: z.boolean().default(false),
  additionalRequirements: z.string().trim().max(300).nullable().default(null),
}).superRefine((value, context) => {
  if (value.destination.type === "province" && value.destination.scope === "single_city") context.addIssue({ code:"custom",path:["destination","scope"],message:"省份目的地需要先选择只玩省会或规划省内多地" });
  if (!value.preferredWakeTime || !value.preferredDepartureTime) return;
  const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
  if (minutes(value.preferredDepartureTime) < minutes(value.preferredWakeTime) + 30) context.addIssue({ code: "custom", path: ["preferredDepartureTime"], message: "出发时间建议至少比起床时间晚30分钟" });
});

export const transportSchema = z.object({
  method: z.enum(["walk", "public_transport", "taxi", "mixed"]),
  durationMinutes: z.number().int().nonnegative(),
  description: z.string().min(1),
});

export const activitySchema = z.object({
  id: z.string().min(1),
  type: z.enum(["attraction", "meal", "coffee", "shopping", "rest", "entertainment"]),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  name: z.string().trim().min(1),
  area: z.string().trim().min(1),
  reason: z.string().min(1),
  durationMinutes: z.number().int().positive(),
  estimatedCost: z.number().nonnegative().nullable(),
  transportToNext: transportSchema.nullable(),
  tips: z.array(z.string()),
  photoTips: z.array(z.string()),
});

export const dayPlanSchema = z.object({
  dayNumber: z.number().int().positive(),
  date: z.string().nullable(),
  title: z.string().min(1),
  theme: z.string().min(1),
  intensity: z.enum(["easy", "moderate", "intense"]),
  estimatedWalkingKm: z.number().nonnegative(),
  estimatedCost: z.number().nonnegative().nullable(),
  activities: z.array(activitySchema).min(1),
  dayTips: z.array(z.string()),
});

export const planBudgetSchema = z.object({
  mode: z.enum(["unrestricted", "economy", "moderate", "comfortable", "custom"]),
  currency: z.literal("CNY"),
  estimateType: z.enum(["none", "range", "exact"]),
  userBudgetAmount: z.number().positive().nullable(),
  userBudgetScope: z.enum(["total", "per_person"]).nullable(),
  includesAccommodation: z.boolean().nullable(),
  includesIntercityTransport: z.boolean().nullable(),
  estimatedTotal: z.number().nonnegative().nullable(),
  estimatedRange: z.object({ min: z.number().nonnegative(), max: z.number().nonnegative() }).nullable(),
  dailyCostTotal: z.number().nonnegative().nullable(),
  unallocatedCost: z.number().nonnegative().nullable(),
  unallocatedExplanation: z.string().nullable(),
  includedItems: z.array(z.string()),
  excludedItems: z.array(z.string()),
  notes: z.string().min(1),
});

export const tripPlanSchema = z.object({
  schemaVersion: z.literal("0.2"),
  tripId: z.string(),
  status: z.enum(["generating", "completed", "failed"]),
  title: z.string(),
  summary: z.string(),
  destination: z.object({ city: z.string(), country: z.string() }),
  strategy: z.object({ pace: z.string(), recommendedStayArea: z.string(), stayReason: z.string(), transportAdvice: z.string() }),
  budget: planBudgetSchema,
  days: z.array(dayPlanSchema),
  generalTips: z.array(z.string()),
  dataDisclaimer: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const adjacentDayContextSchema = z.object({
  dayNumber: z.number().int().positive(),
  date: z.string().nullable(),
  title: z.string(),
  lastActivityEndTime: z.string().nullable(),
  lastActivityArea: z.string().nullable(),
  firstActivityStartTime: z.string().nullable(),
  firstActivityArea: z.string().nullable(),
}).nullable();

export const dayRevisionRequestSchema = z.object({
  schemaVersion: z.literal("0.2"),
  originalInput: tripInputSchema,
  strategy: tripPlanSchema.shape.strategy,
  budget: planBudgetSchema,
  targetDayNumber: z.number().int().positive(),
  currentDay: dayPlanSchema,
  previousDay: adjacentDayContextSchema,
  nextDay: adjacentDayContextSchema,
  otherDaysCostTotal: z.number().nonnegative().nullable(),
  instruction: z.string().trim().min(3).max(500),
  mode: z.enum(["full_day", "selected_activities"]).default("full_day"),
  selectedActivityIds: z.array(z.string().trim().min(1)).max(12).default([]),
});

export const dayRevisionResponseSchema = z.object({
  targetDayNumber: z.number().int().positive(),
  updatedDay: dayPlanSchema,
  changeSummary: z.array(z.string().trim().min(1)).min(1).max(5),
});
