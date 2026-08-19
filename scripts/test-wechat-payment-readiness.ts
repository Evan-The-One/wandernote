import assert from "node:assert/strict";
import {createWechatPayProvider,wechatPaymentConfigured,wechatPointPacks} from "../src/server/payments/wechat-provider";

async function main(){const old={mini:process.env.MINIAPP_PAYMENTS_ENABLED,provider:process.env.PAYMENT_PROVIDER_WECHAT_ENABLED,mode:process.env.WECHAT_PAY_MODE};
process.env.MINIAPP_PAYMENTS_ENABLED="false";
process.env.PAYMENT_PROVIDER_WECHAT_ENABLED="false";
process.env.WECHAT_PAY_MODE="disabled";
assert.equal(wechatPaymentConfigured(),false);
assert.equal(wechatPointPacks.length,3);
assert.ok(wechatPointPacks.every(pack=>pack.enabled===false&&pack.amountFen===0&&pack.points===0));
const provider=createWechatPayProvider();
for(const operation of [()=>provider.createOrder({orderId:"order",packId:"wechat_starter_draft",userId:"user",openidSubjectHash:"hash"}),()=>provider.queryOrder("order"),()=>provider.closeOrder("order"),()=>provider.handleRefund("order",1),()=>provider.queryRefund("refund")]){
  await assert.rejects(operation,error=>error instanceof Error&&"code" in error&&error.code==="MINIAPP_PAYMENTS_DISABLED");
}
assert.throws(()=>provider.verifyCallback("{}",new Headers()),error=>error instanceof Error&&"code" in error&&error.code==="MINIAPP_PAYMENTS_DISABLED");
process.env.MINIAPP_PAYMENTS_ENABLED=old.mini;
process.env.PAYMENT_PROVIDER_WECHAT_ENABLED=old.provider;
process.env.WECHAT_PAY_MODE=old.mode;
console.log("wechat payment readiness: disabled contract and draft packs passed");
}
main().catch(error=>{console.error(error);process.exitCode=1});
