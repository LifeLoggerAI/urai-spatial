import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const repoRoot = process.cwd();
const appRoot = join(repoRoot, "urai-tier1");

function readAppFile(relativePath) {
  return readFileSync(join(appRoot, relativePath), "utf8");
}

function assertPrimaryRouteUses3D(relativePath) {
  const content = readAppFile(relativePath);
  assert.match(
    content,
    /TierOneExperience/,
    `${relativePath} must render TierOneExperience as the canonical true 3D Genesis surface.`,
  );
  assert.doesNotMatch(
    content,
    /UraiV1Experience/,
    `${relativePath} must not import or render UraiV1Experience. 2.5D is fallback only.`,
  );
}

function assertFallbackRouteUses2D(relativePath) {
  const fullPath = join(appRoot, relativePath);
  assert.equal(existsSync(fullPath), true, `${relativePath} must exist as the explicit 2.5D fallback route.`);
  const content = readAppFile(relativePath);
  assert.match(
    content,
    /UraiV1Experience/,
    `${relativePath} must render UraiV1Experience as fallback.`,
  );
}

assertPrimaryRouteUses3D("src/app/page.tsx");
assertPrimaryRouteUses3D("src/app/home/page.tsx");
assertPrimaryRouteUses3D("src/app/spatial/page.tsx");
assertFallbackRouteUses2D("src/app/spatial-fallback/page.tsx");

console.log("URAI route canon passed: /, /home, /spatial are true 3D; /spatial-fallback is 2.5D fallback.");
