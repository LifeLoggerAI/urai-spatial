import test from 'node:test';
import assert from 'node:assert/strict';

import { chooseGlowingStars, createSeededRandom, scoreGlowCandidate } from '../../src/components/spatial/lifeMapGlowScheduler.ts';

const stars = [
  { id: 'a', state: 'idle', emotion: 'threshold', recency: 0.8, intensity: 0.8, unresolvedWeight: 0.9, lastActivatedAt: 0 },
  { id: 'b', state: 'idle', emotion: 'recovery', recency: 0.7, intensity: 0.7, unresolvedWeight: 0.8, lastActivatedAt: 0 },
  { id: 'c', state: 'idle', emotion: 'joy', recency: 0.7, intensity: 0.7, unresolvedWeight: 0.8, lastActivatedAt: 0 },
];

test('score penalizes cooldown and repeats', () => {
  const base = scoreGlowCandidate(stars[0], 10, {}, {});
  const cooled = scoreGlowCandidate(stars[0], 10, { a: 11 }, {});
  const repeated = scoreGlowCandidate(stars[0], 10, {}, { a: 2 });
  assert.ok(cooled < base);
  assert.ok(repeated < base);
});

test('deterministic picks with seeded rng and repeat limit', () => {
  const rng = createSeededRandom(1);
  const history = [{ tick: 0, ids: ['a'] }, { tick: 1, ids: ['a'] }];
  const picked = chooseGlowingStars(stars, history, { count: 2, tick: 2, minTicksBetweenGlows: 1, repeatWindowTicks: 3, maxRepeatsPerWindow: 2 }, rng);
  assert.equal(picked.includes('a'), false);
  assert.equal(picked.length, 2);
});
