ALTER TABLE users
  ADD COLUMN IF NOT EXISTS generation_access_mode text NOT NULL DEFAULT 'normal';

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS generation_access_updated_at timestamptz;

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_generation_access_mode_check;

ALTER TABLE users
  ADD CONSTRAINT users_generation_access_mode_check
  CHECK (generation_access_mode IN ('normal', 'tester_unlimited'));
