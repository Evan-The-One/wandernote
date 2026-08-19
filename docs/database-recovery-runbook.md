# 数据库恢复 Runbook

## 触发条件

错误部署、点数账本与余额不一致、海报迁移/所有权异常、重复支付回调或大面积写入失败。

## 先止血

1. 记录 deployment、北京时间、requestId 和受影响业务键；不要复制私人行程。
2. 关闭对应写入开关；支付保持 disabled，必要时暂停新生成，不影响历史只读。
3. 禁止手工直接改余额、删除账本、重放未知 migration 或执行破坏性 reset。

## 识别

- 对照 `point_ledger` 汇总与 `point_accounts`，以不可变账本和唯一 `business_key` 为审计依据。
- 检查 `payment_webhook_events(provider,event_id)`、订单和 fulfilled 时间。
- 检查海报 task/page 的 owner、tripVersion、checksum 和 storageKey，不输出签名 URL。
- 确认 migration 版本、Production deployment commit 和 Neon 可恢复时间点。

## 恢复

优先回滚应用写入，再由 Neon 时间点恢复或经过复核的补偿事务修复。财务补偿必须追加新账本记录，不覆写历史。迁移回滚需先在隔离分支/副本演练；生产执行前人工确认。

## 验证

- Schema/外键/唯一键正常；历史攻略与分享只读正常。
- 账本逐用户可重算，余额与 reserved/lifetime 字段一致。
- 重复 callback、幂等请求不重复发点或扣点。
- 私有海报仍只允许所有者读取；健康检查和核心回归通过后恢复写入。

