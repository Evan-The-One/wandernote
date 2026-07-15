const displayLabels: Record<string, string> = {
  late_start: "晚起下午逛", "late start": "晚起下午逛",
  fast_paced: "特种兵", slow: "慢慢逛", lazy: "轻松玩", food: "美食探索", romantic: "情侣旅行", family: "亲子旅行",
  economy: "尽量省钱", moderate: "适中消费", comfortable: "上不封顶", unrestricted: "暂不限制", custom: "自定义金额",
  mixed: "组合交通", public_transport: "公共交通", taxi: "打车", walk: "步行", walking: "步行", driving: "自驾",
  easy: "轻松", intense: "充实",
  great_food: "吃点好的", photogenic: "拍照出片", less_walking: "少走路", avoid_crowds: "减少排队", hidden_gems: "小众安静",
  must_see: "经典必去", family_friendly: "带孩子方便", hotel_experience: "住宿体验", nightlife: "夜生活",
  value_for_money: "性价比", culture: "逛逛人文", nature: "欣赏风景",
  solo: "一个人", friends: "朋友", couple: "情侣", parents: "父母", with_children: "带娃", extended_family: "一大家人",
};

export function formatDisplayValue(value: unknown, fallback = "按你的偏好安排") {
  if (typeof value !== "string" || !value.trim()) return fallback;
  const normalized = value.trim();
  const mapped = displayLabels[normalized] || displayLabels[normalized.toLowerCase()];
  if (mapped) return mapped;
  if (/^[a-z][a-z\s_-]*$/i.test(normalized)) return fallback;
  return normalized;
}

export function formatPriority(value: string) { return formatDisplayValue(value, "个性偏好"); }

export function formatDisplayText(value: string) {
  const naturalChinese = sanitizeUserFacingText(value);
  return Object.entries(displayLabels).reduce((text, [internal, label]) => text.replaceAll(internal, label), naturalChinese);
}
import { sanitizeUserFacingText } from "@/lib/sanitize-user-facing-text";
