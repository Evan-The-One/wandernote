# 0010 Trip 版本与私有海报页面

新增 `trip_versions`、`poster_pages`，并为 `trips` 增加 `current_version_id`、为生成任务增加幂等 `request_id`。迁移会为已有完整攻略创建一次兼容版本，不改变行程、点数或海报账本。

生产部署由 `scripts/run-production-migrations.mjs` 获取 PostgreSQL advisory lock 后运行 Drizzle journal。仅 `VERCEL_ENV=production` 执行；失败会阻止新部署，旧 Production 不受影响。

回滚应用前应先停止新版写入。数据回滚顺序：删除 `poster_pages`；移除 `trips.current_version_id` 外键和列；删除 `trip_versions`；移除 `generation_jobs.request_id`。回滚会失去新版版本历史和私有海报索引，因此必须先备份，不能作为普通发布流程自动执行。
