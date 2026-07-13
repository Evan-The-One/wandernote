import { execFileSync } from "node:child_process";

const tracked = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean);
const patterns = [
  { name: "OpenAI API key", value: /sk-(?:proj-)?[A-Za-z0-9_-]{20,}/g },
  { name: "database URL with credentials", value: /postgres(?:ql)?:\/\/[^\s:@]+:[^\s@]+@/g },
  { name: "local proxy address", value: /127\.0\.0\.1:7890/g },
];
let failed = false;
for (const file of tracked) {
  if (/\.(png|jpg|jpeg|gif|ico|woff2?)$/i.test(file)) continue;
  let content = "";
  try { content = execFileSync("git", ["show", `:${file}`], { encoding: "utf8", maxBuffer: 10_000_000 }); } catch { continue; }
  for (const pattern of patterns) if (pattern.value.test(content)) { console.error(`Potential ${pattern.name} in ${file}`); failed = true; }
}
if (failed) process.exit(1);
console.log(`Secret scan passed (${tracked.length} tracked files).`);
