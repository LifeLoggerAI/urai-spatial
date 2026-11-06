import assert from 'node:assert/strict';
import { test } from 'node:test';
import { lifeMapRotateFlightAxes, advanceLifeMapViewOrientation, lifeMapRotatedLookTarget } from '../src/components/lifemap/lifeMapFlightOrientation.mjs';

const keys = (...values) => new Set(values);
const origin = { yaw: 0, pitch: 0 };
const camera = [0, 1.55, 13.4];
const target = [0, 0.12, -4.5];

test('neutral look and flight preserve original overview', () => {
  assert.deepEqual(lifeMapRotateFlightAxes({ x: 1, y: 0.5, z: -1 }, 0), { x: 1, y: 0.5, z: -1 });
  assert.deepEqual(lifeMapRotatedLookTarget(camera, target, origin), target);
});
test('right turn makes forward flight move right', () => {
  const v = lifeMapRotateFlightAxes({ x: 0, y: 0, z: -1 }, Math.PI / 2);
  assert.ok(Math.abs(v.x - 1) < 1e-12 && Math.abs(v.z) < 1e-12);
});
test('view and movement rotate together with distance retained', () => {
  const heading = { yaw: Math.PI / 3, pitch: 0.2 };
  const actual = lifeMapRotatedLookTarget(camera, target, heading);
  assert.ok(actual[0] > 0);
  assert.ok(Math.abs(Math.hypot(...actual.map((v, i) => v - camera[i])) - Math.hypot(...target.map((v, i) => v - camera[i]))) < 1e-8);
  assert.ok(lifeMapRotateFlightAxes({ x: 0, y: 0, z: -1 }, heading.yaw).x > 0);
});
test('arrow look is bounded and neutral input does not drift', () => {
  let pose = origin;
  for (let i = 0; i < 300; i++) pose = advanceLifeMapViewOrientation(pose, keys('ArrowRight', 'ArrowUp'), 1 / 60);
  assert.ok(Math.abs(pose.yaw) <= Math.PI && pose.pitch <= 0.95);
  assert.deepEqual(advanceLifeMapViewOrientation(pose, keys(), 1 / 60), pose);
});
test('invalid and negative deltas do not move camera', () => {
  for (const dt of [-1, NaN, Infinity]) assert.deepEqual(advanceLifeMapViewOrientation(origin, keys('ArrowLeft'), dt), origin);
});
test('invalid world and orientation values fail closed', () => {
  assert.throws(() => lifeMapRotatedLookTarget([0, Infinity, 0], target, origin), /NONFINITE_LOOK_TARGET/);
  assert.throws(() => lifeMapRotateFlightAxes({ x: 0, y: 0, z: NaN }, 0), /NONFINITE_FLIGHT_INPUT/);
  assert.throws(() => advanceLifeMapViewOrientation({ yaw: Infinity, pitch: 0 }, keys(), 0.01), /NONFINITE_ORIENTATION/);
});
test('inputs remain immutable', () => {
  const pose = { yaw: 0.25, pitch: 0.3 };
  lifeMapRotatedLookTarget(camera, target, pose);
  assert.deepEqual(pose, { yaw: 0.25, pitch: 0.3 });
  assert.deepEqual(camera, [0, 1.55, 13.4]);
  assert.deepEqual(target, [0, 0.12, -4.5]);
});
