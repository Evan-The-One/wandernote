import assert from "node:assert/strict";
import { timelinePosterV2SpecSchema, travelPosterSpecSchema, tripImageTemplateSpecSchema, type TripImageAspectRatio } from "../src/schemas/trip-image";
import { randomUUID } from "node:crypto";
import { buildPremiumImagePagePlan, posterAdviceLayout } from "../src/features/trip-plan/premium-image-renderer";
import { posterPointCost } from "../src/config/commerce";
import { normalizePlaceName } from "../src/server/database/trip-images";

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
for(const daysCount of [1,2,3,4,5,6,7]){
  const pageCount=daysCount<=2?1:1+Math.ceil(daysCount/2);
  const pages=Array.from({length:pageCount},(_,index)=>({pageNumber:index+1,dayRange:index===0&&daysCount>2?"旅行总览":`DAY ${Math.max(1,index*2-1)}–${Math.min(daysCount,index*2)}`,backgroundDataUrl:"data:image/webp;base64,AAAA",kind:index===0&&daysCount>2?"cover" as const:"days" as const,days:[]}));
  const parsed=travelPosterSpecSchema.safeParse({kind:"travel_poster",version:"travel_poster_v1",tripId:"11111111-1111-4111-8111-111111111111",tripVersion:1,aspectRatio:"3:4",title:"绍兴两天一晚",subtitle:"古城、水巷与黄酒文化",destination:"绍兴",daysCount,stayArea:"越城区",reminder:"出发前核实实际信息。",pages,model:"gpt-image-2",quality:"medium",estimatedCostUsd:pageCount*.041});
  assert.equal(parsed.success,true,`${daysCount}天海报Schema应通过`); assert.equal(pages.length,pageCount);
}
for(const daysCount of [1,2,3,4,5,6,7]){
  const days=Array.from({length:daysCount},(_,dayIndex)=>({dayNumber:dayIndex+1,date:null,title:`第${dayIndex+1}天古城路线`,city:"绍兴",tips:["提前核实开放时间"],activities:Array.from({length:4},(_,activityIndex)=>({time:`${9+activityIndex}:00–${10+activityIndex}:00`,name:`地点${activityIndex+1}`,note:"简短、具体、可执行的活动说明",category:"attraction" as const,visualAsset:{id:randomUUID(),cacheKey:String(dayIndex*10+activityIndex).padStart(40,"a"),dataUrl:"data:image/webp;base64,AAAA",category:"attraction" as const,altText:"地点视觉示意",reused:false}}))}));
  const pages=[];for(let index=0;index<days.length;index+=2)pages.push({pageNumber:pages.length+1,dayRange:`DAY ${index+1}${index+1<days.length?`–${index+2}`:""}`,days:days.slice(index,index+2),tips:["提前核实开放时间"]});
  const parsed=timelinePosterV2SpecSchema.safeParse({kind:"travel_poster",version:"shaoxing_timeline_v2",tripId:"11111111-1111-4111-8111-111111111111",tripVersion:2,aspectRatio:"3:4",width:1024,height:1536,title:"绍兴慢游行程",subtitle:"古城、水巷与人文",destination:"绍兴",daysCount,pages,model:"gpt-image-2",quality:"low",estimatedCostUsd:daysCount*.02});
  assert.equal(parsed.success,true,`${daysCount}天V2时间轴海报应通过`);assert.equal(pages.length,Math.ceil(daysCount/2));if(daysCount===2)assert.equal(pages[0]!.days.length,2);
}
console.log("Trip image and travel poster schemas passed (legacy ratios; AI poster 1–7 days). ");
assert.deepEqual([1,2,3,4,5,6,7].map(posterPointCost),[1,1,2,2,3,3,4],"点数必须与海报页数一致");
assert.equal(normalizePlaceName("杭州市 · 西湖风景区"),"西湖");
assert.equal(normalizePlaceName("西湖景区"),"西湖");
const adviceLayout=posterAdviceLayout();
assert.equal(adviceLayout.columns,3);assert.equal(adviceLayout.rows,2);
assert.ok(adviceLayout.x+adviceLayout.width<=1024,"建议区不得横向溢出");
assert.ok(adviceLayout.y+adviceLayout.height<1480,"建议区不得覆盖品牌区");
