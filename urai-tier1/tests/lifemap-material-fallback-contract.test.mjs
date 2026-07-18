import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// Exact-head recertification anchor: fallback materials remain dark until textures exist.
const here = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(
  path.join(here, "../src/components/lifemap/AdaptiveLifeMapScene.tsx"),
  "utf8",
);

test("Life Map texture-backed materials never expose default-white loading planes", () => {
  assert.equal(source.includes('map={texture ?? undefined} transparent'), false);
  assert.equal((source.match(/color=\{texture \? "#ffffff" : "#06101f"\}/g) || []).length, 3);
  assert.match(source, /opacity=\{texture \? \(selected \? 1 : related \? 0\.88 : 0\.42\) : \(selected \? 0\.68 : related \? 0\.3 : 0\.12\)\}/);
  assert.equal((source.match(/opacity=\{texture \? \(selected \? 0\.(?:52|42).*?\) : 0\}/g) || []).length, 2);
});
