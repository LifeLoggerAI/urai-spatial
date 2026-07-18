import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const scenePath = path.join(root, "urai-tier1/src/components/lifemap/AdaptiveLifeMapScene.tsx");
const contractPath = path.join(root, "urai-tier1/tests/lifemap-material-fallback-contract.test.mjs");
const workflowPath = path.join(root, ".github/workflows/one-shot-lifemap-material-fallback.yml");
const scriptPath = path.join(root, "scripts/one-shot-lifemap-material-fallback.mjs");

let source = fs.readFileSync(scenePath, "utf8");

const replacements = [
  {
    before: '<meshBasicMaterial map={texture ?? undefined} transparent opacity={selected ? 1 : related ? 0.88 : 0.42} toneMapped={false} />',
    after: '<meshBasicMaterial map={texture ?? undefined} color={texture ? "#ffffff" : "#06101f"} transparent opacity={texture ? (selected ? 1 : related ? 0.88 : 0.42) : (selected ? 0.68 : related ? 0.3 : 0.12)} toneMapped={false} />',
  },
  {
    before: '<meshBasicMaterial map={texture ?? undefined} transparent opacity={selected ? 0.52 : related ? 0.2 : 0.04} depthWrite={false} />',
    after: '<meshBasicMaterial map={texture ?? undefined} color={texture ? "#ffffff" : "#06101f"} transparent opacity={texture ? (selected ? 0.52 : related ? 0.2 : 0.04) : 0} depthWrite={false} />',
  },
  {
    before: '<meshBasicMaterial map={texture ?? undefined} transparent opacity={selected ? 0.42 : related ? 0.16 : 0.03} depthWrite={false} />',
    after: '<meshBasicMaterial map={texture ?? undefined} color={texture ? "#ffffff" : "#06101f"} transparent opacity={texture ? (selected ? 0.42 : related ? 0.16 : 0.03) : 0} depthWrite={false} />',
  },
];

for (const { before, after } of replacements) {
  const count = source.split(before).length - 1;
  assert.equal(count, 1, `Expected exactly one source match for ${before}`);
  source = source.replace(before, after);
}

assert.equal(source.includes('map={texture ?? undefined} transparent'), false);
assert.equal((source.match(/color=\{texture \? "#ffffff" : "#06101f"\}/g) || []).length, 3);
fs.writeFileSync(scenePath, source);

const contract = `import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(
  path.join(here, "../src/components/lifemap/AdaptiveLifeMapScene.tsx"),
  "utf8",
);

test("Life Map texture-backed materials never expose default-white loading planes", () => {
  assert.equal(source.includes('map={texture ?? undefined} transparent'), false);
  assert.equal((source.match(/color=\\{texture \\? "#ffffff" : "#06101f"\\}/g) || []).length, 3);
  assert.match(source, /opacity=\\{texture \\? \\(selected \\? 1 : related \\? 0\\.88 : 0\\.42\\) : \\(selected \\? 0\\.68 : related \\? 0\\.3 : 0\\.12\\)\\}/);
  assert.equal((source.match(/opacity=\\{texture \\? \\(selected \\? 0\\.(?:52|42).*?\\) : 0\\}/g) || []).length, 2);
});
`;

fs.writeFileSync(contractPath, contract);
fs.rmSync(workflowPath, { force: true });
fs.rmSync(scriptPath, { force: true });
console.log("Applied dark material fallbacks, added regression contract, and removed execution files.");
