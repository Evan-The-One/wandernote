import { NextResponse } from "next/server";
import { assertLoginAttempt, clearAdminCookie, isAdminConfigured, recordFailedLogin, setAdminCookie } from "@/server/auth/admin";
import { apiError, assertTrustedMutation, readJsonBody, secureEqual } from "@/server/http";

export async function POST(request: Request) {
  try {
    if (!isAdminConfigured()) return NextResponse.json({ error: "管理后台尚未配置" }, { status: 503 });
    const key = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    if (!assertLoginAttempt(key)) return NextResponse.json({ error: "尝试次数过多，请15分钟后重试" }, { status: 429 });
    const body = await readJsonBody(request) as { code?: unknown } | null;
    if (typeof body?.code !== "string" || !secureEqual(body.code, process.env.ADMIN_ACCESS_CODE!)) { recordFailedLogin(key); return NextResponse.json({ error: "访问码不正确" }, { status: 401 }); }
    await setAdminCookie(); return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
export async function DELETE(request: Request) { try { assertTrustedMutation(request); await clearAdminCookie(); return NextResponse.json({ ok: true }); } catch (error) { return apiError(error); } }
