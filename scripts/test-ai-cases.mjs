import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = process.env.TEST_BASE_URL || "http://localhost:3000";
const outputDir = process.env.TEST_OUTPUT_DIR || "/private/tmp/wandernote-ai-tests";
await mkdir(outputDir, { recursive: true });

const base = {
  schemaVersion: "0.2", departureCity: null, travelers: { adults: 1, children: 0 },
  transportPreference: "mixed", dayTripPreference: false, additionalRequirements: null,
};
const flexibleBudget = (mode = "unrestricted") => ({ mode, amount: null, scope: null, includesAccommodation: null, includesIntercityTransport: null, currency: "CNY" });
const exactDate = (startDate) => ({ type: "exact", startDate, approximateText: null });
const undecidedDate = { type: "undecided", startDate: null, approximateText: null };

const allCases = [
  { id: "hangzhou", name: "杭州情侣3天", input: { ...base, destination: { city: "杭州", country: "中国" }, days: 3, travelStyle: "romantic", datePreference: exactDate("2026-08-15"), budget: { mode: "custom", amount: 3000, scope: "total", includesAccommodation: true, includesIntercityTransport: false, currency: "CNY" }, travelers: { adults: 2, children: 0 }, priorities: ["great_food", "photogenic", "culture"], additionalRequirements: "不想太累，希望有氛围感。" } },
  { id: "chengdu", name: "成都朋友5天", input: { ...base, destination: { city: "成都", country: "中国" }, days: 5, travelStyle: "food", datePreference: exactDate("2026-09-01"), budget: { mode: "custom", amount: 5000, scope: "total", includesAccommodation: true, includesIntercityTransport: false, currency: "CNY" }, travelers: { adults: 3, children: 0 }, priorities: ["great_food", "culture"] } },
  { id: "shanghai", name: "上海国庆亲子2天", input: { ...base, destination: { city: "上海", country: "中国" }, days: 2, travelStyle: "family", datePreference: exactDate("2026-10-01"), budget: { mode: "custom", amount: 3000, scope: "total", includesAccommodation: false, includesIntercityTransport: false, currency: "CNY" }, travelers: { adults: 2, children: 1 }, priorities: ["family_friendly", "nature"] } },
  { id: "suzhou", name: "苏州无日期无预算慢旅行3天", input: { ...base, destination: { city: "苏州", country: "中国" }, days: 3, travelStyle: "slow", datePreference: undecidedDate, budget: flexibleBudget(), priorities: ["photogenic", "culture"] } },
  { id: "xiamen", name: "厦门无日期舒适懒人4天", input: { ...base, destination: { city: "厦门", country: "中国" }, days: 4, travelStyle: "lazy", datePreference: undecidedDate, budget: flexibleBudget("comfortable"), priorities: ["less_walking", "hotel_experience"] } },
];
const cases = process.env.TEST_CASE ? allCases.filter((testCase) => testCase.id === process.env.TEST_CASE) : allCases;

function minutes(value) { const [hours, mins] = value.split(":").map(Number); return hours * 60 + mins; }
function inspect(plan, input) {
  const issues = [];
  if (plan.schemaVersion !== "0.2" || plan.days.length !== input.days) issues.push("Schema版本或天数错误");
  for (const [dayIndex, day] of plan.days.entries()) {
    if (day.dayNumber !== dayIndex + 1) issues.push(`Day${dayIndex + 1}编号错误`);
    if (input.datePreference.type !== "exact" && day.date !== null) issues.push(`Day${dayIndex + 1}虚构日期`);
    const mainCount = day.activities.filter((activity) => ["attraction", "shopping", "entertainment"].includes(activity.type)).length;
    if (["slow", "lazy", "family"].includes(input.travelStyle) && mainCount > 3) issues.push(`Day${dayIndex + 1}主要活动过多`);
    for (let index = 0; index < day.activities.length; index++) {
      const activity = day.activities[index];
      if (index === day.activities.length - 1 && activity.transportToNext !== null) issues.push(`Day${dayIndex + 1}最后活动仍有交通`);
      if (index < day.activities.length - 1) {
        const gap = minutes(day.activities[index + 1].startTime) - minutes(activity.endTime);
        if (gap < (activity.transportToNext?.durationMinutes || 0)) issues.push(`Day${dayIndex + 1}交通时间不足`);
      }
    }
  }
  if (input.budget.mode !== "custom" && (plan.budget.estimatedTotal !== null || plan.days.some((day) => day.estimatedCost !== null))) issues.push("非自定义预算出现精确金额");
  return issues;
}

const results = [];
for (const testCase of cases) {
  const started = Date.now();
  const response = await fetch(`${baseUrl}/api/trips/generate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(testCase.input) });
  const payload = await response.json();
  await writeFile(`${outputDir}/${testCase.id}.json`, JSON.stringify({ input: testCase.input, response: payload }, null, 2));
  const issues = response.ok ? inspect(payload.data, testCase.input) : [payload.error?.message || `HTTP ${response.status}`];
  const result = { id: testCase.id, name: testCase.name, success: response.ok && issues.length === 0, status: response.status, seconds: Math.round((Date.now() - started) / 1000), issues, title: payload.data?.title };
  results.push(result);
  console.log(`${result.success ? "✓" : "✗"} ${result.name} (${result.seconds}s)${issues.length ? `: ${issues.join("；")}` : ""}`);
}
console.log(JSON.stringify(results, null, 2));
if (results.some((result) => !result.success)) process.exitCode = 1;
