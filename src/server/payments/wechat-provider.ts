import { HttpError } from "@/server/http";

export type WechatOrderState="created"|"pending"|"paid"|"failed"|"closed"|"refunded"|"refund_pending";
export type WechatPointPack={packId:string;points:number;amountFen:number;currency:"CNY";enabled:false;sortOrder:number;priceVersion:string};
export type WechatCreateOrder={orderId:string;packId:string;userId:string;openidSubjectHash:string};
export type WechatOrderResult={providerOrderId:string;state:WechatOrderState;prepayId?:string};
export type WechatCallback={eventId:string;providerOrderId:string;state:WechatOrderState;amountFen:number;currency:"CNY";appId:string;merchantId:string};
export type WechatRefundResult={refundId:string;state:"refund_pending"|"refunded"|"failed"};

/** Provider contract only. Production remains fail-closed until every official credential exists. */
export interface WechatPayProvider{
  createOrder(input:WechatCreateOrder):Promise<WechatOrderResult>;
  queryOrder(providerOrderId:string):Promise<WechatOrderResult>;
  closeOrder(providerOrderId:string):Promise<WechatOrderResult>;
  verifyCallback(rawBody:string,headers:Headers):WechatCallback;
  handleRefund(providerOrderId:string,amountFen:number):Promise<WechatRefundResult>;
  queryRefund(refundId:string):Promise<WechatRefundResult>;
}
export const wechatPointPacks:WechatPointPack[]=[
  {packId:"wechat_starter_draft",points:0,amountFen:0,currency:"CNY",enabled:false,sortOrder:1,priceVersion:"draft-unpublished"},
  {packId:"wechat_standard_draft",points:0,amountFen:0,currency:"CNY",enabled:false,sortOrder:2,priceVersion:"draft-unpublished"},
  {packId:"wechat_value_draft",points:0,amountFen:0,currency:"CNY",enabled:false,sortOrder:3,priceVersion:"draft-unpublished"},
];
export function assertWechatPaymentsDisabled():never{throw new HttpError(503,"点数购买即将开放","MINIAPP_PAYMENTS_DISABLED");}
export function wechatPaymentConfigured(){return process.env.MINIAPP_PAYMENTS_ENABLED==="true"&&process.env.PAYMENT_PROVIDER_WECHAT_ENABLED==="true"&&process.env.WECHAT_PAY_MODE!=="disabled"&&Boolean(process.env.WECHAT_PAY_MCH_ID&&process.env.WECHAT_PAY_API_V3_KEY&&process.env.WECHAT_PAY_PRIVATE_KEY);}

export class DisabledWechatPayProvider implements WechatPayProvider{
  async createOrder():Promise<never>{return assertWechatPaymentsDisabled();}
  async queryOrder():Promise<never>{return assertWechatPaymentsDisabled();}
  async closeOrder():Promise<never>{return assertWechatPaymentsDisabled();}
  verifyCallback():never{return assertWechatPaymentsDisabled();}
  async handleRefund():Promise<never>{return assertWechatPaymentsDisabled();}
  async queryRefund():Promise<never>{return assertWechatPaymentsDisabled();}
}

export function createWechatPayProvider():WechatPayProvider{
  // Do not silently fall back to a mock provider in production.
  if(!wechatPaymentConfigured())return new DisabledWechatPayProvider();
  throw new HttpError(503,"微信支付联调尚未启用","WECHAT_PAY_PROVIDER_PENDING_CREDENTIALS");
}
