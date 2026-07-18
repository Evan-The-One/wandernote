# 旅行海报账户升级

## 数据变更

- 新增 `users`、`user_sessions`、`email_login_tokens`。
- `trips.user_id` 可空；匿名攻略继续使用 `visitor_id`，邮箱验证成功后只认领当前匿名访客尚未归属账户的攻略。
- `entitlement_ledger` 增加可空的 `principal_type` 与 `principal_id`；旧匿名权益记录保持可读，V2 新权益按已验证用户计算。

迁移文件：`drizzle/0003_user_accounts.sql`。迁移只新增表、列和索引，不删除历史数据。回滚时应先停止新登录，再移除新增索引/列/表；不要删除 `trips.visitor_id`。

## 邮件登录配置

生产环境需要 `AUTH_SECRET`、`AUTH_EMAIL_FROM`、`RESEND_API_KEY`。发件域名必须在 Resend 验证。缺少任一项时普通攻略仍可匿名使用，但邮件登录与新海报生成不可用。

登录链接有效期 15 分钟、单次使用；会话 Cookie 为 HttpOnly、Secure（生产）、SameSite=Lax。
