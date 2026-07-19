CREATE TABLE IF NOT EXISTS point_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  available_points integer NOT NULL DEFAULT 0 CHECK (available_points >= 0), reserved_points integer NOT NULL DEFAULT 0 CHECK (reserved_points >= 0),
  lifetime_granted integer NOT NULL DEFAULT 0, lifetime_consumed integer NOT NULL DEFAULT 0, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS point_accounts_user_unique ON point_accounts(user_id);
CREATE TABLE IF NOT EXISTS point_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, type text NOT NULL,
  amount integer NOT NULL, balance_after integer NOT NULL CHECK (balance_after >= 0), business_key text NOT NULL,
  trip_id uuid REFERENCES trips(id) ON DELETE SET NULL, task_id uuid REFERENCES trip_image_tasks(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS point_ledger_business_key_unique ON point_ledger(business_key);
CREATE INDEX IF NOT EXISTS point_ledger_user_created_idx ON point_ledger(user_id,created_at DESC);
CREATE TABLE IF NOT EXISTS payment_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, provider text NOT NULL,
  provider_order_id text, package_id text NOT NULL, points integer NOT NULL CHECK(points > 0), amount_cents integer NOT NULL CHECK(amount_cents > 0),
  currency text NOT NULL DEFAULT 'CNY', status text NOT NULL DEFAULT 'pending', idempotency_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS payment_orders_idempotency_unique ON payment_orders(idempotency_key);
CREATE UNIQUE INDEX IF NOT EXISTS payment_orders_provider_order_unique ON payment_orders(provider,provider_order_id) WHERE provider_order_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS place_visual_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), public_asset_id uuid NOT NULL DEFAULT gen_random_uuid(), region text, destination text NOT NULL,
  canonical_place_name text NOT NULL, normalized_place_name text NOT NULL, aliases jsonb NOT NULL DEFAULT '[]'::jsonb,
  activity_category text NOT NULL, visual_style_version text NOT NULL, image_model text NOT NULL, prompt_version text NOT NULL,
  asset_data_url text NOT NULL, content_hash text NOT NULL, review_status text NOT NULL DEFAULT 'pending', is_generic boolean NOT NULL DEFAULT false,
  generated_cost_usd text NOT NULL DEFAULT '0', reuse_count integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS place_visual_assets_public_unique ON place_visual_assets(public_asset_id);
CREATE UNIQUE INDEX IF NOT EXISTS place_visual_assets_cache_unique ON place_visual_assets(destination,normalized_place_name,activity_category,visual_style_version,image_model,prompt_version);
CREATE INDEX IF NOT EXISTS place_visual_assets_review_idx ON place_visual_assets(review_status,updated_at DESC);
CREATE TABLE IF NOT EXISTS legal_documents (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), document_type text NOT NULL, version text NOT NULL, published_at timestamptz NOT NULL DEFAULT now(), active boolean NOT NULL DEFAULT true);
CREATE UNIQUE INDEX IF NOT EXISTS legal_documents_type_version_unique ON legal_documents(document_type,version);
CREATE TABLE IF NOT EXISTS user_legal_acceptances (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, document_type text NOT NULL, version text NOT NULL, accepted_at timestamptz NOT NULL DEFAULT now());
CREATE UNIQUE INDEX IF NOT EXISTS user_legal_acceptances_unique ON user_legal_acceptances(user_id,document_type,version);
CREATE TABLE IF NOT EXISTS account_deletion_requests (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, status text NOT NULL DEFAULT 'pending', requested_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz);
CREATE INDEX IF NOT EXISTS account_deletion_requests_user_idx ON account_deletion_requests(user_id,requested_at DESC);

INSERT INTO legal_documents(document_type,version) VALUES
 ('privacy','2026-07-19'),('terms','2026-07-19'),('points_rules','2026-07-19'),('refund_policy','2026-07-19'),('cookies','2026-07-19'),('ai_notice','2026-07-19')
ON CONFLICT DO NOTHING;
