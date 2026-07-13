import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { tripInputSchema } from "../src/schemas/trip";
import { feedbackSchema, persistedRevisionSchema } from "../src/schemas/beta";
import { and, eq, sql } from "drizzle-orm";

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
async function runLiveTests() {
if (!process.env.DATABASE_URL) {
  console.log("Live database tests pending: DATABASE_URL is not configured.");
} else {
  const { getDatabase } = await import("../src/server/database/client");
  const { feedback, generationJobs, trips, visitors } = await import("../src/server/database/schema");
  const db = getDatabase();
  const sessionId = randomBytes(32).toString("base64url");
  const [visitor] = await db.insert(visitors).values({ sessionId }).returning({ id: visitors.id });
  try {
    const [trip] = await db.insert(trips).values({ visitorId: visitor.id, inputJson: input }).returning({ id: trips.id, version: trips.version });
    assert.match(trip.id, /^[0-9a-f-]{36}$/);
    await db.insert(feedback).values({ tripId: trip.id, visitorId: visitor.id, rating: "helpful", issueTagsJson: [] });
    await db.insert(generationJobs).values({ visitorId: visitor.id, tripId: trip.id, type: "full_generation", status: "running" });
    let duplicateBlocked = false;
    try { await db.insert(generationJobs).values({ visitorId: visitor.id, tripId: trip.id, type: "full_generation", status: "running" }); }
    catch { duplicateBlocked = true; }
    assert.equal(duplicateBlocked, true, "concurrent full generations must be blocked");
    const [updated] = await db.update(trips).set({ version: sql`${trips.version} + 1` }).where(and(eq(trips.id, trip.id), eq(trips.version, trip.version))).returning({ version: trips.version });
    assert.equal(updated.version, trip.version + 1);
    const staleUpdate = await db.update(trips).set({ version: sql`${trips.version} + 1` }).where(and(eq(trips.id, trip.id), eq(trips.version, trip.version))).returning({ version: trips.version });
    assert.equal(staleUpdate.length, 0, "stale version must not overwrite a trip");
    console.log("Live Neon tests passed (CRUD, UUID, feedback, concurrency lock, optimistic version)." );
  } finally {
    await db.delete(visitors).where(eq(visitors.id, visitor.id));
  }
}
}

runLiveTests().catch((error) => { console.error(error instanceof Error ? error.message : "Live database tests failed"); process.exitCode = 1; });
