import { readFile } from "node:fs/promises";
import path from "node:path";

export const genericVisualCategories = [
  "hotel_room", "hotel_checkin", "luggage_pickup",
  "lunch_generic", "dinner_generic", "breakfast_generic", "cafe_generic",
  "self_drive_departure", "return_trip", "train_travel", "airplane_travel", "transit_departure",
  "walking_street", "city_stroll", "historic_street", "city_walking", "rest_generic",
] as const;
export type GenericVisualCategory = typeof genericVisualCategories[number];
export type GenericVisualHumanPresence = "none" | "crowd" | "single" | "group";
export type GenericVisualStatus = "approved" | "disabled";
export type GenericVisualAsset = {
  key: string;
  category: GenericVisualCategory;
  humanPresence: GenericVisualHumanPresence;
  suitableForSolo: boolean;
  suitableForGenericReuse: boolean;
  status: GenericVisualStatus;
};

export type ActivityVisualInput = {
  name: string;
  type: string;
  note?: string;
  area?: string;
  tags?: string[];
  previousName?: string;
  nextName?: string;
  dayTheme?: string;
};

export type ActivityVisualClassification = {
  visualCategory: GenericVisualCategory | null;
  visualSubject: string;
  isSpecificPlace: boolean;
  fallbackCategories: GenericVisualCategory[];
};

const categoryFiles: Record<GenericVisualCategory, string[]> = {
  hotel_room: ["hotel_room_1", "hotel_room_2"],
  hotel_checkin: ["hotel_checkin_3"],
  luggage_pickup: ["luggage_pickup_3", "luggage_pickup_4"],
  lunch_generic: ["lunch_generic_3", "lunch_generic_4", "lunch_generic_5"],
  dinner_generic: ["dinner_generic_4", "dinner_generic_5"],
  breakfast_generic: ["breakfast_generic_1", "breakfast_generic_3"],
  cafe_generic: ["cafe_generic_1", "cafe_generic_2", "cafe_generic_3"],
  self_drive_departure: ["self_drive_departure_1", "self_drive_departure_2", "self_drive_departure_3"],
  return_trip: ["return_trip_1", "return_trip_2"],
  train_travel: ["train_travel_1", "train_travel_2"],
  airplane_travel: ["airplane_travel_1", "airplane_travel_2"],
  transit_departure: ["transit_departure_1", "transit_departure_2"],
  walking_street: ["walking_street_1", "walking_street_2", "walking_street_3"],
  city_stroll: ["city_stroll_1", "city_stroll_2", "city_stroll_3"],
  historic_street: ["historic_street_1", "historic_street_2", "historic_street_3", "historic_street_4"],
  city_walking: ["city_walking_1", "city_walking_2"],
  rest_generic: ["rest_generic_2"],
};

const disabledAssetMetadata: GenericVisualAsset[] = [
  ...["dinner_generic_1", "dinner_generic_2", "dinner_generic_3", "lunch_generic_1", "lunch_generic_2"].map((key) => ({ key, category: key.startsWith("dinner") ? "dinner_generic" as const : "lunch_generic" as const, humanPresence: "group" as const, suitableForSolo: false, suitableForGenericReuse: false, status: "disabled" as const })),
  ...["hotel_checkin_1", "hotel_checkin_2"].map((key) => ({ key, category: "hotel_checkin" as const, humanPresence: "single" as const, suitableForSolo: true, suitableForGenericReuse: false, status: "disabled" as const })),
  ...["luggage_pickup_1", "luggage_pickup_2"].map((key) => ({ key, category: "luggage_pickup" as const, humanPresence: "single" as const, suitableForSolo: true, suitableForGenericReuse: false, status: "disabled" as const })),
  { key: "hotel_room_3", category: "hotel_room", humanPresence: "single", suitableForSolo: true, suitableForGenericReuse: false, status: "disabled" },
  { key: "breakfast_generic_2", category: "breakfast_generic", humanPresence: "single", suitableForSolo: true, suitableForGenericReuse: false, status: "disabled" },
  { key: "rest_generic_1", category: "rest_generic", humanPresence: "single", suitableForSolo: true, suitableForGenericReuse: false, status: "disabled" },
];

const approvedAssetMetadata = new Map<string, GenericVisualAsset>(Object.entries(categoryFiles).flatMap(([category, keys]) => keys.map((key) => [key, {
  key,
  category: category as GenericVisualCategory,
  humanPresence: (["walking_street", "city_stroll", "historic_street", "city_walking", "transit_departure"].includes(category) ? "crowd" : "none") as GenericVisualHumanPresence,
  suitableForSolo: true,
  suitableForGenericReuse: true,
  status: "approved" as const,
}] as const)));

const exactFallbacks: Record<GenericVisualCategory, GenericVisualCategory[]> = {
  hotel_room: ["hotel_checkin"],
  hotel_checkin: ["hotel_room"],
  luggage_pickup: ["hotel_checkin"],
  lunch_generic: [],
  dinner_generic: [],
  breakfast_generic: ["lunch_generic"],
  cafe_generic: ["rest_generic"],
  self_drive_departure: ["return_trip"],
  return_trip: ["self_drive_departure"],
  train_travel: ["transit_departure"],
  airplane_travel: ["transit_departure"],
  transit_departure: ["train_travel", "airplane_travel"],
  walking_street: ["city_stroll", "historic_street"],
  city_stroll: ["walking_street", "historic_street", "city_walking"],
  historic_street: ["city_stroll", "walking_street"],
  city_walking: ["city_stroll", "walking_street"],
  rest_generic: ["cafe_generic"],
};

export function classifyActivityVisual(input: ActivityVisualInput): ActivityVisualClassification {
  const name = input.name;
  const text = [input.name, input.note, input.area, input.tags?.join(" "), input.dayTheme].filter(Boolean).join(" ");
  const context = [input.previousName, input.nextName].filter(Boolean).join(" ");
  let visualCategory: GenericVisualCategory | null = null;

  // The activity title is authoritative. Notes often mention the next meal or hotel and must not override it.
  if (/自驾|开车|驾车|高速/.test(name) && /出发|启程|前往|返程|回程|在途|车程/.test(name)) visualCategory = "self_drive_departure";
  else if (/高铁|动车|火车|铁路|火车站/.test(name)) visualCategory = "train_travel";
  else if (/飞机|机场|航班|候机/.test(name)) visualCategory = "airplane_travel";
  else if (/取行李|取回行李|寄存行李|整理行李|收拾行李|退房|返程准备/.test(name)) visualCategory = "luggage_pickup";
  else if (/办理入住|酒店前台|入住酒店|酒店入住|入住休整|先入住|到酒店放行李|抵达住宿地/.test(name)) visualCategory = "hotel_checkin";
  else if (/回酒店休息|酒店稍作休息|入住后休息|返回住宿地|晚上回酒店|酒店休息|午休/.test(name)) visualCategory = "hotel_room";
  else if (/步行街|商业街|商圈|夜间逛街|沿街慢走|南京西路|湖滨步行街|城隍庙商圈|(?:路|大道)$/.test(name)) visualCategory = "walking_street";
  else if (/老城厢|梧桐街区|历史文化街区|古城街道|老街|胡同|(?:坊|巷|弄|街)$/.test(name)) visualCategory = "historic_street";
  else if (/散步|漫步|city\s*walk|citywalk/i.test(name)) visualCategory = "city_stroll";
  else if (/早餐|早午餐/.test(name)) visualCategory = "breakfast_generic";
  else if (/晚餐|晚饭|夜宵|夜间用餐/.test(name)) visualCategory = "dinner_generic";
  else if (/午餐|中饭|中午用餐|午间小吃|用餐|小吃/.test(name)) visualCategory = "lunch_generic";
  else if (/咖啡|咖啡馆|下午茶|饮品/.test(name)) visualCategory = "cafe_generic";
  // Strong actions in notes can supplement an ambiguous title, but never outrank a concrete title match above.
  else if (/自驾|开车|驾车|高速/.test(text) && /出发|启程|前往|返程|回程|在途|车程/.test(text)) visualCategory = "self_drive_departure";
  else if (/取行李|取回行李|寄存行李|整理行李|收拾行李|退房|返程准备/.test(text)) visualCategory = "luggage_pickup";
  else if (/办理入住|酒店前台|入住酒店|酒店入住|入住休整|先入住|到酒店放行李|抵达住宿地/.test(text)) visualCategory = "hotel_checkin";
  else if (/回酒店休息|酒店稍作休息|入住后休息|返回住宿地|晚上回酒店|酒店休息|午休/.test(text)) visualCategory = "hotel_room";
  else if (/晚餐|晚饭|夜宵|夜间用餐/.test(text)) visualCategory = "dinner_generic";
  else if (/午餐|中饭|中午用餐|午间小吃/.test(text)) visualCategory = "lunch_generic";
  else if (/街区闲逛|街区散步|城市漫步|街区慢逛/.test(text)) visualCategory = "city_stroll";
  else if (/步行前往|徒步\s*\d+|短距离步行/.test(text)) visualCategory = "city_walking";
  else if (/返程|回程/.test(text)) visualCategory = "return_trip";
  else if (/地铁|公交|换乘|客运|乘车/.test(text) || (/抵达|前往/.test(text) && /地铁|公交|高铁|火车|机场/.test(context))) visualCategory = "transit_departure";
  else if (input.type === "rest" || /稍作休息|短暂休息|游客中心休息/.test(text)) visualCategory = "rest_generic";
  else if (input.type === "meal") visualCategory = "lunch_generic";
  else if (input.type === "hotel") visualCategory = "hotel_room";
  else if (input.type === "transport") visualCategory = "transit_departure";

  const genericPlace = visualCategory !== null;
  return {
    visualCategory,
    visualSubject: input.name,
    isSpecificPlace: !genericPlace,
    fallbackCategories: visualCategory ? exactFallbacks[visualCategory] : [],
  };
}

/** Backward-compatible wrapper used by older tests and callers. */
export function genericVisualCategory(name: string, type: string, note = ""): GenericVisualCategory {
  return classifyActivityVisual({ name, type, note }).visualCategory ?? "city_stroll";
}

export function genericVisualCandidates(category: GenericVisualCategory) {
  return categoryFiles[category].map((key) => approvedAssetMetadata.get(key)!).filter((asset) => asset.status === "approved" && asset.suitableForGenericReuse && asset.suitableForSolo);
}

export function genericVisualAssetAudit() {
  return [...approvedAssetMetadata.values(), ...disabledAssetMetadata.filter((asset) => !approvedAssetMetadata.has(asset.key))];
}

export function isAllowedVisualFallback(source: GenericVisualCategory, candidate: GenericVisualCategory) {
  return source === candidate || exactFallbacks[source].includes(candidate);
}

export async function genericVisualDataUrl(assetKey: string) {
  if (!approvedAssetMetadata.has(assetKey)) throw new Error("POSTER_VISUAL_FALLBACK_INVALID");
  const file = await readFile(path.join(process.cwd(), "public", "poster-assets", "generic-real-v2", `${assetKey}.webp`));
  return `data:image/webp;base64,${file.toString("base64")}`;
}

export function genericVisualCounts() {
  return Object.fromEntries(genericVisualCategories.map((category) => [category, categoryFiles[category].length])) as Record<GenericVisualCategory, number>;
}
