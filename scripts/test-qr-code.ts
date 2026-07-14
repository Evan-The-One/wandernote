import assert from "node:assert/strict";
import QRCode from "qrcode";
import jsQR from "jsqr";
import { PNG } from "pngjs";

async function main() {
  for (const value of ["https://www.yjchufa.com", "https://www.yjchufa.com/trip/b7c59dda-a1dd-4493-ba29-8798752b4b87"]) {
    const png = PNG.sync.read(await QRCode.toBuffer(value, { errorCorrectionLevel: "M", margin: 4, width: 320 }));
    const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
    assert.equal(decoded?.data, value);
  }
  console.log("QR contract tests passed (homepage and read-only trip links decode exactly).");
}
void main().catch((error) => { console.error(error); process.exitCode = 1; });
