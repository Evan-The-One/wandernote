import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull, or, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDatabase, withDatabaseTransaction } from "@/server/database/client";
import {
  emailLoginTokens,
  loginAttempts,
  trips,
  userLegalAcceptances,
  userSessions,
  users,
} from "@/server/database/schema";
import { findVisitor } from "./visitor";

const COOKIE = "yjchufa_user_session";
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const pendingActions = new Set(["generate_poster"]);
let initialized = false;

async function ensureUserAuthTables() {
  if (initialized) return;
  const db = getDatabase();
  await db.execute(sql.raw(`CREATE TABLE IF NOT EXISTS users (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),email text NOT NULL UNIQUE,verified_at timestamptz,status text NOT NULL DEFAULT 'active',created_at timestamptz NOT NULL DEFAULT now(),last_login_at timestamptz)`));
  await db.execute(sql.raw(`CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users(email)`));
  await db.execute(sql.raw(`CREATE TABLE IF NOT EXISTS user_sessions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,token_hash text NOT NULL UNIQUE,expires_at timestamptz NOT NULL,created_at timestamptz NOT NULL DEFAULT now())`));
  await db.execute(sql.raw(`CREATE UNIQUE INDEX IF NOT EXISTS user_sessions_token_unique ON user_sessions(token_hash)`));
  await db.execute(sql.raw(`CREATE INDEX IF NOT EXISTS user_sessions_user_idx ON user_sessions(user_id)`));
  await db.execute(sql.raw(`CREATE TABLE IF NOT EXISTS email_login_tokens (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),email text NOT NULL,token_hash text NOT NULL UNIQUE,expires_at timestamptz NOT NULL,used_at timestamptz,created_at timestamptz NOT NULL DEFAULT now())`));
  await db.execute(sql.raw(`CREATE UNIQUE INDEX IF NOT EXISTS email_login_tokens_token_unique ON email_login_tokens(token_hash)`));
  await db.execute(sql.raw(`CREATE INDEX IF NOT EXISTS email_login_tokens_email_created_idx ON email_login_tokens(email,created_at)`));
  await db.execute(sql.raw(`ALTER TABLE trips ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES users(id) ON DELETE SET NULL`));
  await db.execute(sql.raw(`CREATE INDEX IF NOT EXISTS trips_user_updated_idx ON trips(user_id,updated_at)`));
  await db.execute(sql.raw(`CREATE TABLE IF NOT EXISTS login_attempts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),attempt_token_hash text NOT NULL UNIQUE,email_normalized text NOT NULL,trip_id uuid REFERENCES trips(id) ON DELETE SET NULL,visitor_id uuid REFERENCES visitors(id) ON DELETE SET NULL,return_to text NOT NULL DEFAULT '/',pending_action text,status text NOT NULL DEFAULT 'pending',expires_at timestamptz NOT NULL,completed_at timestamptz,user_id uuid REFERENCES users(id) ON DELETE SET NULL,consumed_token_id uuid REFERENCES email_login_tokens(id) ON DELETE SET NULL,failure_code text,created_at timestamptz NOT NULL DEFAULT now())`));
  await db.execute(sql.raw(`CREATE INDEX IF NOT EXISTS login_attempts_trip_created_idx ON login_attempts(trip_id,created_at)`));
  await db.execute(sql.raw(`CREATE INDEX IF NOT EXISTS login_attempts_expires_idx ON login_attempts(expires_at)`));
  initialized = true;
}

export function userAuthConfigured() {
  return Boolean(process.env.AUTH_SECRET && process.env.RESEND_API_KEY && process.env.AUTH_EMAIL_FROM);
}

export async function currentUser() {
  await ensureUserAuthTables();
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const [row] = await getDatabase()
    .select({ id: users.id, email: users.email })
    .from(userSessions)
    .innerJoin(users, eq(userSessions.userId, users.id))
    .where(and(eq(userSessions.tokenHash, hash(raw)), gt(userSessions.expiresAt, new Date()), eq(users.status, "active")))
    .limit(1);
  return row || null;
}

type LoginRequest = {
  returnTo: string;
  tripId?: string;
  pendingAction?: string;
};

export async function sendLoginLink(rawEmail: string, request: Request, options: LoginRequest) {
  await ensureUserAuthTables();
  const email = rawEmail.trim().toLowerCase();
  if (!emailPattern.test(email) || email.length > 254 || !userAuthConfigured()) return null;
  const visitor = await findVisitor();
  const safeReturn = options.returnTo.startsWith("/trip/") || options.returnTo === "/account" ? options.returnTo : "/";
  const pendingAction = options.pendingAction && pendingActions.has(options.pendingAction) ? options.pendingAction : null;
  let tripId: string | null = null;
  if (options.tripId && visitor) {
    const [ownedTrip] = await getDatabase().select({ id: trips.id }).from(trips)
      .where(and(eq(trips.id, options.tripId), eq(trips.visitorId, visitor.visitorId), isNull(trips.userId))).limit(1);
    tripId = ownedTrip?.id ?? null;
  }
  const loginToken = randomBytes(32).toString("base64url");
  const attemptToken = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 15 * 60_000);
  const result = await withDatabaseTransaction(async (tx) => {
    const [tokenRow] = await tx.insert(emailLoginTokens).values({
      email,
      tokenHash: hash(loginToken),
      expiresAt,
    }).returning({ id: emailLoginTokens.id });
    const [attempt] = await tx.insert(loginAttempts).values({
      attemptTokenHash: hash(attemptToken),
      emailNormalized: email,
      tripId,
      visitorId: tripId ? visitor?.visitorId : null,
      returnTo: safeReturn,
      pendingAction,
      status: "email_sent",
      expiresAt,
      consumedTokenId: tokenRow.id,
    }).returning({ id: loginAttempts.id });
    return attempt;
  });
  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const url = `${origin}/api/auth/email/verify?token=${encodeURIComponent(loginToken)}&attempt=${encodeURIComponent(attemptToken)}`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: process.env.AUTH_EMAIL_FROM,
      to: [email],
      subject: "登录一键出发",
      html: `<p>点击下面的链接登录一键出发。链接 15 分钟内有效，且只能使用一次。</p><p><a href="${url}">登录并继续</a></p><p>如果不是你本人操作，请忽略这封邮件。</p>`,
    }),
  });
  if (!response.ok) {
    await getDatabase().update(loginAttempts).set({ status: "failed", failureCode: "EMAIL_DELIVERY_FAILED" }).where(eq(loginAttempts.id, result.id));
    return null;
  }
  return { attemptId: attemptToken, expiresAt: expiresAt.toISOString(), returnTo: safeReturn, pendingAction };
}

export type VerifyResult =
  | { ok: true; returnTo: string; pendingAction: string | null }
  | { ok: false; reason: "expired" | "used" | "invalid" };

export async function verifyLoginToken(token: string, attemptToken: string): Promise<VerifyResult> {
  await ensureUserAuthTables();
  const rawSession = randomBytes(32).toString("base64url");
  const result = await withDatabaseTransaction(async (tx) => {
    const [attempt] = await tx.select().from(loginAttempts)
      .where(eq(loginAttempts.attemptTokenHash, hash(attemptToken))).limit(1);
    if (!attempt) return { ok: false as const, reason: "invalid" as const };
    if (attempt.status === "completed") return { ok: false as const, reason: "used" as const };
    if (attempt.expiresAt <= new Date()) {
      await tx.update(loginAttempts).set({ status: "expired", failureCode: "LOGIN_LINK_EXPIRED" }).where(eq(loginAttempts.id, attempt.id));
      return { ok: false as const, reason: "expired" as const };
    }
    const [entry] = await tx.select().from(emailLoginTokens)
      .where(and(eq(emailLoginTokens.id, attempt.consumedTokenId!), eq(emailLoginTokens.tokenHash, hash(token)))).limit(1);
    if (!entry || entry.email !== attempt.emailNormalized) return { ok: false as const, reason: "invalid" as const };
    if (entry.usedAt) return { ok: false as const, reason: "used" as const };
    if (entry.expiresAt <= new Date()) return { ok: false as const, reason: "expired" as const };
    const consumed = await tx.update(emailLoginTokens).set({ usedAt: new Date() }).where(and(eq(emailLoginTokens.id, entry.id), isNull(emailLoginTokens.usedAt))).returning({id:emailLoginTokens.id});
    if (!consumed.length) return { ok: false as const, reason: "used" as const };
    const [account] = await tx.insert(users).values({
      email: entry.email,
      verifiedAt: new Date(),
      lastLoginAt: new Date(),
    }).onConflictDoUpdate({
      target: users.email,
      set: { verifiedAt: new Date(), lastLoginAt: new Date(), status: "active" },
    }).returning({ id: users.id });
    await tx.insert(userSessions).values({
      userId: account.id,
      tokenHash: hash(rawSession),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60_000),
    });
    await tx.insert(userLegalAcceptances).values([
      { userId: account.id, documentType: "privacy", version: "2026-07-19" },
      { userId: account.id, documentType: "terms", version: "2026-07-19" },
    ]).onConflictDoNothing({ target: [userLegalAcceptances.userId, userLegalAcceptances.documentType, userLegalAcceptances.version] });
    if (attempt.tripId && attempt.visitorId) {
      await tx.update(trips).set({ userId: account.id }).where(and(
        eq(trips.id, attempt.tripId),
        eq(trips.visitorId, attempt.visitorId),
        or(isNull(trips.userId), eq(trips.userId, account.id)),
      ));
    }
    await tx.update(loginAttempts).set({
      status: "completed",
      completedAt: new Date(),
      userId: account.id,
      failureCode: null,
    }).where(and(eq(loginAttempts.id, attempt.id), eq(loginAttempts.status, "email_sent")));
    return { ok: true as const, returnTo: attempt.returnTo, pendingAction: attempt.pendingAction };
  });
  if (!result.ok) return result;
  (await cookies()).set(COOKIE, rawSession, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
  return result;
}

export async function getLoginAttemptStatus(attemptToken: string) {
  await ensureUserAuthTables();
  const [attempt] = await getDatabase().select({
    status: loginAttempts.status,
    expiresAt: loginAttempts.expiresAt,
    completedAt: loginAttempts.completedAt,
    userId: loginAttempts.userId,
    tripId: loginAttempts.tripId,
    pendingAction: loginAttempts.pendingAction,
  }).from(loginAttempts).where(eq(loginAttempts.attemptTokenHash, hash(attemptToken))).limit(1);
  if (!attempt) return null;
  const user = await currentUser();
  const authenticated = Boolean(user && attempt.userId === user.id);
  let tripClaimed = false;
  if (authenticated && attempt.tripId) {
    const [claimed] = await getDatabase().select({ id: trips.id }).from(trips)
      .where(and(eq(trips.id, attempt.tripId), eq(trips.userId, user!.id))).limit(1);
    tripClaimed = Boolean(claimed);
  }
  return {
    status: attempt.status,
    authenticated,
    tripClaimed,
    pendingAction: attempt.pendingAction,
    expiresAt: attempt.expiresAt.toISOString(),
    completedAt: attempt.completedAt?.toISOString() ?? null,
  };
}

export async function signOutUser() {
  const store = await cookies();
  const raw = store.get(COOKIE)?.value;
  if (raw) await getDatabase().delete(userSessions).where(eq(userSessions.tokenHash, hash(raw)));
  store.delete(COOKIE);
}
