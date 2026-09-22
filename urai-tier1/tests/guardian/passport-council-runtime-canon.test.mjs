import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const app = join(root, "urai-tier1");

const files = [
  "src/spatial/passport/passportPermissionSchema.ts",
  "src/spatial/passport/PassportRealm.tsx",
  "src/app/passport/page.tsx",
  "src/app/passport/PassportVaultClient.tsx",
  "src/app/FinalPassportVault.tsx",
  "src/spatial/council/councilAgentSchema.ts",
  "src/spatial/council/CouncilRealm.tsx",
  "src/app/council/page.tsx",
  "src/spatial/realms/SpatialRealmRuntime.tsx",
  "src/spatial/realms/SpatialRealmExperience.tsx",
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
assert.match(passportRoute, /PassportVaultClient/, "Passport route must render the canonical Ownership Vault owner.");
assert.doesNotMatch(passportRoute, /FinalPassportVault/, "Passport route must not restore the retired poster-style owner.");

const passportClient = readFileSync(join(app, "src/app/passport/PassportVaultClient.tsx"), "utf8");
assert.match(passportClient, /data-route-owner="passport-ownership-vault"/, "Passport client must expose canonical route ownership.");
assert.match(passportClient, /getOperationalPassportSnapshot/, "Passport client must use trusted owner-scoped state.");

const finalPassport = readFileSync(join(app, "src/app/FinalPassportVault.tsx"), "utf8");
assert.match(finalPassport, /identity-consent-vault/, "Retained legacy Passport source must preserve its historical contract marker.");
assert.match(finalPassport, /passportAssets/, "Retained legacy Passport source must preserve the registered asset stack.");

const council = readFileSync(join(app, "src/spatial/council/councilAgentSchema.ts"), "utf8");
assert.match(council, /CouncilAgent/, "CouncilAgent schema must exist.");
assert.match(council, /DEMO_COUNCIL_AGENTS/, "Demo Council agents must exist.");

const councilRoute = readFileSync(join(app, "src/app/council/page.tsx"), "utf8");
assert.match(councilRoute, /CouncilRealm/, "Council route must render the rigged embodied Council owner.");
assert.match(councilRoute, /data-route-owner="rigged-embodied-council"/, "Council route must publish the current owner.");
assert.match(councilRoute, /getSceneDefinition/, "Council route must use sceneRegistry.");
assert.doesNotMatch(councilRoute, /SpatialRealmRuntime|RealmShell/, "Council route must not regress to the superseded generic or flat owner.");

const councilRealm = readFileSync(join(app, "src/spatial/council/CouncilRealm.tsx"), "utf8");
assert.match(councilRealm, /human-makehuman-v4/, "Council must use the current V4 rigged human candidates.");
assert.match(councilRealm, /RiggedCouncilHuman/, "Council must render rigged human participants rather than luminous placeholders.");
assert.match(councilRealm, /CouncilSemanticFallback/, "Council must preserve semantic no-WebGL access.");
assert.match(councilRealm, /stepEmbodiedMotion/, "Council must retain embodied movement input.");
assert.match(councilRealm, /requestUraiWorldTravel/, "Council destinations must use unified world travel.");
assert.match(councilRealm, /MobileMovementPad/, "Council must remain navigable on mobile.");

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

console.log("URAI Passport, capability-aware Council, sound, haptics, and performance canon passed.");
