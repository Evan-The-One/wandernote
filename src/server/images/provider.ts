export type ImageSourceType = "static" | "uploaded" | "external" | "generated";
export type ImageSource = { sourceType: ImageSourceType; sourceUrl: string | null; assetId: string | null; altText: string; attribution: string | null; generatedAt: string | null; generationJobId: string | null };

export interface ImageGenerationProvider {
  readonly name: string;
  readonly enabled: boolean;
  generateAtmosphereImage(input: { tripId: string; destination: string; prompt: string; aspectRatio: string }): Promise<ImageSource>;
}

export const disabledImageGenerationProvider: ImageGenerationProvider = {
  name: "disabled", enabled: false,
  async generateAtmosphereImage() { throw new Error("AI image generation is disabled"); },
};

export function staticCityAtmosphere(destination: string): ImageSource {
  return { sourceType: "static", sourceUrl: null, assetId: "brand-city-atmosphere-v1", altText: `${destination}旅行氛围插画`, attribution: null, generatedAt: null, generationJobId: null };
}
