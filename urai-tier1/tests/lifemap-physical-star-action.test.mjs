import assert from 'node:assert/strict';
import { test } from 'node:test';
import { lifeMapPhysicalReplayAllowed, lifeMapPhysicalStarAction } from '../src/components/lifemap/lifeMapPhysicalStarAction.mjs';

const canonical = () => ({ id: 'star-1', authorizedMemory: true, locked: false, replayAvailable: true, memoryId: 'memory-1', replayManifestId: 'manifest-1' });
test('first physical star click selects without replay', () => { assert.equal(lifeMapPhysicalStarAction('star-1', null, 'overview', true), 'select'); });
test('clicking a different star while at arrival starts another approach', () => { assert.equal(lifeMapPhysicalStarAction('star-2', 'star-1', 'arrival', true), 'select'); });
test('same-star repeat during departure, travel or approach does nothing', () => {
  for (const phase of ['overview', 'departure', 'travel', 'approach']) assert.equal(lifeMapPhysicalStarAction('star-1', 'star-1', phase, true), 'ignore');
});
test('same selected star enters Replay only at authorized arrival', () => {
  const node = canonical();
  assert.equal(lifeMapPhysicalStarAction(node.id, node.id, 'arrival', lifeMapPhysicalReplayAllowed(node, 'private')), 'replay');
  assert.equal(lifeMapPhysicalStarAction(node.id, node.id, 'arrival', false), 'ignore');
});
test('a hidden, locked or unreplayable star cannot open private Replay', () => {
  for (const variant of [{ locked: true }, { replayAvailable: false }, { id: '' }, { privacyLevel: 'hidden' }, { privacy: 'hidden' }]) assert.equal(lifeMapPhysicalReplayAllowed({ ...canonical(), ...variant }, 'private'), false);
});
test('private event metadata alone is never Replay authorization', () => {
  for (const variant of [{ authorizedMemory: false }, { authorizedMemory: undefined }, { memoryId: undefined }, { replayManifestId: undefined }, { replayManifestId: '  ' }]) assert.equal(lifeMapPhysicalReplayAllowed({ ...canonical(), ...variant }, 'private'), false);
});
test('unavailable, signed-out, error and empty source modes cannot authorize Replay', () => {
  for (const sourceMode of ['signed-out', 'unavailable', 'error', 'empty', 'other']) assert.equal(lifeMapPhysicalReplayAllowed(canonical(), sourceMode), false);
});
test('explicit-demo Replay remains disclosed and never confers private permission', () => {
  const seed = { id: 'demo-1', replayAvailable: true, locked: false };
  assert.equal(lifeMapPhysicalReplayAllowed(seed, 'explicit-demo'), true);
  assert.equal(lifeMapPhysicalReplayAllowed(seed, 'private'), false);
});
test('missing or invalid physical click identity fails closed', () => {
  for (const id of [null, '', undefined, 42]) assert.equal(lifeMapPhysicalStarAction(id, 'star-1', 'arrival', true), 'ignore');
});
test('nonboolean replay flag cannot authorize Replay', () => {
  assert.equal(lifeMapPhysicalStarAction('star-1', 'star-1', 'arrival', 'yes'), 'ignore');
  assert.equal(lifeMapPhysicalStarAction('star-1', 'star-1', 'arrival', 1), 'ignore');
});
test('revocation immediately denies replay on the next physical click', () => {
  const node = canonical();
  assert.equal(lifeMapPhysicalReplayAllowed(node, 'private'), true);
  node.authorizedMemory = false;
  assert.equal(lifeMapPhysicalReplayAllowed(node, 'private'), false);
  assert.equal(lifeMapPhysicalStarAction(node.id, node.id, 'arrival', lifeMapPhysicalReplayAllowed(node, 'private')), 'ignore');
});
test('selection and replay intent do not mutate source authority objects', () => {
  const original = Object.freeze(canonical());
  assert.equal(lifeMapPhysicalReplayAllowed(original, 'private'), true);
  assert.equal(lifeMapPhysicalStarAction(original.id, null, 'overview', true), 'select');
  assert.deepEqual(original, canonical());
});

test('hidden privacy blocks explicit-demo Replay and revokes already selected private star', () => {
  const demo = { id: 'demo-1', replayAvailable: true, locked: false };
  assert.equal(lifeMapPhysicalReplayAllowed({ ...demo, privacyLevel: 'hidden' }, 'explicit-demo'), false);
  const node = canonical();
  assert.equal(lifeMapPhysicalReplayAllowed(node, 'private'), true);
  node.privacyLevel = 'hidden';
  assert.equal(lifeMapPhysicalReplayAllowed(node, 'private'), false);
  assert.equal(lifeMapPhysicalStarAction(node.id, node.id, 'arrival', lifeMapPhysicalReplayAllowed(node, 'private')), 'ignore');
});
