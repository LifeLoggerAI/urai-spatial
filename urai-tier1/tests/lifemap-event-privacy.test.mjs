import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeLifeMapEventPrivacy } from '../src/components/lifemap/lifeMapEventPrivacy.mjs';

const cases = [
  [{ privacyLevel: 'hidden' }, 'hidden'],
  [{ privacy: 'hidden' }, 'hidden'],
  [{ privacyLevel: 'private', privacy: 'hidden' }, 'hidden'],
  [{ privacyLevel: 'shareable', privacy: 'hidden' }, 'hidden'],
  [{ privacyLevel: 'hidden', privacy: 'shareable' }, 'hidden'],
  [{ privacyLevel: 'shareable' }, 'shareable'],
  [{ privacyLevel: 'private' }, 'private'],
  [{ privacy: 'shareable' }, 'private'],
  [{ privacyLevel: 'unrecognized', privacy: 'shareable' }, 'private'],
  [{}, 'private'],
  [null, 'private'],
];

test('current and legacy hidden event fields are both fail-closed', () => {
  for (const [value, expected] of cases) {
    assert.equal(normalizeLifeMapEventPrivacy(value), expected, JSON.stringify(value));
  }
});
test('legacy shareable alias cannot escalate privacy authority', () => {
  assert.equal(normalizeLifeMapEventPrivacy({ privacy:'shareable' }), 'private');
});
test('normalization is pure even for frozen Firestore-like objects', () => {
  const doc = Object.freeze({ privacyLevel:'shareable', privacy:'hidden', id:'sealed' });
  assert.equal(normalizeLifeMapEventPrivacy(doc), 'hidden');
  assert.equal(doc.privacyLevel,'shareable');
});
test('non-object or invalid values default to private', () => {
  for (const value of [undefined, null, '', false, 0, [], 'hidden']) {
    assert.equal(normalizeLifeMapEventPrivacy(value),'private');
  }
});
