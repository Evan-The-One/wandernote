# 精美旅行图片

## 第一阶段

结果页在用户确认并调整文字攻略后，主动生成 `classic_timeline_v1` 模板图片。文字、时间、地点和交通全部来自对应版本的 TripPlan 快照；浏览器 Canvas 只负责排版，不调用 AI，不重新理解或改写行程。

- 3:4：默认，适合图文平台。
- 9:16：适合手机长图。
- 1:1：适合社交封面。
- 1～2天在内容允许时使用一张详情图；3～4天增加封面并自动分页；5～7天增加封面、每日详情和出发前摘要。
- 单日图片继续使用原有执行长图，不消耗高级图片额度。

## 任务与额度

`trip_image_tasks` 保存任务状态、行程版本、比例、模板版本、幂等哈希和模板快照。`entitlement_ledger` 使用可审计的 grant/consume/refund 记账模型，额度来源支持 `free_grant`，未来可扩展 `rewarded_ad`、`paid_credit`、`subscription` 和 `admin_grant`。

测试期每个匿名访客获得一次 lifetime 精美图片额度。同一行程版本与模板可以免费导出其他比例；新行程或修改后的新版本需要新的额度。额度检查和消费在数据库事务及访客 advisory lock 中完成，客户端状态不可信。

## 安全

- 只有行程创建者可以 POST 创建图片任务；分享访客只能 GET 查看已完成快照。
- 任务 ID、行程 ID 都是随机 UUID，不在文件名中加入访客标识。
- 接口使用现有同源、HttpOnly Cookie、请求体和 Schema 防护。
- 不抓取任意外部 URL，因此当前不存在图片抓取 SSRF 面。
- 静态氛围素材通过统一 `ImageSource` 元数据描述；当前只使用项目内的品牌图形，不使用未知版权图片。
- 图片修改失败不写回 TripPlan，也不影响文字攻略。

## AI 图片 Provider 预留

`ImageGenerationProvider` 已支持 `disabled` 实现和未来 OpenAI/其他服务实现。当前生产环境不调用图片 API。

官方 OpenAI 文档显示 GPT Image 2 支持图片生成与编辑，并可通过图片生成端点使用；但模型生成的中文长文本不应替代模板排版。未来若启用，只用于城市氛围图或插画，API Key 必须保存在服务端，生成素材经过缓存后再由模板叠加准确中文。

启用前需新增并评审：`IMAGE_GENERATION_PROVIDER`、`OPENAI_IMAGE_MODEL`、图片质量、单图成本上限、存储服务、内容安全、生命周期和删除策略。不得仅通过配置环境变量就绕过额度、幂等和全站成本熔断。

参考：

- https://developers.openai.com/api/docs/models/gpt-image-2
- https://developers.openai.com/api/docs/guides/image-generation

## 迁移与回滚

迁移只新增 `trip_image_tasks` 和 `entitlement_ledger`，不修改 trips、visitors、攻略 JSONB 或历史记录。应用路由也会使用 `CREATE TABLE/INDEX IF NOT EXISTS` 做安全补齐。

回滚应用时可直接部署安全检查点，新增表不会影响旧代码。确认不再需要图片任务且已备份后，才可以人工删除两张新增表；常规应用回滚不删除数据。
