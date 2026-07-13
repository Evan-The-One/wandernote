import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { tripInputSchema } from "../src/schemas/trip";
import { feedbackSchema, persistedRevisionSchema } from "../src/schemas/beta";

const input = tripInputSchema.parse({ schemaVersion: "0.2", destination: { city: "苏州", country: "中国" }, days: 3, travelStyle: "slow", datePreference: { type: "undecided", startDate: null, approximateText: null }, budget: { mode: "unrestricted", amount: null, scope: null, includesAccommodation: null, includesIntercityTransport: null, currency: "CNY" }, priorities: [], departureCity: null, travelers: { adults: 1, children: 0 }, transportPreference: "mixed", dayTripPreference: false, additionalRequirements: null });
assert.equal(input.travelers.adults, 1);
assert.equal(persistedRevisionSchema.safeParse({ targetDayNumber: 1, instruction: "轻松一点", version: 1 }).success, true);
assert.equal(feedbackSchema.safeParse({ rating: "helpful", issueTags: [], comment: null }).success, true);
assert.equal(feedbackSchema.safeParse({ rating: "helpful", issueTags: [], comment: "x".repeat(301) }).success, false);
assert.match(randomBytes(32).toString("base64url"), /^[A-Za-z0-9_-]{40,60}$/);
const migration = readFileSync(new URL("../drizzle/0000_rich_bromley.sql", import.meta.url), "utf8");
for (const table of ["visitors", "trips", "day_revisions", "generation_jobs", "feedback"]) assert.ok(migration.includes(`CREATE TABLE \"${table}\"`));
assert.ok(migration.includes("generation_jobs_one_running_full_per_visitor"));
console.log("Persistence contract tests passed (schemas, session shape, migration tables/indexes)." );
if (!process.env.DATABASE_URL) console.log("Live database tests pending: DATABASE_URL is not configured.");
