import type { TripInput, TripPlan } from "@/types/trip";

export type PreTripAdvice = NonNullable<TripPlan["preTripAdvice"]>;

function short(value: string, fallback: string) {
  const clean = value.replace(/mixed|null|undefined|day\.date|[a-z]+_[a-z_]+/gi, "").replace(/\s+/g, " ").trim();
  return (clean || fallback).slice(0, 36);
}

export function resolvePreTripAdvice(plan: TripPlan, input: TripInput): PreTripAdvice {
  const first = plan.days[0];
  const last = plan.days.at(-1);
  const fallback: PreTripAdvice = {
    transport: input.departureCity ? `${input.departureCity}出发，先核实往返班次或路况` : `市内按当天路线选择步行与短途交通`,
    accommodation: `住在${plan.strategy.recommendedStayArea || plan.destination.city}，每天出发更方便`,
    clothing: first && first.estimatedWalkingKm > 6 ? "当天步行较多，穿轻便防滑的鞋" : "穿适合长时间活动的轻便衣鞋",
    photoSpots: first?.activities.find((item) => item.type === "attraction")?.name ? `在${first.activities.find((item) => item.type === "attraction")!.name}预留拍照时间` : "把拍照留在光线和人流更舒服的时段",
    food: first?.activities.find((item) => item.type === "meal")?.area ? `到${first.activities.find((item) => item.type === "meal")!.area}再选当地餐食` : "正餐优先选择当天活动片区，少绕路",
    timing: last?.dayTips[0] || "热门地点的预约和开放时间请提前核实",
  };
  const source = plan.preTripAdvice;
  return {
    transport: short(source?.transport || "", fallback.transport),
    accommodation: short(source?.accommodation || "", fallback.accommodation),
    clothing: short(source?.clothing || "", fallback.clothing),
    photoSpots: short(source?.photoSpots || "", fallback.photoSpots),
    food: short(source?.food || "", fallback.food),
    timing: short(source?.timing || "", fallback.timing),
  };
}
