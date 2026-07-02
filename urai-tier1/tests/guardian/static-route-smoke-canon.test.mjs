import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const app = join(root, "urai-tier1");
const placeSegment = "[" + "placeId" + "]";

const routes = [
  ["src/app/page.tsx", "TierOneExperience"],
  ["src/app/spatial/page.tsx", "TierOneExperience"],
  ["src/app/spatial-fallback/page.tsx", "UraiV1Experience"],
  ["src/app/focus/page.tsx", "FinalFocusChamber"],
  ["src/app/replay/page.tsx", "FinalReplayFilm"],
  ["src/app/location-map/page.tsx", "LocationMapScene"],
  [`src/app/place/${placeSegment}/page.tsx`, "MemoryPlaceScene"],
  [`src/app/place/${placeSegment}/replay/page.tsx`, "PlaceReplayScene"],
  ["src/app/passport/page.tsx", "FinalPassportVault"],
  ["src/app/council/page.tsx", "RealmShell"],
  ["src/app/legacy/page.tsx", "RealmShell"],
  ["src/app/dream/page.tsx", "RealmShell"],
  ["src/app/ground/page.tsx", "walkable-first-person-ground-layer"],
];

for (const [file, expected] of routes) {
  const full = join(app, file);
  assert.equal(existsSync(full), true, `${file} must exist.`);
  const text = readFileSync(full, "utf8");
  assert.match(text, new RegExp(expected), `${file} must reference ${expected}.`);
}

const place = readFileSync(join(app, `src/app/place/${placeSegment}/page.tsx`), "utf8");
assert.match(place, /resolveMemoryPlace/, "Place route must use repository resolver.");

const placeReplay = readFileSync(join(app, `src/app/place/${placeSegment}/replay/page.tsx`), "utf8");
assert.match(placeReplay, /resolveMemoryPlace/, "Place replay route must use repository resolver.");

console.log("URAI static route smoke canon passed.");
