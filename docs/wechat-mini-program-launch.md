# 微信小程序上线清单

状态：开发版基础工程完成，外部平台配置未完成。不得据此宣称已经上线、备案、完成 AI 登记或启用微信支付。

## 公众平台人工事项

- [ ] 确认真实主体类型（当前产品计划为个体工商户，但必须以最终执照为准）
- [ ] 注册并认证小程序，提供真实 AppID
- [ ] 添加开发者与体验者权限
- [ ] 确认名称、简称、介绍与真实服务类目
- [ ] 完成小程序备案
- [ ] 配置隐私保护指引、用户协议、AI 内容说明与客服方式
- [ ] 核验生成式 AI 服务合规要求；当前 `GEN_AI_SERVICE_REGISTRATION_STATUS=unverified`
- [ ] 配置 `request`、`downloadFile` 合法域名
- [ ] 在开发者工具运行并完成体验版上传
- [ ] iPhone 与 Android 微信真机全流程测试
- [ ] 准备审核测试账号、步骤和审核备注

不得虚构运营主体名称、统一社会信用代码、经营地址、备案号、AI 登记号或微信商户号。

## 服务端配置

必须在 Vercel 服务端配置，不得写入小程序包：

- `WECHAT_MINIAPP_APP_ID`
- `WECHAT_MINIAPP_APP_SECRET`
- `AUTH_SECRET`
- `MINIAPP_API_ORIGIN`
- `GEN_AI_SERVICE_REGISTRATION_STATUS`
- `GEN_AI_SERVICE_REGISTRATION_NUMBER`（仅在真实取得后设置）
- `AI_CONTENT_LABEL_VERSION`

建议合法域名：

- API：`https://www.yjchufa.com`（未来如启用 `api.yjchufa.com`，先完成 DNS、证书、Vercel 域名和大陆网络测试）
- 示例图：`https://www.yjchufa.com`
- 私有海报下载：服务端授权的 HTTPS 短期地址；不得暴露永久私有 URL

当前没有 WebSocket 和上传域名需求。不要未经确认修改 Cloudflare 或 Vercel DNS。

## 微信支付预留

代码保留 `wechat_pay` Provider 边界和人民币点数包 ID，但所有包 `enabled=false`、金额未发布，生产必须保持：

```text
MINIAPP_PAYMENTS_ENABLED=false
WECHAT_PAY_MODE=disabled
PAYMENT_PROVIDER_WECHAT_ENABLED=false
```

未来启用前还需商户号、AppID 绑定、API v3 Key、商户证书序列号、私钥和通知地址。服务端只接受 `packId`，金额和点数使用服务端快照；必须以验签解密后的异步通知履约，不能依赖客户端成功回调发点。Creem 与微信支付配置、订单 Provider 和密钥完全隔离。

## 真机验收

必须覆盖 iPhone 与 Android：首次微信登录、生成与恢复、整天/局部修改、分享只读、海报生成与多页保存、拒绝相册后重新授权、退出并恢复、邮箱绑定、弱网、关闭重开、不同微信账号。没有正式 AppID 和开发者权限时只能标记“待验收”，不能用浏览器模拟替代。
