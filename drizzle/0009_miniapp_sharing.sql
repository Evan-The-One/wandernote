CREATE TABLE IF NOT EXISTS "trip_shares" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "trip_id" uuid NOT NULL REFERENCES "trips"("id") ON DELETE CASCADE,
  "created_by" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "token_hash" text NOT NULL,
  "status" text NOT NULL DEFAULT 'active',
  "optional_expires_at" timestamptz,
  "revoked_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "trip_shares_status_check" CHECK ("status" IN ('active','revoked'))
);
CREATE UNIQUE INDEX IF NOT EXISTS "trip_shares_token_unique" ON "trip_shares"("token_hash");
CREATE INDEX IF NOT EXISTS "trip_shares_trip_status_idx" ON "trip_shares"("trip_id","status","created_at");
