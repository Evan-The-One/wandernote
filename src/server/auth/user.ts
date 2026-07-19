import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDatabase, withDatabaseTransaction } from "@/server/database/client";
import { emailLoginTokens, trips, userSessions, users } from "@/server/database/schema";
import { findVisitor } from "./visitor";

const COOKIE = "yjchufa_user_session";
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
let initialized=false;
async function ensureUserAuthTables(){if(initialized)return;const db=getDatabase();await db.execute(sql.raw(`CREATE TABLE IF NOT EXISTS users (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),email text NOT NULL UNIQUE,verified_at timestamptz,status text NOT NULL DEFAULT 'active',created_at timestamptz NOT NULL DEFAULT now(),last_login_at timestamptz)`));await db.execute(sql.raw(`CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users(email)`));await db.execute(sql.raw(`CREATE TABLE IF NOT EXISTS user_sessions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,token_hash text NOT NULL UNIQUE,expires_at timestamptz NOT NULL,created_at timestamptz NOT NULL DEFAULT now())`));await db.execute(sql.raw(`CREATE UNIQUE INDEX IF NOT EXISTS user_sessions_token_unique ON user_sessions(token_hash)`));await db.execute(sql.raw(`CREATE INDEX IF NOT EXISTS user_sessions_user_idx ON user_sessions(user_id)`));await db.execute(sql.raw(`CREATE TABLE IF NOT EXISTS email_login_tokens (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),email text NOT NULL,token_hash text NOT NULL UNIQUE,expires_at timestamptz NOT NULL,used_at timestamptz,created_at timestamptz NOT NULL DEFAULT now())`));await db.execute(sql.raw(`CREATE UNIQUE INDEX IF NOT EXISTS email_login_tokens_token_unique ON email_login_tokens(token_hash)`));await db.execute(sql.raw(`CREATE INDEX IF NOT EXISTS email_login_tokens_email_created_idx ON email_login_tokens(email,created_at)`));await db.execute(sql.raw(`ALTER TABLE trips ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES users(id) ON DELETE SET NULL`));await db.execute(sql.raw(`CREATE INDEX IF NOT EXISTS trips_user_updated_idx ON trips(user_id,updated_at)`));await db.execute(sql.raw(`ALTER TABLE entitlement_ledger ADD COLUMN IF NOT EXISTS principal_type text`));await db.execute(sql.raw(`ALTER TABLE entitlement_ledger ADD COLUMN IF NOT EXISTS principal_id uuid`));await db.execute(sql.raw(`CREATE INDEX IF NOT EXISTS entitlement_ledger_principal_type_idx ON entitlement_ledger(principal_type,principal_id,credit_type,created_at)`));initialized=true;}

export function userAuthConfigured() { return Boolean(process.env.AUTH_SECRET && process.env.RESEND_API_KEY && process.env.AUTH_EMAIL_FROM); }

export async function currentUser() {
  await ensureUserAuthTables();
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const [row] = await getDatabase().select({ id: users.id, email: users.email }).from(userSessions).innerJoin(users, eq(userSessions.userId, users.id)).where(and(eq(userSessions.tokenHash, hash(raw)), gt(userSessions.expiresAt, new Date()), eq(users.status, "active"))).limit(1);
  return row || null;
}

export async function sendLoginLink(rawEmail: string, request: Request, returnTo: string) {
  await ensureUserAuthTables();
  const email = rawEmail.trim().toLowerCase();
  if (!emailPattern.test(email) || email.length > 254 || !userAuthConfigured()) return;
  const db = getDatabase();
  const token = randomBytes(32).toString("base64url");
  await db.insert(emailLoginTokens).values({ email, tokenHash: hash(token), expiresAt: new Date(Date.now() + 15 * 60_000) });
  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const safeReturn = returnTo.startsWith("/trip/") ? returnTo : "/";
  const url = `${origin}/api/auth/email/verify?token=${encodeURIComponent(token)}&returnTo=${encodeURIComponent(safeReturn)}`;
  await fetch("https://api.resend.com/emails", { method: "POST", headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json" }, body: JSON.stringify({ from: process.env.AUTH_EMAIL_FROM, to: [email], subject: "登录一键出发", html: `<p>点击下面的链接登录一键出发。链接 15 分钟内有效，且只能使用一次。</p><p><a href="${url}">登录并继续生成旅行海报</a></p><p>如果不是你本人操作，请忽略这封邮件。</p>` }) });
}

export async function verifyLoginToken(token: string) {
  await ensureUserAuthTables();
  const visitor = await findVisitor();
  const rawSession = randomBytes(32).toString("base64url");
  const user = await withDatabaseTransaction(async (tx) => {
    const [entry] = await tx.select().from(emailLoginTokens).where(and(eq(emailLoginTokens.tokenHash, hash(token)), isNull(emailLoginTokens.usedAt), gt(emailLoginTokens.expiresAt, new Date()))).limit(1);
    if (!entry) return null;
    await tx.update(emailLoginTokens).set({ usedAt: new Date() }).where(eq(emailLoginTokens.id, entry.id));
    const [account] = await tx.insert(users).values({ email: entry.email, verifiedAt: new Date(), lastLoginAt: new Date() }).onConflictDoUpdate({ target: users.email, set: { verifiedAt: new Date(), lastLoginAt: new Date(), status: "active" } }).returning({ id: users.id, email: users.email });
    await tx.insert(userSessions).values({ userId: account.id, tokenHash: hash(rawSession), expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60_000) });
    if (visitor) await tx.update(trips).set({ userId: account.id }).where(and(eq(trips.visitorId, visitor.visitorId), isNull(trips.userId)));
    return account;
  });
  if (!user) return null;
  (await cookies()).set(COOKIE, rawSession, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 30 * 24 * 60 * 60 });
  return user;
}

export async function signOutUser() {
  const store = await cookies(); const raw = store.get(COOKIE)?.value;
  if (raw) await getDatabase().delete(userSessions).where(eq(userSessions.tokenHash, hash(raw)));
  store.delete(COOKIE);
}
