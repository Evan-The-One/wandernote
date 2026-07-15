import { sql } from "drizzle-orm";
import { getDatabase } from "./client";
import { analyticsEvents } from "./schema";

let initialized=false; export async function ensureAnalyticsTable(){if(initialized)return;const db=getDatabase();await db.execute(sql.raw(`CREATE TABLE IF NOT EXISTS analytics_events (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), visitor_id uuid NOT NULL REFERENCES visitors(id) ON DELETE CASCADE, event_name text NOT NULL, trip_id uuid REFERENCES trips(id) ON DELETE SET NULL, page_name text, duration_ms integer, status text, error_category text, metadata jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now())`));await db.execute(sql.raw(`CREATE INDEX IF NOT EXISTS analytics_events_created_idx ON analytics_events(created_at)`));await db.execute(sql.raw(`CREATE INDEX IF NOT EXISTS analytics_events_name_created_idx ON analytics_events(event_name,created_at)`));initialized=true;}
export async function recordAnalyticsEvent(value: typeof analyticsEvents.$inferInsert){await ensureAnalyticsTable();await getDatabase().insert(analyticsEvents).values(value);}
