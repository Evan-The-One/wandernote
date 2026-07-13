import { createHash, randomBytes } from "node:crypto";
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
  let sessionId = store.get(VISITOR_COOKIE)?.value;
  if (!sessionId || !/^[A-Za-z0-9_-]{40,60}$/.test(sessionId)) {
    sessionId = randomBytes(32).toString("base64url");
    store.set(VISITOR_COOKIE, sessionId, options());
  }
  const db = getDatabase();
  const [visitor] = await db.insert(visitors).values({ sessionId }).onConflictDoUpdate({ target: visitors.sessionId, set: { lastSeenAt: new Date() } }).returning({ id: visitors.id });
  return { visitorId: visitor.id, sessionId };
}

export async function findVisitor() {
  const sessionId = (await cookies()).get(VISITOR_COOKIE)?.value;
  if (!sessionId) return null;
  const db = getDatabase();
  const [visitor] = await db.select({ id: visitors.id }).from(visitors).where(eq(visitors.sessionId, sessionId)).limit(1);
  return visitor ? { visitorId: visitor.id, sessionId } : null;
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
