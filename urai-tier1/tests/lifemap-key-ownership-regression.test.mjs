import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read = relative => readFileSync(new URL(relative, import.meta.url),'utf8');
const boundary=read('../src/spatial/world/LifeMapIndependentInputBoundary.tsx');
const camera=read('../src/components/lifemap/ComposedLifeMapScene.tsx');
const semantic=read('../src/components/lifemap/LifeMapSemanticNavigator.tsx');
const world=read('../src/spatial/world/UraiWorldShell.tsx');
test('canonical shell mounts real camera, navigator and independent help',()=>{
  assert.match(world,/<LifeMapIndependentInputBoundary\s*\/>/);
  assert.match(camera,/function CameraRig\(/);
  assert.match(semantic,/window\.addEventListener\('keydown', onKeyDown, true\)/);
});
test('movement keys belong only to camera rig, not star stepping',()=>{
  for (const k of ['KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE']) assert.ok(camera.includes(k));
  assert.match(camera,/function stepLifeMapFlight\(/);
  assert.doesNotMatch(boundary,/addEventListener\('keydown'/);
  assert.doesNotMatch(boundary,/event\.code === 'KeyA'|event\.code === 'KeyD'|event\.code === 'KeyQ'|event\.code === 'KeyE'|event\.code === 'KeyR'/);
});
test('semantic keyboard still owns arrow stepping, overview and search',()=>{
  assert.match(semantic,/event\.key === 'ArrowRight'/);
  assert.match(semantic,/event\.key === 'ArrowLeft'/);
  assert.match(semantic,/event\.key === 'Home'/);
  assert.match(semantic,/event\.key\.toLowerCase\(\) === 'o'/);
  assert.match(semantic,/event\.key === '\/'/);
});
test('existing explicit mobility event keeps its independent non-keyboard route',()=>{
  assert.match(boundary,/addEventListener\('urai:life-map-movement', onCommand as EventListener\)/);
  assert.match(boundary,/action === 'previous'/);
  assert.match(boundary,/action === 'next'/);
  assert.match(boundary,/action === 'overview'/);
});
test('camera releases movement and does not take Chalk or ADAM keyboard',()=>{
  assert.match(camera,/if \(lifeMapForegroundControlsOwnKeys\(document\)\) \{ release\(\); return; \}/);
  assert.match(camera,/lifeMapForegroundControlsOwnKeys\(document\)/);
  assert.match(camera,/window\.removeEventListener\('keydown', keyDown\)/);
});
test('global Escape yields to an open assistant before world-navigation',()=>{
  assert.match(camera,/if \(lifeMapForegroundControlsOwnKeys\(document\)/);
  assert.match(semantic,/if \(lifeMapForegroundControlsOwnKeys\(document\)\) return/);
  assert.match(boundary,/lifeMapForegroundControlsOwnKeys\(document\)/);
});
test('help describes distinct flight and semantic navigation',()=>{
  assert.match(boundary,/W\/A\/S\/D/);
  assert.match(boundary,/Arrow Left\/Right/);
  assert.match(boundary,/R recenter/);
});
