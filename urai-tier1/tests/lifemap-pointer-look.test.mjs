import assert from 'node:assert/strict';
import test from 'node:test';
import { lifeMapApplyPointerLook } from '../src/components/lifemap/lifeMapPointerLook.mjs';

test('rightward drag turns camera right, downward drag looks down', () => {
  assert.deepEqual(lifeMapApplyPointerLook({yaw: 0, pitch: 0}, 25, 10), {yaw: 0.1, pitch: -0.03});
});
test('zero movement leaves orientation untouched', () => {
  const pose = {yaw: 0.3, pitch: -0.15};
  assert.deepEqual(lifeMapApplyPointerLook(pose, 0, 0), pose);
});
test('a lost pointer event cannot spin more than one bounded step', () => {
  const pose = {yaw: 0, pitch: 0};
  assert.deepEqual(lifeMapApplyPointerLook(pose, 100000, -100000), {yaw: 0.48, pitch: 0.36});
});
test('pitch remains below the upside-down limit', () => {
  let pose = {yaw: 0, pitch: 0};
  for (let i = 0; i < 200; i++) pose = lifeMapApplyPointerLook(pose, 50, -100);
  assert.ok(pose.pitch <= 0.95 && pose.pitch >= -0.95);
  assert.ok(pose.yaw <= Math.PI && pose.yaw >= -Math.PI);
});
test('orientation is immutable', () => {
  const pose = Object.freeze({yaw: 1, pitch: -0.15});
  const next = lifeMapApplyPointerLook(pose, -25, 15);
  assert.notStrictEqual(next, pose);
  assert.deepEqual(pose, {yaw: 1, pitch: -0.15});
});
test('invalid numeric inputs fail closed', () => {
  for (const bad of [NaN, Infinity, -Infinity]) {
    assert.throws(() => lifeMapApplyPointerLook({yaw: 0, pitch: 0}, bad, 0), /LIFE_MAP_NONFINITE_POINTER_LOOK/);
    assert.throws(() => lifeMapApplyPointerLook({yaw: bad, pitch: 0}, 0, 0), /LIFE_MAP_NONFINITE_POINTER_LOOK/);
  }
});
test('upward drag and leftward drag use the inverse directions', () => {
  const a = lifeMapApplyPointerLook({yaw: 0, pitch: 0}, -20, -30);
  assert.ok(a.yaw < 0 && a.pitch > 0);
});
