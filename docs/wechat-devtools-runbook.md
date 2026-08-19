# 微信开发者工具运行手册

## 前置条件

1. 在微信公众平台完成主体注册，取得真实 AppID。
2. 在“管理 → 成员管理”添加开发者与体验成员。
3. 在“开发 → 开发管理 → 开发设置”配置服务器域名。
4. 在 Vercel Production/Preview 分别设置 `WECHAT_MINIAPP_APP_ID` 和 `WECHAT_MINIAPP_APP_SECRET`；AppSecret 只放服务端。

## 导入与运行

```bash
pnpm install
pnpm miniapp:dev
```

打开微信开发者工具，导入仓库的 `apps/miniprogram` 目录。将 `project.config.json` 的 `touristappid` 换成真实 AppID；不要提交个人生成的 `project.private.config.json`。构建目录为 `dist/`，`miniprogramRoot` 指向该目录。

在开发者工具中：

1. 登录被授权的开发者微信。
2. 不勾选“忽略合法域名校验”作为验收依据。
3. 调用首页登录，确认 `wx.login` 返回真实一次性 code。
4. 服务端日志只使用 requestId 检索，不复制 code、openid 或 session_key。
5. 验证登录、生成、编辑、撤销、分享和海报流程。
6. 通过“上传”创建体验版，并填写真实版本号与测试说明。

## 首次完整联调顺序

1. `pnpm install && pnpm miniapp:typecheck && pnpm miniapp:lint && pnpm miniapp:build`。
2. 填入真实 AppID 后编译，确认主包/分包无超限；不得提交 `project.private.config.json`。
3. 配置 request/download 合法域名，关闭“不校验合法域名”的调试例外后重新编译。
4. 完成微信登录，检查 Session 刷新和退出；日志不得出现 code、openid、unionid 或 session_key。
5. 创建攻略，切后台/断网/关闭后重开，确认 jobId 恢复且不重复创建。
6. 验证修改活动、整天修改、重排、撤销、分享及撤销分享。
7. 验证海报报价、生成、多页查看、相册首次授权/拒绝/重新授权和私有下载。
8. 检查 `onShareAppMessage`；`onShareTimeline` 仅在平台能力和内容策略确认后启用。
9. 上传体验版，设置体验成员；按 `device-test-checklist.md` 完成 iPhone 与 Android。
10. 提审前逐项复核隐私指引、AI说明、客服、类目、备案状态和支付关闭状态。

## 合法域名建议

- request：`https://www.yjchufa.com`（当前接口无跳转）
- downloadFile：`https://www.yjchufa.com`（正式私有下载接口完成后）
- uploadFile：第一版不配置
- WebSocket：第一版不配置

不要配置 Vercel 随机部署域名，也不要把 `api.weixin.qq.com` 配为客户端域名。若启用 `api.yjchufa.com`，必须先完成 DNS、HTTPS、平台备案与大陆真机网络测试。
