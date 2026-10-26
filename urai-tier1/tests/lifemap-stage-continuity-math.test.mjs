import assert from 'node:assert/strict';
import { test } from 'node:test';
import { lifeMapWorldStageTransform, lifeMapStagePoint } from '../src/components/lifemap/lifeMapStageContinuity.mjs';

test('one authored landscape transform per viewport, with no selected-star input', () => {
  const desktop = lifeMapWorldStageTransform(false);
  const portrait = lifeMapWorldStageTransform(true);
  assert.deepEqual(desktop, { scale: [1.12, 1.18, 1.08], position: [0, 0.05, 0.9] });
  assert.deepEqual(portrait, { scale: [0.54, 0.96, 0.78], position: [0, -0.18, 1.1] });
  assert.notDeepEqual(desktop, portrait);
});

test('camera target and galaxy placement agree for desktop and portrait', () => {
  for (const portrait of [false, true]) {
    const { scale, position } = lifeMapWorldStageTransform(portrait);
    for (let k = 0; k < 256; k += 1) {
      const p = [Math.sin(k) * 18, Math.cos(k) * 9, Math.sin(k * 0.3) * 27];
      const intended = p.map((v, i) => v * scale[i] + position[i]);
      assert.deepEqual(lifeMapStagePoint(p, portrait), intended);
    }
  }
});

test('selecting any Memory Star never changes the transform or teleports existing stars', () => {
  for (const portrait of [false, true]) {
    const before = lifeMapWorldStageTransform(portrait);
    const stars = [[0, 0, 0], [6, -3, 9], [-8, 2.5, -26], [11, 8, 2]];
    const oldPositions = stars.map(star => lifeMapStagePoint(star, portrait));
    for (const _selectedId of [null, 'star-a', 'star-b', 'star-c']) {
      const after = lifeMapWorldStageTransform(portrait);
      assert.deepEqual(after, before);
      assert.deepEqual(stars.map(star => lifeMapStagePoint(star, portrait)), oldPositions);
    }
  }
});

test('invalid star world coordinates fail closed rather than poison the render camera', () => {
  for (const value of [[1, 2, NaN], [1, Infinity, 3], [1, 2], null, 'star']) {
    assert.throws(() => lifeMapStagePoint(value, true), /LIFE_MAP_NONFINITE_STAGE_POINT/);
  }
});

test('world transforms are fresh values and cannot be mutated through another request', () => {
  const mutated = lifeMapWorldStageTransform(true);
  mutated.scale[0] = 99;
  mutated.position[1] = 99;
  assert.deepEqual(lifeMapWorldStageTransform(true), { scale: [0.54, 0.96, 0.78], position: [0, -0.18, 1.1] });
});
