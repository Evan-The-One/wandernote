import assert from "node:assert/strict";
import { createWebTripShareToken, verifyWebTripShareToken } from "../src/server/sharing/web-trip-share";

process.env.AUTH_SECRET ||= "closed-beta-test-secret-that-is-not-used-in-production";

const tripId = "11111111-1111-4111-8111-111111111111";
const now = Date.parse("2026-08-21T00:00:00Z");
const token = createWebTripShareToken(tripId, now);

assert.equal(verifyWebTripShareToken(token, tripId, now + 1_000), true, "a valid signed share token must read its trip");
assert.equal(verifyWebTripShareToken(token, "22222222-2222-4222-8222-222222222222", now + 1_000), false, "a token must not read a different trip");
assert.equal(verifyWebTripShareToken(`${token.slice(0, -1)}x`, tripId, now + 1_000), false, "a modified token must fail closed");
assert.equal(verifyWebTripShareToken(token, tripId, now + 31 * 24 * 60 * 60 * 1_000), false, "an expired token must fail closed");

console.log("Web trip sharing security checks passed.");
