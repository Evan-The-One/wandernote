import { createPaymentProvider } from "@/server/payments/provider";
import { processCreemEvent } from "@/server/payments/orders";
import { apiError, HttpError } from "@/server/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const declared = Number(request.headers.get("content-length") || 0);
    if (declared > 256 * 1024) throw new HttpError(413, "Webhook过大", "WEBHOOK_TOO_LARGE");
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > 256 * 1024) throw new HttpError(413, "Webhook过大", "WEBHOOK_TOO_LARGE");
    const event = createPaymentProvider().verifyWebhook(rawBody, request.headers.get("creem-signature"));
    const result = await processCreemEvent(event);
    return Response.json({ received: true, duplicate: Boolean(result.duplicate) });
  } catch (error) { return apiError(error); }
}
