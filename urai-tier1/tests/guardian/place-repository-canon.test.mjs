import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const app = join(root, "urai-tier1");

const requiredFiles = [
  "src/spatial/places/memoryPlaceRepository.ts",
  "src/spatial/places/firestoreMemoryPlaceRepository.ts",
  "src/app/location-map/page.tsx",
  "src/app/place/[placeId]/page.tsx",
  "src/app/place/[placeId]/replay/page.tsx",
];

for (const file of requiredFiles) {
  assert.equal(existsSync(join(app, file)), true, `${file} must exist.`);
}

const repository = readFileSync(join(app, "src/spatial/places/memoryPlaceRepository.ts"), "utf8");
assert.match(repository, /MemoryPlaceRepository/, "MemoryPlaceRepository contract must exist.");
assert.match(repository, /fallbackMemoryPlaceRepository/, "Fallback memory place repository must exist.");
assert.match(repository, /resolveMemoryPlace/, "resolveMemoryPlace helper must exist.");
assert.match(repository, /listMemoryPlaceObjects/, "listMemoryPlaceObjects helper must exist.");
assert.match(repository, /listMemoryPlaces/, "listMemoryPlaces helper must exist.");

const adapter = readFileSync(join(app, "src/spatial/places/firestoreMemoryPlaceRepository.ts"), "utf8");
assert.match(adapter, /createFirestoreMemoryPlaceRepository/, "Firestore adapter factory must exist.");
assert.match(adapter, /fallbackMemoryPlaceRepository/, "Firestore adapter must fall back safely.");

const placeRoute = readFileSync(join(app, "src/app/place/[placeId]/page.tsx"), "utf8");
assert.match(placeRoute, /resolveMemoryPlace/, "Place route must resolve through repository.");
assert.match(placeRoute, /listMemoryPlaceObjects/, "Place route must load objects through repository.");
assert.doesNotMatch(placeRoute, /resolveDemoMemoryPlace/, "Place route must not import demo resolver directly.");

const replayRoute = readFileSync(join(app, "src/app/place/[placeId]/replay/page.tsx"), "utf8");
assert.match(replayRoute, /resolveMemoryPlace/, "Place replay route must resolve through repository.");
assert.doesNotMatch(replayRoute, /resolveDemoMemoryPlace/, "Place replay route must not import demo resolver directly.");

const locationRoute = readFileSync(join(app, "src/app/location-map/page.tsx"), "utf8");
assert.match(locationRoute, /listMemoryPlaces/, "Location Map route must load places through repository.");
assert.doesNotMatch(locationRoute, /DEMO_MEMORY_PLACES/, "Location Map route must not import demo places directly.");

console.log("URAI place repository canon passed.");
