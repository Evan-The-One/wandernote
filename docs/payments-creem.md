# Creem 点数支付运维

一键出发仅接入 Creem 的一次性点数购买，不提供订阅或自动续费。Stripe 只保留 Provider 枚举，不启用实际流程。

## 环境与开关

- `PAYMENT_PROVIDER=disabled|creem|stripe`
- `PAYMENTS_ENABLED=false|true`
- `CREEM_MODE=test|production`
- `CREEM_API_KEY`
- `CREEM_WEBHOOK_SECRET`
- `CREEM_PRODUCT_POINTS_4`
- `CREEM_PRODUCT_POINTS_10`
- `CREEM_PRODUCT_POINTS_25`
- `CREEM_MODERATION_ENABLED=true|false`
- `CREEM_PRODUCTION_APPROVED=true|false`

Test 使用 `https://test-api.creem.io` 和测试产品；Production 使用生产 API、生产产品和独立 Webhook Secret。禁止混用。

## Checkout

客户端只提交 `packId`。服务端读取可信套餐、登录用户和产品 ID，创建内部 `payment_orders` 后调用 Creem Checkout。成功页只轮询内部订单状态，不能发点。

## Webhook 与到账事务

Webhook 地址为 `/api/webhooks/creem`。处理器对原始请求体使用 `CREEM_WEBHOOK_SECRET` 做 HMAC-SHA256 校验。`payment_webhook_events(provider, provider_event_id)` 唯一索引阻止重放。

`checkout.completed` 在同一数据库事务中锁定订单和点数账户，核对商品、金额、币种和用户归属，写入 `purchase_credit` 账本并把订单置为 `fulfilled`。任何一步失败会整体回滚，Creem 可安全重试。

## Moderation

所有新送入图片模型的 Prompt 先调用 Creem `/v1/moderation/prompt`。`allow` 才继续；`flag`、`deny` 阻止；超时或 5xx fail closed，不调用 OpenAI，海报预留点会释放。缓存素材没有新 Prompt 时不重复调用模型。

## 退款与拒付

- 未消费购买点数：扣回并写 `purchase_refund`。
- 已消费部分点数：订单进入 `manual_review`，不允许余额为负。
- `dispute.created`：订单标记 `disputed`，保留已有内容，暂停后续付费生成应由账户风控检查执行。

## 生产开启门槛

Creem 审核、KYC/KYB、收款账户、生产产品、生产 Webhook、Moderation 覆盖和 Test Mode 验收全部完成，并获得用户明确同意后，才可设置：

```text
PAYMENT_PROVIDER=creem
PAYMENTS_ENABLED=true
CREEM_MODE=production
CREEM_PRODUCTION_APPROVED=true
CREEM_MODERATION_ENABLED=true
```

未满足时保持 `PAYMENTS_ENABLED=false`。

## 关闭支付

将 `PAYMENTS_ENABLED=false` 并重新部署。已有攻略、海报和点数账本不会受影响。

## 排错

付款完成但未到账：按内部订单号查询 `payment_orders`，再核对 `payment_webhook_events` 和 `point_ledger`。可在 Creem Dashboard 重放 Webhook；不得手工伪造成功 URL。重放后唯一事件键和账本 business key 会阻止重复发点。
