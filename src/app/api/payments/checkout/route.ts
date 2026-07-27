import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { currentUser } from "@/server/auth/user";
import { createPaymentProvider } from "@/server/payments/provider";
import { attachCheckout, createPendingOrder } from "@/server/payments/orders";
import { apiError, HttpError, readJsonBody } from "@/server/http";

const schema = z.object({ packId: z.string().min(3).max(64), idempotencyKey: z.string().uuid().optional() });

export async function POST(request: Request) {
  try {
    const user = await currentUser();
    if (!user) throw new HttpError(401, "请先登录后购买点数", "LOGIN_REQUIRED");
    const body = schema.parse(await readJsonBody(request));
    const key = createHash("sha256").update(`${user.id}:${body.packId}:${body.idempotencyKey || randomUUID()}`).digest("hex");
    const pending = await createPendingOrder({ userId: user.id, packId: body.packId, idempotencyKey: key });
    const existingUrl = typeof pending.order.metadata?.checkoutUrl === "string" ? pending.order.metadata.checkoutUrl : null;
    if (pending.reused && existingUrl) return Response.json({ orderId: pending.order.id, checkoutUrl: existingUrl, reused: true });
    const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    const checkout = await createPaymentProvider().createCheckout({
      orderId: pending.order.id, productId: pending.productId, customerEmail: user.email,
      successUrl: `${origin}/account/payment-result?order=${pending.order.id}`,
    });
    await attachCheckout(pending.order.id, checkout.providerCheckoutId, checkout.checkoutUrl);
    return Response.json({ orderId: pending.order.id, checkoutUrl: checkout.checkoutUrl, reused: false }, { status: 201 });
  } catch (error) { return apiError(error); }
}
