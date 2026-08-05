import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const app = join(root, "urai-tier1");

const files = [
  "src/spatial/realms/sceneRegistry.ts",
  "src/spatial/realms/RealmShell.tsx",
  "src/spatial/realms/SpatialRealmRuntime.tsx",
  "src/spatial/realms/SpatialRealmExperience.tsx",
  "src/app/mirror/page.tsx",
  "src/app/mirror/MirrorSpatialClient.tsx",
  "src/app/shadow/page.tsx",
  "src/app/legacy/page.tsx",
  "src/app/passport/page.tsx",
  "src/app/council/page.tsx",
  "src/app/dream/page.tsx",
  "src/app/ground/page.tsx",
];

for (const file of files) assert.equal(existsSync(join(app, file)), true, `${file} must exist.`);

const registry = readFileSync(join(app, "src/spatial/realms/sceneRegistry.ts"), "utf8");
for (const id of ["mirror", "shadow", "legacy", "passport", "council", "dream", "ground"]) {
  assert.match(registry, new RegExp(id), `sceneRegistry must include ${id}.`);
}
assert.match(registry, /exitRoute/, "Scene registry entries must include exitRoute.");
assert.match(registry, /fallbackRoute/, "Scene registry entries must include fallbackRoute.");
assert.match(registry, /privacyLevel/, "Scene registry entries must include privacyLevel.");

const shell = readFileSync(join(app, "src/spatial/realms/RealmShell.tsx"), "utf8");
assert.match(shell, /Return Home/, "RealmShell must include Return Home exit.");
assert.match(shell, /Location Map/, "RealmShell must link to Location Map.");
assert.match(shell, /LifeMap/, "RealmShell must link to LifeMap.");

for (const route of ["legacy", "dream"]) {
  const content = readFileSync(join(app, `src/app/${route}/page.tsx`), "utf8");
  assert.match(content, /RealmShell/, `${route} route must render RealmShell.`);
  assert.match(content, /getSceneDefinition/, `${route} route must use sceneRegistry.`);
}

const spatialRuntime = readFileSync(join(app, "src/spatial/realms/SpatialRealmRuntime.tsx"), "utf8");
assert.match(spatialRuntime, /SpatialRealmExperience/, "SpatialRealmRuntime must preserve the canonical R3F owner when WebGL is available.");
assert.match(spatialRuntime, /semantic-no-webgl-fallback/, "SpatialRealmRuntime must provide semantic no-WebGL access.");
assert.match(spatialRuntime, /data-reduced-motion/, "SpatialRealmRuntime must publish reduced-motion evidence.");
assert.match(spatialRuntime, /requestUraiWorldTravel/, "SpatialRealmRuntime fallback destinations must use unified world travel.");

const spatialRealm = readFileSync(join(app, "src/spatial/realms/SpatialRealmExperience.tsx"), "utf8");
assert.match(spatialRealm, /Canvas/, "SpatialRealmExperience must own a React Three Fiber Canvas.");
assert.match(spatialRealm, /useMovementInput/, "SpatialRealmExperience must support embodied movement input.");
assert.match(spatialRealm, /stepEmbodiedMotion/, "SpatialRealmExperience must advance a bounded spatial camera.");
assert.match(spatialRealm, /MobileMovementPad/, "SpatialRealmExperience must retain mobile movement controls.");
assert.match(spatialRealm, /requestUraiWorldTravel/, "SpatialRealmExperience portals must use the unified world travel runtime.");
assert.match(spatialRealm, /data-spatial-exploration="walkable"/, "SpatialRealmExperience must publish walkable exploration ownership.");
assert.match(spatialRealm, /let second: number \| null = null/, "SpatialRealmExperience must retain the nested animation frame id for cleanup.");
assert.match(spatialRealm, /if \(second !== null\) window\.cancelAnimationFrame\(second\)/, "SpatialRealmExperience must cancel the nested animation frame during cleanup.");
assert.doesNotMatch(spatialRealm, /return \(\) => window\.cancelAnimationFrame\(second\)/, "SpatialRealmExperience must not return ignored cleanup from inside an animation-frame callback.");

for (const route of ["shadow", "council"]) {
  const content = readFileSync(join(app, `src/app/${route}/page.tsx`), "utf8");
  assert.match(content, /SpatialRealmRuntime/, `${route} route must render the capability-aware spatial runtime.`);
  assert.match(content, new RegExp(`realm="${route}"`), `${route} route must mount its matching realm.`);
  assert.match(content, /getSceneDefinition/, `${route} route must use sceneRegistry.`);
  assert.doesNotMatch(content, /RealmShell/, `${route} route must not fall back to the flat shell owner.`);
}

const mirror = readFileSync(join(app, "src/app/mirror/page.tsx"), "utf8");
const mirrorClient = readFileSync(join(app, "src/app/mirror/MirrorSpatialClient.tsx"), "utf8");
assert.match(mirror, /MirrorSpatialClient/, "Mirror route must render the canonical spatial client.");
assert.match(mirror, /mirror-embodied-reflection-chamber/, "Mirror route must publish the embodied route fingerprint.");
assert.match(mirrorClient, /data-mirror-renderer="webgl-r3f"/, "Mirror client must own the React Three Fiber chamber.");
assert.match(mirrorClient, /privacy-safe-user-reflection/, "Mirror must retain its privacy-safe embodied reflection.");
assert.doesNotMatch(mirror, /mirror-reflection-main\.webp|reflection-realm/, "Mirror route must not restore the rejected static owner.");
assert.doesNotMatch(mirror, /See the pattern clearly|Reflection stack/, "Mirror route must not restore promotional composition copy.");

const passport = readFileSync(join(app, "src/app/passport/page.tsx"), "utf8");
assert.match(passport, /PassportVaultClient/, "Passport route must render the canonical Ownership Vault owner.");
assert.doesNotMatch(passport, /FinalPassportVault/, "Passport route must not restore the retired poster-style vault owner.");

const ground = readFileSync(join(app, "src/app/ground/page.tsx"), "utf8");
assert.match(ground, /walkable-first-person-ground-layer/, "Ground route must render the final ground world.");
assert.match(ground, /getSceneDefinition/, "Ground route must preserve scene registry contract.");

console.log("URAI realm routes canon passed: shell realms and capability-aware navigable spatial route owners are preserved.");
