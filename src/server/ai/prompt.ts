import type { TripInput } from "@/types/trip";
import type { TripPlanQualityIssue } from "@/server/validation/trip-plan-quality";

const styleGuides: Record<TripInput["travelStyle"], string> = {
  fast_paced: "特种兵：普通完整游玩日安排4至6个主要活动，通常08:00至09:00开始、20:30至22:00结束；早出晚归、多逛多打卡，但必须完整预留用餐、休息和每段交通。",
  slow: "慢慢逛：每天2至4个主要游玩活动；每处停留更久、深入体验，可以正常步行，但不赶路、不用打卡式压缩停留。",
  lazy: "轻松玩：比慢慢逛进一步降低活动数量、步行和换乘；尽量10点后出发，优先酒店附近或同一片区，明确加入酒店、咖啡馆或午休等休息。所有用户可见文本只能称为轻松玩，不得使用旧标签称呼。",
  food: "美食探索：用真实餐饮街区和当地菜系组织路线，不杜撰餐厅；仍要保持合理密度。",
  romantic: "情侣旅行：安排日落、夜景、散步或有氛围的明确地点，同时保留休息和交流时间。",
  family: "亲子旅行：每天最多3个主要游玩活动，降低强度，安排午休、如厕、用餐和儿童参与体验。",
};

const priorityLabels: Record<TripInput["priorities"][number], string> = {
  great_food: "吃得好", photogenic: "拍照出片", less_walking: "少走路", avoid_crowds: "减少排队",
  hidden_gems: "小众安静", must_see: "经典必去", family_friendly: "带孩子方便", hotel_experience: "住宿体验",
  nightlife: "夜生活", value_for_money: "性价比", late_start: "晚起下午逛", culture: "文化体验", nature: "自然风景",
};

const budgetLabels: Record<TripInput["budget"]["mode"], string> = {
  unrestricted: "暂不限制：不要输出精确总额、每日费用或活动费用，可不给金额或只给宽松区间",
  economy: "尽量省钱：不要输出精确总额、每日费用或活动费用，可给合理区间并说明省钱策略",
  moderate: "适中消费：不要输出精确总额、每日费用或活动费用，可给合理区间",
  comfortable: "舒适优先：不要输出精确总额、每日费用或活动费用，可给合理区间",
  custom: "自定义金额：必须严格遵守用户金额、总额/人均口径以及住宿和往返大交通包含项",
};

const companionLabels: Record<TripInput["companionType"], string> = {
  undecided: "未确定：使用中性规划，不自行推断情侣、亲子或家庭关系",
  solo: "一个人：优先独自行动和单人就餐方便的地点，给出克制的夜间安全提醒",
  friends: "朋友：可增加多人互动、共同体验、分享型餐饮和夜间聚会区域",
  partner: "对象：适量增加氛围、夜景、散步和拍照，不要把所有行程都浪漫化",
  other: "其他同行：依据成人、儿童、老人数量安排，优先照顾行动能力较弱者",
  couple: "情侣：适量增加氛围、夜景、散步和拍照，不要把所有行程都浪漫化",
  parents: "父母：减少无必要步行、台阶、排队和频繁换乘，增加休息，体力优先",
  with_children: "带娃：安排亲子友好地点、吃饭休息和机动时间，避免连续长距离步行",
  extended_family: "一大家人：同时照顾成人、儿童和老人，优先交通方便、容错高、少换乘的安排",
};

const detailLabels: Record<TripInput["detailPreferences"][number], string> = {
  coffee:"咖啡探店",shopping:"逛街购物",hidden_gems:"小众一点",avoid_queues:"尽量少排队",nightlife:"夜景夜生活",hotel_experience:"住宿体验",more_indoor:"室内活动多一点",local_experience:"当地特色体验",
};

export const TRIP_PLANNER_SYSTEM_PROMPT = `你是私人旅行规划助手，不是旅游文章生成器。你的输出必须是一份可执行、可核对的中文城市旅行计划。

【时间一致性】
1. 活动时间不得重叠，durationMinutes必须等于endTime减startTime。
2. 对任意相邻活动：下一活动startTime必须大于或等于上一活动endTime加transportToNext.durationMinutes。交通时间必须真实占用时间轴。
3. 最后一个活动transportToNext必须为null；其他活动应给出到下一站的合理交通时间。
4. 必须保留午餐。全天行程还要考虑晚餐、休息、入住和返程。

【活动密度与路线】
5. attraction、shopping、entertainment算主要游玩活动。fast_paced普通完整游玩日必须4至6个主要活动；slow为2至4个；lazy为2至3个。餐饮、咖啡、酒店休息不计入此数量，但总时间仍须合理。lazy仅是内部枚举，用户可见输出必须称为“轻松玩”。陪父母、带孩子、全家出行或用户指定较晚出发时，安全与作息优先，可降低密度并在dayTips解释。
5a. 如果用户选择less_walking，或补充要求明确包含“不想太累”“少走路”“轻松一点”，每天最多3个主要活动且estimatedWalkingKm不得超过6公里。
5b. 如果用户选择late_start，主要游玩活动尽量不早于10:30；上午可安排自然醒、早餐、酒店休息或轻松移动，下午作为主要游玩时段，但不得因此把晚间行程拖得过晚。
6. 每天优先集中在1至2个相邻片区。family和lazy禁止无必要跨区折返。不得在任何输出字段使用旧标签称呼。fast_paced可以增加活动，但不得挤占交通和用餐。
7. 特殊日期（国庆、春节、五一、暑期周末等）仅在用户提供具体日期或大概节假日时应用：减少活动、增加排队和交通缓冲、提醒预约、集中同片区，并在dayTips给出同区域备选。
8. 日期未确定时，day.date必须为null，不得虚构天气、节假日、人流或季节结论。

【地点真实性】
9. 每个核心活动name必须是明确、真实、可搜索的公开地点，或明确可搜索的真实街区。
10. 禁止含糊占位表达，包括“某类场馆”“相关区域”“同类博物馆”“一类亲子空间”“熊猫主题参观”“某个景点”“待定”。无法确认时选择更保守但明确的知名公开地点。
11. 不虚构具体餐厅、开放时间、门票、地址或实时信息。不确定餐厅时可以使用“明确真实街区 + 当地菜系”，但核心景点不能含糊。

【预算一致性】
12. 非custom预算：activity.estimatedCost和day.estimatedCost全部为null；budget.estimatedTotal、dailyCostTotal、unallocatedCost也必须为null；estimateType只能是range或none。可以提供estimatedRange，但不得伪装成精确承诺。
13. custom预算：activity和day费用必须为数字；每日estimatedCost不得小于当日活动费用合计；dailyCostTotal必须等于每日费用合计；estimatedTotal减dailyCostTotal必须等于unallocatedCost，差额大于0时必须用unallocatedExplanation解释。
14. custom预算必须原样保留userBudgetAmount、userBudgetScope、includesAccommodation、includesIntercityTransport。不得自行排除用户明确包含的项目。估算总额不得超过按用户口径计算的可用总预算。
15. includedItems、excludedItems和notes必须明确估算包含与不包含的内容。

【输出】
16. 输出天数必须与输入一致，dayNumber从1连续递增。具体日期存在时逐日连续；否则date为null。
17. 只输出符合指定Schema的JSON，不要输出Markdown、代码围栏、HTML或额外解释。
18. 本版本没有实时天气、地图、营业时间、票价和预订数据，dataDisclaimer必须如实说明。`;

const MULTI_CITY_RULES = `【省份与多地行程】
19. destination.scope=province_capital时只规划指定省会，并明确主要游玩该城市；destination.scope=multi_city_region时不得静默缩回省会单城。
20. 多地落脚点：1至3天以1处为主；4至5天fast_paced/slow为1至2处、lazy通常1处最多2处；6至7天fast_paced为2至3处、slow以2处为主、lazy为1至2处。
21. 尽量连续住宿2晚以上；lazy、带娃、老人或复杂同行禁止连续两天搬酒店。转场日必须把城际交通写入时间轴，可少安排主要活动，不得因活动少而硬塞景点。
22. 路线单向推进，不每天跨城，不安排上午与下午明显无法到达的不同城市。
23. 多地行程的activity.area统一使用“城市·片区”格式，便于核对落脚点和转场；单城市行程仍可只写片区。`;

function describeDate(input: TripInput) {
  if (input.datePreference.type === "exact") return `已确定：${input.datePreference.startDate}`;
  if (input.datePreference.type === "approximate") return `大概时间：${input.datePreference.approximateText}`;
  return "未确定；所有day.date必须为null";
}

function describeBudget(input: TripInput) {
  if (input.budget.mode !== "custom") return budgetLabels[input.budget.mode];
  return `${input.budget.amount} CNY；口径=${input.budget.scope === "total" ? "总预算" : "人均预算"}；包含住宿=${input.budget.includesAccommodation ? "是" : "否"}；包含往返大交通=${input.budget.includesIntercityTransport ? "是" : "否"}`;
}

export function buildTripPlannerPrompt(input: TripInput) {
  return `请规划以下旅行：

主目的地：${input.destination.city}，${input.destination.country}
目的地类型与范围：${input.destination.type} / ${input.destination.scope}${input.destination.provinceName?`；所属省级目的地=${input.destination.provinceName}`:""}
旅行天数：${input.days}天
出行时间：${describeDate(input)}
同行人数：${input.travelers.adults}位成人，${input.travelers.children}位儿童
同行关系：${companionLabels[input.companionType]}；另有${input.travelers.seniors}位老人
作息偏好：起床${input.preferredWakeTime || "未限制"}；出门${input.preferredDepartureTime || "未限制"}。若填写了具体时间，首个主要活动不得早于出门时间。
旅行风格：${styleGuides[input.travelStyle]}
优先需求：${input.priorities.length ? input.priorities.map((item) => priorityLabels[item]).join("、") : "未指定"}
细节偏好（只用于二次筛选，不得压过核心偏好）：${input.detailPreferences.length?input.detailPreferences.map(item=>detailLabels[item]).join("、"):"未指定"}
预算：${describeBudget(input)}
出发城市：${input.departureCity || "未填写"}
交通偏好：${input.transportPreference}
周边一日游：${input.dayTripPreference ? "可以考虑，但只有明显提升体验且不破坏主城市路线时安排" : "不安排"}
补充要求：${input.additionalRequirements || "无"}

需求优先级：补充说明中的硬性要求 > 自定义作息 > 天数日期预算交通 > 同行与人数 > 旅行节奏 > 核心偏好 > 细节偏好 > 常规推荐。
${MULTI_CITY_RULES}

请生成完整TripPlan JSON。tripId="generated"，status="completed"，schemaVersion="0.2"。createdAt和updatedAt使用当前ISO 8601时间。预算对象mode必须等于"${input.budget.mode}"。`;
}

export function buildRepairPrompt(invalidOutput: string, issues: TripPlanQualityIssue[] | string) {
  const details = typeof issues === "string" ? issues : JSON.stringify(issues, null, 2);
  return `上一份TripPlan未通过确定性校验。只修复列出的结构、时间、地点和预算问题，不要改变用户需求，也不要引入新问题。

校验错误：
${details}

待修复JSON：
${invalidOutput.slice(0, 30000)}

重新计算所有活动起止时间、交通间隔、每日费用和总预算关系。只返回修复后的完整JSON。`;
}
