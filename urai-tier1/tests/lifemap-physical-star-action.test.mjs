import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as navigation from '../src/components/lifemap/lifeMapPhysicalStarAction.mjs';
const { lifeMapPhysicalReplayAllowed, lifeMapPhysicalStarAction, lifeMapFocusAllowed, lifeMapVisibleRelatedNodes } = navigation;

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


test('Focus uses the same authorized private-memory and disclosed-demo boundary as Replay', () => {
  assert.equal(lifeMapFocusAllowed(canonical(), 'private'), true);
  assert.equal(lifeMapFocusAllowed({ id: 'demo-1', locked: false, replayAvailable: false }, 'explicit-demo'), true);
  assert.equal(lifeMapPhysicalReplayAllowed({ id: 'demo-1', locked: false, replayAvailable: false }, 'explicit-demo'), false);
});
test('Focus denies incomplete private memory grants or unsupported source modes', () => {
  for (const variant of [ { authorizedMemory: false }, { authorizedMemory: undefined }, { memoryId: undefined }, { memoryId: '   ' }, { replayManifestId: undefined }, { replayManifestId: '  ' } ]) {
    assert.equal(lifeMapFocusAllowed({ ...canonical(), ...variant }, 'private'), false);
  }
  for (const source of ['signed-out', 'error', 'unavailable', 'empty', 'other']) {
    assert.equal(lifeMapFocusAllowed(canonical(), source), false);
  }
});
test('Focus and Replay both deny hidden, locked, invalid-ID stars across private and disclosed demo', () => {
  const variants = [{ locked: true }, { privacyLevel: 'hidden' }, { privacy: 'hidden' }, { id: '' }, { id: '   ' }];
  for (const mode of ['private', 'explicit-demo']) {
    for (const variant of variants) {
      const value = { ...canonical(), ...variant };
      assert.equal(lifeMapFocusAllowed(value, mode), false);
      assert.equal(lifeMapPhysicalReplayAllowed(value, mode), false);
    }
  }
});
test('a revoked Focus memory loses navigation eligibility immediately', () => {
  const granted = canonical();
  assert.equal(lifeMapFocusAllowed(granted, 'private'), true);
  granted.authorizedMemory = false;
  assert.equal(lifeMapFocusAllowed(granted, 'private'), false);
  assert.equal(lifeMapPhysicalReplayAllowed(granted, 'private'), false);
});
test('Focus selection cannot mutate frozen node authority', () => {
  const immutable = Object.freeze(canonical());
  assert.equal(lifeMapFocusAllowed(immutable, 'private'), true);
  assert.deepEqual(immutable, canonical());
});
test('Focus and Replay fail closed without a node', () => {
  for (const mode of ['private', 'explicit-demo', 'signed-out']) {
    assert.equal(lifeMapFocusAllowed(null, mode), false);
    assert.equal(lifeMapPhysicalReplayAllowed(null, mode), false);
  }
});


test('related Memory Stars omit hidden nodes even when graph links reference them', () => {
  const selected = { id: 'star-a', privacyLevel: 'private', connectedTo: ['star-b', 'sealed-star'] };
  const candidates = [
    selected,
    { id: 'star-b', privacyLevel: 'private', connectedTo: [] },
    { id: 'sealed-star', privacyLevel: 'hidden', connectedTo: ['star-a'] },
    { id: 'unrelated', privacyLevel: 'shareable', connectedTo: [] },
  ];
  assert.deepEqual(lifeMapVisibleRelatedNodes(candidates, selected).map(n => n.id), ['star-b']);
});

test('related Memory Star filtering denies hidden selected nodes and preserves linked visible neighbors', () => {
  const selected = { id: 'star-a', privacyLevel: 'private', connectedTo: [] };
  const linked = { id: 'star-b', privacyLevel: 'shareable', connectedTo: ['star-a'] };
  const hiddenSelected = { ...selected, privacyLevel: 'hidden' };
  assert.deepEqual(lifeMapVisibleRelatedNodes([selected, linked], selected).map(n => n.id), ['star-b']);
  assert.deepEqual(lifeMapVisibleRelatedNodes([hiddenSelected, linked], hiddenSelected), []);
  assert.deepEqual(lifeMapVisibleRelatedNodes([linked], null), []);
  assert.deepEqual(lifeMapVisibleRelatedNodes([linked], undefined), []);
});
