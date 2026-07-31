import assert from "node:assert/strict";
import { generationAccessPolicy } from "../src/server/auth/generation-access";

const normal = generationAccessPolicy("normal");
assert.equal(normal.enforceDailyFullGenerationLimit, true);
assert.equal(normal.enforceDailyWholeDayRevisionLimit, true);
assert.equal(normal.enforceDailyPartialRevisionLimit, true);
assert.equal(normal.enforcePosterPoints, true);
assert.equal(normal.enforceBurstRateLimit, true);
assert.equal(normal.enforceGlobalKillSwitch, true);

const tester = generationAccessPolicy("tester_unlimited");
assert.equal(tester.enforceDailyFullGenerationLimit, false);
assert.equal(tester.enforceDailyWholeDayRevisionLimit, false);
assert.equal(tester.enforceDailyPartialRevisionLimit, false);
assert.equal(tester.enforcePosterPoints, true);
assert.equal(tester.enforceBurstRateLimit, true);
assert.equal(tester.enforceGlobalKillSwitch, true);

console.log("tester generation access policy passed");
