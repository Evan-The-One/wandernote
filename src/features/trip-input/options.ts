import type { TripInput } from "@/types/trip";

export const travelStyles: { value: TripInput["travelStyle"]; label: string; icon: string; description: string }[] = [
  { value: "fast_paced", label: "特种兵旅行", icon: "⚡", description: "多打卡、节奏紧凑" },
  { value: "slow", label: "慢旅行", icon: "🍃", description: "少安排几个地方，深入体验" },
  { value: "lazy", label: "懒人旅行", icon: "☁️", description: "少走路、少换乘、多休息" },
  { value: "food", label: "美食探索", icon: "🥢", description: "围绕本地美食安排路线" },
  { value: "romantic", label: "情侣旅行", icon: "", description: "氛围、拍照和约会体验优先" },
  { value: "family", label: "亲子旅行", icon: "🎈", description: "控制强度，增加休息和便利性" },
];

export const priorityOptions: { value: TripInput["priorities"][number]; label: string; icon: string }[] = [
  { value: "great_food", label: "吃得好", icon: "🥢" }, { value: "photogenic", label: "拍照出片", icon: "📷" },
  { value: "less_walking", label: "少走路", icon: "🛋️" }, { value: "avoid_crowds", label: "不排队", icon: "🌿" },
  { value: "hidden_gems", label: "小众安静", icon: "🪴" }, { value: "must_see", label: "经典必去", icon: "📍" },
  { value: "family_friendly", label: "带孩子方便", icon: "🎈" }, { value: "hotel_experience", label: "住宿体验", icon: "🏨" },
  { value: "nightlife", label: "夜生活", icon: "🌙" }, { value: "late_start", label: "晚起下午逛", icon: "" },
  { value: "culture", label: "文化体验", icon: "🏛️" }, { value: "nature", label: "自然风景", icon: "⛰️" },
];

export const budgetModes: { value: TripInput["budget"]["mode"]; label: string; description: string }[] = [
  { value: "unrestricted", label: "暂不限制", description: "先按体验规划" },
  { value: "moderate", label: "适中消费", description: "舒适与价格平衡" },
  { value: "economy", label: "尽量省钱", description: "优先性价比" },
  { value: "comfortable", label: "上不封顶", description: "减少折腾，体验更好" },
  { value: "custom", label: "自定义金额", description: "明确预算口径" },
];

export const transportOptions: { value: TripInput["transportPreference"]; label: string }[] = [
  { value: "mixed", label: "灵活组合" }, { value: "public_transport", label: "公共交通" },
  { value: "taxi", label: "打车优先" }, { value: "walking", label: "喜欢步行" }, { value: "driving", label: "自驾" },
];
