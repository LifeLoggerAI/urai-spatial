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
  ["src/app/legacy/page.tsx", "RealmShell"],
  ["src/app/dream/page.tsx", "RealmShell"],
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
}

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
