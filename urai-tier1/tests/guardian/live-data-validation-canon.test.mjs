import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const app = join(root, "urai-tier1");

const files = [
  "src/spatial/places/memoryPlaceValidation.ts",
  "src/spatial/places/firestoreMemoryPlaceRepository.ts",
  "src/spatial/world/worldContinuityRepository.ts",
  "tests/guardian/static-route-smoke-canon.test.mjs",
];

for (const file of files) assert.equal(existsSync(join(app, file)), true, `${file} must exist.`);

const validation = readFileSync(join(app, "src/spatial/places/memoryPlaceValidation.ts"), "utf8");
assert.match(validation, /validateMemoryPlace/, "Memory place validator must exist.");
assert.match(validation, /validatePlaceObject/, "Place object validator must exist.");
assert.match(validation, /locationPrivacy/, "Validator must require locationPrivacy.");
assert.match(validation, /privacyLevel/, "Validator must require privacyLevel.");

const adapter = readFileSync(join(app, "src/spatial/places/firestoreMemoryPlaceRepository.ts"), "utf8");
assert.match(adapter, /validateMemoryPlace/, "Firestore adapter must validate memory places.");
assert.match(adapter, /validatePlaceObject/, "Firestore adapter must validate place objects.");
assert.match(adapter, /fallbackMemoryPlaceRepository/, "Firestore adapter must preserve fallback behavior.");

const continuity = readFileSync(join(app, "src/spatial/world/worldContinuityRepository.ts"), "utf8");
assert.match(continuity, /WorldContinuityRepository/, "World continuity repository contract must exist.");
assert.match(continuity, /markPlaceVisited/, "Continuity repository must mark place visits.");
assert.match(continuity, /markObjectInspected/, "Continuity repository must mark object inspection.");
assert.match(continuity, /markReplayCompleted/, "Continuity repository must mark replay completion.");
assert.match(continuity, /fallbackWorldContinuityRepository/, "Continuity repository must have fallback behavior.");

console.log("URAI live data validation canon passed.");
