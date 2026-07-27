import { and, desc, eq, gte, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getCreemProductId, getPointPackage } from "@/config/commerce";
import { getDatabase, withDatabaseTransaction } from "@/server/database/client";
import { paymentOrders, paymentWebhookEvents, pointAccounts, pointLedger } from "@/server/database/schema";
import { HttpError } from "@/server/http";
import type { CreemWebhookEvent } from "./provider";

let paymentTablesReady = false;
export async function ensurePaymentTables() {
  if (paymentTablesReady) return;
  const db = getDatabase();
  for (const statement of [
    "ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS provider_checkout_id text",
    "ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS price_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb",
    "ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now()",
    "ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS fulfilled_at timestamptz",
    "ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS refunded_points integer NOT NULL DEFAULT 0",
    "ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb",
    "CREATE UNIQUE INDEX IF NOT EXISTS payment_orders_provider_checkout_unique ON payment_orders(provider,provider_checkout_id) WHERE provider_checkout_id IS NOT NULL",
    "CREATE TABLE IF NOT EXISTS payment_webhook_events (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),provider text NOT NULL,provider_event_id text NOT NULL,event_type text NOT NULL,order_id uuid REFERENCES payment_orders(id) ON DELETE SET NULL,status text NOT NULL DEFAULT 'received',created_at timestamptz NOT NULL DEFAULT now(),processed_at timestamptz)",
    "CREATE UNIQUE INDEX IF NOT EXISTS payment_webhook_events_provider_event_unique ON payment_webhook_events(provider,provider_event_id)",
    "CREATE INDEX IF NOT EXISTS payment_webhook_events_created_idx ON payment_webhook_events(created_at DESC)",
  ]) await db.execute(sql.raw(statement));
  paymentTablesReady = true;
}

export async function createPendingOrder(args: { userId: string; packId: string; idempotencyKey: string }) {
  await ensurePaymentTables();
  const pack = getPointPackage(args.packId);
  if (!pack) throw new HttpError(400, "点数包无效", "INVALID_POINT_PACK");
  const productId = getCreemProductId(pack);
  if (!productId) throw new HttpError(503, "点数购买即将开放", "PAYMENT_PRODUCT_NOT_CONFIGURED");
  const db = getDatabase();
  const recent = await db.select().from(paymentOrders).where(and(eq(paymentOrders.userId, args.userId), eq(paymentOrders.status, "pending"), gte(paymentOrders.createdAt, new Date(Date.now() - 30 * 60_000)))).orderBy(desc(paymentOrders.createdAt)).limit(1);
  if (recent[0]?.providerCheckoutId && recent[0].packageId === pack.id) return { order: recent[0], pack, productId, reused: true };
  const [order] = await db.insert(paymentOrders).values({
    userId: args.userId, provider: "creem", packageId: pack.id, points: pack.points,
    amountCents: pack.amountCents, currency: pack.currency, status: "pending",
    idempotencyKey: args.idempotencyKey, priceSnapshot: { packId: pack.id, points: pack.points, amountCents: pack.amountCents, currency: pack.currency, productId },
  }).onConflictDoNothing({ target: paymentOrders.idempotencyKey }).returning();
  if (order) return { order, pack, productId, reused: false };
  const [existing] = await db.select().from(paymentOrders).where(eq(paymentOrders.idempotencyKey, args.idempotencyKey)).limit(1);
  if (!existing) throw new HttpError(500, "订单创建失败", "ORDER_CREATE_FAILED");
  return { order: existing, pack, productId, reused: true };
}

export async function attachCheckout(orderId: string, providerCheckoutId: string, checkoutUrl: string) {
  await ensurePaymentTables();
  const [current] = await getDatabase().select().from(paymentOrders).where(eq(paymentOrders.id, orderId)).limit(1);
  const [order] = await getDatabase().update(paymentOrders).set({ providerCheckoutId, metadata: { ...(current?.metadata || {}), checkoutUrl }, updatedAt: new Date() }).where(and(eq(paymentOrders.id, orderId), eq(paymentOrders.status, "pending"))).returning();
  if (!order) throw new HttpError(409, "订单状态已变化，请刷新后重试", "ORDER_STATE_CHANGED");
  return order;
}

export async function getOwnedOrder(orderId: string, userId: string) {
  await ensurePaymentTables();
  const [order] = await getDatabase().select().from(paymentOrders).where(and(eq(paymentOrders.id, orderId), eq(paymentOrders.userId, userId))).limit(1);
  if (!order) throw new HttpError(404, "没有找到这笔订单", "ORDER_NOT_FOUND");
  return order;
}

function eventOrderId(event: CreemWebhookEvent) { return event.object?.request_id || null; }
function providerOrderId(event: CreemWebhookEvent) { return event.object?.order?.id || event.object?.id || null; }

export async function processCreemEvent(event: CreemWebhookEvent) {
  await ensurePaymentTables();
  if (!event.id || !event.eventType) throw new HttpError(400, "Webhook字段缺失", "INVALID_WEBHOOK");
  return withDatabaseTransaction(async tx => {
    const [stored] = await tx.insert(paymentWebhookEvents).values({ provider: "creem", providerEventId: event.id, eventType: event.eventType }).onConflictDoNothing({ target: [paymentWebhookEvents.provider, paymentWebhookEvents.providerEventId] }).returning();
    if (!stored) return { duplicate: true };
    const orderId = eventOrderId(event);
    if (!orderId) throw new HttpError(400, "订单关联缺失", "WEBHOOK_ORDER_MISSING");
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`payment:${orderId}`}))`);
    const [order] = await tx.select().from(paymentOrders).where(eq(paymentOrders.id, orderId)).limit(1);
    if (!order || order.provider !== "creem") throw new HttpError(400, "订单不匹配", "WEBHOOK_ORDER_MISMATCH");
    const snapshot = order.priceSnapshot;
    const incomingProduct = event.object?.order?.product || event.object?.product?.id;
    const incomingAmount = event.object?.order?.amount ?? event.object?.product?.price;
    const incomingCurrency = event.object?.order?.currency ?? event.object?.product?.currency;
    if (incomingProduct !== snapshot.productId || incomingAmount !== order.amountCents || incomingCurrency?.toUpperCase() !== order.currency) throw new HttpError(400, "订单金额或商品不匹配", "WEBHOOK_VALUE_MISMATCH");
    if (event.eventType === "checkout.completed") {
      if (order.status === "fulfilled") return { duplicate: true };
      await tx.insert(pointAccounts).values({ userId: order.userId }).onConflictDoNothing({ target: pointAccounts.userId });
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`points:${order.userId}`}))`);
      const [account] = await tx.select().from(pointAccounts).where(eq(pointAccounts.userId, order.userId)).limit(1);
      if (!account) throw new HttpError(500, "点数账户不可用", "POINT_ACCOUNT_ERROR");
      const balance = account.availablePoints + order.points;
      await tx.update(pointAccounts).set({ availablePoints: balance, lifetimeGranted: account.lifetimeGranted + order.points, updatedAt: new Date() }).where(eq(pointAccounts.userId, order.userId));
      await tx.insert(pointLedger).values({ userId: order.userId, type: "purchase_credit", amount: order.points, balanceAfter: balance, businessKey: `creem:${providerOrderId(event) || event.id}:credit`, metadata: { source: "creem", orderId: order.id, providerOrderId: providerOrderId(event) || "" } });
      await tx.update(paymentOrders).set({ status: "fulfilled", providerOrderId: providerOrderId(event), completedAt: new Date(), fulfilledAt: new Date(), updatedAt: new Date() }).where(eq(paymentOrders.id, order.id));
    } else if (event.eventType === "refund.created") {
      const [account] = await tx.select().from(pointAccounts).where(eq(pointAccounts.userId, order.userId)).limit(1);
      const consumed = Math.max(0, order.points - (account?.availablePoints ?? 0));
      if (!account || consumed > 0) {
        await tx.update(paymentOrders).set({ status: "manual_review", metadata: { ...order.metadata, refundReason: "points_consumed" }, updatedAt: new Date() }).where(eq(paymentOrders.id, order.id));
      } else {
        const balance = Math.max(0, account.availablePoints - order.points);
        await tx.update(pointAccounts).set({ availablePoints: balance, updatedAt: new Date() }).where(eq(pointAccounts.userId, order.userId));
        await tx.insert(pointLedger).values({ userId: order.userId, type: "purchase_refund", amount: -order.points, balanceAfter: balance, businessKey: `creem:${event.id}:refund`, metadata: { source: "creem", orderId: order.id } });
        await tx.update(paymentOrders).set({ status: "refunded", refundedPoints: order.points, updatedAt: new Date() }).where(eq(paymentOrders.id, order.id));
      }
    } else if (event.eventType === "dispute.created") {
      await tx.update(paymentOrders).set({ status: "disputed", metadata: { ...order.metadata, generationFrozen: true }, updatedAt: new Date() }).where(eq(paymentOrders.id, order.id));
    }
    await tx.update(paymentWebhookEvents).set({ orderId: order.id, status: "processed", processedAt: new Date() }).where(eq(paymentWebhookEvents.id, stored.id));
    return { duplicate: false, orderId: order.id };
  });
}

export const newOrderIdempotencyKey = (userId: string, packId: string) => `checkout:${userId}:${packId}:${randomUUID()}`;
