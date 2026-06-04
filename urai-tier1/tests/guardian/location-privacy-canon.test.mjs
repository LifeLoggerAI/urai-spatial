import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const repoRoot = process.cwd();
const appRoot = join(repoRoot, "urai-tier1");
const privacyDoc = join(repoRoot, "docs", "URAI_PRIVACY_LOCATION_RULES.md");
const blueprint = join(repoRoot, "URAI_SPATIAL_MASTER_BLUEPRINT.md");

assert.equal(existsSync(privacyDoc), true, "docs/URAI_PRIVACY_LOCATION_RULES.md must exist.");
assert.equal(existsSync(blueprint), true, "URAI_SPATIAL_MASTER_BLUEPRINT.md must exist.");

const privacyText = readFileSync(privacyDoc, "utf8");
const blueprintText = readFileSync(blueprint, "utf8");

for (const required of [
  "symbolic-only",
  "city-only",
  "approx-private",
  "exact-private",
  "exact-share-opt-in",
  "Do not display exact addresses in Genesis mode.",
  "Do not display raw latitude and longitude in Genesis mode.",
]) {
  assert.match(privacyText, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `Privacy doc must include: ${required}`);
}

assert.match(blueprintText, /locationPrivacy/, "Blueprint must define locationPrivacy on MemoryPlace.");
assert.match(blueprintText, /exact-share-opt-in/, "Blueprint must include exact-share-opt-in as explicit opt-in mode.");

function walk(dir, files = []) {
  if (!existsSync(dir)) return files;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) walk(full, files);
    else if (/\.(ts|tsx|js|jsx|mjs|md)$/.test(name)) files.push(full);
  }
  return files;
}

const sourceFiles = walk(join(appRoot, "src"));
const forbiddenPatterns = [
  /exact address/i,
  /exact latitude/i,
  /exact longitude/i,
];

for (const file of sourceFiles) {
  const text = readFileSync(file, "utf8");
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(text) && !/privacy|redact|opt-in|exact-share-opt-in/i.test(text)) {
      assert.fail(`${file} mentions ${pattern} without privacy/redaction context.`);
    }
  }
}

console.log("URAI location privacy canon passed: privacy docs and blueprint include required location safeguards.");
