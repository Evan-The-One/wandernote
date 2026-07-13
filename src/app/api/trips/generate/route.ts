import { NextResponse } from "next/server";
import { tripInputSchema } from "@/schemas/trip";
import { migrateTripInput } from "@/schemas/migration";
import { AiConfigurationError, AiGenerationError, generateTripPlan } from "@/server/ai/client";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  const inputStartedAt = performance.now();
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: { code: "INVALID_JSON", message: "请求内容不是有效JSON" } }, { status: 400 });
  }
  const migrated = migrateTripInput(body);
  const input = migrated ? tripInputSchema.safeParse(migrated) : tripInputSchema.safeParse(body);
  if (!input.success) return NextResponse.json({ error: { code: "INVALID_INPUT", message: input.error.issues[0]?.message || "旅行需求不完整" } }, { status: 400 });
  try {
    const inputProcessingMs = Math.round(performance.now() - inputStartedAt);
    const plan = await generateTripPlan(input.data, inputProcessingMs);
    return NextResponse.json({ data: plan });
  } catch (error) {
    if (error instanceof AiConfigurationError) return NextResponse.json({ error: { code: "AI_NOT_CONFIGURED", message: "AI服务尚未配置，请联系管理员" } }, { status: 503 });
    const message = error instanceof AiGenerationError ? error.message : "生成攻略时遇到问题，请稍后重试";
    console.error("Trip generation failed", error);
    return NextResponse.json({ error: { code: "GENERATION_FAILED", message } }, { status: 502 });
  }
}
