import { paymentConfig } from "@/config/commerce";
import { HttpError } from "@/server/http";

export type ModerationDecision = { id: string; decision: "allow" | "flag" | "deny"; externalId: string; occurredAt: string };

export async function moderateImagePrompt(prompt: string, externalId: string): Promise<ModerationDecision | null> {
  const required = paymentConfig.provider === "creem" || process.env.CREEM_MODERATION_ENABLED === "true";
  if (!required) return null;
  const apiKey = process.env.CREEM_API_KEY;
  if (!apiKey) throw new HttpError(503, "图片安全检查暂时不可用，请稍后重试", "IMAGE_MODERATION_UNAVAILABLE");
  const baseUrl = paymentConfig.creemMode === "production" ? "https://api.creem.io" : "https://test-api.creem.io";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(`${baseUrl}/v1/moderation/prompt`, {
      method: "POST", headers: { "content-type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify({ prompt: prompt.slice(0, 7000), external_id: externalId }), signal: controller.signal,
    });
    const payload = await response.json() as { id?: string; decision?: "allow" | "flag" | "deny"; external_id?: string };
    if (!response.ok || !payload.id || !payload.decision) throw new HttpError(503, "图片安全检查暂时不可用，请稍后重试", "IMAGE_MODERATION_UNAVAILABLE");
    if (payload.decision === "flag") throw new HttpError(422, "这次图片内容暂时无法生成，请调整旅行要求后再试", "IMAGE_PROMPT_FLAGGED");
    if (payload.decision === "deny") throw new HttpError(422, "这次图片内容暂时无法生成，请调整旅行要求后再试", "IMAGE_PROMPT_REJECTED");
    return { id: payload.id, decision: payload.decision, externalId: payload.external_id || externalId, occurredAt: new Date().toISOString() };
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(503, "图片安全检查暂时不可用，请稍后重试", "IMAGE_MODERATION_UNAVAILABLE");
  } finally { clearTimeout(timeout); }
}
