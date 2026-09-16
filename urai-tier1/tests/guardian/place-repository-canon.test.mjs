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
assert.match(repository, /failClosedMemoryPlaceRepository/, "Ordinary place authority must have an explicit fail-closed repository.");
assert.match(repository, /demoMemoryPlaceRepository/, "Historical demo repository may remain only as an explicit opt-in authority.");
assert.match(repository, /context\?\.source === 'demo'/, "Demo place data must require explicit demo context.");
assert.match(repository, /personalized-place-source-required/, "Missing personalized data must fail closed rather than synthesize a place.");
assert.match(repository, /resolveMemoryPlace/, "resolveMemoryPlace helper must exist.");
assert.match(repository, /listMemoryPlaceObjects/, "listMemoryPlaceObjects helper must exist.");
assert.match(repository, /listMemoryPlaces/, "listMemoryPlaces helper must exist.");
assert.doesNotMatch(repository, /fallbackMemoryPlaceRepository/, "Legacy implicit demo fallback authority must remain retired.");

const adapter = readFileSync(join(app, "src/spatial/places/firestoreMemoryPlaceRepository.ts"), "utf8");
assert.match(adapter, /createFirestoreMemoryPlaceRepository/, "Firestore adapter factory must exist.");
assert.match(adapter, /failClosedMemoryPlaceRepository/, "Unwired Firestore adapter must fail closed.");
assert.doesNotMatch(adapter, /demoMemoryPlaceRepository|fallbackMemoryPlaceRepository/, "Firestore must never fall back to demo places.");
assert.match(adapter, /source: 'firestore'/, "Firestore authority must stay explicit when provider wiring arrives.");

const placeRoute = readFileSync(join(app, "src/app/place/[placeId]/page.tsx"), "utf8");
assert.match(placeRoute, /resolveMemoryPlace/, "Place route must resolve through repository.");
assert.match(placeRoute, /listMemoryPlaceObjects/, "Place route must load objects through repository.");
assert.doesNotMatch(placeRoute, /resolveDemoMemoryPlace|DEMO_MEMORY_PLACES|generateStaticParams/, "Place route must not expose demo places implicitly.");
assert.match(placeRoute, /Return to Ground/, "Unavailable legacy place route must return to Ground.");

const replayRoute = readFileSync(join(app, "src/app/place/[placeId]/replay/page.tsx"), "utf8");
assert.match(replayRoute, /resolveMemoryPlace/, "Place replay route must resolve through repository.");
assert.doesNotMatch(replayRoute, /resolveDemoMemoryPlace|DEMO_MEMORY_PLACES|generateStaticParams/, "Place replay route must not expose demo places implicitly.");
assert.match(replayRoute, /Return to Ground/, "Unavailable legacy place replay must return to Ground.");

const locationRoute = readFileSync(join(app, "src/app/location-map/page.tsx"), "utf8");
assert.match(locationRoute, /listMemoryPlaces/, "Location Map route must load places through repository.");
assert.doesNotMatch(locationRoute, /DEMO_MEMORY_PLACES/, "Location Map route must not import demo places directly.");

console.log("URAI place repository canon passed.");
