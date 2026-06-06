import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const app = join(root, "urai-tier1");

const files = [
  "src/spatial/places/placeLayerSchema.ts",
  "src/spatial/places/placeTimelineSchema.ts",
  "src/spatial/places/placeConnectionSchema.ts",
  "src/spatial/places/MemoryPlaceInsightPanel.tsx",
  "src/spatial/places/MemoryPlaceScene.tsx",
];

for (const file of files) assert.equal(existsSync(join(app, file)), true, `${file} must exist.`);

const layer = readFileSync(join(app, "src/spatial/places/placeLayerSchema.ts"), "utf8");
assert.match(layer, /MemoryPlaceLayer/, "MemoryPlaceLayer must exist.");
assert.match(layer, /layerType/, "MemoryPlaceLayer must define layerType.");
assert.match(layer, /defaultPlaceLayers/, "Default layer helper must exist.");

const timeline = readFileSync(join(app, "src/spatial/places/placeTimelineSchema.ts"), "utf8");
assert.match(timeline, /MemoryPlaceTimeline/, "MemoryPlaceTimeline must exist.");
assert.match(timeline, /objectIds/, "Timeline events must support objectIds.");
assert.match(timeline, /makeDemoPlaceTimeline/, "Demo timeline helper must exist.");

const connection = readFileSync(join(app, "src/spatial/places/placeConnectionSchema.ts"), "utf8");
assert.match(connection, /MemoryPlaceConnection/, "MemoryPlaceConnection must exist.");
assert.match(connection, /fromPlaceId/, "Connections must include fromPlaceId.");
assert.match(connection, /toPlaceId/, "Connections must include toPlaceId.");

const insight = readFileSync(join(app, "src/spatial/places/MemoryPlaceInsightPanel.tsx"), "utf8");
assert.match(insight, /explainMemoryPlace/, "Insight panel must use spatial explanations.");
assert.match(insight, /filterSpatialExport/, "Insight panel must use export privacy filter.");

const scene = readFileSync(join(app, "src/spatial/places/MemoryPlaceScene.tsx"), "utf8");
assert.match(scene, /MemoryPlaceInsightPanel/, "MemoryPlaceScene must render MemoryPlaceInsightPanel.");

console.log("URAI place layer, timeline, connection, and insight canon passed.");
