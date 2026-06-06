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

for (const route of ["legacy", "passport", "council", "dream", "ground"]) {
  const content = readFileSync(join(app, `src/app/${route}/page.tsx`), "utf8");
  assert.match(content, /RealmShell/, `${route} route must render RealmShell.`);
  assert.match(content, /getSceneDefinition/, `${route} route must use sceneRegistry.`);
}

const mirror = readFileSync(join(app, "src/app/mirror/page.tsx"), "utf8");
assert.match(mirror, /TierOneExperience/, "Mirror route should preserve its existing true 3D TierOneExperience implementation.");

console.log("URAI realm routes canon passed.");
