import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync(new URL('../src/spatial/home/explainHomeWorldState.ts', import.meta.url), 'utf8');
const banned = ['depressed', 'anxious', 'anxiety', 'disorder', 'diagnosis', 'manic', 'bipolar', 'PTSD', 'suicidal'];

test('includes derived patterns, not raw private media language', () => {
  assert.match(source, /derived patterns, not raw private media/);
});

test('privacy rawSignalsStored is always false', () => {
  assert.match(source, /rawSignalsStored:\s*false/);
});

test('privacy usedRawAudio is always false', () => {
  assert.match(source, /usedRawAudio:\s*false/);
});

test('no banned clinical language appears in explainability copy', () => {
  for (const word of banned) assert.equal(source.toLowerCase().includes(word.toLowerCase()), false, word);
});

test('contributors are bucketed and rounded instead of raw payloads', () => {
  assert.match(source, /scoreBucket/);
  assert.doesNotMatch(source, /raw audio|contact names|lat\/lng|message bodies/i);
});

test('low confidence states knowledge limits', () => {
  assert.match(source, /still gathering signal/);
  assert.match(source, /limit certainty/);
});
