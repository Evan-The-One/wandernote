import assert from "node:assert/strict";
import { tripImageTemplateSpecSchema, type TripImageAspectRatio } from "../src/schemas/trip-image";
import { buildPremiumImagePagePlan } from "../src/features/trip-plan/premium-image-renderer";

function spec(daysCount: number, ratio: TripImageAspectRatio, activities = 4) {
  return tripImageTemplateSpecSchema.parse({
    template: "classic_timeline", templateVersion: "classic_timeline_v1", tripId: "11111111-1111-4111-8111-111111111111", tripVersion: 1,
    aspectRatio: ratio, title: "杭州慢游路线", destination: "杭州", daysCount, theme: "慢慢逛，不赶路。", stayArea: "湖滨", transportAdvice: "步行和公共交通", reminder: "出发前核实重要信息。",
    heroImage: { sourceType: "static", sourceUrl: null, assetId: "brand-city-atmosphere-v1", altText: "杭州旅行氛围插画", attribution: null, generatedAt: null, generationJobId: null },
    days: Array.from({ length: daysCount }, (_, day) => ({ dayNumber: day + 1, date: null, title: `第${day + 1}天`, theme: "当天主题", tips: [], activities: Array.from({ length: activities }, (_, activity) => ({ time: `${String(9 + activity).padStart(2, "0")}:00`, name: `地点${activity + 1}`, area: "西湖区", durationMinutes: 60, reason: "顺路游玩。", transport: activity === activities - 1 ? null : { method: "walk", durationMinutes: 10 } })) })),
  });
}

for (const ratio of ["3:4", "9:16", "1:1"] as const) {
  const oneDay = buildPremiumImagePagePlan(spec(1, ratio));
  assert.equal(oneDay.length >= 1, true);
  assert.equal(oneDay.every((page) => page.kind === "details"), true, "1天无需额外封面");
  const sevenDays = buildPremiumImagePagePlan(spec(7, ratio, 5));
  assert.equal(sevenDays[0]?.kind, "cover");
  assert.equal(sevenDays.at(-1)?.kind, "summary");
  assert.equal(sevenDays.filter((page) => page.kind === "details").flatMap((page) => page.days).reduce((sum, day) => sum + day.activities.length, 0), 35);
}

const longName = spec(2, "3:4");
longName.days[0]!.activities[0]!.name = "一个很长但仍然能够安全进入模板并自动截断显示的中文旅行地点名称";
assert.equal(tripImageTemplateSpecSchema.safeParse(longName).success, true);
console.log("Trip image schemas and pagination passed (3:4, 9:16, 1:1; 1–7 days). ");
