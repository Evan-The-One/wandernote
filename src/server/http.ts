import { createHash, timingSafeEqual } from "node:crypto";

export const MAX_REQUEST_BODY_BYTES = 16 * 1024;

export class HttpError extends Error {
  constructor(public status: number, message: string, public code: string) { super(message); }
}

export type PublicErrorCode =
  | "AI_DISABLED" | "DAILY_LIMIT_REACHED" | "OPENAI_AUTH_ERROR" | "OPENAI_QUOTA_ERROR"
  | "OPENAI_TIMEOUT" | "DATABASE_ERROR" | "FUNCTION_TIMEOUT" | "VALIDATION_FAILED" | "JSON_PARSE_FAILED" | "SCHEMA_VALIDATION_FAILED" | "QUALITY_VALIDATION_FAILED" | "UNKNOWN_ERROR"
  | "DAILY_AI_BUDGET_EXCEEDED" | "GLOBAL_CONCURRENCY_LIMIT" | "RATE_LIMITED";

export type ApiErrorContext = { requestId?: string; stage?: string };

export async function readJsonBody(request: Request): Promise<unknown> {
  assertTrustedMutation(request);
  const contentType = request.headers.get("content-type")?.toLowerCase() || "";
  if (!contentType.startsWith("application/json")) throw new HttpError(415, "请求格式无效", "UNSUPPORTED_MEDIA_TYPE");
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > MAX_REQUEST_BODY_BYTES) throw new HttpError(413, "请求内容过大，请精简补充要求后重试", "BODY_TOO_LARGE");
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_REQUEST_BODY_BYTES) throw new HttpError(413, "请求内容过大，请精简补充要求后重试", "BODY_TOO_LARGE");
  try { return JSON.parse(raw); } catch { throw new HttpError(400, "请求格式无效", "INVALID_JSON"); }
}

/**
 * Cookie-backed mutations must come from this deployment. This blocks browser
 * CSRF and casual cross-site replay; quotas and idempotency remain the security
 * boundary for non-browser clients, which can forge headers.
 */
export function assertTrustedMutation(request: Request) {
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "same-site" && site !== "none") {
    throw new HttpError(403, "请求来源无效，请刷新页面后重试", "UNTRUSTED_ORIGIN");
  }

  const origin = request.headers.get("origin");
  if (!origin) {
    if (process.env.NODE_ENV === "production") throw new HttpError(403, "请求来源无效，请刷新页面后重试", "UNTRUSTED_ORIGIN");
    return;
  }

  let originUrl: URL;
  try { originUrl = new URL(origin); }
  catch { throw new HttpError(403, "请求来源无效，请刷新页面后重试", "UNTRUSTED_ORIGIN"); }
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || (process.env.NODE_ENV === "production" ? "https" : "http");
  const deploymentOrigin = host ? `${forwardedProto}://${host}` : null;
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || null;
  if (originUrl.origin !== deploymentOrigin && originUrl.origin !== configuredOrigin) {
    throw new HttpError(403, "请求来源无效，请刷新页面后重试", "UNTRUSTED_ORIGIN");
  }
}

export function secureEqual(left: string, right: string) {
  const a = createHash("sha256").update(left).digest();
  const b = createHash("sha256").update(right).digest();
  return timingSafeEqual(a, b);
}

export function apiError(error: unknown, context: ApiErrorContext = {}) {
  const requestId = context.requestId;
  if (error instanceof HttpError) {
    if (error.status >= 500 || error.code === "VALIDATION_FAILED") console.warn("api_request_rejected", JSON.stringify({ requestId, stage: context.stage, code: error.code, status: error.status }));
    return Response.json({ error: { code: error.code, message: error.message, requestId } }, { status: error.status, headers: requestId ? { "x-request-id": requestId } : undefined });
  }
  const message = error instanceof Error ? error.message : "服务暂时不可用，请稍后重试";
  const isDatabase = /database|postgres|neon|connection|DATABASE_URL|数据库/i.test(`${error instanceof Error ? error.name : ""} ${message}`);
  const isTimeout = /timeout|timed out|function.*time|执行时间/i.test(message);
  const code: PublicErrorCode = isDatabase ? "DATABASE_ERROR" : isTimeout ? "FUNCTION_TIMEOUT" : "UNKNOWN_ERROR";
  const publicMessage = isDatabase ? "攻略暂时无法保存，请稍后重试" : isTimeout ? "生成时间超过服务器限制，请直接重试" : "服务暂时不可用，请稍后重试";
  console.error("api_request_failed", JSON.stringify({
    name: error instanceof Error ? error.name : "Unknown",
    requestId,
    stage: context.stage,
    code,
    detail: redactDiagnostic(message),
  }));
  return Response.json({ error: { code, message: publicMessage, requestId } }, { status: isTimeout ? 504 : 500, headers: requestId ? { "x-request-id": requestId } : undefined });
}

function redactDiagnostic(message: string) {
  return message
    .replace(/\nparams:[\s\S]*/i, "\nparams:[REDACTED]")
    .replace(/Connection string:[^\n]*/gi, "Connection string: [REDACTED]")
    .replace(/postgres(?:ql)?:\/\/\S+/gi, "[DATABASE_URL_REDACTED]")
    .replace(/sk-[A-Za-z0-9_-]{12,}/g, "[API_KEY_REDACTED]")
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi, "[UUID_REDACTED]")
    .replace(/[A-Za-z0-9_-]{40,}/g, "[TOKEN_REDACTED]")
    .slice(0, 300);
}
