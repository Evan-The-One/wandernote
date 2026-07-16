import type { TripInput } from "@/types/trip";

export const travelStyles: { value: TripInput["travelStyle"]; label: string; icon: "bolt" | "leaf" | "cloud"; description: string }[] = [
  { value: "fast_paced", label: "特种兵", icon: "bolt", description: "早出晚归，精力拉满，多逛多打卡" },
  { value: "slow", label: "慢慢逛", icon: "leaf", description: "不赶时间，每个地方多待一会儿" },
  { value: "lazy", label: "轻松玩", icon: "cloud", description: "不早起，多休息，少走路，少换乘" },
];

export const priorityOptions: { value: TripInput["priorities"][number]; label: string; icon: "food" | "camera" | "culture" | "nature" }[] = [
  { value: "great_food", label: "吃点好的", icon: "food" }, { value: "photogenic", label: "拍照出片", icon: "camera" },
  { value: "culture", label: "逛逛人文", icon: "culture" }, { value: "nature", label: "欣赏风景", icon: "nature" },
];

export const companionOptions: { value: TripInput["companionType"]; label: string }[] = [
  { value: "undecided", label: "还没确定" }, { value: "solo", label: "一个人" }, { value: "friends", label: "朋友" },
  { value: "partner", label: "对象" }, { value: "with_children", label: "带娃" }, { value: "other", label: "其他" },
];

export const detailPreferenceOptions: { value: TripInput["detailPreferences"][number]; label: string }[] = [
  { value: "coffee", label: "咖啡探店" }, { value: "shopping", label: "逛街购物" },
  { value: "hidden_gems", label: "小众一点" }, { value: "avoid_queues", label: "尽量少排队" },
  { value: "nightlife", label: "夜景夜生活" }, { value: "hotel_experience", label: "住宿体验" },
  { value: "more_indoor", label: "室内活动多一点" }, { value: "local_experience", label: "当地特色体验" },
];

export const budgetModes: { value: TripInput["budget"]["mode"]; label: string; description: string }[] = [
  { value: "unrestricted", label: "暂不限制", description: "先按体验规划" },
  { value: "economy", label: "尽量省钱", description: "优先性价比" },
  { value: "custom", label: "自定义金额", description: "明确预算口径" },
];

export const transportOptions: { value: TripInput["transportPreference"]; label: string }[] = [
  { value: "mixed", label: "灵活组合" }, { value: "public_transport", label: "公共交通" },
  { value: "taxi", label: "打车优先" }, { value: "walking", label: "喜欢步行" }, { value: "driving", label: "自驾" },
];
