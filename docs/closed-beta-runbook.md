# OneClick Travel 真实用户内测运行手册

## 上线门槛

- Production health 的 database、generation、auth 均为 healthy。
- Production 支付保持关闭；内测点数仅通过管理员 `admin_grant` 发放。
- `main`、`origin/main` 与 Production deployment commit 一致。
- TypeScript、ESLint、Web Build、小程序 TypeScript/ESLint/Build、密钥扫描通过。
- 管理员可查看 1/7/30 天漏斗、健康状态、匿名用户摘要和反馈。

## 每日巡检（北京时间）

1. 查看最近 24 小时 Trip、Revision、Poster 成功率及 P95。
2. 查看漏斗最大流失步骤；样本不足时只记录，不做产品结论。
3. 处理 `new` 反馈：关联 Trip/Poster，仅查看排障所需字段。
4. 检查 AI 成本和 Visual cache hit；不得因内测临时打开支付。
5. 对失败请求使用 requestId 排查，不复制完整行程或用户输入到普通日志。

## 反馈闭环

- 用户分类：行程不合理、时间安排问题、图片不匹配、海报问题、操作不清楚、其他建议。
- 状态：`new → reviewing → resolved`。
- Trip/Poster 关联由服务端校验所有权；管理员页面只展示必要内容。
- 图片不匹配时记录 activity category、asset id/category、cache/generated 与 fallback reason；不要公开私有图片 URL。

## Tester 运营

- Tester 仅豁免 Trip/Revision 的产品每日次数。
- Tester 仍受鉴权、所有权、并发/频率限制、内容安全、全站熔断和成本统计约束。
- Poster 始终消耗点数；测试点通过管理员按注册邮箱发放，并填写原因。
- 每次发点核对 ledger，幂等重试不得重复入账。

## 故障处理

- Trip/Poster 请求超时：先按幂等键查询已有任务，不直接重提。
- 客户端未收到成功响应：恢复轮询；succeeded 任务直接回读。
- Poster 部分失败：保留成功页，失败页单独重试；确认预留点正确释放，禁止重复 consume。
- Production 健康异常或成本熔断：停止新内测邀请，保留历史读取与分享。

## 内测结束判定

- 关键路径连续 7 天无 P0 数据/权限/重复扣点事故。
- Trip、Poster 的成功率、P95、平均成功成本均可在后台解释。
- 所有有效反馈已有状态，阻断问题已解决或有明确降级方案。

