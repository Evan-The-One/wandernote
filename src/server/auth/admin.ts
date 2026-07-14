import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "trip_ready_admin";
const failedAttempts = new Map<string, { count: number; resetAt: number }>();

function signature(code: string) { return createHmac("sha256", code).update("trip-ready-admin-v1").digest("hex"); }
export function isAdminConfigured() { return Boolean(process.env.ADMIN_ACCESS_CODE); }
export async function hasAdminAccess() {
  const code = process.env.ADMIN_ACCESS_CODE; if (!code) return false;
  const value = (await cookies()).get(COOKIE)?.value; if (!value) return false;
  const expected = signature(code); return value.length === expected.length && timingSafeEqual(Buffer.from(value), Buffer.from(expected));
}
export function assertLoginAttempt(key: string) { const now = Date.now(); const value = failedAttempts.get(key); if (value && value.resetAt > now && value.count >= 5) return false; if (!value || value.resetAt <= now) failedAttempts.set(key, { count: 0, resetAt: now + 15 * 60_000 }); return true; }
export function recordFailedLogin(key: string) { const value = failedAttempts.get(key) ?? { count: 0, resetAt: Date.now() + 15 * 60_000 }; failedAttempts.set(key, { ...value, count: value.count + 1 }); }
export async function setAdminCookie() { const code = process.env.ADMIN_ACCESS_CODE!; (await cookies()).set(COOKIE, signature(code), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 60 * 60 * 8 }); }
export async function clearAdminCookie() { (await cookies()).delete(COOKIE); }
