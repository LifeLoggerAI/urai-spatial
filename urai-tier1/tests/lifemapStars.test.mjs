import test from 'node:test';
import assert from 'node:assert/strict';
import { getLifeMapStars } from '../src/spatial/scene/getLifeMapStars.ts';

test('fallback star adapter returns non-empty, finite stars', () => {
  const { stars, source } = getLifeMapStars();
  assert.equal(source, 'seed');
  assert.ok(stars.length >= 80);
  for (const s of stars) {
    assert.ok(Number.isFinite(s.x) && Number.isFinite(s.y) && Number.isFinite(s.z) && Number.isFinite(s.r));
  }
  assert.ok(stars.some((s) => s.major));
  assert.ok(stars.some((s) => !s.major));
});
