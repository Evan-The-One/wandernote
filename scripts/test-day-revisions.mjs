import { mkdir, readFile, writeFile } from "node:fs/promises";

const sourceDir = process.env.TEST_SOURCE_DIR || "/private/tmp/wandernote-ai-tests";
const outputDir = process.env.TEST_OUTPUT_DIR || "/private/tmp/wandernote-revision-tests";
await mkdir(outputDir, { recursive: true });

const scenarios = [
  { id: "hangzhou", day: 2, instruction: "不要安排茶园，换成适合拍照的咖啡店和室内文化活动，整体轻松一点。" },
  { id: "shanghai", day: 1, instruction: "孩子下午可能累，把下午安排减少一个活动，增加午休，不要跨区。" },
  { id: "xiamen", day: 3, instruction: "当天想多待在酒店附近，减少步行，安排一次海景下午茶。" },
  { id: "chengdu", day: 3, instruction: "增加高消费的精品餐厅和高价演出体验，但不要改变原始预算口径。", safeReject: true },
  { id: "suzhou", day: 1, instruction: "上午同时安排三个相距很远的景点。" },
];

function adjacent(day) {
  if (!day) return null;
  const first = day.activities[0], last = day.activities.at(-1);
  return { dayNumber: day.dayNumber, date: day.date, title: day.title, lastActivityEndTime: last?.endTime ?? null, lastActivityArea: last?.area ?? null, firstActivityStartTime: first?.startTime ?? null, firstActivityArea: first?.area ?? null };
}

const results = await Promise.all(scenarios.map(async (scenario) => {
  const source = JSON.parse(await readFile(`${sourceDir}/${scenario.id}.json`, "utf8"));
  const input = source.input, plan = source.response.data;
  const index = plan.days.findIndex((day) => day.dayNumber === scenario.day);
  if (index < 0) return { id: scenario.id, success: false, issues: ["找不到目标日期"] };
  const currentDay = plan.days[index];
  const request = {
    schemaVersion: "0.2", originalInput: input, strategy: plan.strategy, budget: plan.budget,
    targetDayNumber: scenario.day, currentDay, previousDay: adjacent(plan.days[index - 1]), nextDay: adjacent(plan.days[index + 1]),
    otherDaysCostTotal: input.budget.mode === "custom" ? plan.days.reduce((sum, day) => day.dayNumber === scenario.day ? sum : sum + (day.estimatedCost ?? 0), 0) : null,
    instruction: scenario.instruction,
  };
  const started = Date.now();
  const response = await fetch("http://localhost:3000/api/trips/revise-day", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(request) });
  const payload = await response.json();
  const issues = [];
  if (!response.ok) issues.push(payload.error?.message || `HTTP ${response.status}`);
  else {
    const updated = payload.data.updatedDay;
    if (updated.dayNumber !== currentDay.dayNumber) issues.push("dayNumber变化");
    if (updated.date !== currentDay.date) issues.push("date变化");
    const merged = plan.days.map((day) => day.dayNumber === scenario.day ? updated : day);
    for (let dayIndex = 0; dayIndex < plan.days.length; dayIndex++) {
      if (dayIndex !== index && JSON.stringify(merged[dayIndex]) !== JSON.stringify(plan.days[dayIndex])) issues.push(`非目标Day${dayIndex + 1}发生变化`);
    }
    if (input.budget.mode !== "custom" && (updated.estimatedCost !== null || updated.activities.some((activity) => activity.estimatedCost !== null))) issues.push("非自定义预算出现精确费用");
    if (input.budget.mode === "custom" && updated.estimatedCost > currentDay.estimatedCost) issues.push("当天预算提高");
    if (/轻松|减少步行|孩子.*累|酒店附近/.test(scenario.instruction) && updated.estimatedWalkingKm > 6) issues.push("低体力修改步行超过6公里");
  }
  const safelyRejected = scenario.safeReject && response.status === 502;
  const result = { id: scenario.id, targetDay: scenario.day, success: safelyRejected || (response.ok && issues.length === 0), safelyRejected, status: response.status, seconds: Math.round((Date.now() - started) / 1000), issues: safelyRejected ? [] : issues, instruction: scenario.instruction, data: payload.data };
  await writeFile(`${outputDir}/${scenario.id}.json`, JSON.stringify({ request, result }, null, 2));
  return result;
}));

for (const result of results) console.log(`${result.success ? "✓" : "✗"} ${result.id} Day${result.targetDay} (${result.seconds}s)${result.issues.length ? `: ${result.issues.join("；")}` : ""}`);
console.log(JSON.stringify(results.map((result) => ({ id: result.id, targetDay: result.targetDay, success: result.success, safelyRejected: result.safelyRejected, status: result.status, seconds: result.seconds, issues: result.issues, changeSummary: result.data?.changeSummary })), null, 2));
if (results.some((result) => !result.success)) process.exitCode = 1;
