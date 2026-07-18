export type ImageSourceType = "static" | "uploaded" | "external" | "generated";
export type ImageSource = { sourceType: ImageSourceType; sourceUrl: string | null; assetId: string | null; altText: string; attribution: string | null; generatedAt: string | null; generationJobId: string | null };

export type PosterImageResult = { dataUrl: string; model: string; estimatedCostUsd: number };
export interface ImageGenerationProvider {
  readonly name: string;
  readonly enabled: boolean;
  generatePosterBackground(input: { prompt: string; size: "1024x1536" | "1024x1024"; quality?: "low" | "medium" | "high" }): Promise<PosterImageResult>;
}

const PRICE_BY_QUALITY = { low: 0.005, medium: 0.041, high: 0.165 } as const;

export function createOpenAIImageProvider(): ImageGenerationProvider {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2";
  const rawQuality = process.env.OPENAI_IMAGE_QUALITY || "medium";
  const quality = rawQuality === "low" || rawQuality === "high" ? rawQuality : "medium";
  return {
    name: "openai",
    enabled: Boolean(apiKey),
    async generatePosterBackground({ prompt, size, quality: requestedQuality }) {
      if (!apiKey) throw Object.assign(new Error("图片服务尚未配置"), { code: "IMAGE_PROVIDER_DISABLED" });
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 110_000);
      try {
        const response = await fetch("https://api.openai.com/v1/images/generations", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model, prompt: prompt.slice(0, 7000), size, quality: requestedQuality || quality, output_format: "webp", output_compression: size === "1024x1024" ? 42 : 72, moderation: "auto", n: 1 }),
          signal: controller.signal,
        });
        const payload = await response.json() as { data?: Array<{ b64_json?: string }>; error?: { code?: string } };
        if (!response.ok || !payload.data?.[0]?.b64_json) {
          const code = payload.error?.code === "moderation_blocked" ? "IMAGE_MODERATION_BLOCKED" : response.status === 429 ? "IMAGE_RATE_LIMITED" : response.status === 401 || response.status === 403 ? "IMAGE_AUTH_ERROR" : "IMAGE_PROVIDER_ERROR";
          throw Object.assign(new Error("暂时没能生成这张海报"), { code });
        }
        return { dataUrl: `data:image/webp;base64,${payload.data[0].b64_json}`, model, estimatedCostUsd: PRICE_BY_QUALITY[requestedQuality || quality] };
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") throw Object.assign(new Error("海报生成超时"), { code: "IMAGE_TIMEOUT" });
        throw error;
      } finally { clearTimeout(timeout); }
    },
  };
}

export function staticCityAtmosphere(destination: string): ImageSource {
  return { sourceType: "static", sourceUrl: null, assetId: "brand-city-atmosphere-v1", altText: `${destination}旅行氛围插画`, attribution: null, generatedAt: null, generationJobId: null };
}
