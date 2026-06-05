import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const app = join(root, "urai-tier1");

const requiredFiles = [
  "src/app/location-map/page.tsx",
  "src/app/place/[placeId]/page.tsx",
  "src/app/place/[placeId]/replay/page.tsx",
  "src/spatial/places/LocationMapScene.tsx",
  "src/spatial/places/MemoryPlaceScene.tsx",
  "src/spatial/places/PlaceReplayScene.tsx",
];

for (const file of requiredFiles) {
  assert.equal(existsSync(join(app, file)), true, `${file} must exist.`);
}

const locationMap = readFileSync(join(app, "src/app/location-map/page.tsx"), "utf8");
assert.match(locationMap, /LocationMapScene/, "Location Map route must render LocationMapScene.");

const place = readFileSync(join(app, "src/spatial/places/MemoryPlaceScene.tsx"), "utf8");
assert.match(place, /Replay Place/, "MemoryPlaceScene must link to place replay.");
assert.match(place, /Location Map/, "MemoryPlaceScene must link to Location Map.");

const replay = readFileSync(join(app, "src/app/place/[placeId]/replay/page.tsx"), "utf8");
assert.match(replay, /PlaceReplayScene/, "Place replay route must render PlaceReplayScene.");
assert.match(replay, /resolveDemoMemoryPlace/, "Place replay route must resolve place safely.");

console.log("URAI place routes canon passed.");
