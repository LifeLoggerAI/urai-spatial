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

test("Life Map contains untextured first paint behind an authored loading surface", () => {
  assert.match(source, /data-life-map-prepaint-boundary="true"/);
  assert.match(source, /data-life-map-surface-ready=\{surfaceReady \? 'true' : 'false'\}/);
  assert.match(source, /aria-hidden=\{!surfaceReady\}/);
  assert.match(source, /visibility: surfaceReady \? 'visible' : 'hidden'/);
  assert.match(source, /pointerEvents: surfaceReady \? 'auto' : 'none'/);
  assert.match(source, /window\.requestAnimationFrame/);
  assert.match(source, /window\.setTimeout\(\(\) => setSurfaceReady\(true\), 120\)/);
  assert.match(source, /Opening constellation…/);
  assert.match(source, /<AdaptiveLifeMapScene key=\{`\$\{identity\}:\$\{revision\}`\} \/>/);
});
