import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const app = join(root, "urai-tier1");

const requiredFiles = [
  "src/app/location-map/page.tsx",
  "src/app/place/[placeId]/page.tsx",
  "src/app/place/[placeId]/replay/page.tsx",
  "src/spatial/places/LocationMapAcceptanceBoundary.tsx",
  "src/spatial/places/LocationMapScene.tsx",
  "src/spatial/places/MemoryPlaceScene.tsx",
  "src/spatial/places/PlaceReplayScene.tsx",
];

for (const file of requiredFiles) {
  assert.equal(existsSync(join(app, file)), true, `${file} must exist.`);
}

const locationMap = readFileSync(join(app, "src/app/location-map/page.tsx"), "utf8");
assert.match(locationMap, /LocationMapAcceptanceBoundary/, "Location Map route must render the static acceptance boundary.");
assert.match(locationMap, /listMemoryPlaces/, "Location Map route must load places through repository.");
assert.doesNotMatch(locationMap, /DEMO_MEMORY_PLACES/, "Private Location Map must not import demo places as user data.");

const locationBoundary = readFileSync(join(app, "src/spatial/places/LocationMapAcceptanceBoundary.tsx"), "utf8");
assert.match(locationBoundary, /LocationMapScene/, "Location Map acceptance boundary must render LocationMapScene.");

// Historical symbolic scene source remains for explicitly disclosed demo/provenance use only.
// Ordinary user routes must not resolve to it from implicit demo fallback.
const legacyPlaceScene = readFileSync(join(app, "src/spatial/places/MemoryPlaceScene.tsx"), "utf8");
assert.match(legacyPlaceScene, /MemoryPlaceScene/, "Legacy MemoryPlaceScene provenance source must remain identifiable.");

const placeRoute = readFileSync(join(app, "src/app/place/[placeId]/page.tsx"), "utf8");
assert.match(placeRoute, /resolveMemoryPlace/, "Legacy place route must resolve through repository authority.");
assert.match(placeRoute, /legacy-fail-closed-no-demo-substitution/, "Ordinary place route must disclose fail-closed authority.");
assert.match(placeRoute, /Return to Ground/, "Unavailable personal place must return to Ground.");
assert.doesNotMatch(placeRoute, /DEMO_MEMORY_PLACES|generateStaticParams|resolveDemoMemoryPlace/, "Ordinary place route must not expose implicit demo memory places.");

const replay = readFileSync(join(app, "src/app/place/[placeId]/replay/page.tsx"), "utf8");
assert.match(replay, /resolveMemoryPlace/, "Place replay route must resolve place through repository.");
assert.match(replay, /listMemoryPlaceObjects/, "Future source-backed place replay may load objects through repository.");
assert.match(replay, /legacy-fail-closed-no-demo-substitution/, "Ordinary place replay must disclose fail-closed authority.");
assert.match(replay, /Return to Ground/, "Unavailable personal replay must return to Ground.");
assert.doesNotMatch(replay, /DEMO_MEMORY_PLACES|generateStaticParams|resolveDemoMemoryPlace/, "Place replay route must not expose implicit demo memory places.");

console.log("URAI place routes canon passed.");
