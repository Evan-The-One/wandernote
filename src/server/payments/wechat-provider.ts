import { HttpError } from "@/server/http";
export type WechatPointPack={packId:string;points:number;amountFen:number;currency:"CNY";enabled:false;sortOrder:number;priceVersion:string};
export const wechatPointPacks:WechatPointPack[]=[
  {packId:"wechat_points_4_cny",points:4,amountFen:0,currency:"CNY",enabled:false,sortOrder:1,priceVersion:"unpublished"},
  {packId:"wechat_points_10_cny",points:10,amountFen:0,currency:"CNY",enabled:false,sortOrder:2,priceVersion:"unpublished"},
  {packId:"wechat_points_25_cny",points:25,amountFen:0,currency:"CNY",enabled:false,sortOrder:3,priceVersion:"unpublished"},
];
export function assertWechatPaymentsDisabled(){throw new HttpError(503,"点数购买即将开放","MINIAPP_PAYMENTS_DISABLED");}
export function wechatPaymentConfigured(){return process.env.MINIAPP_PAYMENTS_ENABLED==="true"&&process.env.PAYMENT_PROVIDER_WECHAT_ENABLED==="true"&&process.env.WECHAT_PAY_MODE!=="disabled"&&Boolean(process.env.WECHAT_PAY_MCH_ID&&process.env.WECHAT_PAY_API_V3_KEY&&process.env.WECHAT_PAY_PRIVATE_KEY);}
