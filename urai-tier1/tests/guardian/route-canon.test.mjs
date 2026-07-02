import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const repoRoot = process.cwd();
const appRoot = join(repoRoot, "urai-tier1");

function readAppFile(relativePath) {
  return readFileSync(join(appRoot, relativePath), "utf8");
}

function assertHomeRouteUsesFinalOwner(relativePath) {
  const content = readAppFile(relativePath);
  assert.match(
    content,
    /FinalHomeThreshold/,
    `${relativePath} must render FinalHomeThreshold as the canonical Genesis Home owner.`,
  );
  assert.doesNotMatch(
    content,
    /UraiV1Experience/,
    `${relativePath} must not import or render UraiV1Experience. 2.5D is fallback only.`,
  );
}

function assertSpatialRouteUses3D(relativePath) {
  const content = readAppFile(relativePath);
  assert.match(
    content,
    /TierOneExperience/,
    `${relativePath} must render TierOneExperience as the canonical spatial route shell.`,
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

assertHomeRouteUsesFinalOwner("src/app/page.tsx");
assertHomeRouteUsesFinalOwner("src/app/home/page.tsx");
assertSpatialRouteUses3D("src/app/spatial/page.tsx");
assertFallbackRouteUses2D("src/app/spatial-fallback/page.tsx");

console.log("URAI route canon passed: / and /home use FinalHomeThreshold; /spatial is true 3D; /spatial-fallback is 2.5D fallback.");
