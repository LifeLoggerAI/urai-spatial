import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const app = join(root, "urai-tier1");
const placeSegment = "[" + "placeId" + "]";

const routes = [
  ["src/app/page.tsx", "FinalHomeThreshold"],
  ["src/app/home/page.tsx", "FinalHomeThreshold"],
  ["src/app/spatial/page.tsx", "TierOneExperience"],
  ["src/app/spatial-fallback/page.tsx", "UraiV1Experience"],
  ["src/app/focus/page.tsx", "FinalFocusChamber"],
  ["src/app/replay/page.tsx", "FinalReplayFilm"],
  ["src/app/location-map/page.tsx", "LocationMapAcceptanceBoundary"],
  ["src/app/passport/page.tsx", "PassportVaultClient"],
  ["src/app/shadow/page.tsx", "SpatialRealmRuntime"],
  ["src/app/council/page.tsx", "SpatialRealmRuntime"],
  ["src/app/legacy/page.tsx", "LifeMapSemanticRoute"],
  ["src/app/dream/page.tsx", "LifeMapSemanticRoute"],
  ["src/app/spatial/legacy/page.tsx", "LifeMapSemanticRoute"],
  ["src/app/spatial/life-map/page.tsx", "SpatialLifeMapCanonical"],
  ["src/app/spatial/life-map-r3f/page.tsx", "SpatialLifeMapCanonical"],
  ["src/app/spatial/life-map-orbit/page.tsx", "SpatialLifeMapCanonical"],
  ["src/app/ground/page.tsx", "walkable-first-person-ground-layer"],
];

for (const [file, expected] of routes) {
  const full = join(app, file);
  assert.equal(existsSync(full), true, `${file} must exist.`);
  const text = readFileSync(full, "utf8");
  assert.match(text, new RegExp(expected), `${file} must reference ${expected}.`);
  if (file === "src/app/passport/page.tsx") {
    assert.doesNotMatch(text, /FinalPassportVault/, "Passport route must not restore the retired poster owner.");
  }
  if (["src/app/legacy/page.tsx", "src/app/dream/page.tsx", "src/app/spatial/legacy/page.tsx"].includes(file)) {
    assert.doesNotMatch(text, /RealmShell|LegacyScrollPortal/, `${file} must not restore a superseded shell or demo portal.`);
  }
  if (file.includes("spatial/life-map")) {
    assert.doesNotMatch(text, /candidate for comparison|import LifeMapScene from/, `${file} must not expose a parallel Life Map candidate.`);
  }
}

const semanticRoutePath = join(app, "src", "spatial", "realms", "LifeMapSemanticRoute.tsx");
assert.equal(existsSync(semanticRoutePath), true, "Life Map semantic route convergence owner must exist.");
const semanticRoute = readFileSync(semanticRoutePath, "utf8");
assert.match(semanticRoute, /\/life-map\?from=\$\{kind\}&overview=1/, "Legacy and Dream aliases must resolve to canonical Life Map.");
assert.doesNotMatch(semanticRoute, /Camera:|Lighting:|Fallback:/, "Semantic convergence surface must not expose diagnostic metadata.");
assert.equal(existsSync(join(app, "src", "spatial", "realms", "RealmShell.tsx")), false, "Obsolete RealmShell must stay removed.");

const spatialRuntimePath = join(app, "src", "spatial", "realms", "SpatialRealmRuntime.tsx");
assert.equal(existsSync(spatialRuntimePath), true, "Capability-aware spatial realm runtime must exist.");
const spatialRuntime = readFileSync(spatialRuntimePath, "utf8");
assert.match(spatialRuntime, /SpatialRealmExperience/, "Capability-aware runtime must preserve the canonical R3F owner.");
assert.match(spatialRuntime, /semantic-no-webgl-fallback/, "Capability-aware runtime must preserve semantic no-WebGL access.");

const passportClientPath = join(app, "src", "app", "passport", "PassportVaultClient.tsx");
assert.equal(existsSync(passportClientPath), true, "Canonical Passport Ownership Vault client must exist.");
assert.match(readFileSync(passportClientPath, "utf8"), /passport-ownership-vault/, "Canonical Passport client must expose its route-owner marker.");

const locationBoundaryPath = join(app, "src", "spatial", "places", "LocationMapAcceptanceBoundary.tsx");
assert.equal(existsSync(locationBoundaryPath), true, "Location Map acceptance boundary must exist.");
assert.match(readFileSync(locationBoundaryPath, "utf8"), /LocationMapScene/, "Location Map acceptance boundary must render LocationMapScene.");

const placePagePath = join(app, "src", "app", "place", placeSegment, "page.tsx");
const placeReplayPath = join(app, "src", "app", "place", placeSegment, "replay", "page.tsx");
assert.equal(existsSync(placePagePath), true, "place route must exist.");
assert.equal(existsSync(placeReplayPath), true, "place replay route must exist.");
assert.match(readFileSync(placePagePath, "utf8"), /MemoryPlaceScene/, "place route must render MemoryPlaceScene.");
assert.match(readFileSync(placeReplayPath, "utf8"), /PlaceReplayScene/, "place replay route must render PlaceReplayScene.");
assert.match(readFileSync(placePagePath, "utf8"), /resolveMemoryPlace/, "place route must use repository resolver.");
assert.match(readFileSync(placeReplayPath, "utf8"), /resolveMemoryPlace/, "place replay route must use repository resolver.");

console.log("URAI static route smoke canon passed.");
