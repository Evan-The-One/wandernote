export type InspirationPriority = "food" | "photo" | "culture" | "nature" | "relax";
export type TravelRange = "nearby" | "rail" | "domestic";

export const inspirationExperiences: { value: InspirationPriority; label: string }[] = [
  { value: "food", label: "吃得好" }, { value: "photo", label: "拍照出片" }, { value: "culture", label: "文化体验" },
  { value: "nature", label: "自然放松" }, { value: "relax", label: "少折腾" },
];
export const travelRanges: { value: TravelRange; label: string }[] = [
  { value: "nearby", label: "周边短途" }, { value: "rail", label: "高铁3小时内" }, { value: "domestic", label: "国内都可以" },
];

type CityRule = { city: string; province: string; region: string; days: string; play: string; tags: InspirationPriority[]; nearbyFrom: string[]; railFrom: string[]; reason: string };
export const cityRecommendationRules: CityRule[] = [
  { city:"岳阳",province:"湖南",region:"华中",days:"2天",play:"湖景、古楼、慢游",tags:["culture","nature","relax"],nearbyFrom:["长沙"],railFrom:["武汉","南昌"],reason:"洞庭湖与岳阳楼适合周末慢游，核心区域相对集中。" },
  { city:"衡阳",province:"湖南",region:"华中",days:"2天",play:"南岳、人文、自然",tags:["culture","nature"],nearbyFrom:["长沙"],railFrom:["广州","武汉"],reason:"山岳与人文体验兼具，适合两天安排。" },
  { city:"郴州",province:"湖南",region:"华中",days:"2–3天",play:"湖泊、草原、自然",tags:["photo","nature"],nearbyFrom:["长沙","广州"],railFrom:["深圳"],reason:"自然景观类型丰富，适合拍照和短途放松。" },
  { city:"张家界",province:"湖南",region:"华中",days:"3–4天",play:"山水、徒步、摄影",tags:["photo","nature"],nearbyFrom:["长沙"],railFrom:["武汉"],reason:"适合把三天以上时间留给山水体验。" },
  { city:"武汉",province:"湖北",region:"华中",days:"2–3天",play:"江景、美食、城市文化",tags:["food","culture"],nearbyFrom:["长沙"],railFrom:["南昌","广州","北京"],reason:"城市公共交通便利，江景与美食路线容易组合。" },
  { city:"南昌",province:"江西",region:"华中",days:"2天",play:"历史、赣味、城市漫游",tags:["food","culture"],nearbyFrom:["长沙"],railFrom:["武汉","广州"],reason:"适合周末体验城市历史和本地风味。" },
  { city:"苏州",province:"江苏",region:"华东",days:"2–3天",play:"园林、街巷、慢旅行",tags:["photo","culture","relax"],nearbyFrom:["上海"],railFrom:["杭州","南京"],reason:"园林与老城片区集中，适合不赶路地慢慢逛。" },
  { city:"杭州",province:"浙江",region:"华东",days:"2–4天",play:"湖景、人文、轻松散步",tags:["photo","nature","relax"],nearbyFrom:["上海"],railFrom:["南京","苏州"],reason:"山水和城市体验兼有，短途路线成熟。" },
  { city:"嘉兴",province:"浙江",region:"华东",days:"2天",play:"古镇、水乡、美食",tags:["food","photo","relax"],nearbyFrom:["上海","杭州"],railFrom:["苏州"],reason:"水乡体验集中，适合节奏轻松的周末旅行。" },
  { city:"无锡",province:"江苏",region:"华东",days:"2天",play:"太湖、园林、城市休闲",tags:["nature","relax"],nearbyFrom:["上海","苏州"],railFrom:["南京","杭州"],reason:"太湖与城市景点距离适中，适合短途放松。" },
  { city:"南京",province:"江苏",region:"华东",days:"2–4天",play:"历史、城市漫游、美食",tags:["food","culture"],nearbyFrom:["上海"],railFrom:["杭州","北京"],reason:"历史地点丰富，片区路线清楚。" },
  { city:"乐山",province:"四川",region:"西南",days:"2天",play:"美食、江景、人文",tags:["food","culture"],nearbyFrom:["成都"],railFrom:["重庆"],reason:"从成都出发方便，适合围绕美食与大佛安排两天。" },
  { city:"都江堰",province:"四川",region:"西南",days:"1–2天",play:"水利文化、青城山、自然",tags:["culture","nature"],nearbyFrom:["成都"],railFrom:[],reason:"距离成都较近，文化与自然可以灵活组合。" },
  { city:"眉山",province:"四川",region:"西南",days:"1–2天",play:"人文、美食、轻松短途",tags:["food","culture","relax"],nearbyFrom:["成都"],railFrom:[],reason:"适合从成都出发进行低强度短途体验。" },
  { city:"重庆",province:"重庆",region:"西南",days:"3–4天",play:"山城、夜景、美食",tags:["food","photo","culture"],nearbyFrom:["成都"],railFrom:["广州"],reason:"高铁往来方便，城市风貌与美食辨识度高。" },
  { city:"佛山",province:"广东",region:"华南",days:"1–2天",play:"岭南、美食、古镇",tags:["food","culture"],nearbyFrom:["广州"],railFrom:["深圳"],reason:"广佛往来方便，适合以岭南文化和美食为主。" },
  { city:"清远",province:"广东",region:"华南",days:"2天",play:"山水、温泉、放松",tags:["nature","relax"],nearbyFrom:["广州"],railFrom:["深圳"],reason:"适合从广州出发安排自然放松型周末。" },
  { city:"珠海",province:"广东",region:"华南",days:"2–3天",play:"海边、城市休闲、拍照",tags:["photo","nature","relax"],nearbyFrom:["广州","深圳"],railFrom:[],reason:"海滨路线轻松，适合朋友或情侣短途。" },
  { city:"深圳",province:"广东",region:"华南",days:"2–3天",play:"海边、城市、展览",tags:["photo","nature"],nearbyFrom:["广州"],railFrom:["长沙"],reason:"城市交通便利，可组合海边和室内文化体验。" },
  { city:"天津",province:"天津",region:"华北",days:"2天",play:"建筑、美食、城市漫游",tags:["food","photo","culture"],nearbyFrom:["北京"],railFrom:[],reason:"从北京高铁出行方便，适合两天城市漫游。" },
  { city:"秦皇岛",province:"河北",region:"华北",days:"2–3天",play:"海边、长城、放松",tags:["nature","relax"],nearbyFrom:["北京"],railFrom:[],reason:"兼有海滨和人文景观，适合短途换换节奏。" },
  { city:"济南",province:"山东",region:"华东",days:"2–3天",play:"泉水、老城、鲁菜",tags:["food","culture","relax"],nearbyFrom:[],railFrom:["北京"],reason:"高铁可达，泉水老城和鲁菜适合两三天体验。" },
  { city:"石家庄",province:"河北",region:"华北",days:"2天",play:"古建、历史、短途",tags:["culture"],nearbyFrom:["北京"],railFrom:[],reason:"适合作为京津冀范围内的历史文化短途选择。" },
  { city:"西安",province:"陕西",region:"西北",days:"3–5天",play:"历史、经典、美食",tags:["food","culture"],nearbyFrom:[],railFrom:["北京","成都"],reason:"核心历史地点明确，适合第一次去时抓住经典。" },
  { city:"厦门",province:"福建",region:"华东",days:"3–5天",play:"海边、街区、度假",tags:["photo","nature","relax"],nearbyFrom:[],railFrom:["广州"],reason:"海边和城市休闲兼顾，适合降低强度。" },
];

export function recommendCities(priorities: InspirationPriority[], range: TravelRange, days: number, departureCity: string) {
  const source = departureCity.trim().replace(/市$/, "");
  const precise = !!source && cityRecommendationRules.some((item) => item.nearbyFrom.includes(source) || item.railFrom.includes(source));
  let pool = cityRecommendationRules;
  if (range === "nearby" && precise) pool = pool.filter((item) => item.nearbyFrom.includes(source));
  else if (range === "rail" && precise) pool = pool.filter((item) => item.nearbyFrom.includes(source) || item.railFrom.includes(source));
  const scored = pool.map((item) => ({ item, score: item.tags.filter((tag) => priorities.includes(tag)).length * 4 + (item.nearbyFrom.includes(source) ? 5 : 0) + (item.railFrom.includes(source) ? 3 : 0) + (days >= Number(item.days[0]) ? 1 : 0) }))
    .sort((a,b) => b.score - a.score || a.item.city.localeCompare(b.item.city, "zh-CN")).slice(0,3).map(({item}) => item);
  return { items: scored, precise: range === "domestic" || precise, source: source || null };
}
