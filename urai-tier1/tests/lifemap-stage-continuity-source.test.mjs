import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const scene = readFileSync(new URL('../src/components/lifemap/ComposedLifeMapScene.tsx', import.meta.url), 'utf8');
const world = readFileSync(new URL('../src/components/lifemap/LifeMapProductionWorld.tsx', import.meta.url), 'utf8');

test('selected camera targets the identical physical star coordinate as overview', () => {
  assert.match(scene, /lifeMapStagePoint\(node\.position, portrait\)/);
  assert.doesNotMatch(scene, /const scale = portrait \? new THREE\.Vector3\(0\.92, 0\.96, 0\.92\)/);
  assert.match(scene, /const target = selectedStagePoint\(node, portrait\)/);
});

test('selection no longer moves the entire authored galaxy stage', () => {
  assert.match(world, /const stage = lifeMapWorldStageTransform\(portrait\)/);
  assert.match(world, /<group name="life-map-world-stage" scale=\{stageScale\} position=\{stagePosition\}>/);
  assert.doesNotMatch(world, /const stageScale: Point3 = selected \?/);
  assert.doesNotMatch(world, /const stagePosition: Point3 = selected \?/);
});

test('newer Focus, route and privacy authority stay in their original owners', () => {
  assert.match(world, /export function FocusLifeMapContext\(/);
  assert.match(scene, /forwardPrivateMovieRouteSelection/);
  assert.match(scene, /shouldHandleRealmEscape\(event\)/);
  assert.match(scene, /WebGLRecoveryBridge/);
  assert.match(scene, /if \(event\.key !== "Escape" \|\| !shouldHandleRealmEscape\(event\)\)/);
});
