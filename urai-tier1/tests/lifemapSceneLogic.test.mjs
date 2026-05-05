import test from 'node:test';
import assert from 'node:assert/strict';
import { computeChapterCamera, getStateClasses, pickGlowingStars, reducedMotionLoopDelay, scoreStarForGlow } from '../../src/components/spatial/lifemapSceneLogic.ts';

const stars = [
  { id: 'a', title: 'A', x: 10, y: 20, size: 16, emotion: 'threshold', chapterId: 'threshold', state: 'idle', intensity: 1, recency: 1, unresolvedWeight: 1, lastActivatedAt: null, narratorLine: '', connectedTo: [] },
  { id: 'b', title: 'B', x: 20, y: 30, size: 16, emotion: 'joy', chapterId: 'threshold', state: 'resolved', intensity: 0.1, recency: 0.1, unresolvedWeight: 0.1, lastActivatedAt: null, narratorLine: '', connectedTo: [] },
  { id: 'c', title: 'C', x: 40, y: 60, size: 16, emotion: 'grief', chapterId: 'recovery-arc', state: 'idle', intensity: 0.9, recency: 0.8, unresolvedWeight: 0.7, lastActivatedAt: null, narratorLine: '', connectedTo: [] },
  { id: 'd', title: 'D', x: 60, y: 80, size: 16, emotion: 'focus', chapterId: 'recovery-arc', state: 'idle', intensity: 0.2, recency: 0.2, unresolvedWeight: 0.2, lastActivatedAt: null, narratorLine: '', connectedTo: [] },
];

test('glowing selection returns max 3 stars', () => {
  const picked = pickGlowingStars(stars, null, () => 0.9999);
  assert.ok(picked.length <= 3);
});

test('resolved stars are de-prioritized in glow scoring', () => {
  assert.ok(scoreStarForGlow(stars[1]) < scoreStarForGlow(stars[0]));
  assert.ok(scoreStarForGlow(stars[1]) < scoreStarForGlow(stars[2]));
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

test('state class and panel visibility class assertions remain structural', () => {
  const cls = getStateClasses('active', true, false, true);
  assert.match(cls, /state-active/);
  assert.match(cls, /is-connected/);
  assert.match(cls, /is-dimmed/);
});

test('focus/escape and event payload schema keys are stable', () => {
  const focusPayload = { event: 'lifemap.star.focus', starId: 'a', chapterId: 'threshold', emotion: 'threshold', action: 'replay' };
  const clusterPayload = { event: 'lifemap.cluster.focus', chapterId: 'threshold' };
  const resolvedPayload = { event: 'lifemap.star.resolved', starId: 'a', chapterId: 'threshold', emotion: 'threshold', action: 'resolve' };
  assert.deepEqual(Object.keys(focusPayload).sort(), ['action','chapterId','emotion','event','starId']);
  assert.deepEqual(Object.keys(clusterPayload).sort(), ['chapterId','event']);
  assert.deepEqual(Object.keys(resolvedPayload).sort(), ['action','chapterId','emotion','event','starId']);
});
