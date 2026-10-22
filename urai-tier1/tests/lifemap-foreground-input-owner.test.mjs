import test from 'node:test';
import assert from 'node:assert/strict';
import { LIFE_MAP_FOREGROUND_INPUT_SELECTOR, lifeMapForegroundControlsOwnKeys } from '../src/components/lifemap/lifeMapInputOwnership.mjs';

const fakeDocument = (selectors) => ({querySelector: (selector) => selectors.some(value => selector.split(',').map(s=>s.trim()).includes(value)) ? {role:'open-panel'} : null});

test('Chalk panel owns keyboard while opened in Life Map', () => {
  assert.equal(lifeMapForegroundControlsOwnKeys(fakeDocument(['[data-urai-chalk-presence]'])), true);
});
test('ADAM panel retains its preexisting keyboard authority', () => {
  assert.equal(lifeMapForegroundControlsOwnKeys(fakeDocument(['[data-urai-adam-presence]'])), true);
});
test('closed Chalk launcher never blocks exploration', () => {
  assert.equal(lifeMapForegroundControlsOwnKeys(fakeDocument(['[data-urai-chalk-launcher]'])), false);
});
test('ordinary empty world leaves movement available', () => {
  assert.equal(lifeMapForegroundControlsOwnKeys(fakeDocument([])), false);
});
test('malformed and absent document objects do not grant input authority', () => {
  assert.equal(lifeMapForegroundControlsOwnKeys(null), false);
  assert.equal(lifeMapForegroundControlsOwnKeys(undefined), false);
  assert.equal(lifeMapForegroundControlsOwnKeys({querySelector: null}), false);
});
test('DOM query failure fails closed', () => {
  assert.equal(lifeMapForegroundControlsOwnKeys({querySelector(){throw new Error('DOM unavailable')}}),true);
});
test('only the two established active-panel selectors are used', () => {
  assert.equal(LIFE_MAP_FOREGROUND_INPUT_SELECTOR,'[data-urai-adam-presence], [data-urai-chalk-presence]');
});
