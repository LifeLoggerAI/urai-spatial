import assert from 'node:assert/strict';
import test from 'node:test';

import {
  LIFE_MAP_FIRESTORE_COLLECTION_PATHS,
  LIFE_MAP_UNIVERSE_EDGES,
  LIFE_MAP_UNIVERSE_NODES,
} from '../src/spatial/lifemap/lifeMapUniverseData.ts';

const REQUIRED_NODE_TYPES = [
  'memory',
  'insight',
  'ritual',
  'dream',
  'relationship',
  'recovery',
  'shadow',
  'milestone',
  'chapter',
  'voiceMoment',
  'locationMoment',
  'emotionalShift',
  'habitPattern',
  'socialPattern',
  'threshold',
  'rebirth',
  'legacy',
  'mirrorMoment',
];

const REQUIRED_FIRESTORE_PATHS = [
  'users/{userId}/homeWorldState/current',
  'users/{userId}/lifeMapNodes/{nodeId}',
  'users/{userId}/lifeMapEdges/{edgeId}',
  'users/{userId}/lifeMapChapters/{chapterId}',
  'users/{userId}/lifeMapSeasons/{seasonId}',
  'users/{userId}/narratorInsights/{insightId}',
  'users/{userId}/replayPaths/{pathId}',
  'users/{userId}/mirrorStates/{stateId}',
  'users/{userId}/spatialPreferences/current',
];

test('life map universe seed data has 3D nodes and required fields', () => {
  assert.ok(LIFE_MAP_UNIVERSE_NODES.length >= 20);

  for (const node of LIFE_MAP_UNIVERSE_NODES) {
    assert.equal(node.position.length, 3);
    assert.ok(node.title.length > 4);
    assert.ok(!/demo star|test node|lorem ipsum|sample memory/i.test(node.title));
    assert.ok(node.narratorLine.length > 12);
    assert.ok(node.whyThis.length > 24);
    assert.ok(node.sourceSignals.length > 0);
    assert.ok(node.emotionalIntensity >= 0 && node.emotionalIntensity <= 1);
    assert.ok(node.importance >= 0 && node.importance <= 1);
    assert.ok(node.unresolvedness >= 0 && node.unresolvedness <= 1);
  }
});

test('life map universe covers the complete required node type language', () => {
  const actualTypes = new Set(LIFE_MAP_UNIVERSE_NODES.map((node) => node.type));
  for (const requiredType of REQUIRED_NODE_TYPES) {
    assert.ok(actualTypes.has(requiredType), `missing ${requiredType}`);
  }
});

test('life map universe edges connect valid nodes and required arcs', () => {
  const ids = new Set(LIFE_MAP_UNIVERSE_NODES.map((node) => node.id));
  const arcTypes = new Set(LIFE_MAP_UNIVERSE_EDGES.map((edge) => edge.arcType));

  for (const edge of LIFE_MAP_UNIVERSE_EDGES) {
    assert.ok(ids.has(edge.from), `missing from node ${edge.from}`);
    assert.ok(ids.has(edge.to), `missing to node ${edge.to}`);
    assert.ok(edge.strength > 0 && edge.strength <= 1);
  }

  for (const requiredArc of ['recovery-path', 'relationship-arc', 'shadow-season', 'purpose-thread', 'habit-loop', 'dream-memory', 'threshold-rebirth']) {
    assert.ok(arcTypes.has(requiredArc), `missing arc ${requiredArc}`);
  }
});

test('life map universe declares Firestore-ready paths', () => {
  assert.deepEqual([...LIFE_MAP_FIRESTORE_COLLECTION_PATHS], REQUIRED_FIRESTORE_PATHS);
});
