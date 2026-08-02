import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { wechatPaymentConfigured, wechatPointPacks } from "../src/server/payments/wechat-provider";

async function main(){const env={...process.env};
delete process.env.MINIAPP_PAYMENTS_ENABLED;delete process.env.PAYMENT_PROVIDER_WECHAT_ENABLED;process.env.WECHAT_PAY_MODE="disabled";
assert.equal(wechatPaymentConfigured(),false,"微信支付必须默认关闭");
assert.equal(wechatPointPacks.every(pack=>!pack.enabled&&pack.amountFen===0),true,"人民币点数包不得提前开放或发布价格");
Object.assign(process.env,env);

const [auth,login,generate,migration,shareMigration,project,publicConfig,shareRoute,sharedRoute,undoRoute,tripRoute,deploymentMigration]=await Promise.all([
  readFile("src/server/auth/miniapp.ts","utf8"),readFile("src/app/api/miniapp/auth/login/route.ts","utf8"),readFile("src/app/api/miniapp/trips/generate/route.ts","utf8"),readFile("drizzle/0008_wechat_miniapp_identity.sql","utf8"),readFile("drizzle/0009_miniapp_sharing.sql","utf8"),readFile("apps/miniprogram/project.config.json","utf8"),readFile("src/app/api/miniapp/public-config/route.ts","utf8"),readFile("src/app/api/miniapp/trips/[tripId]/share/route.ts","utf8"),readFile("src/app/api/miniapp/shares/[token]/route.ts","utf8"),readFile("src/app/api/miniapp/trips/[tripId]/undo/route.ts","utf8"),readFile("src/app/api/miniapp/trips/[tripId]/route.ts","utf8"),readFile("scripts/run-production-migrations.mjs","utf8"),
]);
assert.match(auth,/jscode2session/);assert.doesNotMatch(login,/session_key|openid|AppSecret/);assert.match(auth,/Bearer /);assert.match(auth,/revokedAt/);
assert.match(generate,/idempotency-key/);assert.match(generate,/prepareMiniappGeneration/);assert.match(migration,/user_identities/);assert.match(migration,/miniapp_sessions/);
assert.doesNotMatch(publicConfig,/ensure|CREATE TABLE|ALTER TABLE|CREATE INDEX|getDatabase|execute\s*\(/i,"public-config 必须无 DDL 和数据库副作用");
assert.match(shareMigration,/token_hash/);assert.match(shareRoute,/currentMiniappUser/);assert.match(shareRoute,/eq\(trips\.userId,user\.id\)/);assert.doesNotMatch(shareRoute,/readMiniappJson|request\.json\(/,"分享所有者必须来自服务端 Session");assert.match(sharedRoute,/tokenHash/);assert.doesNotMatch(sharedRoute,/point|email|userId|poster/i,"公开分享不得返回账户、点数或海报数据");
assert.match(undoRoute,/currentMiniappUser/);assert.match(undoRoute,/undoLatestRevision/);assert.match(tripRoute,/segments/);assert.match(deploymentMigration,/VERCEL_ENV\s*!==\s*"production"/);assert.match(deploymentMigration,/DATABASE_URL is required/);assert.match(deploymentMigration,/pg_advisory_lock/);
assert.equal(JSON.parse(project).appid,"touristappid","没有真实AppID时只允许使用官方游客占位");
assert.equal(Math.ceil(7/2),4);console.log("miniapp backend contracts passed");}
void main();
