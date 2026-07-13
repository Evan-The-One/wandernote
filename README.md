# 漫游册 WanderNote

面向中文用户的 AI 私人旅行管家：极简填写 → 真实 AI 规划 → 确定性质量校验 → 持久化攻略 → 单日调整与一次撤销 → 只读链接分享。

公网 Beta：[https://wandernote-beryl.vercel.app](https://wandernote-beryl.vercel.app)

## 技术栈

Next.js 16 App Router、React 19、TypeScript、Tailwind CSS 4、Zod 4、OpenAI Responses API、Neon PostgreSQL、Drizzle ORM、pnpm。

## 本地开发

要求 Node.js 20.9+。

```bash
pnpm install
cp .env.example .env.local
pnpm db:migrate
pnpm dev
```

访问 `http://localhost:3000`。`.env.local` 需要配置：

```dotenv
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.4-mini
DATABASE_URL=
AI_GENERATION_ENABLED=true
FULL_GENERATION_DAILY_LIMIT=3
DAY_REVISION_DAILY_LIMIT=10
BETA_ACCESS_CODE=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

`NODE_USE_ENV_PROXY`、`HTTPS_PROXY`、`HTTP_PROXY` 只属于本机开发；需要时通过终端临时提供，禁止提交，也不要配置到生产环境。Key 不得使用 `NEXT_PUBLIC_` 前缀。

## 数据、权限与成本保护

- Neon PostgreSQL 是最终数据源；TripInput、TripPlan、DayPlan JSONB 在应用边界经过 Zod。
- 首次 API 访问生成 256-bit 随机 session，写入 HTTP-only、SameSite=Lax Cookie；生产环境自动启用 Secure。
- 攻略使用不可预测 UUID。链接持有者可只读，只有 Cookie 对应的创建者可修改和撤销。
- localStorage 仅用于表单、页面缓存和网络失败恢复，不再是权威数据源。
- 生成/修改次数由环境变量控制；数据库局部唯一索引阻止同一访客并发完整生成，version 乐观锁阻止修改覆盖。
- `AI_GENERATION_ENABLED=false` 在调用模型前拒绝请求。`BETA_ACCESS_CODE` 非空时启用服务端访问码验证。

## 部署（Vercel + Neon）

1. Neon 创建 PostgreSQL 项目，取得 pooled `DATABASE_URL`，在安全环境执行 `pnpm db:migrate`。
2. GitHub 仓库导入 Vercel，使用 Node.js Fluid Compute。
3. 在 Vercel Project Settings 配置 `.env.example` 中的变量，不配置本机代理。
4. `NEXT_PUBLIC_APP_URL` 设置为正式 HTTPS 地址，部署后执行手机端端到端验收。

生成和单日修改路由显式设置 `maxDuration = 120` 秒。Vercel Hobby 当前 Fluid Compute 上限为 300 秒，足以保留现有 30–60 秒同步模型调用及全部质量校验。

另外应在 OpenAI 项目的 Limits 中设置 Monthly budget 和 Notification threshold。该预算是软提醒而非硬封顶，因此应用限额和 AI 总开关仍需保留。

## 检查命令

```bash
pnpm typecheck
pnpm lint
pnpm build
pnpm db:check
pnpm test:integration
pnpm scan:secrets
```

当前不开发正式登录、支付、地图、实时天气、图片、PDF、小程序、iOS 或多城市规划。详细范围见 [PRODUCT_SPEC.md](./PRODUCT_SPEC.md)，协议见 [DATA_SCHEMA.md](./DATA_SCHEMA.md)。
