import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(
  path.join(here, "../src/components/lifemap/LifeMapRouteBoundary.tsx"),
  "utf8",
);

test("Life Map reveals only after pixel-clean texture evidence or semantic recovery", () => {
  assert.match(source, /data-life-map-prepaint-boundary="true"/);
  assert.match(source, /data-life-map-surface-ready=\{surfaceReady \? 'true' : 'false'\}/);
  assert.match(source, /data-life-map-readiness-method=\{readinessMethod\}/);
  assert.match(source, /aria-hidden=\{!surfaceReady\}/);
  assert.match(source, /visibility: surfaceReady \? 'visible' : 'hidden'/);
  assert.match(source, /pointerEvents: surfaceReady \? 'auto' : 'none'/);
  assert.match(source, /canvas\.getContext\('webgl2'\) \|\| canvas\.getContext\('webgl'\)/);
  assert.match(source, /gl\.readPixels/);
  assert.match(source, /BRIGHT_NEUTRAL_LIMIT = 0\.015/);
  assert.match(source, /REQUIRED_STABLE_SAMPLES = 2/);
  assert.match(source, /sample\.brightNeutralRatio < BRIGHT_NEUTRAL_LIMIT/);
  assert.match(source, /sample\.litRatio > MIN_LIT_RATIO/);
  assert.match(source, /reveal\('pixel-proof'\)/);
  assert.match(source, /reveal\('semantic-recovery'\)/);
  assert.equal(source.includes("setSurfaceReady(true), 120"), false);
  assert.match(source, /Opening constellation…/);
  assert.match(source, /<AdaptiveLifeMapScene key=\{`\$\{identity\}:\$\{revision\}`\} \/>/);
});
