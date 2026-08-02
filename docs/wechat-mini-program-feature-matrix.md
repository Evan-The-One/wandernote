# Web 与微信小程序功能对照

状态只使用：`implemented_and_tested`、`implemented_waiting_real_appid`、`implemented_waiting_real_device`、`blocked`、`not_applicable`。

| 能力 | 小程序状态 | 说明 |
|---|---|---|
| 微信登录 | implemented_waiting_real_appid | code 服务端交换、身份哈希、可撤销短 Session、自动续期已实现 |
| 退出登录 | implemented_waiting_real_appid | 撤销当前小程序 Session |
| 生成行程/进度恢复 | implemented_waiting_real_appid | 异步 job、幂等、冷启动恢复 |
| 我的行程/详情/删除 | implemented_waiting_real_appid | 所有权校验与分页摘要 |
| 修改单个活动 | implemented_waiting_real_appid | 快捷意图 + 自由补充，复用 selected_activities revision |
| 修改整天 | implemented_waiting_real_appid | 复用 full_day revision 与额度 |
| 重新安排整份 | blocked | 需新增非覆盖式完整版本记录，当前 Trip 只有 currentPlanJson |
| 撤销最近修改 | implemented_waiting_real_appid | 乐观版本锁与所有权校验 |
| 结构化重点强调 | implemented_waiting_real_appid | 服务端从 Web 同一确定性摘要生成结构化 segments，小程序安全 Text 渲染；历史内容回退纯文本 |
| 出发与返程/出发前提醒 | implemented_waiting_real_appid | 数据保留，视觉需真机复核 |
| 海报示例 | implemented_and_tested | 静态资源，不调用 AI、不扣点 |
| 海报页数/点数/生成任务 | blocked | Web 服务可复用，但 Bearer 异步适配尚未安全拆分 |
| 私有海报短期下载 | blocked | 当前输出是结构化海报规格，不是服务端合成 JPEG |
| 多页查看与相册保存 | blocked | 等待服务端高清文件与真实设备权限测试 |
| 点数余额与记录 | implemented_waiting_real_appid | Web/小程序同一 userId、同一账本 |
| 分享/只读/撤销 | implemented_waiting_real_appid | 哈希 shareToken、只读接口、撤销已实现 |
| 绑定邮箱与账户合并 | blocked | 未开放；点数账本与订单合并尚无可证明安全的事务方案 |
| 联系支持与法律页面 | implemented_waiting_real_device | 统一 PUBLIC_CONTACT_EMAIL，未配置时安全降级 |
| 账户注销入口 | blocked | Web 有申请接口，小程序 Bearer 适配未完成 |
| 微信支付 | not_applicable | 首发无支付；分类未确认，全部开关关闭 |

`blocked` 项不会在首发体验版中伪装成可用按钮。支付之外的核心阻断项完成前，不应提交正式审核版。
