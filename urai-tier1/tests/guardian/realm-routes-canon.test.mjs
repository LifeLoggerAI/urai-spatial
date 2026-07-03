import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const app = join(root, "urai-tier1");

const files = [
  "src/spatial/realms/sceneRegistry.ts",
  "src/spatial/realms/RealmShell.tsx",
  "src/app/mirror/page.tsx",
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
assert.match(mirror, /reflection-realm/, "Mirror route must render the final reflection realm owner.");
assert.match(
  mirror,
  /mirrorAssets\.primary\.src|mirror-reflection-main/,
  "Mirror route must use the canonical final mirror asset through the registry or direct path.",
);
assert.match(mirror, /mirrorAssets\.accents\.pattern\.src/, "Mirror route must use the final pattern glyph.");

const passport = readFileSync(join(app, "src/app/passport/page.tsx"), "utf8");
assert.match(passport, /FinalPassportVault/, "Passport route must render the final vault owner.");

const ground = readFileSync(join(app, "src/app/ground/page.tsx"), "utf8");
assert.match(ground, /walkable-first-person-ground-layer/, "Ground route must render the final ground world.");
assert.match(ground, /getSceneDefinition/, "Ground route must preserve scene registry contract.");

console.log("URAI realm routes canon passed: shell realms and final route owners are preserved.");
