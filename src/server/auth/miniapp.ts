import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { getDatabase, withDatabaseTransaction } from "@/server/database/client";
import { miniappSessions, userIdentities, users } from "@/server/database/schema";
import { HttpError } from "@/server/http";

const ACCESS_TTL = 2 * 60 * 60_000;
const REFRESH_TTL = 30 * 24 * 60 * 60_000;
const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
const secret = () => {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new HttpError(503, "微信登录暂未配置", "MINIAPP_AUTH_UNAVAILABLE");
  return value;
};
export const miniappConfigured = () => Boolean(process.env.WECHAT_MINIAPP_APP_ID && process.env.WECHAT_MINIAPP_APP_SECRET && process.env.AUTH_SECRET);
export const subjectHash = (value: string) => createHmac("sha256", secret()).update(`wechat:${value}`).digest("hex");
export const emailHash = (value: string) => createHmac("sha256", secret()).update(`email:${value.trim().toLowerCase()}`).digest("hex");

export function encryptPrivateText(value: string) {
  const key = createHash("sha256").update(secret()).digest();
  const iv = randomBytes(12); const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`;
}
export function decryptPrivateText(value: string) {
  const [ivRaw, tagRaw, dataRaw] = value.split(".");
  if (!ivRaw || !tagRaw || !dataRaw) throw new HttpError(400, "绑定信息无效", "INVALID_BINDING");
  const decipher = createDecipheriv("aes-256-gcm", createHash("sha256").update(secret()).digest(), Buffer.from(ivRaw, "base64url"));
  decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(dataRaw, "base64url")), decipher.final()]).toString("utf8");
}

export async function exchangeWechatCode(code: string) {
  if (!miniappConfigured()) throw new HttpError(503, "微信登录将在配置 AppID 后开放", "MINIAPP_AUTH_UNAVAILABLE");
  const url = new URL("https://api.weixin.qq.com/sns/jscode2session");
  url.searchParams.set("appid", process.env.WECHAT_MINIAPP_APP_ID!);
  url.searchParams.set("secret", process.env.WECHAT_MINIAPP_APP_SECRET!);
  url.searchParams.set("js_code", code);
  url.searchParams.set("grant_type", "authorization_code");
  let response:Response;
  try{response=await fetch(url,{cache:"no-store",signal:AbortSignal.timeout(8_000)});}catch(error){if(error instanceof Error&&(error.name==="TimeoutError"||error.name==="AbortError"))throw new HttpError(504,"微信登录响应较慢，请重试","WECHAT_API_TIMEOUT");throw new HttpError(502,"微信登录服务暂时不可用","WECHAT_API_UNAVAILABLE");}
  const payload = await response.json() as { openid?: string; unionid?: string; errcode?: number };
  if(payload.errcode===40029)throw new HttpError(401,"登录凭证已失效，请重新进入","WECHAT_CODE_INVALID");
  if(payload.errcode===40125||payload.errcode===40013)throw new HttpError(503,"微信登录配置需要管理员检查","WECHAT_CREDENTIALS_INVALID");
  if(payload.errcode===45011)throw new HttpError(429,"登录尝试较多，请稍后再试","WECHAT_LOGIN_RATE_LIMITED");
  if (!response.ok || !payload.openid || payload.errcode) throw new HttpError(401, "微信登录失败，请重试", "WECHAT_LOGIN_FAILED");
  return { providerSubjectHash: subjectHash(payload.unionid ? `union:${payload.unionid}` : `open:${payload.openid}`) };
}

async function issueSession(userId: string) {
  const token = randomBytes(32).toString("base64url"); const refreshToken = randomBytes(40).toString("base64url");
  await getDatabase().insert(miniappSessions).values({ userId, tokenHash: sha256(token), refreshTokenHash: sha256(refreshToken), expiresAt: new Date(Date.now() + ACCESS_TTL), refreshExpiresAt: new Date(Date.now() + REFRESH_TTL) });
  return { sessionToken: token, refreshToken, expiresIn: ACCESS_TTL / 1000 };
}

export async function loginWechatIdentity(providerSubjectHash: string) {
  return withDatabaseTransaction(async tx => {
    const [identity] = await tx.select({ userId: userIdentities.userId }).from(userIdentities).where(and(eq(userIdentities.provider, "wechat_miniprogram"), eq(userIdentities.providerSubjectHash, providerSubjectHash))).limit(1);
    let userId = identity?.userId;
    if (!userId) {
      const internalEmail = `wechat+${providerSubjectHash.slice(0, 32)}@identity.invalid`;
      const [account] = await tx.insert(users).values({ email: internalEmail, status: "active", lastLoginAt: new Date() }).returning({ id: users.id });
      userId = account!.id;
      await tx.insert(userIdentities).values({ userId, provider: "wechat_miniprogram", providerSubjectHash });
    } else {
      await tx.update(userIdentities).set({ lastUsedAt: new Date() }).where(and(eq(userIdentities.provider, "wechat_miniprogram"), eq(userIdentities.providerSubjectHash, providerSubjectHash)));
      await tx.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, userId));
    }
    return userId;
  }).then(issueSession);
}

function bearer(request: Request) {
  const header = request.headers.get("authorization") || "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}
export async function currentMiniappUser(request: Request) {
  const token = bearer(request); if (!token) throw new HttpError(401, "登录状态已过期，请重新登录", "MINIAPP_LOGIN_REQUIRED");
  const [row] = await getDatabase().select({ id: users.id, generationAccessMode: users.generationAccessMode, sessionId: miniappSessions.id }).from(miniappSessions).innerJoin(users, eq(miniappSessions.userId, users.id)).where(and(eq(miniappSessions.tokenHash, sha256(token)), gt(miniappSessions.expiresAt, new Date()), isNull(miniappSessions.revokedAt), eq(users.status, "active"))).limit(1);
  if (!row) throw new HttpError(401, "登录状态已过期，请重新登录", "MINIAPP_SESSION_EXPIRED");
  await getDatabase().update(miniappSessions).set({ lastUsedAt: new Date() }).where(eq(miniappSessions.id, row.sessionId)).catch(() => undefined);
  return row;
}
export async function revokeMiniappSession(request: Request) {
  const token = bearer(request); if (!token) return;
  await getDatabase().update(miniappSessions).set({ revokedAt: new Date() }).where(eq(miniappSessions.tokenHash, sha256(token)));
}

export async function rotateMiniappSession(refreshToken: string) {
  const [row] = await getDatabase().select().from(miniappSessions).where(and(eq(miniappSessions.refreshTokenHash, sha256(refreshToken)), gt(miniappSessions.refreshExpiresAt, new Date()), isNull(miniappSessions.revokedAt))).limit(1);
  if (!row) throw new HttpError(401, "登录状态已过期，请重新登录", "MINIAPP_REFRESH_EXPIRED");
  await getDatabase().update(miniappSessions).set({ revokedAt: new Date() }).where(eq(miniappSessions.id, row.id));
  return issueSession(row.userId);
}

export async function readMiniappJson(request: Request, maxBytes = 16 * 1024) {
  if (!(request.headers.get("content-type") || "").toLowerCase().startsWith("application/json")) throw new HttpError(415, "请求格式无效", "UNSUPPORTED_MEDIA_TYPE");
  const raw = await request.text(); if (new TextEncoder().encode(raw).byteLength > maxBytes) throw new HttpError(413, "请求内容过大", "BODY_TOO_LARGE");
  try { return JSON.parse(raw) as unknown; } catch { throw new HttpError(400, "请求格式无效", "INVALID_JSON"); }
}
