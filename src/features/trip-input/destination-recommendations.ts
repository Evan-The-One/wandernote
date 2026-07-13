export type InspirationPriority = "food" | "photo" | "culture" | "nature" | "relax";
export type TravelRange = "nearby" | "rail" | "flight";

export const inspirationExperiences: { value: InspirationPriority; label: string }[] = [
  { value: "food", label: "吃得好" }, { value: "photo", label: "拍照出片" },
  { value: "culture", label: "文化体验" }, { value: "nature", label: "自然放松" },
  { value: "relax", label: "少折腾" },
];

export const travelRanges: { value: TravelRange; label: string }[] = [
  { value: "nearby", label: "周边短途" }, { value: "rail", label: "高铁可达" }, { value: "flight", label: "可以坐飞机" },
];

const cities = [
  { city: "苏州", days: "2–3天", play: "园林、街巷、慢旅行", tags: ["photo","culture","relax"], ranges: ["nearby","rail"], reason: "园林与老城片区集中，适合不赶路地慢慢逛。" },
  { city: "杭州", days: "2–4天", play: "湖景、人文、轻松散步", tags: ["photo","nature","relax"], ranges: ["nearby","rail"], reason: "山水和城市体验兼有，玩法灵活，周末也容易安排。" },
  { city: "南京", days: "2–4天", play: "历史、城市漫游、美食", tags: ["food","culture"], ranges: ["nearby","rail"], reason: "历史地点丰富，片区路线清楚，本地小吃选择也多。" },
  { city: "成都", days: "3–5天", play: "美食、茶馆、松弛感", tags: ["food","culture","relax"], ranges: ["rail","flight"], reason: "适合围绕吃喝和街区体验安排，节奏可以很松弛。" },
  { city: "泉州", days: "3–4天", play: "古城、寺庙、小吃", tags: ["food","photo","culture"], ranges: ["rail","flight"], reason: "古城文化密度高，步行线路集中，适合边吃边逛。" },
  { city: "厦门", days: "3–5天", play: "海边、街区、度假", tags: ["photo","nature","relax"], ranges: ["rail","flight"], reason: "海边和城市休闲兼顾，适合降低强度、留出休息。" },
  { city: "西安", days: "3–5天", play: "历史、经典、美食", tags: ["food","culture"], ranges: ["rail","flight"], reason: "核心历史地点明确，适合第一次去时抓住经典。" },
  { city: "大理", days: "4–6天", play: "自然、拍照、放空", tags: ["photo","nature","relax"], ranges: ["flight"], reason: "适合把时间留给自然和住宿体验，不必密集打卡。" },
] as const;

export function recommendCities(priorities: InspirationPriority[], range: TravelRange, days: number) {
  return cities.map((item) => ({ item, score: item.tags.filter((tag) => priorities.includes(tag)).length * 3 + (item.ranges.includes(range as never) ? 2 : 0) + (days >= Number(item.days[0]) ? 1 : 0) }))
    .sort((a,b) => b.score - a.score || a.item.city.localeCompare(b.item.city, "zh-CN"))
    .slice(0,3).map(({item}) => item);
}
