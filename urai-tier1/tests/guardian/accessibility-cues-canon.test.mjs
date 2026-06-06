import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const app = join(root, "urai-tier1");

const files = [
  "src/spatial/accessibility/spatialAccessibilitySchema.ts",
  "src/spatial/runtime/spatialCueMetadata.ts",
  "src/spatial/places/MemoryPlaceInsightPanel.tsx",
  "src/spatial/places/PlaceReplayScene.tsx",
  "src/spatial/sound/soundCueRegistry.ts",
  "src/spatial/haptics/hapticCueRegistry.ts",
];

for (const file of files) assert.equal(existsSync(join(app, file)), true, `${file} must exist.`);

const accessibility = readFileSync(join(app, "src/spatial/accessibility/spatialAccessibilitySchema.ts"), "utf8");
assert.match(accessibility, /SpatialAccessibilityMode/, "SpatialAccessibilityMode must exist.");
assert.match(accessibility, /reducedMotion/, "Accessibility must support reducedMotion.");
assert.match(accessibility, /keyboardNavigation/, "Accessibility must support keyboardNavigation.");
assert.match(accessibility, /accessibilityRenderHints/, "Accessibility render hints must exist.");

const cue = readFileSync(join(app, "src/spatial/runtime/spatialCueMetadata.ts"), "utf8");
assert.match(cue, /getSpatialCueMetadata/, "Spatial cue metadata helper must exist.");
assert.match(cue, /privacySafe/, "Spatial cue metadata must include privacySafe.");
assert.match(cue, /reducedMotionSafe/, "Spatial cue metadata must include reducedMotionSafe.");

const insight = readFileSync(join(app, "src/spatial/places/MemoryPlaceInsightPanel.tsx"), "utf8");
assert.match(insight, /getSpatialCueMetadata/, "MemoryPlaceInsightPanel must use cue metadata.");
assert.match(insight, /Sensory cues/, "MemoryPlaceInsightPanel must show sensory cue metadata.");

const replay = readFileSync(join(app, "src/spatial/places/PlaceReplayScene.tsx"), "utf8");
assert.match(replay, /getSpatialCueMetadata/, "PlaceReplayScene must use cue metadata.");
assert.match(replay, /Replay sensory cue/, "PlaceReplayScene must show replay sensory cue metadata.");

console.log("URAI accessibility and sensory cues canon passed.");
