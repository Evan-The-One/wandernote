ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS provider_checkout_id text;
ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS price_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS fulfilled_at timestamptz;
ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS refunded_points integer NOT NULL DEFAULT 0;
ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
CREATE UNIQUE INDEX IF NOT EXISTS payment_orders_provider_checkout_unique
  ON payment_orders(provider,provider_checkout_id) WHERE provider_checkout_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS payment_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  provider_event_id text NOT NULL,
  event_type text NOT NULL,
  order_id uuid REFERENCES payment_orders(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'received',
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS payment_webhook_events_provider_event_unique
  ON payment_webhook_events(provider,provider_event_id);
CREATE INDEX IF NOT EXISTS payment_webhook_events_created_idx
  ON payment_webhook_events(created_at DESC);
