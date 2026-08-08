import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const read=(path)=>readFile(new URL(`../${path}`,import.meta.url),"utf8");
const [shell,form,styles,miniConfig,miniStart]=await Promise.all([
  read("src/components/app-shell.tsx"),read("src/features/trip-input/trip-form.tsx"),read("src/app/globals.css"),read("apps/miniprogram/src/app.config.ts"),read("apps/miniprogram/src/pages/start/index.tsx"),
]);
for(const label of ["出发","行程","我的"]){assert.match(shell,new RegExp(`label:\"${label}\"`));assert.match(miniConfig,new RegExp(`text: \"${label}\"`));}
assert.match(styles,/safe-area-inset-bottom/);
assert.match(styles,/@media \(max-width: 767px\)/);
assert.doesNotMatch(shell,/mobile-tab-bar/);
assert.match(form,/const \[step, setStep\] = useState<1 \| 2>/);
assert.match(form,/\{step\} \/ 2/);
assert.match(miniStart,/\{step\} \/ 2/);
assert.doesNotMatch(form,/3 \/ 3|共3步/);
assert.match(form,/← 返回上一步/);
assert.match(form,/去哪儿，玩几天/);
assert.match(form,/继续选玩法/);
assert.match(miniStart,/去哪儿，玩几天/);
assert.doesNotMatch(miniStart,/step-dot-on/);
assert.match(miniStart,/travel-illustration/);
assert.match(shell,/href:"\/trips"/);
assert.match(shell,/href:"\/account"/);
assert.match(styles,/mobile-action-bar/);
assert.match(form,/yijianchufa:trip-draft-v2/);
assert.match(form,/yijianchufa:trip-draft-consumed/);
assert.match(form,/清空选择/);
assert.match(form,/useState\(0\)/);
assert.match(form,/useState<TripInput\["travelStyle"\] \| null>\(null\)/);
console.log("Web 顶部导航、小程序 TabBar、两屏流程与安全区契约通过");
