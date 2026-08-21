import { createHmac, timingSafeEqual } from "node:crypto";
import { HttpError } from "@/server/http";

const SHARE_TTL_SECONDS = 30 * 24 * 60 * 60;

function secret() {
  const value = process.env.AUTH_SECRET || process.env.VISITOR_SESSION_SECRET;
  if (!value) throw new HttpError(503, "分享服务暂不可用", "SHARE_UNAVAILABLE");
  return value;
}

function signature(payload: string) {
  return createHmac("sha256", secret()).update(`web-trip-share:v1:${payload}`).digest("base64url");
}

export function createWebTripShareToken(tripId: string, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ tripId, expiresAt: now + SHARE_TTL_SECONDS * 1000 })).toString("base64url");
  return `${payload}.${signature(payload)}`;
}

export function verifyWebTripShareToken(token: string, expectedTripId: string, now = Date.now()) {
  if (token.length < 40 || token.length > 500) return false;
  const [payload, received, extra] = token.split(".");
  if (!payload || !received || extra) return false;
  const expected = signature(payload);
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return false;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { tripId?: unknown; expiresAt?: unknown };
    return parsed.tripId === expectedTripId && typeof parsed.expiresAt === "number" && parsed.expiresAt > now;
  } catch {
    return false;
  }
}
