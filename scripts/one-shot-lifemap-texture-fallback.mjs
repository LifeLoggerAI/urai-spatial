import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const sourcePath = path.join(root, "urai-tier1/src/components/lifemap/AdaptiveLifeMapScene.tsx");
const testPath = path.join(root, "urai-tier1/tests/lifemap-texture-fallback-contract.test.mjs");
const workflowPath = path.join(root, ".github/workflows/one-shot-lifemap-texture-fallback.yml");
const scriptPath = path.join(root, "scripts/one-shot-lifemap-texture-fallback.mjs");

let source = fs.readFileSync(sourcePath, "utf8");

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
  const matches = source.split(before).length - 1;
  assert.equal(matches, 1, `Expected exactly one source match for: ${before}`);
  source = source.replace(before, after);
}

assert.equal(
  source.includes('map={texture ?? undefined} transparent'),
  false,
  "No texture-backed memory plane may retain Three.js default-white fallback material",
);

fs.writeFileSync(sourcePath, source);

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

test("Life Map memory planes never expose Three.js default-white loading surfaces", () => {
  assert.match(source, /color=\\{texture \\? "#ffffff" : "#06101f"\\}/);
  assert.match(source, /opacity=\\{texture \\? \\(selected \\? 1 : related \\? 0\\.88 : 0\\.42\\) : \\(selected \\? 0\\.68 : related \\? 0\\.3 : 0\\.12\\)\\}/);
  assert.equal(source.includes("map={texture ?? undefined} transparent"), false);
  assert.equal((source.match(/color=\\{texture \\? "#ffffff" : "#06101f"\\}/g) || []).length, 3);
  assert.equal((source.match(/: 0\\} depthWrite=\\{false\\}/g) || []).length >= 2, true);
});
`;

fs.writeFileSync(testPath, contract);
fs.rmSync(workflowPath, { force: true });
fs.rmSync(scriptPath, { force: true });

console.log("Applied dark Life Map texture fallback, added regression contract, and removed one-shot execution files.");
