import { createHmac } from "node:crypto";
import { assertPaymentConfiguration, paymentConfig } from "@/config/commerce";
import { HttpError, secureEqual } from "@/server/http";

export type CheckoutRequest = {
  orderId: string;
  productId: string;
  customerEmail: string;
  successUrl: string;
};
export type CheckoutResult = { providerCheckoutId: string; checkoutUrl: string };
export type CreemWebhookEvent = {
  id: string;
  eventType: "checkout.completed" | "refund.created" | "dispute.created" | string;
  object?: {
    id?: string;
    request_id?: string;
    order?: { id?: string; product?: string; amount?: number; currency?: string; status?: string };
    product?: { id?: string; price?: number; currency?: string };
  };
};

export interface PaymentProvider {
  createCheckout(request: CheckoutRequest): Promise<CheckoutResult>;
  verifyWebhook(rawBody: string, signature: string | null): CreemWebhookEvent;
}

class DisabledPaymentProvider implements PaymentProvider {
  async createCheckout(): Promise<never> { throw new HttpError(503, "点数购买即将开放", "PAYMENTS_DISABLED"); }
  verifyWebhook(): never { throw new HttpError(503, "支付尚未启用", "PAYMENTS_DISABLED"); }
}

class CreemPaymentProvider implements PaymentProvider {
  private readonly apiKey = process.env.CREEM_API_KEY!;
  private readonly webhookSecret = process.env.CREEM_WEBHOOK_SECRET!;
  private readonly baseUrl = paymentConfig.creemMode === "production" ? "https://api.creem.io" : "https://test-api.creem.io";

  async createCheckout(request: CheckoutRequest): Promise<CheckoutResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch(`${this.baseUrl}/v1/checkouts`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": this.apiKey },
        body: JSON.stringify({
          product_id: request.productId,
          request_id: request.orderId,
          units: 1,
          success_url: request.successUrl,
          customer: { email: request.customerEmail },
          metadata: { orderId: request.orderId },
        }),
        signal: controller.signal,
      });
      const payload = await response.json() as { id?: string; checkout_url?: string };
      if (!response.ok || !payload.id || !payload.checkout_url) throw new HttpError(502, "暂时无法创建付款页面，请稍后重试", "CHECKOUT_PROVIDER_ERROR");
      return { providerCheckoutId: payload.id, checkoutUrl: payload.checkout_url };
    } catch (error) {
      if (error instanceof HttpError) throw error;
      throw new HttpError(502, "暂时无法创建付款页面，请稍后重试", "CHECKOUT_PROVIDER_ERROR");
    } finally { clearTimeout(timeout); }
  }

  verifyWebhook(rawBody: string, signature: string | null) {
    if (!signature) throw new HttpError(401, "签名无效", "INVALID_WEBHOOK_SIGNATURE");
    const expected = createHmac("sha256", this.webhookSecret).update(rawBody).digest("hex");
    if (!secureEqual(signature, expected)) throw new HttpError(401, "签名无效", "INVALID_WEBHOOK_SIGNATURE");
    try { return JSON.parse(rawBody) as CreemWebhookEvent; }
    catch { throw new HttpError(400, "Webhook格式无效", "INVALID_WEBHOOK"); }
  }
}

export function createPaymentProvider(): PaymentProvider {
  const config = assertPaymentConfiguration();
  if (!config.enabled) return new DisabledPaymentProvider();
  if (config.provider === "creem") return new CreemPaymentProvider();
  throw new HttpError(503, "支付渠道配置尚未完成", "PAYMENT_PROVIDER_NOT_CONFIGURED");
}
