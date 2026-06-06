import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const app = join(root, "urai-tier1");

const requiredFiles = [
  "src/spatial/places/memoryPlaceSafetyGate.ts",
  "src/spatial/places/MemoryPlaceGatePanel.tsx",
  "src/spatial/world/worldContinuityState.ts",
  "src/app/place/[placeId]/page.tsx",
];

for (const file of requiredFiles) {
  assert.equal(existsSync(join(app, file)), true, `${file} must exist.`);
}

const gate = readFileSync(join(app, "src/spatial/places/memoryPlaceSafetyGate.ts"), "utf8");
assert.match(gate, /MemoryPlaceSafetyGate/, "Safety gate schema must exist.");
assert.match(gate, /gateForMemoryPlace/, "Safety gate resolver must exist.");
assert.match(gate, /required/, "Safety gate must support required gate state.");

const route = readFileSync(join(app, "src/app/place/[placeId]/page.tsx"), "utf8");
assert.match(route, /gateForMemoryPlace/, "Place route must evaluate safety gate.");
assert.match(route, /MemoryPlaceGatePanel/, "Place route must render gate panel when required.");

const continuity = readFileSync(join(app, "src/spatial/world/worldContinuityState.ts"), "utf8");
assert.match(continuity, /WorldContinuityState/, "World continuity schema must exist.");
assert.match(continuity, /visitedPlaceIds/, "World continuity must track visited places.");
assert.match(continuity, /completedReplayIds/, "World continuity must track completed replays.");
assert.match(continuity, /inspectedObjectIds/, "World continuity must track inspected objects.");

console.log("URAI place safety and continuity canon passed.");
