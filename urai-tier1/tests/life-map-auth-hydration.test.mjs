import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const file = new URL('../src/spatial/lifemap/lifeMapAuthGate.ts', import.meta.url);
const source = readFileSync(file, 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
} }).outputText;
const exported = {};
new Function('exports', 'require', compiled)(exported, require);
const { subscribeLifeMapAuth } = exported;

function fakeClock() {
  const timers = new Map();
  let next = 1;
  return {
    schedule: (callback, delay) => { const id = next++; timers.set(id, { callback, delay }); return id; },
    cancel: id => { timers.delete(id); },
    fire: () => { for (const [id, item] of [...timers]) { timers.delete(id); item.callback(); } },
    get delays() { return [...timers.values()].map(t => t.delay); },
  };
}

test('missing initial auth callback falls back to signed-out without private data', () => {
  const clock = fakeClock(), results = [];
  const stop = subscribeLifeMapAuth({ listen: () => () => {}, onResolved: x => results.push(x), ...clock });
  assert.deepEqual(clock.delays, [12_000]);
  assert.deepEqual(results, []);
  clock.fire();
  assert.deepEqual(results, [null]);
  stop();
});

test('synchronous Firebase getAuth/listener error resolves signed-out', () => {
  const clock = fakeClock(), results = [];
  const stop = subscribeLifeMapAuth({ listen: () => { throw new Error('offline') }, onResolved: x => results.push(x), ...clock });
  assert.deepEqual(results, [null]);
  assert.deepEqual(clock.delays, []);
  stop();
});

test('asynchronous auth error resolves signed-out and clears watchdog', () => {
  const clock = fakeClock(), results = [];
  let onError;
  const stop = subscribeLifeMapAuth({ listen: (_, e) => { onError = e; return () => {} }, onResolved: x => results.push(x), ...clock });
  onError();
  clock.fire();
  assert.deepEqual(results, [null]);
  stop();
});

test('verified current-user identity wins before timeout and later logout denies owner access', () => {
  const clock = fakeClock(), results = [];
  let onIdentity;
  const stop = subscribeLifeMapAuth({listen: cb => {onIdentity = cb; return () => {}}, onResolved: x => results.push(x), ...clock});
  onIdentity('owner-123');
  clock.fire();
  assert.deepEqual(results, ['owner-123']);
  onIdentity(null);
  assert.deepEqual(results, ['owner-123', null]);
  stop();
});

test('late verified identity can recover after the initial signed-out threshold', () => {
  const clock = fakeClock(), results = [];
  let onIdentity;
  const stop = subscribeLifeMapAuth({listen: cb => {onIdentity = cb; return () => {}}, onResolved: x => results.push(x), ...clock});
  clock.fire();
  assert.deepEqual(results, [null]);
  onIdentity('verified-late-owner');
  assert.deepEqual(results, [null, 'verified-late-owner']);
  stop();
});

test('cleanup prevents delayed auth callbacks, timeouts and account leaks', () => {
  const clock = fakeClock(), results = [];
  let onIdentity, onError, cleaned = 0;
  const stop = subscribeLifeMapAuth({ listen: (cb, err) => {onIdentity = cb; onError = err; return () => {cleaned++}}, onResolved: x => results.push(x), ...clock });
  stop();
  clock.fire();
  onIdentity('stale-private-owner');
  onError();
  assert.deepEqual(results, []);
  assert.equal(cleaned, 1);
});

test('error after verified account change still downgrades to signed-out', () => {
  const clock = fakeClock(), results = [];
  let onIdentity, onError;
  const stop = subscribeLifeMapAuth({listen: (cb,e) => {onIdentity=cb;onError=e;return () =>{}},onResolved: x=>results.push(x),...clock});
  onIdentity('owner');
  onError();
  assert.deepEqual(results, ['owner', null]);
  stop();
});


test('original Life Map consumer uses bounded Firebase authority and does not bypass demo/privacy gate', () => {
  const map = readFileSync(new URL('../src/spatial/lifemap/SpatialLifeMapCanonical.tsx', import.meta.url), 'utf8');
  assert.match(map, /return subscribeLifeMapAuth\(\{/);
  assert.match(map, /listen:\s*\(onIdentity, onFailure\)\s*=>\s*\{/);
  assert.match(map, /const auth = getUraiAuth\(\)/);
  assert.match(map, /onAuthStateChanged\(auth, user\s*=>/);
  assert.match(map, /auth\.currentUser === user \? user\.uid : null/);
  assert.doesNotMatch(map, /onIdentity\(user\?\.uid \?\? null\)/);
  assert.match(map, /onResolved:\s*userId\s*=>/);
  assert.match(map, /setMode\(userId \? "private" : "signed-out"\)/);
  assert.match(map, /data-private-memory-mounted=\{mode === "signed-out" \? "false"/);
  assert.match(map, /if \(current.get\("demo"\) === "1"\)/);
});


// Exercise the real callback extracted from the source component rather than
// asserting its presence by a string match. Firebase and React remain mocked.
function canonicalLifeMapActorFixture() {
  const source = readFileSync(new URL('../src/spatial/lifemap/SpatialLifeMapCanonical.tsx', import.meta.url), 'utf8')
  const callback = source.match(/listen:\s*\(onIdentity, onFailure\)\s*=>\s*\{[\s\S]*?\n\s*\},/)
  assert.ok(callback, 'Canonical Life Map auth listener missing')
  const compileListener = new Function('getUraiAuth', 'onAuthStateChanged',
    'return ({' + callback[0] + '}).listen')
  const actor = { uid: 'owner-A' }
  const auth = { currentUser: actor }
  const values = []
  let emit
  const listener = compileListener(
    () => auth,
    (actualAuth, callbackFn) => {
      assert.equal(actualAuth, auth)
      emit = callbackFn
      return () => { emit = null }
    },
  )
  const cleanup = listener(uid => values.push(uid), () => values.push('ERROR'))
  return { actor, auth, values, notify: user => emit(user), cleanup }
}

test('real Life Map Auth callback admits the exact current Firebase user', () => {
  const f = canonicalLifeMapActorFixture()
  try {
    f.notify(f.actor)
    assert.deepEqual(f.values, ['owner-A'])
  } finally { f.cleanup() }
})

test('real Life Map Auth callback rejects a replaced different-UID actor', () => {
  const f = canonicalLifeMapActorFixture()
  try {
    const oldActor = f.actor
    f.auth.currentUser = { uid: 'owner-B' }
    f.notify(oldActor)
    assert.deepEqual(f.values, [null])
    f.notify(f.auth.currentUser)
    assert.deepEqual(f.values, [null, 'owner-B'])
  } finally { f.cleanup() }
})

test('real Life Map Auth callback rejects stale actor after same-UID rotation', () => {
  const f = canonicalLifeMapActorFixture()
  try {
    const oldActor = f.actor
    f.auth.currentUser = { uid: 'owner-A' }
    f.notify(oldActor)
    assert.deepEqual(f.values, [null])
    f.notify(f.auth.currentUser)
    assert.deepEqual(f.values, [null, 'owner-A'])
  } finally { f.cleanup() }
})

test('real Life Map Auth callback revokes its private owner on sign-out', () => {
  const f = canonicalLifeMapActorFixture()
  try {
    f.notify(f.actor)
    f.auth.currentUser = null
    f.notify(null)
    assert.deepEqual(f.values, ['owner-A', null])
  } finally { f.cleanup() }
})

test('terminal Firebase listener error cannot revive a stale private owner', () => {
  const clock = fakeClock(), results = [];
  let onIdentity, onError;
  const stop = subscribeLifeMapAuth({
    listen: (identity, error) => { onIdentity = identity; onError = error; return () => {}; },
    onResolved: value => results.push(value), ...clock,
  });
  onIdentity('owner-A');
  onError();
  onIdentity('owner-A');
  assert.deepEqual(results, ['owner-A', null]);
  stop();
});

test('initial listener error blocks a late owner and repeated error notifications', () => {
  const clock = fakeClock(), results = [];
  let onIdentity, onError;
  const stop = subscribeLifeMapAuth({
    listen: (identity, error) => { onIdentity = identity; onError = error; return () => {}; },
    onResolved: value => results.push(value), ...clock,
  });
  onError();
  onIdentity('owner-B');
  onError();
  assert.deepEqual(results, [null]);
  stop();
});
