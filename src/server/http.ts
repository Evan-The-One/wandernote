import { createHash, timingSafeEqual } from "node:crypto";

export const MAX_REQUEST_BODY_BYTES = 16 * 1024;

export class HttpError extends Error {
  constructor(public status: number, message: string, public code: string) { super(message); }
}

export async function readJsonBody(request: Request): Promise<unknown> {
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > MAX_REQUEST_BODY_BYTES) throw new HttpError(413, "请求内容过大，请精简补充要求后重试", "BODY_TOO_LARGE");
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_REQUEST_BODY_BYTES) throw new HttpError(413, "请求内容过大，请精简补充要求后重试", "BODY_TOO_LARGE");
  try { return JSON.parse(raw); } catch { throw new HttpError(400, "请求格式无效", "INVALID_JSON"); }
}

export function secureEqual(left: string, right: string) {
  const a = createHash("sha256").update(left).digest();
  const b = createHash("sha256").update(right).digest();
  return timingSafeEqual(a, b);
}

export function apiError(error: unknown) {
  if (error instanceof HttpError) return Response.json({ error: { code: error.code, message: error.message } }, { status: error.status });
  const message = error instanceof Error ? error.message : "服务暂时不可用，请稍后重试";
  const isConfig = message.includes("尚未配置") || message.includes("DATABASE_URL");
  console.error("api_request_failed", JSON.stringify({
    name: error instanceof Error ? error.name : "Unknown",
    config: isConfig,
    detail: redactDiagnostic(message),
  }));
  return Response.json({ error: { code: isConfig ? "SERVICE_NOT_CONFIGURED" : "INTERNAL_ERROR", message: isConfig ? message : "服务暂时不可用，请稍后重试" } }, { status: isConfig ? 503 : 500 });
}

function redactDiagnostic(message: string) {
  return message
    .replace(/postgres(?:ql)?:\/\/\S+/gi, "[DATABASE_URL_REDACTED]")
    .replace(/sk-[A-Za-z0-9_-]{12,}/g, "[API_KEY_REDACTED]")
    .replace(/[A-Za-z0-9_-]{40,}/g, "[TOKEN_REDACTED]")
    .slice(0, 300);
}
