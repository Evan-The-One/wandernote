import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const read=(path)=>readFile(new URL(`../${path}`,import.meta.url),"utf8");
const [shell,form,styles,miniConfig,miniStart]=await Promise.all([
  read("src/components/app-shell.tsx"),read("src/features/trip-input/trip-form.tsx"),read("src/app/globals.css"),read("apps/miniprogram/src/app.config.ts"),read("apps/miniprogram/src/pages/start/index.tsx"),
]);
for(const label of ["出发","行程","我的"]){assert.match(shell,new RegExp(`label:\"${label}\"`));assert.match(miniConfig,new RegExp(`text: \"${label}\"`));}
assert.match(styles,/safe-area-inset-bottom/);
assert.match(styles,/mobile-tab-bar/);
assert.match(styles,/@media \(max-width: 767px\)/);
assert.match(form,/const \[step, setStep\] = useState<1 \| 2 \| 3>/);
assert.match(form,/\{step\} \/ 3/);
assert.match(miniStart,/\{step\} \/ 3/);
assert.doesNotMatch(miniStart,/step-dot-on/);
assert.match(miniStart,/travel-illustration/);
assert.match(shell,/href:"\/trips"/);
assert.match(shell,/href:"\/account"/);
assert.match(styles,/mobile-action-bar/);
console.log("App Shell、三栏导航、三步流程与安全区契约通过");
