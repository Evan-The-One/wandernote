import { z } from "zod";
import { dayRevisionResponseSchema } from "@/schemas/trip";
import type { DayRevisionRequest, DayRevisionResponse } from "@/types/trip";
import { parseJsonResponse } from "./json";
import { requestStructuredModel, AiGenerationError } from "./client";
import { buildDayRevisionPrompt, buildDayRevisionRepairPrompt, DAY_REVISION_SYSTEM_PROMPT } from "./day-revision-prompt";
import { validateDayRevisionQuality } from "@/server/validation/day-revision-quality";
import { sanitizeUserFacingData } from "@/lib/sanitize-user-facing-text";

export type DayRevisionMetrics = { firstModelCallMs: number; validationMs: number; repairModelCallMs: number; repairValidationMs: number; repairUsed: boolean; totalMs: number };

function validate(raw: string, request: DayRevisionRequest): DayRevisionResponse {
  const parsed = dayRevisionResponseSchema.safeParse(parseJsonResponse(raw));
  if (!parsed.success) throw parsed.error;
  const cleanResult = sanitizeUserFacingData(parsed.data);
  const quality = validateDayRevisionQuality(cleanResult, request);
  if (!quality.valid) throw quality.issues;
  return cleanResult;
}

export async function reviseDay(request: DayRevisionRequest): Promise<DayRevisionResponse> {
  const startedAt = performance.now();
  const metrics: DayRevisionMetrics = { firstModelCallMs: 0, validationMs: 0, repairModelCallMs: 0, repairValidationMs: 0, repairUsed: false, totalMs: 0 };
  const first = await requestStructuredModel(buildDayRevisionPrompt(request), dayRevisionResponseSchema, "day_revision", DAY_REVISION_SYSTEM_PROMPT);
  metrics.firstModelCallMs = first.durationMs;
  const validationStartedAt = performance.now();
  try {
    const result = validate(first.raw, request);
    metrics.validationMs = Math.round(performance.now() - validationStartedAt);
    metrics.totalMs = Math.round(performance.now() - startedAt);
    console.info("ai_day_revision_metrics", JSON.stringify({ dayNumber: request.targetDayNumber, style: request.originalInput.travelStyle, ...metrics }));
    return result;
  } catch (firstError) {
    metrics.validationMs = Math.round(performance.now() - validationStartedAt);
    metrics.repairUsed = true;
    const issues = firstError instanceof z.ZodError ? firstError.issues.map((item) => `${item.path.join(".")}: ${item.message}`).join("; ") : Array.isArray(firstError) ? firstError : "单日结果不符合约束";
    const repair = await requestStructuredModel(buildDayRevisionRepairPrompt(first.raw, issues), dayRevisionResponseSchema, "day_revision_repair", DAY_REVISION_SYSTEM_PROMPT);
    metrics.repairModelCallMs = repair.durationMs;
    const repairStartedAt = performance.now();
    try {
      const result = validate(repair.raw, request);
      metrics.repairValidationMs = Math.round(performance.now() - repairStartedAt);
      metrics.totalMs = Math.round(performance.now() - startedAt);
      console.info("ai_day_revision_metrics", JSON.stringify({ dayNumber: request.targetDayNumber, style: request.originalInput.travelStyle, ...metrics }));
      return result;
    } catch {
      metrics.repairValidationMs = Math.round(performance.now() - repairStartedAt);
      metrics.totalMs = Math.round(performance.now() - startedAt);
      console.warn("ai_day_revision_metrics", JSON.stringify({ dayNumber: request.targetDayNumber, style: request.originalInput.travelStyle, failed: true, ...metrics }));
      throw new AiGenerationError("这次调整仍存在时间、地点或预算冲突，已保留原行程");
    }
  }
}
