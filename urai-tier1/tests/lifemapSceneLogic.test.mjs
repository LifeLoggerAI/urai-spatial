import test from 'node:test';
import assert from 'node:assert/strict';
import { computeChapterCamera, getStateClasses, reducedMotionLoopDelay, clampCamera } from '../../src/components/spatial/lifemapSceneLogic.ts';
import { chooseGlowingStars, scoreGlowCandidate } from '../../src/components/spatial/lifeMapGlowScheduler.ts';

const stars = [
  { id: 'a', title: 'A', x: 10, y: 20, size: 16, emotion: 'threshold', chapterId: 'threshold', state: 'idle', intensity: 1, recency: 1, unresolvedWeight: 1, lastActivatedAt: null, narratorLine: '', connectedTo: [] },
  { id: 'b', title: 'B', x: 20, y: 30, size: 16, emotion: 'joy', chapterId: 'threshold', state: 'resolved', intensity: 0.1, recency: 0.1, unresolvedWeight: 0.1, lastActivatedAt: null, narratorLine: '', connectedTo: [] },
  { id: 'c', title: 'C', x: 40, y: 60, size: 16, emotion: 'grief', chapterId: 'recovery-arc', state: 'idle', intensity: 0.9, recency: 0.8, unresolvedWeight: 0.7, lastActivatedAt: null, narratorLine: '', connectedTo: [] },
  { id: 'd', title: 'D', x: 60, y: 80, size: 16, emotion: 'focus', chapterId: 'recovery-arc', state: 'idle', intensity: 0.2, recency: 0.2, unresolvedWeight: 0.2, lastActivatedAt: null, narratorLine: '', connectedTo: [] },
];

test('glowing selection returns max 3 stars', () => {
  const picked = chooseGlowingStars(stars, [], { count: 3, tick: 1, minTicksBetweenGlows: 1, repeatWindowTicks: 3, maxRepeatsPerWindow: 2 }, () => 0.9999);
  assert.ok(picked.length <= 3);
});

test('resolved stars are de-prioritized in glow scoring', () => {
  assert.equal(scoreGlowCandidate(stars[1], 1, {}, {}), -1000);
  assert.ok(scoreGlowCandidate(stars[0], 1, {}, {}) > scoreGlowCandidate(stars[3], 1, {}, {}));
});

test('reduced motion uses no-loop long delay behavior', () => {
  assert.equal(reducedMotionLoopDelay(true, Math.random), 14000);
  assert.equal(reducedMotionLoopDelay(false, () => 0), 8000);
});

test('chapter focus camera centers chapter stars', () => {
  const camera = computeChapterCamera(stars, 'threshold');
  assert.equal(camera.zoom, 1.45);
  assert.equal(camera.x, 15);
  assert.equal(camera.y, 25);
});

test('camera clamp keeps values in range', () => {
  assert.deepEqual(clampCamera({ x: -10, y: 120, zoom: 9 }), { x: 0, y: 100, zoom: 2.25 });
});

test('state class and panel visibility class assertions remain structural', () => {
  const cls = getStateClasses('active', true, false, true);
  assert.match(cls, /state-active/);
  assert.match(cls, /is-connected/);
  assert.match(cls, /is-dimmed/);
});
