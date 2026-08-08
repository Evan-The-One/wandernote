import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const read=path=>readFile(new URL(`../${path}`,import.meta.url),"utf8");
const [client,contentRoute,storage,badge,account,render,generating]=await Promise.all([
  read("src/features/trip-plan/premium-trip-images.tsx"),
  read("src/app/api/trips/[id]/images/[taskId]/pages/[pageId]/content/route.ts"),
  read("src/server/posters/storage.ts"),
  read("src/components/trip-status-badge.tsx"),
  read("src/features/account/account-client.tsx"),
  read("src/server/posters/render.ts"),
  read("src/features/trip-plan/generating-view.tsx"),
]);
assert.match(client,/\/content`/);
assert.doesNotMatch(client,/fetch\(token\.url\)/);
for(const code of ["POSTER_PAGE_NOT_FOUND","POSTER_STORAGE_OBJECT_MISSING","POSTER_READ_FAILED","POSTER_SCHEMA_INCOMPATIBLE"])assert(contentRoute.includes(code)||storage.includes(code)||client.includes(code));
assert.match(contentRoute,/eq\(trips\.userId,user\.id\)/);
assert.match(contentRoute,/eq\(posterPages\.userId,user\.id\)/);
assert.match(storage,/get\(pathname,\{access:"private"/);
assert.match(badge,/white-space|trip-status-badge/);
assert.match(account,/line-clamp-2/);
assert.match(account,/更多行程操作/);
assert.match(render,/OneClick Travel/);
assert.match(generating,/trip-draft-consumed/);
console.log("poster private read, draft lifecycle and trip-card contracts passed");
