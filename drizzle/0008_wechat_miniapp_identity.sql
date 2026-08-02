CREATE TABLE IF NOT EXISTS "user_identities" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "provider" text NOT NULL,
  "provider_subject_hash" text NOT NULL,
  "verified_at" timestamptz NOT NULL DEFAULT now(),
  "last_used_at" timestamptz NOT NULL DEFAULT now(),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "user_identities_provider_check" CHECK ("provider" IN ('email','wechat_miniprogram'))
);
CREATE UNIQUE INDEX IF NOT EXISTS "user_identities_provider_subject_unique" ON "user_identities"("provider","provider_subject_hash");
CREATE INDEX IF NOT EXISTS "user_identities_user_idx" ON "user_identities"("user_id");

CREATE TABLE IF NOT EXISTS "miniapp_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "token_hash" text NOT NULL UNIQUE,
  "refresh_token_hash" text NOT NULL UNIQUE,
  "expires_at" timestamptz NOT NULL,
  "refresh_expires_at" timestamptz NOT NULL,
  "revoked_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "last_used_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "miniapp_sessions_user_idx" ON "miniapp_sessions"("user_id");

CREATE TABLE IF NOT EXISTS "miniapp_binding_attempts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "source_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "target_email_hash" text NOT NULL,
  "target_email_encrypted" text NOT NULL,
  "token_hash" text NOT NULL UNIQUE,
  "status" text NOT NULL DEFAULT 'pending',
  "expires_at" timestamptz NOT NULL,
  "completed_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "miniapp_binding_attempts_status_check" CHECK ("status" IN ('pending','verified','merged','expired','conflict'))
);
CREATE INDEX IF NOT EXISTS "miniapp_binding_attempts_source_created_idx" ON "miniapp_binding_attempts"("source_user_id","created_at");
