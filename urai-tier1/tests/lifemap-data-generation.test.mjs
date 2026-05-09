import assert from 'node:assert/strict';
import test from 'node:test';

import {
  clampLifeMapIntensity,
  formatLifeMapDateLabel,
  lifeMapNodes,
  mapLifeMapEventToNode,
  stableLifeMapPosition,
} from '../src/components/lifemap/lifeMapData.ts';
import {
  buildLifeMapReplaySequence,
  dominantTypes,
  generateMirrorOfBecoming,
  replayCameraTarget,
  replayPhaseForProgress,
} from '../src/components/lifemap/lifeMapReplay.ts';

test('stableLifeMapPosition is deterministic for the same event identity', () => {
  const first = stableLifeMapPosition('event-alpha', 'memory', 0.72);
  const second = stableLifeMapPosition('event-alpha', 'memory', 0.72);
  assert.deepEqual(first, second);
  assert.equal(first.length, 3);
});

test('clampLifeMapIntensity keeps values inside 0..1', () => {
  assert.equal(clampLifeMapIntensity(-10), 0);
  assert.equal(clampLifeMapIntensity(10), 1);
  assert.equal(clampLifeMapIntensity(Number.NaN), 0.5);
  assert.equal(clampLifeMapIntensity(0.42), 0.42);
});

test('mapLifeMapEventToNode fills safe defaults and stable position', () => {
  const node = mapLifeMapEventToNode({
    id: 'event-beta',
    userId: 'demo-user',
    title: 'Beta Memory',
    summary: 'A beta memory signal.',
    type: 'memory',
    sourceType: 'system_generated',
    intensity: 2,
  });

  assert.equal(node.id, 'event-beta');
  assert.equal(node.title, 'Beta Memory');
  assert.equal(node.intensity, 1);
  assert.equal(node.aura, '#8adfff');
  assert.equal(node.privacyLevel, 'private');
  assert.deepEqual(node.position, stableLifeMapPosition('event-beta', 'memory', 1));
});

test('formatLifeMapDateLabel returns readable labels for ISO dates', () => {
  const label = formatLifeMapDateLabel('2026-05-09T12:00:00.000Z');
  assert.match(label ?? '', /2026/);
});

test('buildLifeMapReplaySequence creates a bounded connected sequence', () => {
  const start = lifeMapNodes.find((node) => node.id === 'memory-thread');
  assert.ok(start);

  const replay = buildLifeMapReplaySequence(start, lifeMapNodes, 0.58);
  assert.equal(replay.startNodeId, 'memory-thread');
  assert.ok(replay.nodeSequence.length >= 2);
  assert.ok(replay.nodeSequence.length <= 5);
  assert.equal(replay.phase, 'playing');
  assert.equal(replay.caption, 'Playing memory stream');
});

test('replayPhaseForProgress maps progress to safe phases', () => {
  assert.equal(replayPhaseForProgress(-1).phase, 'gathering');
  assert.equal(replayPhaseForProgress(0.4).phase, 'weather');
  assert.equal(replayPhaseForProgress(2).phase, 'complete');
});

test('replayCameraTarget resolves the active node position', () => {
  const start = lifeMapNodes[0];
  const replay = buildLifeMapReplaySequence(start, lifeMapNodes, 0.58);
  const target = replayCameraTarget(replay, lifeMapNodes);
  assert.equal(target.length, 3);
});

test('generateMirrorOfBecoming derives a mirror from nodes and eras', () => {
  const mirror = generateMirrorOfBecoming(lifeMapNodes, [], 'demo-user');
  assert.equal(mirror.userId, 'demo-user');
  assert.ok(mirror.dominantArchetypes.length > 0);
  assert.ok(mirror.sourceNodeIds.includes('memory-thread'));
  assert.ok(mirror.confidence >= 0.38);
  assert.match(mirror.becomingStatement, /becoming/i);
});

test('dominantTypes ranks node types by count and intensity', () => {
  const types = dominantTypes(lifeMapNodes);
  assert.ok(types.length > 0);
  assert.ok(types.includes('memory'));
});
