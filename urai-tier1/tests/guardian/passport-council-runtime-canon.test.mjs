import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const app = join(root, "urai-tier1");

const files = [
  "src/spatial/passport/passportPermissionSchema.ts",
  "src/spatial/passport/PassportRealm.tsx",
  "src/app/passport/page.tsx",
  "src/spatial/council/councilAgentSchema.ts",
  "src/spatial/council/CouncilRealm.tsx",
  "src/app/council/page.tsx",
  "src/spatial/sound/soundCueRegistry.ts",
  "src/spatial/haptics/hapticCueRegistry.ts",
  "src/spatial/performance/renderLevelSchema.ts",
];

for (const file of files) assert.equal(existsSync(join(app, file)), true, `${file} must exist.`);

const passport = readFileSync(join(app, "src/spatial/passport/passportPermissionSchema.ts"), "utf8");
assert.match(passport, /PassportPermission/, "PassportPermission schema must exist.");
assert.match(passport, /DEMO_PASSPORT_PERMISSIONS/, "Demo passport permissions must exist.");
assert.match(passport, /canExport/, "Passport permissions must describe export control.");

const passportRoute = readFileSync(join(app, "src/app/passport/page.tsx"), "utf8");
assert.match(passportRoute, /PassportRealm/, "Passport route must render PassportRealm.");

const council = readFileSync(join(app, "src/spatial/council/councilAgentSchema.ts"), "utf8");
assert.match(council, /CouncilAgent/, "CouncilAgent schema must exist.");
assert.match(council, /DEMO_COUNCIL_AGENTS/, "Demo Council agents must exist.");

const councilRoute = readFileSync(join(app, "src/app/council/page.tsx"), "utf8");
assert.match(councilRoute, /CouncilRealm/, "Council route must render CouncilRealm.");

const sound = readFileSync(join(app, "src/spatial/sound/soundCueRegistry.ts"), "utf8");
assert.match(sound, /SOUND_CUE_REGISTRY/, "Sound cue registry must exist.");
assert.match(sound, /enter-place/, "Sound registry must include enter-place.");

const haptics = readFileSync(join(app, "src/spatial/haptics/hapticCueRegistry.ts"), "utf8");
assert.match(haptics, /HAPTIC_CUE_REGISTRY/, "Haptic cue registry must exist.");
assert.match(haptics, /reducedMotionSafe/, "Haptic cues must include reducedMotionSafe.");

const performance = readFileSync(join(app, "src/spatial/performance/renderLevelSchema.ts"), "utf8");
assert.match(performance, /RENDER_LEVEL_PROFILES/, "Render level profiles must exist.");
assert.match(performance, /spatial-fallback/, "Render level profile must include fallback route.");
assert.match(performance, /chooseRenderLevel/, "Render level chooser must exist.");

console.log("URAI Passport, Council, sound, haptics, and performance canon passed.");
