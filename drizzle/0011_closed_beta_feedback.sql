ALTER TABLE "feedback" ADD COLUMN IF NOT EXISTS "feedback_type" text NOT NULL DEFAULT 'trip';
ALTER TABLE "feedback" ADD COLUMN IF NOT EXISTS "poster_task_id" uuid REFERENCES "trip_image_tasks"("id") ON DELETE SET NULL;
ALTER TABLE "feedback" ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'new';
ALTER TABLE "feedback" ADD COLUMN IF NOT EXISTS "updated_at" timestamptz NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS "feedback_status_created_idx" ON "feedback"("status","created_at");
