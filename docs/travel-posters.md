# 精美旅行海报

## 产品边界

文字攻略继续负责规划、修改与执行；“保存今日行程为图片”继续负责单日离线查看；旅行海报只在结果确认后由创建者主动生成，用于整趟旅行的保存与分享。旧 `premium_trip` 模板入口已经下线，历史记录不删除。

## 技术方案

采用混合方案：服务端把当前 `TripPlan` 压缩为每页1至2天、每天最多5个核心活动，并使用 `gpt-image-2` 生成不含文字的目的地旅行杂志底图；浏览器 Canvas 再叠加来源于结构化行程的中文标题、时间、地点、页码和品牌。这样保留 AI 场景与拼贴质感，同时避免图片模型生成密集中文时出现乱码或行程信息错位。

页数规则：1至2天1张；3至4天为封面加2张详情；5至7天为封面加每2天一张详情。输出为高质量 JPEG，支持逐张保存、全部保存和系统分享。

## 权限、额度与幂等

- 新功能使用独立 `travel_poster` 权益，每个匿名访客赠送1次；旧模板额度不会占用海报额度。
- 只有行程创建者可创建任务；分享访客只能读取成功结果。
- 缓存键包含 trip、version、imageType、aspectRatio 与 version；相同版本重复请求复用任务。
- 任务先写入 `running`，成功后保存结构化内容和压缩 WebP 底图；失败写入安全错误码并自动返还权益。
- 请求经过同源校验、访客 Cookie、IP 风险限制、全站 AI 预算熔断和数据库访客锁；API Key 只存在服务端。

## 成本

生产默认 `OPENAI_IMAGE_MODEL=gpt-image-2`、`OPENAI_IMAGE_QUALITY=medium`。成本按实际页数估算并记录到任务和 `ai_usage` 分析事件。官方公开参考价会变化，运维时应以 OpenAI 当前价格页为准。

## 环境变量

```env
OPENAI_IMAGE_MODEL=gpt-image-2
OPENAI_IMAGE_QUALITY=medium
FREE_LIFETIME_PREMIUM_IMAGE_LIMIT=1
```

## 回滚

应用可以回滚到本轮安全检查点。无需删除 `trip_image_tasks` 或 `entitlement_ledger`；`premium_trip` 与 `travel_poster` 通过 `image_type` 和独立权益类型隔离。不得为了回滚删除历史任务。
