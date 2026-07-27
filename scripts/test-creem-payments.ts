import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

process.env.PAYMENTS_ENABLED = "true";
process.env.PAYMENT_PROVIDER = "creem";
process.env.CREEM_MODE = "test";
process.env.CREEM_API_KEY = "test-placeholder";
process.env.CREEM_WEBHOOK_SECRET = "webhook-test-secret";

async function main() {
const { pointPackages, posterPointCost } = await import("../src/config/commerce");
const { createPaymentProvider } = await import("../src/server/payments/provider");

assert.deepEqual(pointPackages.map(({ points, amountCents, currency }) => ({ points, amountCents, currency })), [
  { points: 4, amountCents: 399, currency: "USD" },
  { points: 10, amountCents: 899, currency: "USD" },
  { points: 25, amountCents: 1899, currency: "USD" },
]);
assert.deepEqual([1,2,3,4,5,6,7].map(posterPointCost), [1,1,2,2,3,3,4]);

const raw = JSON.stringify({ id: "evt_test", eventType: "checkout.completed", object: { request_id: "order_test" } });
const signature = createHmac("sha256", process.env.CREEM_WEBHOOK_SECRET!).update(raw).digest("hex");
assert.equal(createPaymentProvider().verifyWebhook(raw, signature).id, "evt_test");
assert.throws(() => createPaymentProvider().verifyWebhook(raw, "invalid"));

console.log("Creem payment contract tests passed");
}
void main();
