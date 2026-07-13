import { sql } from "drizzle-orm";
import { index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import type { DayPlan, TripInput, TripPlan } from "@/types/trip";

export const visitors = pgTable("visitors", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: text("session_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex("visitors_session_id_unique").on(table.sessionId)]);

export const trips = pgTable("trips", {
  id: uuid("id").defaultRandom().primaryKey(),
  visitorId: uuid("visitor_id").notNull().references(() => visitors.id, { onDelete: "cascade" }),
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
