import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { getDatabase } from "@/server/database/client";
import { visitors } from "@/server/database/schema";

const VISITOR_COOKIE = "wandernote_session";
const BETA_COOKIE = "wandernote_beta";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function options(httpOnly = true) {
  return { httpOnly, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: COOKIE_MAX_AGE };
}

export async function ensureVisitor() {
  const store = await cookies();
  const db = getDatabase();
  const rawCookie = store.get(VISITOR_COOKIE)?.value;
  let sessionId = verifySessionCookie(rawCookie);
  if (!sessionId && rawCookie && /^[A-Za-z0-9_-]{40,60}$/.test(rawCookie)) {
    // One-time migration for existing HTTP-only cookies: only accept a legacy
    // value if it already belongs to a persisted visitor.
    const [legacy] = await db.select({ id: visitors.id }).from(visitors).where(eq(visitors.sessionId, rawCookie)).limit(1);
    if (legacy) sessionId = rawCookie;
  }
  if (!sessionId) sessionId = randomBytes(32).toString("base64url");
  if (rawCookie !== signSessionCookie(sessionId)) store.set(VISITOR_COOKIE, signSessionCookie(sessionId), options());
  const [visitor] = await db.insert(visitors).values({ sessionId }).onConflictDoUpdate({ target: visitors.sessionId, set: { lastSeenAt: new Date() } }).returning({ id: visitors.id });
  return { visitorId: visitor.id, sessionId };
}

export async function findVisitor() {
  const store = await cookies();
  const rawCookie = store.get(VISITOR_COOKIE)?.value;
  let sessionId = verifySessionCookie(rawCookie);
  if (!sessionId && rawCookie && /^[A-Za-z0-9_-]{40,60}$/.test(rawCookie)) sessionId = rawCookie;
  if (!sessionId) return null;
  const db = getDatabase();
  const [visitor] = await db.select({ id: visitors.id }).from(visitors).where(eq(visitors.sessionId, sessionId)).limit(1);
  if (visitor && rawCookie !== signSessionCookie(sessionId)) store.set(VISITOR_COOKIE, signSessionCookie(sessionId), options());
  return visitor ? { visitorId: visitor.id, sessionId } : null;
}

function sessionSecret() {
  return process.env.VISITOR_SESSION_SECRET || process.env.ADMIN_ACCESS_CODE || process.env.OPENAI_API_KEY || "development-only-session-secret";
}

function signSessionCookie(sessionId: string) {
  const signature = createHmac("sha256", sessionSecret()).update(sessionId).digest("base64url");
  return `${sessionId}.${signature}`;
}

function verifySessionCookie(value: string | undefined) {
  if (!value) return null;
  const [sessionId, signature, extra] = value.split(".");
  if (extra || !sessionId || !signature || !/^[A-Za-z0-9_-]{43}$/.test(sessionId)) return null;
  const expected = signSessionCookie(sessionId).split(".")[1]!;
  return signature.length === expected.length && timingSafeEqual(Buffer.from(signature), Buffer.from(expected)) ? sessionId : null;
}

export async function hasBetaAccess(expectedCode: string | null) {
  if (!expectedCode) return true;
  return (await cookies()).get(BETA_COOKIE)?.value === betaCookieValue(expectedCode);
}

export async function grantBetaAccess(code: string) {
  (await cookies()).set(BETA_COOKIE, betaCookieValue(code), options());
}

function betaCookieValue(code: string) {
  return createHashSafe(`${code}:${process.env.OPENAI_API_KEY || "local"}`);
}

function createHashSafe(value: string) {
  return createHash("sha256").update(value).digest("base64url");
}
