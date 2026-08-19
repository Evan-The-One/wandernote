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
| 重新安排整份 | implemented_waiting_real_appid | 新建 full_replan 任务和 trip_version，不覆盖旧版本；需真实 AI 与多设备联调 |
| 撤销最近修改 | implemented_waiting_real_appid | 基于 trip_versions 父版本恢复，创建 undo_restore 记录并使用乐观锁 |
| 结构化重点强调 | implemented_waiting_real_appid | 服务端从 Web 同一确定性摘要生成结构化 segments，小程序安全 Text 渲染；历史内容回退纯文本 |
| 出发与返程/出发前提醒 | implemented_waiting_real_appid | 数据保留，视觉需真机复核 |
| 海报示例 | implemented_and_tested | 静态资源，不调用 AI、不扣点 |
| 海报页数/点数/生成任务 | implemented_waiting_real_device | Bearer、动态分页、幂等、点数预留/返还与 Production 私有 Blob 已实现；仍需真实设备验证较长任务生命周期 |
| 私有海报短期下载 | implemented_waiting_real_device | Sharp 输出 JPEG、Private Blob 与5分钟 signed URL 已实现；等待真机权限与弱网测试 |
| 多页查看与相册保存 | implemented_waiting_real_device | 逐页取新令牌、下载、保存、进度和失败页重试已实现；等待 iPhone/Android 权限实测 |
| 点数余额与记录 | implemented_waiting_real_appid | Web/小程序同一 userId、同一账本 |
| 分享/只读/撤销 | implemented_waiting_real_appid | 哈希 shareToken、只读接口、撤销已实现 |
| 绑定邮箱与账户合并 | blocked | 未开放；点数账本与订单合并尚无可证明安全的事务方案 |
| 联系支持与法律页面 | implemented_waiting_real_device | Production 已配置统一 PUBLIC_CONTACT_EMAIL；等待真机 mailto/复制体验验证 |
| 账户注销入口 | implemented_waiting_real_appid | Bearer 所有权、二次确认、幂等 pending 申请和当前 Session 撤销已实现 |
| 微信支付 | not_applicable | 首发无支付；分类未确认，全部开关关闭 |

`blocked` 项不会在首发体验版中伪装成可用按钮。支付之外的核心阻断项完成前，不应提交正式审核版。
