import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/spatial/scene/getLifeMapStars.ts', import.meta.url), 'utf8');

test('fallback star adapter keeps deterministic seeded stars', () => {
  assert.match(source, /const majorCount = 8/);
  assert.match(source, /const backgroundCount = 80/);
  assert.match(source, /return \[\.\.\.majors, \.\.\.background\]/);
});

test('fallback star adapter normalizes finite coordinate fields', () => {
  assert.match(source, /x: finite\(star\.x, 0\)/);
  assert.match(source, /y: finite\(star\.y, 8\)/);
  assert.match(source, /z: finite\(star\.z, -48\)/);
  assert.match(source, /r: finite\(star\.r, star\.major \? 0\.9 : 0\.08\)/);
});

test('fallback star adapter distinguishes seed and remote fallback sources', () => {
  assert.match(source, /source: fromRemote\.length > 0 \? "fallback" : "seed"/);
});
