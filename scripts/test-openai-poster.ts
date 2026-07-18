import { config } from "dotenv";
import { writeFileSync } from "node:fs";
import { createOpenAIImageProvider } from "../src/server/images/provider";

async function main() {
config({ path: ".env.local", quiet: true });
const provider = createOpenAIImageProvider();
if (!provider.enabled) throw new Error("OPENAI_API_KEY is not configured");
const result = await provider.generatePosterBackground({
  size: "1024x1536",
  prompt: "Create a premium portrait travel magazine poster BACKGROUND for Shaoxing, China, two-day slow travel. Refined editorial travel magazine, authentic Jiangnan canal-town atmosphere, warm white and pale mint green, deep green details, elegant photo collage of canals, stone bridges, black-tile houses and yellow-rice-wine culture, generous clean translucent spaces for later Chinese typography. STRICT: NO text, NO letters, NO numbers, NO logos, NO watermarks, no childish illustration, no unrelated landmarks.",
});
const bytes = Buffer.from(result.dataUrl.split(",")[1]!, "base64");
writeFileSync("/tmp/yjchufa-shaoxing-poster-bg.webp", bytes);
console.log(JSON.stringify({ model: result.model, estimatedCostUsd: result.estimatedCostUsd, bytes: bytes.length }));
}
main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Poster generation test failed");
  process.exitCode = 1;
});
