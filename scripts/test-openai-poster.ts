import { config } from "dotenv";
import { writeFileSync } from "node:fs";
import sharp from "sharp";
import { createOpenAIImageProvider } from "../src/server/images/provider";

async function main() {
config({ path: ".env.local", quiet: true });
const provider = createOpenAIImageProvider();
if (!provider.enabled) throw new Error("OPENAI_API_KEY is not configured");
const result = await provider.generatePosterBackground({
  size: "1024x1024",
  quality: "low",
  prompt: "Create a clean contact sheet of 6 separate travel editorial photographs for Shaoxing, China, arranged in an exact 3-column grid with 2 equal rows. Exact order: panel 1 self-drive highway arrival; panel 2 calm hotel room; panel 3 Lu Xun Native Place Jiangnan cultural courtyard; panel 4 Cangqiao Straight Street canal-side old street; panel 5 Shaoxing cuisine; panel 6 East Lake night boat. Every panel distinct and self-contained, realistic travel photography, simple composition, natural light. STRICT: no words, labels, letters, numbers, logos, watermarks, captions, readable signs, borders, frames or unrelated landmarks.",
});
const bytes = Buffer.from(result.dataUrl.split(",")[1]!, "base64");
writeFileSync("/tmp/yjchufa-shaoxing-poster-bg.webp", bytes);
for(let index=0;index<6;index++){const width=Math.floor(1024/3),height=512,left=(index%3)*width,top=Math.floor(index/3)*height;const crop=await sharp(bytes).extract({left,top,width:index%3===2?1024-left:width,height}).resize(420,280,{fit:"cover"}).webp({quality:72}).toBuffer();writeFileSync(`/tmp/yjchufa-shaoxing-activity-${index+1}.webp`,crop);}
console.log(JSON.stringify({ model: result.model, estimatedCostUsd: result.estimatedCostUsd, bytes: bytes.length }));
}
main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Poster generation test failed");
  process.exitCode = 1;
});
