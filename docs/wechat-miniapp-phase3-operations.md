# 微信小程序第三阶段运维准备

## 私有海报存储

服务端使用 Sharp + SVG 生成 1024×1536 JPEG，并写入 Vercel Private Blob。必须在现有 Vercel 项目 Storage 中连接一个 **Private** Blob store，使 Production 获得 `BLOB_READ_WRITE_TOKEN`（或项目 OIDC 权限）。未配置时接口 fail closed，生成前返回 `POSTER_STORAGE_UNAVAILABLE`，不会预留或扣除点数。

下载采用单页、只读、5分钟有效的 signed GET URL。数据库只保存 pathname、checksum、尺寸和文件大小，不保存长期公开 URL 或图片二进制。

## 微信平台域名

- request 合法域名：`https://www.yjchufa.com`
- downloadFile 合法域名：Private Blob store 的固定 `https://<store-id>.private.blob.vercel-storage.com`
- uploadFile：首版不配置
- WebSocket：首版不配置

ICP备案和域名在微信公众平台的可添加状态必须由管理员凭备案记录确认。没有确认前保持阻断。

## AppID

将正式 AppID 写入 `apps/miniprogram/project.config.json` 的本地副本或开发者工具项目设置；不要提交个人 `project.private.config.json`。Production 配置 `WECHAT_MINIAPP_APP_ID` 与 `WECHAT_MINIAPP_APP_SECRET`，Preview 单独配置测试凭据或保持未配置。AppSecret 只能在 Vercel 服务端。
