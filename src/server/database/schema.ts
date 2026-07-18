import { sql } from "drizzle-orm";
import { index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import type { DayPlan, TripInput, TripPlan } from "@/types/trip";

export const visitors = pgTable("visitors", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: text("session_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex("visitors_session_id_unique").on(table.sessionId)]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(), email: text("email").notNull(), verifiedAt: timestamp("verified_at", { withTimezone: true }),
  status: text("status").notNull().default("active"), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(), lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
}, (table) => [uniqueIndex("users_email_unique").on(table.email)]);

export const userSessions = pgTable("user_sessions", {
  id: uuid("id").defaultRandom().primaryKey(), userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }), tokenHash: text("token_hash").notNull(), expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex("user_sessions_token_unique").on(table.tokenHash), index("user_sessions_user_idx").on(table.userId)]);

export const emailLoginTokens = pgTable("email_login_tokens", {
  id: uuid("id").defaultRandom().primaryKey(), email: text("email").notNull(), tokenHash: text("token_hash").notNull(), expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(), usedAt: timestamp("used_at", { withTimezone: true }), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex("email_login_tokens_token_unique").on(table.tokenHash), index("email_login_tokens_email_created_idx").on(table.email, table.createdAt)]);

export const trips = pgTable("trips", {
  id: uuid("id").defaultRandom().primaryKey(),
  visitorId: uuid("visitor_id").notNull().references(() => visitors.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  status: text("status", { enum: ["generating", "completed", "failed"] }).notNull().default("generating"),
  inputJson: jsonb("input_json").$type<TripInput>().notNull(),
  currentPlanJson: jsonb("current_plan_json").$type<TripPlan>(),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("trips_visitor_updated_idx").on(table.visitorId, table.updatedAt)]);

export const dayRevisions = pgTable("day_revisions", {
  id: uuid("id").defaultRandom().primaryKey(),
  tripId: uuid("trip_id").notNull().references(() => trips.id, { onDelete: "cascade" }),
  dayNumber: integer("day_number").notNull(),
  instruction: text("instruction").notNull(),
  previousDayJson: jsonb("previous_day_json").$type<DayPlan>().notNull(),
  updatedDayJson: jsonb("updated_day_json").$type<DayPlan>().notNull(),
  changeSummaryJson: jsonb("change_summary_json").$type<string[]>().notNull(),
  planVersion: integer("plan_version").notNull(),
  undoneAt: timestamp("undone_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("day_revisions_trip_created_idx").on(table.tripId, table.createdAt)]);

export const generationJobs = pgTable("generation_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  visitorId: uuid("visitor_id").notNull().references(() => visitors.id, { onDelete: "cascade" }),
  tripId: uuid("trip_id").references(() => trips.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["full_generation", "day_revision"] }).notNull(),
  status: text("status", { enum: ["running", "completed", "failed"] }).notNull(),
  durationMs: integer("duration_ms"),
  errorCode: text("error_code"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
}, (table) => [
  index("generation_jobs_visitor_created_idx").on(table.visitorId, table.createdAt),
  uniqueIndex("generation_jobs_one_running_full_per_visitor")
    .on(table.visitorId)
    .where(sql`${table.status} = 'running' and ${table.type} = 'full_generation'`),
]);

export const feedback = pgTable("feedback", {
  id: uuid("id").defaultRandom().primaryKey(),
  tripId: uuid("trip_id").notNull().references(() => trips.id, { onDelete: "cascade" }),
  visitorId: uuid("visitor_id").notNull().references(() => visitors.id, { onDelete: "cascade" }),
  rating: text("rating", { enum: ["helpful", "usable", "not_helpful"] }).notNull(),
  issueTagsJson: jsonb("issue_tags_json").$type<string[]>().notNull().default([]),
  comment: text("comment"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("feedback_trip_idx").on(table.tripId)]);

export const analyticsEvents = pgTable("analytics_events", {
  id: uuid("id").defaultRandom().primaryKey(), visitorId: uuid("visitor_id").notNull().references(() => visitors.id, { onDelete: "cascade" }),
  eventName: text("event_name").notNull(), tripId: uuid("trip_id").references(() => trips.id, { onDelete: "set null" }), pageName: text("page_name"),
  durationMs: integer("duration_ms"), status: text("status"), errorCategory: text("error_category"), metadata: jsonb("metadata").$type<Record<string,string|number|boolean|null>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("analytics_events_created_idx").on(table.createdAt), index("analytics_events_name_created_idx").on(table.eventName,table.createdAt)]);

export const tripImageTasks = pgTable("trip_image_tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  visitorId: uuid("visitor_id").notNull().references(() => visitors.id, { onDelete: "cascade" }),
  tripId: uuid("trip_id").notNull().references(() => trips.id, { onDelete: "cascade" }),
  tripVersion: integer("trip_version").notNull(),
  imageType: text("image_type").notNull(),
  aspectRatio: text("aspect_ratio").notNull(),
  templateVersion: text("template_version").notNull(),
  provider: text("provider").notNull(),
  status: text("status").notNull(),
  idempotencyHash: text("idempotency_hash").notNull(),
  outputJson: jsonb("output_json").$type<Record<string, unknown>>(),
  failureCode: text("failure_code"),
  retryCount: integer("retry_count").notNull().default(0),
  durationMs: integer("duration_ms"),
  estimatedCostUsd: text("estimated_cost_usd").notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
}, (table) => [
  uniqueIndex("trip_image_tasks_idempotency_unique").on(table.visitorId, table.idempotencyHash),
  uniqueIndex("trip_image_tasks_cache_unique").on(table.tripId, table.tripVersion, table.imageType, table.aspectRatio, table.templateVersion),
  index("trip_image_tasks_trip_created_idx").on(table.tripId, table.createdAt),
]);

export const entitlementLedger = pgTable("entitlement_ledger", {
  id: uuid("id").defaultRandom().primaryKey(),
  visitorId: uuid("visitor_id").notNull().references(() => visitors.id, { onDelete: "cascade" }),
  principalType: text("principal_type"),
  principalId: uuid("principal_id"),
  creditType: text("credit_type").notNull(),
  direction: text("direction").notNull(),
  amount: integer("amount").notNull(),
  source: text("source").notNull(),
  businessKey: text("business_key").notNull(),
  taskId: uuid("task_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("entitlement_ledger_business_key_unique").on(table.businessKey),
  index("entitlement_ledger_visitor_type_idx").on(table.visitorId, table.creditType, table.createdAt),
  index("entitlement_ledger_principal_type_idx").on(table.principalType, table.principalId, table.creditType, table.createdAt),
]);
