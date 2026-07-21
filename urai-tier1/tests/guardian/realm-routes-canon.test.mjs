import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const app = join(root, "urai-tier1");

const files = [
  "src/spatial/realms/sceneRegistry.ts",
  "src/spatial/realms/RealmShell.tsx",
  "src/app/mirror/page.tsx",
  "src/app/mirror/MirrorSpatialClient.tsx",
  "src/app/legacy/page.tsx",
  "src/app/passport/page.tsx",
  "src/app/council/page.tsx",
  "src/app/dream/page.tsx",
  "src/app/ground/page.tsx",
];

for (const file of files) assert.equal(existsSync(join(app, file)), true, `${file} must exist.`);

const registry = readFileSync(join(app, "src/spatial/realms/sceneRegistry.ts"), "utf8");
for (const id of ["mirror", "legacy", "passport", "council", "dream", "ground"]) {
  assert.match(registry, new RegExp(id), `sceneRegistry must include ${id}.`);
}
assert.match(registry, /exitRoute/, "Scene registry entries must include exitRoute.");
assert.match(registry, /fallbackRoute/, "Scene registry entries must include fallbackRoute.");
assert.match(registry, /privacyLevel/, "Scene registry entries must include privacyLevel.");

const shell = readFileSync(join(app, "src/spatial/realms/RealmShell.tsx"), "utf8");
assert.match(shell, /Return Home/, "RealmShell must include Return Home exit.");
assert.match(shell, /Location Map/, "RealmShell must link to Location Map.");
assert.match(shell, /LifeMap/, "RealmShell must link to LifeMap.");

for (const route of ["legacy", "council", "dream"]) {
  const content = readFileSync(join(app, `src/app/${route}/page.tsx`), "utf8");
  assert.match(content, /RealmShell/, `${route} route must render RealmShell.`);
  assert.match(content, /getSceneDefinition/, `${route} route must use sceneRegistry.`);
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
assert.match(passport, /FinalPassportVault/, "Passport route must render the final vault owner.");

const ground = readFileSync(join(app, "src/app/ground/page.tsx"), "utf8");
assert.match(ground, /walkable-first-person-ground-layer/, "Ground route must render the final ground world.");
assert.match(ground, /getSceneDefinition/, "Ground route must preserve scene registry contract.");

console.log("URAI realm routes canon passed: shell realms and canonical spatial route owners are preserved.");
