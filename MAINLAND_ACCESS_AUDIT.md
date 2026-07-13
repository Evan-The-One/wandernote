# 一键出发：中国大陆访问审计与部署准备

## 结论

当前中国大陆手机网络无法稳定访问，不是前端业务代码能够直接解决的问题。Vercel 官方说明其没有中国大陆服务器或 CDN 节点，`.vercel.app` 子域可能被阻断或限速，跨境路由也可能造成高延迟。因此保留现有 Vercel Beta，同时准备自定义域名，是当前成本最低的下一步；即使绑定域名，也不能承诺中国大陆稳定可用。

官方参考：

- [Accessing Vercel-hosted sites from mainland China](https://vercel.com/kb/guide/accessing-vercel-hosted-sites-from-mainland-china)
- [Vercel Global Network and Regions](https://vercel.com/docs/regions)
- [Configuring regions for Vercel Functions](https://vercel.com/docs/functions/configuring-functions/region)
- [Vercel Domains](https://vercel.com/docs/domains)

## 前端资源审计

- 无 Google Fonts 或其他远程字体；字体使用系统字体栈。
- 无外部图片域名，当前页面不依赖远程图片。
- 无第三方前端脚本、远程 CSS、海外统计 SDK。
- 浏览器只调用同源 `/api/*`；OpenAI Responses API 只由 Node.js 服务端调用。
- Tailwind CSS 与全部 JavaScript 均由 Next.js 构建并随站点发布。

这意味着页面没有额外的 Google、图片 CDN 或海外 SDK 单点故障。剩余主要风险是 Vercel 域名、Vercel 海外网络和跨境链路本身。

## 自定义域名准备

购买域名后，在当前 Vercel 项目添加域名、按提示配置 DNS，并把 `NEXT_PUBLIC_APP_URL` 更新为正式 HTTPS 地址后重新部署。代码会优先使用该变量生成 canonical 与 Open Graph 地址，无需新建仓库、项目或数据库。

候选仅用于命名讨论，尚未查询注册状态：

- 拼音全称：`yijianchufa.com`、`yijianchufa.cn`
- 简短拼音：`yjchufa.com`、`yjcf.travel`、`chufa.ai`
- 英文或混合：`oneclicktrip.com`、`goyijian.com`、`ready2chufa.com`

自定义域名可能降低 `.vercel.app` 域名直接受限的概率，也有利于品牌记忆与分享；它不会增加 Vercel 中国大陆节点，不能消除跨境延迟、国际出口波动或监管因素。

## 香港或亚洲入口评估

Vercel提供香港 `hkg1`、东京 `hnd1`、首尔 `icn1` 和新加坡 `sin1` 等函数区域，但静态资源仍由 Vercel 全球 CDN 提供。当前 Neon 数据库位于美国东部，OpenAI 调用也适合美国区域；直接把现有函数迁到香港会增加函数到数据库和 OpenAI 的延迟，且不能解决 `.vercel.app` 域名可达性。

建议顺序：

1. 先绑定自定义域名并进行中国大陆多运营商实测。
2. 保持当前美国函数区域作为 AI 与数据库主入口。
3. 如果真实测试仍不稳定，再评估 Pro 方案的亚洲函数区域或独立香港部署；届时应同步评估亚洲数据库副本、异步 AI 任务与成本。
4. 本阶段不创建第二项目、不迁移中国大陆服务器、不启动 ICP 备案，也不删除当前 Vercel 部署。
