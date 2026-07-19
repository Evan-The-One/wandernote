# 0004 点数、视觉资产与合规迁移

迁移只新增表和索引，不改写或删除 `trips`、`trip_image_tasks`、`entitlement_ledger` 等历史数据。部署前备份 Neon；执行 `pnpm db:migrate` 后用只读查询核对六张新表。

回滚仅在确认没有新交易后执行，按依赖顺序删除 `account_deletion_requests`、`user_legal_acceptances`、`legal_documents`、`payment_orders`、`point_ledger`、`point_accounts`、`place_visual_assets`。生产环境不得自动回滚或删除已有账本记录。
