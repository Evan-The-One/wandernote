# 漫游册 WanderNote

漫游册是一款面向中文用户的 AI 私人旅行管家。用户输入目的地、日期、人数、预算和少量偏好，即可获得按天组织、易读且可继续调整的私人旅行攻略。

## 当前版本目标

V0.1 先验证最小体验闭环：极简填写 → AI生成 → 质量校验 → 查看攻略 → 调整某一天 → 一次撤销。当前数据协议为V0.2；暂不接入数据库和实时旅行数据。

## 技术栈

- Next.js 16（App Router）
- React 19
- TypeScript
- Tailwind CSS 4
- Zod 4
- pnpm

项目采用单体全栈结构，核心数据协议和服务端规划模块与页面分离，未来可被小程序或 iOS 客户端复用。

## 运行项目

要求 Node.js 20.9 或更高版本。

```bash
pnpm install
pnpm dev
```

访问 `http://localhost:3000`。

复制环境变量模板并填入服务端 API Key：

```bash
cp .env.example .env.local
```

`OPENAI_API_KEY` 为必填；`OPENAI_MODEL` 可选，默认使用 `gpt-5.4-mini`。不要将 Key 使用 `NEXT_PUBLIC_` 前缀。

生产检查：

```bash
pnpm typecheck
pnpm lint
pnpm build
pnpm start
```

## 当前路由

- `/`：产品首页
- `/create`：旅行需求填写
- `/generating`：真实AI生成过程
- `/trip`：当前浏览器最近生成的攻略
- `POST /api/trips/generate`：验证输入并生成结构化攻略
- `POST /api/trips/revise-day`：只生成并校验一个更新后的DayPlan

## 后续开发计划

1. 持续运行五组固定质量回归并优化规划稳定性。
2. 接入 PostgreSQL，保存攻略和单日修订版本。
3. 增加基础监控并部署公开测试网址。

详细范围见 [PRODUCT_SPEC.md](./PRODUCT_SPEC.md)，数据协议见 [DATA_SCHEMA.md](./DATA_SCHEMA.md)。
