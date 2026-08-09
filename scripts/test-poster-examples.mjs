import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const config = await readFile(new URL("src/config/poster-examples.ts", root), "utf8");
const home = await readFile(new URL("src/app/page.tsx", root), "utf8");
const tripView = await readFile(new URL("src/features/trip-plan/trip-plan-view.tsx", root), "utf8");

for (const id of ["shaoxing-two-day", "suzhou-two-day"]) {
  assert.equal(config.includes(`id: "${id}"`), true, `${id} must be in the official data source`);
}
for (const asset of ["shaoxing-travel-poster-example.jpg", "suzhou-travel-poster-example.jpg"]) {
  await access(new URL(`public/examples/${asset}`, root));
}
assert.equal(home.includes('<PosterExampleGallery context="home" />'), true, "home must use the shared gallery");
assert.equal((tripView.match(/<PremiumTripImages/g) ?? []).length, 2, "trip result must render top and bottom poster areas");
assert.equal(tripView.includes('placement="top"'), true);
assert.equal(tripView.includes('placement="bottom"'), true);

console.log("Official poster examples and all three gallery placements are consistent.");
