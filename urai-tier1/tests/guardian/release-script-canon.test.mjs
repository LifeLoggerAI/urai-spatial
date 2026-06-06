import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const scripts = pkg.scripts ?? {};

for (const [name, command] of Object.entries(scripts)) {
  assert.equal(typeof command, "string", `${name} must be a string script.`);
  const recursiveRunPnpm = new RegExp(`run-pnpm\\.mjs\\s+${name.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}`);
  assert.equal(recursiveRunPnpm.test(command), false, `${name} must not call itself through run-pnpm.mjs.`);
}

assert.match(scripts["release:check"] ?? "", /launch:local/, "release:check must run launch:local.");
assert.match(scripts["release:p1"] ?? "", /release:check/, "release:p1 must run release:check.");
assert.match(scripts["lock:static"] ?? "", /urai:guardian/, "lock:static must run urai:guardian.");
assert.match(scripts["urai:guardian"] ?? "", /scripts\/urai-guardian\.mjs/, "urai:guardian must use the guardian runner script.");

console.log("URAI release script canon passed.");
