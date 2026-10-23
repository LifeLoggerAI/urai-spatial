import assert from 'node:assert/strict';
import test from 'node:test';
import { lifeMapApplyPointerLook, lifeMapPointerDragStep, LIFE_MAP_POINTER_DRAG_THRESHOLD_PX } from '../src/components/lifemap/lifeMapPointerLook.mjs';

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

const start = Object.freeze({ startX: 200, startY: 100, lastX: 200, lastY: 100, dragging: false });

test('taps and subthreshold wiggles do not rotate the view', () => {
  assert.deepEqual(lifeMapPointerDragStep(start, 205, 102), {dragging:false,deltaX:0,deltaY:0});
  assert.deepEqual(lifeMapPointerDragStep(start, 200, 100), {dragging:false,deltaX:0,deltaY:0});
  assert.equal(LIFE_MAP_POINTER_DRAG_THRESHOLD_PX, 8);
});
test('crossing drag threshold is continuous without an eight-pixel camera jump', () => {
  assert.deepEqual(lifeMapPointerDragStep(start, 208, 100), {dragging:true,deltaX:0,deltaY:0});
  assert.deepEqual(lifeMapPointerDragStep(start, 210, 100), {dragging:true,deltaX:2,deltaY:0});
  const d = lifeMapPointerDragStep(start, 206, 108);
  assert.equal(d.dragging, true);
  assert.ok(Math.abs(Math.hypot(d.deltaX,d.deltaY) - 2) < 1e-12);
});
test('subsequent drag frames apply only incremental displacement', () => {
  const active = { ...start, lastX: 210, lastY: 100, dragging: true };
  assert.deepEqual(lifeMapPointerDragStep(active, 215, 97), {dragging:true,deltaX:5,deltaY:-3});
});
test('gesture coordinates remain immutable', () => {
  lifeMapPointerDragStep(start, 218, 108);
  assert.deepEqual(start, {startX:200,startY:100,lastX:200,lastY:100,dragging:false});
});
test('invalid gesture values fail closed', () => {
  for (const bad of [NaN, Infinity, -Infinity]) {
    assert.throws(() => lifeMapPointerDragStep(start, bad, 100), /LIFE_MAP_NONFINITE_POINTER_DRAG/);
    assert.throws(() => lifeMapPointerDragStep({...start, lastX:bad}, 210, 100), /LIFE_MAP_NONFINITE_POINTER_DRAG/);
  }
  assert.throws(() => lifeMapPointerDragStep(null, 210, 100), /LIFE_MAP_NONFINITE_POINTER_DRAG/);
  assert.throws(() => lifeMapPointerDragStep({...start, dragging:'no'}, 210, 100), /LIFE_MAP_NONFINITE_POINTER_DRAG/);
});
test('existing physical star R3F 6px tap guard is stricter than drag threshold', () => {
  assert.ok(6 < LIFE_MAP_POINTER_DRAG_THRESHOLD_PX);
});
