import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve("src/app/GroundSpatialWorldClean.tsx"), "utf8");

test("Ground natural profiles use the governed CC0 photoreal canopy and reject prior canopy stand-ins", () => {
  assert.match(source, /GROUND_BROADLEAF_CANOPY = "\/assets\/urai\/ground-production\/cc0\/polyhaven-jacaranda-web-v1\.glb"/);
  assert.match(source, /useGLTF\(GROUND_BROADLEAF_CANOPY\)/);
  assert.match(source, /name="ground-cc0-jacaranda-canopy-v35"/);
  assert.match(source, /treatment: "cc0-photoreal-broadleaf-canopy-v35"/);
  assert.match(source, /useGLTF\.preload\(GROUND_BROADLEAF_CANOPY\)/);
  assert.doesNotMatch(source, /ground-natural-canopy-v3\.glb/);
  assert.doesNotMatch(source, /CanopyLeafInstances/);
  assert.doesNotMatch(source, /makeOrganicTaperedTube/);
});
