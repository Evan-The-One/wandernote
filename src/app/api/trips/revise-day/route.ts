import { NextResponse } from "next/server";
import { dayRevisionRequestSchema } from "@/schemas/trip";
import { AiConfigurationError, AiGenerationError } from "@/server/ai/client";
import { reviseDay } from "@/server/ai/day-revision";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: { code: "INVALID_JSON", message: "修改请求不是有效JSON" } }, { status: 400 });
  }
  const parsed = dayRevisionRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_REVISION", message: parsed.error.issues[0]?.message || "修改请求不完整" } }, { status: 400 });
  try {
    const result = await reviseDay(parsed.data);
    return NextResponse.json({ data: result });
  } catch (error) {
    if (error instanceof AiConfigurationError) return NextResponse.json({ error: { code: "AI_NOT_CONFIGURED", message: "AI服务尚未配置" } }, { status: 503 });
    const message = error instanceof AiGenerationError ? error.message : "无法完成这次调整，原行程没有变化";
    console.error("Day revision failed", error);
    return NextResponse.json({ error: { code: "REVISION_FAILED", message } }, { status: 502 });
  }
}
