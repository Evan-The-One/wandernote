# 0007 tester generation access

Adds an account-level `generation_access_mode` with a safe `normal` default and
an audit timestamp. Existing accounts, trips, sessions, points, posters, and
ownership are unchanged.

Rollback (only after all accounts have been restored to `normal`):

```sql
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_generation_access_mode_check;
ALTER TABLE users DROP COLUMN IF EXISTS generation_access_updated_at;
ALTER TABLE users DROP COLUMN IF EXISTS generation_access_mode;
```
