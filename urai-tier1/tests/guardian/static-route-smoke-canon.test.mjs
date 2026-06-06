import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const app = join(root, "urai-tier1");

const routes = [
  ["src/app/page.tsx", "TierOneExperience"],
  ["src/app/spatial/page.tsx", "TierOneExperience"],
  ["src/app/spatial-fallback/page.tsx", "UraiV1Experience"],
  ["src/app/focus/page.tsx", "FocusPlaceDoor"],
  ["src/app/location-map/page.tsx", "LocationMapScene"],
  ["src/app/place/[placeId]/page.tsx", "MemoryPlaceScene"],
  ["src/app/place/[placeId]/replay/page.tsx", "PlaceReplayScene"],
  ["src/app/passport/page.tsx", "PassportRealm"],
  ["src/app/council/page.tsx", "CouncilRealm"],
  ["src/app/legacy/page.tsx", "RealmShell"],
  ["src/app/dream/page.tsx", "RealmShell"],
  ["src/app/ground/page.tsx", "RealmShell"],
];

for (const [file, expected] of routes) {
  const full = join(app, file);
  assert.equal(existsSync(full), true, `${file} must exist.`);
  const text = readFileSync(full, "utf8");
  assert.match(text, new RegExp(expected), `${file} must reference ${expected}.`);
}

const place = readFileSync(join(app, "src/app/place/[placeId]/page.tsx"), "utf8");
assert.match(place, /gateForMemoryPlace/, "Place route must gate before entry.");
assert.match(place, /resolveMemoryPlace/, "Place route must use repository resolver.");

const replay = readFileSync(join(app, "src/app/place/[placeId]/replay/page.tsx"), "utf8");
assert.match(replay, /resolveMemoryPlace/, "Place replay route must use repository resolver.");

console.log("URAI static route smoke canon passed.");
