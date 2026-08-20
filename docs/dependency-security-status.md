# 依赖安全状态

审计日期：2026-08-20。命令：`pnpm audit`。

## 结论

当前告警主要来自 Taro/webpack 开发与构建工具的传递依赖，并不由 Web Production Node runtime 直接加载。不能将“build only”解释为无风险：开发机或 CI 若处理恶意项目/路径仍可能触发。此次不使用强制 override，以免破坏小程序构建；升级应随 Taro 官方依赖链更新后逐项验证。

## 重点 High / Critical 边界

| 包/链路 | 告警类型 | 可触达边界 | 处置 |
| --- | --- | --- | --- |
| `git-clone` via `@tarojs/cli` | 命令注入 | 仅开发 CLI 下载模板；生产请求不可达 | 禁止 CI/开发机使用不可信仓库参数，等待 Taro 升级到 patched transitive version |
| `http-cache-semantics` via Taro download | ReDoS | 开发 CLI 网络下载路径 | 不在生产 runtime；等待上游升级 |
| `html-minifier` via Taro webpack runner | ReDoS | 小程序构建期 | 构建输入只来自受控仓库；等待上游 patch |
| `webpack-dev-server` / `esbuild` | dev server 信息暴露/跨源访问 | 本地开发服务 | 开发服务不对公网监听；Preview/Production 不运行 dev server |
| 其余 audit High/Critical | Taro/webpack 传递依赖为主 | 开发/构建或小程序包编译链 | 发布前复跑 audit，优先接受 Taro patch/minor；每次升级必须同时验证 Web 与 Taro build |

## 升级策略

1. 优先升级直接依赖的 patch/minor，禁止无测试的 major 或 lockfile override。
2. 每次变更运行 Web typecheck/lint/build 与 miniapp typecheck/lint/build。
3. 若上游尚未发布兼容修复，保留告警并限制开发服务网络暴露。
4. Production 容器不得安装/运行 Taro CLI、webpack dev server 或 drizzle-kit dev server。

完整 advisory 明细保留在本次 CI/本地审计输出，不提交包含机器路径的原始审计文件。
