CREATE TABLE IF NOT EXISTS "trip_versions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "trip_id" uuid NOT NULL REFERENCES "trips"("id") ON DELETE CASCADE,
  "version_number" integer NOT NULL,
  "parent_version_id" uuid,
  "change_type" text NOT NULL,
  "trip_plan_snapshot" jsonb NOT NULL,
  "change_summary" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "created_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "request_id" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "trip_versions_change_type_check" CHECK ("change_type" IN ('initial_generation','activity_revision','day_revision','full_replan','undo_restore'))
);
CREATE UNIQUE INDEX IF NOT EXISTS "trip_versions_trip_number_unique" ON "trip_versions"("trip_id","version_number");
CREATE UNIQUE INDEX IF NOT EXISTS "trip_versions_trip_request_unique" ON "trip_versions"("trip_id","request_id");
CREATE INDEX IF NOT EXISTS "trip_versions_trip_created_idx" ON "trip_versions"("trip_id","created_at");
DO $$ BEGIN
  ALTER TABLE "trip_versions" ADD CONSTRAINT "trip_versions_parent_fk" FOREIGN KEY ("parent_version_id") REFERENCES "trip_versions"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "trips" ADD COLUMN IF NOT EXISTS "current_version_id" uuid;
INSERT INTO "trip_versions" ("trip_id","version_number","change_type","trip_plan_snapshot","created_by_user_id","request_id","created_at")
SELECT "id", "version", 'initial_generation', "current_plan_json", "user_id", 'backfill:' || "id"::text || ':' || "version"::text, "updated_at"
FROM "trips" WHERE "current_plan_json" IS NOT NULL
ON CONFLICT ("trip_id","version_number") DO NOTHING;
UPDATE "trips" t SET "current_version_id" = v."id"
FROM "trip_versions" v WHERE v."trip_id" = t."id" AND v."version_number" = t."version" AND t."current_version_id" IS NULL;
DO $$ BEGIN
  ALTER TABLE "trips" ADD CONSTRAINT "trips_current_version_fk" FOREIGN KEY ("current_version_id") REFERENCES "trip_versions"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "generation_jobs" ADD COLUMN IF NOT EXISTS "request_id" text;
CREATE UNIQUE INDEX IF NOT EXISTS "generation_jobs_trip_request_unique" ON "generation_jobs"("trip_id","request_id") WHERE "request_id" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "generation_jobs_one_running_replan_per_trip" ON "generation_jobs"("trip_id") WHERE "status" = 'running' AND "type" = 'full_replan';

CREATE TABLE IF NOT EXISTS "poster_pages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "poster_task_id" uuid NOT NULL REFERENCES "trip_image_tasks"("id") ON DELETE CASCADE,
  "trip_id" uuid NOT NULL REFERENCES "trips"("id") ON DELETE CASCADE,
  "trip_version" integer NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "page_index" integer NOT NULL,
  "storage_key" text NOT NULL,
  "width" integer NOT NULL,
  "height" integer NOT NULL,
  "file_size" integer NOT NULL,
  "checksum" text NOT NULL,
  "mime_type" text NOT NULL,
  "template_version" text NOT NULL,
  "render_version" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "poster_pages_task_page_unique" ON "poster_pages"("poster_task_id","page_index");
CREATE UNIQUE INDEX IF NOT EXISTS "poster_pages_storage_key_unique" ON "poster_pages"("storage_key");
CREATE INDEX IF NOT EXISTS "poster_pages_user_created_idx" ON "poster_pages"("user_id","created_at");
