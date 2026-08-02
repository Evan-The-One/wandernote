# 一键出发微信小程序

这是基于 Taro 4、React 与 TypeScript 的独立微信小程序客户端，不使用 `web-view` 承载核心产品。它复用一键出发的 Next.js 服务端、Neon 数据、账户、行程、点数与海报领域逻辑。

## 本地构建

```bash
pnpm miniapp:typecheck
pnpm miniapp:lint
pnpm miniapp:test
pnpm miniapp:build
```

构建产物位于 `apps/miniprogram/dist`。在微信开发者工具中导入 `apps/miniprogram`，正式联调前把 `project.config.json` 中的 `touristappid` 替换为已授权 AppID，并在服务端设置 `WECHAT_MINIAPP_APP_ID`、`WECHAT_MINIAPP_APP_SECRET`。个人的 `project.private.config.json` 不得提交。

## 安全边界

- AppSecret、支付私钥、OpenAI Key 均只存在服务端。
- 小程序只保存短期不透明 Session 和轮换用 Refresh Token。
- 所有 Trip、Points、Poster 接口由服务端 Session 解析 `userId`，不信任客户端传入身份。
- 支付默认关闭；客户端不会显示可付款入口。
- 不默认申请定位、手机号、相机、通讯录、麦克风或相册权限。相册权限只在用户主动保存海报时申请。

## 尚需外部条件

正式 AppID、开发者权限、合法域名、主体认证、备案、服务类目、隐私指引与真机测试尚需在微信公众平台完成。详见 `docs/wechat-mini-program-launch.md`。
