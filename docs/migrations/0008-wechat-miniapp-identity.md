# 0008 微信小程序身份与会话

新增 `user_identities`、`miniapp_sessions`、`miniapp_binding_attempts`。不修改现有用户、攻略、点数、订单或海报数据。

回滚前必须确认没有小程序身份在使用；随后按 `miniapp_binding_attempts` → `miniapp_sessions` → `user_identities` 顺序删除新表。生产启用后不建议回滚，只应关闭微信登录开关。
