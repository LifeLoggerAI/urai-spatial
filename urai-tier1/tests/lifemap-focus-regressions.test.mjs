import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  capGlowingStars,
  resolveActionState,
  shouldLoopAnimations,
  clearFocusOnEscape,
  focusClusterByChapterAnchor,
  buildLifemapEventPayload,
} from '../src/spatial/scene/lifemapFocusRegression.ts';

test('max 3 glowing stars', () => {
  assert.equal(capGlowingStars(7), 3);
  assert.equal(capGlowingStars(3), 3);
});

test('resolve action state transition', () => {
  assert.equal(resolveActionState('idle', 'resolve'), 'resolving');
  assert.equal(resolveActionState('resolving', 'resolve'), 'resolved');
});

test('reduced-motion disables loops', () => {
  assert.equal(shouldLoopAnimations(true), false);
});

test('escape clears focus', () => {
  assert.equal(clearFocusOnEscape('Escape', 'node-01'), null);
});

test('chapter anchor focuses cluster', () => {
  const cluster = focusClusterByChapterAnchor('chapter-return', { 'chapter-return': 'cluster-return' });
  assert.equal(cluster, 'cluster-return');
});

test('event dispatches fire with expected payloads', () => {
  const payload = buildLifemapEventPayload('chapter_anchor', 'chapter-return');
  assert.deepEqual(payload, {
    type: 'chapter_anchor',
    value: 'chapter-return',
    ts: '2026-05-04T12:00:00.000Z',
  });
});


test('selected Life Map Escape unwinds overview then Home without reselecting retained node', () => {
  const scene = fs.readFileSync(new URL('../src/components/lifemap/ComposedLifeMapScene.tsx', import.meta.url), 'utf8');
  assert.match(scene, /get\("overview"\) === "1"/);
  assert.match(scene, /if \(overviewIsCurrent \|\| !selectedId\) router\.push\("\/home"\)/);
  assert.match(scene, /else overview\(\)/);
  assert.match(scene, /setSelectedId\(null\)/);
});
