CREATE TABLE IF NOT EXISTS "trip_image_tasks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "visitor_id" uuid NOT NULL REFERENCES "visitors"("id") ON DELETE CASCADE,
  "trip_id" uuid NOT NULL REFERENCES "trips"("id") ON DELETE CASCADE,
  "trip_version" integer NOT NULL, "image_type" text NOT NULL, "aspect_ratio" text NOT NULL,
  "template_version" text NOT NULL, "provider" text NOT NULL, "status" text NOT NULL,
  "idempotency_hash" text NOT NULL, "output_json" jsonb, "failure_code" text,
  "retry_count" integer DEFAULT 0 NOT NULL, "duration_ms" integer,
  "estimated_cost_usd" text DEFAULT '0' NOT NULL, "created_at" timestamptz DEFAULT now() NOT NULL,
  "completed_at" timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS "trip_image_tasks_idempotency_unique" ON "trip_image_tasks" ("visitor_id", "idempotency_hash");
CREATE UNIQUE INDEX IF NOT EXISTS "trip_image_tasks_cache_unique" ON "trip_image_tasks" ("trip_id", "trip_version", "image_type", "aspect_ratio", "template_version");
CREATE INDEX IF NOT EXISTS "trip_image_tasks_trip_created_idx" ON "trip_image_tasks" ("trip_id", "created_at");

CREATE TABLE IF NOT EXISTS "entitlement_ledger" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "visitor_id" uuid NOT NULL REFERENCES "visitors"("id") ON DELETE CASCADE,
  "credit_type" text NOT NULL, "direction" text NOT NULL, "amount" integer NOT NULL,
  "source" text NOT NULL, "business_key" text NOT NULL UNIQUE, "task_id" uuid,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "entitlement_ledger_visitor_type_idx" ON "entitlement_ledger" ("visitor_id", "credit_type", "created_at");
