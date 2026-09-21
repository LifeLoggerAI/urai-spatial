import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync(new URL('../src/components/lifemap/LifeMapProductionWorld.tsx', import.meta.url), 'utf8');

test('current Memory Star geometry is stellar and retired geological membrane geometry cannot re-enter runtime', () => {
  assert.match(source, /function AuthoredMemoryStar\(/);
  assert.match(source, /name="memory-star-photosphere"/);
  assert.match(source, /name="memory-star-inner-corona"/);
  assert.match(source, /name="memory-star-outer-corona"/);
  assert.match(source, /visualAuthority: "stellar-body-not-geology"/);
  assert.match(source, /<sphereGeometry args=\{\[0\.58, 64, 48\]\} \/>/);
  assert.doesNotMatch(source, /function memoryMembrane\(/);
  assert.doesNotMatch(source, /function memoryHeartGeometry\(/);
  assert.doesNotMatch(source, /function memoryFilamentGeometry\(/);
  assert.doesNotMatch(source, /life-map-weathered-memory-outcrop-/);
});
