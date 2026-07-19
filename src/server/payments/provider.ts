import { assertPaymentConfiguration } from "@/config/commerce";
import { HttpError } from "@/server/http";

export type CheckoutRequest={userId:string;packageId:string;idempotencyKey:string;returnUrl:string};
export type CheckoutResult={providerOrderId:string;checkoutUrl:string};
export interface PaymentProvider{createCheckout(request:CheckoutRequest):Promise<CheckoutResult>;verifyWebhook(request:Request):Promise<{providerOrderId:string;status:"paid"|"refunded"|"failed"}>;}

class DisabledPaymentProvider implements PaymentProvider{
  async createCheckout():Promise<never>{throw new HttpError(503,"点数购买即将开放","PAYMENTS_DISABLED");}
  async verifyWebhook():Promise<never>{throw new HttpError(503,"支付尚未启用","PAYMENTS_DISABLED");}
}

export function createPaymentProvider():PaymentProvider{
  const config=assertPaymentConfiguration();
  if(!config.enabled)return new DisabledPaymentProvider();
  // Provider adapters remain intentionally disabled until merchant credentials and webhook signing are configured.
  throw new HttpError(503,"支付渠道配置尚未完成","PAYMENT_PROVIDER_NOT_CONFIGURED");
}
