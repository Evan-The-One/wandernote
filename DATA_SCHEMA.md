# V0.2 数据协议

## PostgreSQL 持久化表

- `visitors`：UUID、不可预测 session ID、创建/最近访问时间。
- `trips`：UUID、所有者、状态、TripInput JSONB、TripPlan JSONB、version、时间戳。
- `day_revisions`：目标天、短指令、修改前后 DayPlan、摘要、planVersion、撤销标记。
- `generation_jobs`：生成类型、运行状态、耗时、非敏感错误码；用于限额和并发保护。
- `feedback`：评分、问题标签 JSONB、可选短评。

数据库不保存 API Key、代理配置、访问码原文或完整服务端请求日志。

运行时代码以 `src/schemas/trip.ts` 为准。TypeScript类型由Zod Schema推导。

## TripInput

只有目的地、天数和旅行风格是用户必填项。其余字段都有安全默认值。

```json
{
  "schemaVersion": "0.2",
  "destination": { "city": "杭州", "country": "中国" },
  "days": 3,
  "travelStyle": "romantic",
  "datePreference": { "type": "undecided", "startDate": null, "approximateText": null },
  "budget": {
    "mode": "unrestricted",
    "amount": null,
    "scope": null,
    "includesAccommodation": null,
    "includesIntercityTransport": null,
    "currency": "CNY"
  },
  "priorities": ["photogenic", "great_food"],
  "departureCity": null,
  "travelers": { "adults": 1, "children": 0 },
  "transportPreference": "mixed",
  "dayTripPreference": false,
  "additionalRequirements": null
}
```

### 日期

- `undecided`：`startDate`和`approximateText`均为`null`。
- `approximate`：填写`approximateText`，例如“国庆前后”。
- `exact`：填写ISO日期格式的`startDate`。

### 预算

- `unrestricted | economy | moderate | comfortable`：不填写精确金额。
- `custom`：必须填写`amount`、`scope`、是否包含住宿、是否包含往返大交通。

### 优先需求

最多3项：`great_food | photogenic | less_walking | avoid_crowds | hidden_gems | must_see | family_friendly | hotel_experience | nightlife | late_start | culture | nature`。历史数据中的`value_for_money`继续兼容读取，但新表单使用`late_start`（晚起下午逛）。

## TripPlan

```json
{
  "schemaVersion": "0.2",
  "tripId": "generated",
  "status": "completed",
  "title": "杭州3日浪漫慢游",
  "summary": "行程摘要",
  "destination": { "city": "杭州", "country": "中国" },
  "strategy": {
    "pace": "轻松",
    "recommendedStayArea": "湖滨商圈",
    "stayReason": "便于集中游览",
    "transportAdvice": "步行与短途公共交通结合"
  },
  "budget": {
    "mode": "unrestricted",
    "currency": "CNY",
    "estimateType": "range",
    "userBudgetAmount": null,
    "userBudgetScope": null,
    "includesAccommodation": null,
    "includesIntercityTransport": null,
    "estimatedTotal": null,
    "estimatedRange": { "min": 1800, "max": 3200 },
    "dailyCostTotal": null,
    "unallocatedCost": null,
    "unallocatedExplanation": null,
    "includedItems": ["市内交通", "餐饮", "常规门票"],
    "excludedItems": ["住宿", "往返大交通"],
    "notes": "区间仅作消费级别参考"
  },
  "days": [
    {
      "dayNumber": 1,
      "date": null,
      "title": "西湖初见",
      "theme": "湖景与街区",
      "intensity": "easy",
      "estimatedWalkingKm": 4,
      "estimatedCost": null,
      "activities": [],
      "dayTips": []
    }
  ],
  "generalTips": [],
  "dataDisclaimer": "不包含实时数据。",
  "createdAt": "2026-07-12T00:00:00Z",
  "updatedAt": "2026-07-12T00:00:00Z"
}
```

非custom预算时，活动和每日费用必须为`null`，计划只能给区间或不提供金额。custom预算时所有精确费用必须可加总核对。

## 旧数据迁移

`migrateTripInput()`会将V0.1 localStorage输入转换为V0.2：旧日期转为`exact`；旧总预算转为`custom`；旧兴趣映射为新优先需求。无法识别的数据会进入友好空状态，不导致页面崩溃。

## DayRevisionRequest

单日修改只发送必要上下文，不发送整份无关攻略：

```json
{
  "schemaVersion": "0.2",
  "originalInput": {},
  "strategy": {},
  "budget": {},
  "targetDayNumber": 2,
  "currentDay": {},
  "previousDay": {},
  "nextDay": {},
  "otherDaysCostTotal": 1200,
  "instruction": "第二天轻松一点，减少步行。"
}
```

模型只允许返回：

```json
{
  "targetDayNumber": 2,
  "updatedDay": {},
  "changeSummary": ["减少了一个主要活动", "降低了步行距离"]
}
```

客户端只替换目标`DayPlan`。其他日期不会发送给模型，也不会被模型返回。修改前的当天和预算快照保存在`wandernote:last-undo`，用于一次撤销。
