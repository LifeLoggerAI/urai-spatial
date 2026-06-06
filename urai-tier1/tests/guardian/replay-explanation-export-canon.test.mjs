import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const app = join(root, "urai-tier1");

const files = [
  "src/spatial/replay/placeReplayBeatSchema.ts",
  "src/spatial/places/PlaceReplayScene.tsx",
  "src/spatial/explanations/spatialExplanationSchema.ts",
  "src/spatial/exports/exportPrivacyFilter.ts",
];

for (const file of files) assert.equal(existsSync(join(app, file)), true, `${file} must exist.`);

const replay = readFileSync(join(app, "src/spatial/replay/placeReplayBeatSchema.ts"), "utf8");
assert.match(replay, /PlaceReplayBeat/, "PlaceReplayBeat must exist.");
assert.match(replay, /targetPlaceObjectId/, "Replay beats must target place objects.");
assert.match(replay, /makeDemoPlaceReplayBeats/, "Demo replay beat generator must exist.");

const scene = readFileSync(join(app, "src/spatial/places/PlaceReplayScene.tsx"), "utf8");
assert.match(scene, /makeDemoPlaceReplayBeats/, "PlaceReplayScene must use replay beat schema.");

const explanation = readFileSync(join(app, "src/spatial/explanations/spatialExplanationSchema.ts"), "utf8");
assert.match(explanation, /SpatialExplanation/, "SpatialExplanation schema must exist.");
assert.match(explanation, /confidence/, "SpatialExplanation must include confidence.");
assert.match(explanation, /privacyLevel/, "SpatialExplanation must include privacyLevel.");

const exportFilter = readFileSync(join(app, "src/spatial/exports/exportPrivacyFilter.ts"), "utf8");
assert.match(exportFilter, /filterSpatialExport/, "Export privacy filter must exist.");
assert.match(exportFilter, /exact-share-opt-in/, "Export filter must protect exact location sharing.");

console.log("URAI replay, explanation, and export canon passed.");
