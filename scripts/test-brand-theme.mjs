import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const [tokens,web,mini,brand,miniBrand]=await Promise.all([
  readFile("packages/design-tokens/tokens.json","utf8").then(JSON.parse),
  readFile("src/app/globals.css","utf8"),
  readFile("apps/miniprogram/src/app.scss","utf8"),
  readFile("src/components/brand-icon.tsx","utf8"),
  readFile("apps/miniprogram/src/components/brand.tsx","utf8"),
]);
for(const [name,value] of Object.entries(tokens)){
  assert.match(value,/^#[0-9A-F]{6}$/);
  assert(web.toLowerCase().includes(value.toLowerCase()),`Web theme is missing ${name}`);
  assert(mini.toLowerCase().includes(value.toLowerCase()),`Miniapp theme is missing ${name}`);
}
assert.match(web,/system-ui.*PingFang SC.*HarmonyOS Sans SC.*MiSans/);
assert.match(mini,/system-ui.*PingFang SC.*HarmonyOS Sans SC.*MiSans/);
assert.match(web,/prefers-reduced-motion/);
assert.match(mini,/prefers-reduced-motion/);
assert.match(web,/\.btn-primary/);
assert.match(web,/\.btn-secondary/);
assert.match(web,/\.btn-destructive/);
assert.match(brand,/Temporary icon adapter/);
assert.match(miniBrand,/Temporary icon adapter/);
assert(!web.includes("@font-face"));
assert(!mini.includes("@font-face"));
console.log("shared brand theme contracts passed");
