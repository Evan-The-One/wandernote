CREATE TABLE IF NOT EXISTS "analytics_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "visitor_id" uuid NOT NULL REFERENCES "visitors"("id") ON DELETE CASCADE,
  "event_name" text NOT NULL, "trip_id" uuid REFERENCES "trips"("id") ON DELETE SET NULL,
  "page_name" text, "duration_ms" integer, "status" text, "error_category" text,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL, "created_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "analytics_events_created_idx" ON "analytics_events" ("created_at");
CREATE INDEX IF NOT EXISTS "analytics_events_name_created_idx" ON "analytics_events" ("event_name", "created_at");
