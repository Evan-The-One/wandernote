import { z } from "zod";
import { tripPlanSchema } from "@/schemas/trip";
import type { TripInput, TripPlan } from "@/types/trip";
import { extractResponseText, parseJsonResponse } from "./json";
import { buildRepairPrompt, buildTripPlannerPrompt, TRIP_PLANNER_SYSTEM_PROMPT } from "./prompt";
import { normalizeTripPlanForQuality, validateTripPlanQuality, type TripPlanQualityIssue } from "@/server/validation/trip-plan-quality";
import { HttpError } from "@/server/http";

const OPENAI_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-5.4-mini";

export class AiConfigurationError extends HttpError {
  constructor(message: string) { super(503, message, "OPENAI_AUTH_ERROR"); }
}
export class AiGenerationError extends HttpError {
  constructor(message: string, code = "UNKNOWN_ERROR", status = 502) { super(status, message, code); }
}

export type AiGenerationMetrics = {
  inputProcessingMs: number;
  firstModelCallMs: number;
  jsonParseMs: number;
  zodValidationMs: number;
  qualityValidationMs: number;
  repairModelCallMs: number;
  repairValidationMs: number;
  repairUsed: boolean;
  providerRetryCount: number;
  totalMs: number;
};

function getConfig() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new AiConfigurationError("服务端尚未配置 OPENAI_API_KEY");
  return { apiKey, model: process.env.OPENAI_MODEL || DEFAULT_MODEL };
}

export async function requestStructuredModel(input: string, schema: z.ZodType, schemaName: string, instructions: string): Promise<{ raw: string; durationMs: number }> {
  const { apiKey, model } = getConfig();
  const startedAt = performance.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);
  try {
    const jsonSchema = z.toJSONSchema(schema) as Record<string, unknown>;
    delete jsonSchema.$schema;
    const response = await fetch(OPENAI_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        instructions,
        input,
        reasoning: { effort: "low" },
        text: {
          format: {
            type: "json_schema",
            name: schemaName,
            strict: true,
            schema: jsonSchema,
          },
        },
      }),
      signal: controller.signal,
    });
    const payload = await response.json() as Record<string, unknown>;
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) throw new AiGenerationError("AI服务认证失败，请联系管理员", "OPENAI_AUTH_ERROR", 503);
      if (response.status === 429) throw new AiGenerationError("AI服务额度或频率已达上限，请稍后重试", "OPENAI_QUOTA_ERROR", 503);
      throw new AiGenerationError("AI服务暂时不可用，请稍后重试", "UNKNOWN_ERROR", 502);
    }
    return { raw: extractResponseText(payload), durationMs: Math.round(performance.now() - startedAt) };
  } catch (error) {
    if (error instanceof AiConfigurationError || error instanceof AiGenerationError) throw error;
    if (error instanceof Error && error.name === "AbortError") throw new AiGenerationError("AI生成超时，请稍后重试", "OPENAI_TIMEOUT", 504);
    throw new AiGenerationError("无法连接AI服务，请稍后重试", "UNKNOWN_ERROR", 502);
  } finally { clearTimeout(timeout); }
}

async function requestWithProviderRetry(input:string,schema:z.ZodType,schemaName:string,instructions:string,metrics:AiGenerationMetrics){try{return await requestStructuredModel(input,schema,schemaName,instructions);}catch(error){if(!(error instanceof AiGenerationError)||!["OPENAI_QUOTA_ERROR","UNKNOWN_ERROR"].includes(error.code))throw error;metrics.providerRetryCount+=1;await new Promise(resolve=>setTimeout(resolve,750));return requestStructuredModel(input,schema,schemaName,instructions);}}

function validatePlan(raw: string, input: TripInput, metrics: AiGenerationMetrics, normalize = false): TripPlan {
  const parseStartedAt = performance.now();
  const json = parseJsonResponse(raw);
  metrics.jsonParseMs += Math.round(performance.now() - parseStartedAt);
  const zodStartedAt = performance.now();
  const parsed = tripPlanSchema.safeParse(json);
  metrics.zodValidationMs += Math.round(performance.now() - zodStartedAt);
  if (!parsed.success) throw parsed.error;
  const candidate = normalize ? normalizeTripPlanForQuality(parsed.data, input) : parsed.data;
  const qualityStartedAt = performance.now();
  const quality = validateTripPlanQuality(candidate, input);
  metrics.qualityValidationMs += Math.round(performance.now() - qualityStartedAt);
  if (!quality.valid) throw quality.issues;
  return candidate;
}

function validationSummary(error: unknown) {
  if (error instanceof z.ZodError) return error.issues.map((issue) => ({ code: "ZOD", path: issue.path.join(".") })).slice(0, 20);
  if (Array.isArray(error)) return (error as TripPlanQualityIssue[]).map((issue) => ({ code: issue.code, path: issue.path })).slice(0, 20);
  return [{ code: "UNKNOWN_VALIDATION", path: "unknown" }];
}

export async function generateTripPlan(input: TripInput, inputProcessingMs = 0): Promise<TripPlan> {
  const totalStartedAt = performance.now();
  const metrics: AiGenerationMetrics = { inputProcessingMs, firstModelCallMs: 0, jsonParseMs: 0, zodValidationMs: 0, qualityValidationMs: 0, repairModelCallMs: 0, repairValidationMs: 0, repairUsed: false, providerRetryCount:0, totalMs: 0 };
  const first = await requestWithProviderRetry(buildTripPlannerPrompt(input), tripPlanSchema, "trip_plan", TRIP_PLANNER_SYSTEM_PROMPT,metrics);
  metrics.firstModelCallMs = first.durationMs;
  try {
    const plan = validatePlan(first.raw, input, metrics);
    metrics.totalMs = Math.round(performance.now() - totalStartedAt) + inputProcessingMs;
    console.info("ai_generation_metrics", JSON.stringify({ days: input.days, style: input.travelStyle, ...metrics }));
    return plan;
  } catch (firstError) {
    metrics.repairUsed = true;
    const issues = firstError instanceof z.ZodError
      ? firstError.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")
      : Array.isArray(firstError) ? firstError
      : firstError instanceof Error ? firstError.message : "未知结构错误";
    const repair = await requestWithProviderRetry(buildRepairPrompt(first.raw, issues), tripPlanSchema, "trip_plan_repair", TRIP_PLANNER_SYSTEM_PROMPT,metrics);
    metrics.repairModelCallMs = repair.durationMs;
    const repairValidationStartedAt = performance.now();
    try {
      const plan = validatePlan(repair.raw, input, metrics, true);
      metrics.repairValidationMs = Math.round(performance.now() - repairValidationStartedAt);
      metrics.totalMs = Math.round(performance.now() - totalStartedAt) + inputProcessingMs;
      console.info("ai_generation_metrics", JSON.stringify({ days: input.days, style: input.travelStyle, ...metrics }));
      return plan;
    } catch (repairError) {
      metrics.repairValidationMs = Math.round(performance.now() - repairValidationStartedAt);
      metrics.totalMs = Math.round(performance.now() - totalStartedAt) + inputProcessingMs;
      console.warn("ai_generation_metrics", JSON.stringify({ days: input.days, style: input.travelStyle, failed: true, validationIssues: validationSummary(repairError), ...metrics }));
      const code = repairError instanceof z.ZodError ? "SCHEMA_VALIDATION_FAILED" : Array.isArray(repairError) ? "QUALITY_VALIDATION_FAILED" : /JSON|解析/.test(String(repairError)) ? "JSON_PARSE_FAILED" : "VALIDATION_FAILED";
      throw new AiGenerationError("这次行程没有顺利生成，已为你保留全部条件，可以直接再试一次。", code, 422);
    }
  }
}
