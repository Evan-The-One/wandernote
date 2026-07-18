# 安全说明

## 当前安全边界

- OpenAI 与数据库凭据只存在于服务端环境变量中，客户端不接触第三方密钥。
- 匿名访客通过 `HttpOnly`、`Secure`（生产环境）、`SameSite=Lax` Cookie 识别；Cookie 使用 HMAC 签名，历史未签名 Cookie 仅在数据库已存在对应访客时迁移。
- 攻略 UUID 是只读分享能力链接。修改、撤销和最近攻略必须同时匹配服务端访客身份；修改还使用版本号防止并发覆盖。
- 所有 Cookie 关联的写接口验证 `Origin`、Fetch Metadata、JSON Content-Type、请求体大小和 Zod Schema。
- AI 请求同时受访客日额度、风险哈希小时限流、单访客并发唯一约束、全站并发、幂等键、每日成本软/硬熔断保护。
- 数据查询使用 Drizzle 参数化表达式；React 默认转义用户内容；管理 CSV 对公式注入字符进行转义。
- 生产构建关闭浏览器 Source Map，启用压缩，并发送 CSP、HSTS、点击劫持、MIME 嗅探和权限限制响应头。

## 环境变量

生产环境应独立设置高熵的 `VISITOR_SESSION_SECRET` 与 `RATE_LIMIT_SALT`，不要复用 API Key。所有秘密只通过 Vercel Environment Variables 配置，不写入仓库或日志。`AI_BLOCKED_RISK_HASHES` 接受逗号分隔的风险哈希，用于紧急封禁，不接受原始 IP。

## 商业化额度设计

当前额度由服务端根据访客、任务和北京时间窗口强制执行，前端只展示结果。未来加入账户、会员、广告解锁和图片生成时，应增加服务端额度账本：每次扣减使用唯一业务键并在数据库事务中完成，记录额度类型、来源、消费、退款和过期时间。客户端传来的会员等级或剩余额度一律不可信。

建议额度类型：`trip_generation`、`day_revision`、`partial_revision`、`image_generation`。免费赠送、会员月包和广告奖励分别形成可审计的额度批次；失败退款必须幂等。

## 平台层防护

应用层限流不能替代边缘防护。正式商业投放前建议在 Vercel Firewall 或 Cloudflare WAF 配置：

- `/api/trips*` 按 IP、ASN 或地区配置速率规则和 Bot 管理；
- `/api/admin/*` 使用更严格的速率限制和可选 IP Allowlist；
- 开启异常流量告警、托管规则集和 DDoS 防护；
- 保留 `www.yjchufa.com` 的端到端 HTTPS，避免缓存任何 API 或管理响应。

Cloudflare 不能让公开网页接口变成秘密。攻击者仍可模拟合法浏览器，因此后端额度、幂等、预算熔断和所有权检查必须始终保留。

## 已知边界

- 只读分享链接由持有链接的人访问，不等同于账户级私密空间；用户不应在旅行要求中填写敏感身份信息。
- User-Agent 与 Origin 可以被非浏览器客户端伪造，它们只作为附加信号，不是认证机制。
- 当前管理员失败登录计数是进程内保护；Serverless 多实例下应再配置 Vercel 或 Cloudflare 边缘限流。商业化正式账户上线后，应改为成熟身份服务和多因素认证。
- 浏览器代码无法真正隐藏。压缩和关闭 Source Map 只减少源码可读性，产品逻辑和秘密必须留在服务端。

## 漏洞报告

请通过站点配置的公开联系邮箱报告安全问题。请勿在报告中包含真实用户数据、Cookie、密钥或可直接利用的公开攻击载荷。
