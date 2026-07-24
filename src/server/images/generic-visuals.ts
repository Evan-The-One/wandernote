import { readFile } from "node:fs/promises";
import path from "node:path";

export const genericVisualCategories = [
  "hotel_room","hotel_checkin","luggage_pickup","lunch_generic","dinner_generic","breakfast_generic",
  "cafe_generic","self_drive_departure","return_trip","walking_transition","shopping_rest","transit_generic",
] as const;
export type GenericVisualCategory = typeof genericVisualCategories[number];

export function genericVisualCategory(name:string,type:string,note=""):GenericVisualCategory {
  const text=`${name} ${note}`;
  if(/早餐|早午餐/.test(text))return "breakfast_generic";
  if(/晚餐|夜宵/.test(text))return "dinner_generic";
  if(/午餐|小吃|美食|餐厅|用餐/.test(text)||type==="meal")return "lunch_generic";
  if(/咖啡|下午茶/.test(text))return "cafe_generic";
  if(/办理入住|前台|入住/.test(text))return "hotel_checkin";
  if(/取行李|寄存行李|整理行李|退房|准备行李/.test(text))return "luggage_pickup";
  if(/酒店|民宿|住宿|回酒店|休息/.test(text))return "hotel_room";
  if(/自驾|开车|驾车/.test(text)&&/出发|启程|前往/.test(text))return "self_drive_departure";
  if(/返程|回程|准备返程/.test(text))return "return_trip";
  if(/高铁|火车|飞机|地铁|换乘|交通/.test(text))return "transit_generic";
  if(/步行|慢走|散步/.test(text))return "walking_transition";
  return "shopping_rest";
}

export async function genericVisualDataUrl(category:GenericVisualCategory) {
  const file=await readFile(path.join(process.cwd(),"public","poster-assets","generic-real-v1",`${category}.webp`));
  return `data:image/webp;base64,${file.toString("base64")}`;
}
