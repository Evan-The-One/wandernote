CREATE TABLE IF NOT EXISTS "login_attempts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "attempt_token_hash" text NOT NULL,
  "email_normalized" text NOT NULL,
  "trip_id" uuid,
  "visitor_id" uuid,
  "return_to" text DEFAULT '/' NOT NULL,
  "pending_action" text,
  "status" text DEFAULT 'pending' NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "completed_at" timestamp with time zone,
  "user_id" uuid,
  "consumed_token_id" uuid,
  "failure_code" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "login_attempts_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE set null ON UPDATE no action,
  CONSTRAINT "login_attempts_visitor_id_visitors_id_fk" FOREIGN KEY ("visitor_id") REFERENCES "public"."visitors"("id") ON DELETE set null ON UPDATE no action,
  CONSTRAINT "login_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action,
  CONSTRAINT "login_attempts_consumed_token_id_email_login_tokens_id_fk" FOREIGN KEY ("consumed_token_id") REFERENCES "public"."email_login_tokens"("id") ON DELETE set null ON UPDATE no action
);
CREATE UNIQUE INDEX IF NOT EXISTS "login_attempts_token_unique" ON "login_attempts" USING btree ("attempt_token_hash");
CREATE INDEX IF NOT EXISTS "login_attempts_trip_created_idx" ON "login_attempts" USING btree ("trip_id","created_at");
CREATE INDEX IF NOT EXISTS "login_attempts_expires_idx" ON "login_attempts" USING btree ("expires_at");
