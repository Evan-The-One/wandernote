import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { wechatPaymentConfigured, wechatPointPacks } from "../src/server/payments/wechat-provider";

async function main(){const env={...process.env};
delete process.env.MINIAPP_PAYMENTS_ENABLED;delete process.env.PAYMENT_PROVIDER_WECHAT_ENABLED;process.env.WECHAT_PAY_MODE="disabled";
assert.equal(wechatPaymentConfigured(),false,"微信支付必须默认关闭");
assert.equal(wechatPointPacks.every(pack=>!pack.enabled&&pack.amountFen===0),true,"人民币点数包不得提前开放或发布价格");
Object.assign(process.env,env);

const [auth,login,generate,migration,project]=await Promise.all([
  readFile("src/server/auth/miniapp.ts","utf8"),readFile("src/app/api/miniapp/auth/login/route.ts","utf8"),readFile("src/app/api/miniapp/trips/generate/route.ts","utf8"),readFile("drizzle/0008_wechat_miniapp_identity.sql","utf8"),readFile("apps/miniprogram/project.config.json","utf8"),
]);
assert.match(auth,/jscode2session/);assert.doesNotMatch(login,/session_key|openid|AppSecret/);assert.match(auth,/Bearer /);assert.match(auth,/revokedAt/);
assert.match(generate,/idempotency-key/);assert.match(generate,/prepareMiniappGeneration/);assert.match(migration,/user_identities/);assert.match(migration,/miniapp_sessions/);
assert.equal(JSON.parse(project).appid,"touristappid","没有真实AppID时只允许使用官方游客占位");
assert.equal(Math.ceil(7/2),4);console.log("miniapp backend contracts passed");}
void main();
