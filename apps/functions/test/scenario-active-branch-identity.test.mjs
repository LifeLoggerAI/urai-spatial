import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

// Execute the original source callables, not copied stand-ins. This keeps a
// fail-closed regression for retired branches and discarded Possible Futures.
const source = fs.readFileSync(new URL('../src/scenarioOperations.ts', import.meta.url), 'utf8')
function callable(name) {
  const start = source.indexOf('export const ' + name + ' = functions.https.onCall(')
  assert.ok(start >= 0, name + ' must exist in original Functions source')
  const next = source.indexOf('\nexport const ', start + 1)
  assert.ok(next > start, name + ' must have a following callable')
  return source.slice(start, next)
}
const compiled = ts.transpileModule(
  callable('getPossibleFuture') + '\n' + callable('getPossibleFutureCouncilBundle') + '\n' + callable('comparePossibleFutureBranches'),
  { fileName: 'scenarioOperations.ts', reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
)
assert.deepEqual(compiled.diagnostics ?? [], [], 'Original scenario readers must transpile')

class HttpsError extends Error {
  constructor(code, message) { super(message); this.code = code }
}

function harness({
  scenario = {
    ownerId: 'owner-synthetic', status: 'ready', question: 'What if?',
    branchIds: ['br_current_two', 'br_current_one'], activeBranchId: 'br_current_two',
  },
  scenarioOnTransaction = null,
  branches = new Map([
    ['br_stale', { ownerId: 'owner-synthetic', label: 'Retired', summary: 'MUST NOT LEAK' }],
    ['br_current_one', { ownerId: 'owner-synthetic', label: 'First', summary: 'Authorized first' }],
    ['br_current_two', { ownerId: 'owner-synthetic', label: 'Second', summary: 'Authorized second' }],
  ]),
} = {}) {
  const reads = [], writes = []
  const snapshot = (id, value) => ({ id, exists: value !== undefined && value !== null, data: () => value })
  const ref = {
    get: async () => snapshot('scn_synthetic', scenario),
    collection(name) {
      if (name === 'comparisons') return { doc: (id) => ({create: async value => {writes.push({id,value})}}) }
      if (name === 'basis') return { doc(id) {
        assert.equal(id, 'current')
        return { get: async () => snapshot(id, { evidenceRefs: [], assumptionOnly: true }) }
      } }
      assert.equal(name, 'branches')
      return {
        limit() { throw new Error('Unbounded branch collection scan is forbidden') },
        doc(id) { reads.push(id); return { get: async () => snapshot(id, branches.get(id)) } },
      }
    },
  }
  const exports = {}
  vm.runInNewContext(compiled.outputText, {
    exports, Promise, Set,
    functions: { https: { onCall: (fn) => fn, HttpsError } },
    uid: (context) => context.auth.uid,
    ensureScenarioId: (value) => { assert.equal(value, 'scn_synthetic'); return value },
    scenarioRef: (ownerId, scenarioId) => {
      assert.equal(ownerId, 'owner-synthetic')
      assert.equal(scenarioId, 'scn_synthetic')
      return ref
    },
    safeContextId: (value) => typeof value === 'string' && /^[A-Za-z0-9:_-]{1,160}$/.test(value) ? value : '',
    asStringArray: (value, max = 64) => Array.isArray(value)
      ? value.filter(item => typeof item === 'string' && item.length > 0).slice(0, max) : [],
    BRANCH_LIMIT: 3,
    operationId: (value) => value,
    db: { runTransaction: async (fn) => {
      if (scenarioOnTransaction) scenario = scenarioOnTransaction
      return fn({
        get: async (ref) => ref.get(),
        create: (ref, value) => writes.push({id: ref.id, value}),
      })
    } },
    opaque: () => 'cmp_synthetic',
    fv: {serverTimestamp: () => 'timestamp-synthetic'},
  })
  const invoke = (name, data = {}) =>
    exports[name]({ scenarioId: 'scn_synthetic', ...data }, { auth: { uid: 'owner-synthetic' } })
  return { invoke, reads, writes }
}

test('owner scenario returns current branch IDs in stored order, never stale query-order documents', async () => {
  const h = harness()
  const result = await h.invoke('getPossibleFuture')
  assert.deepEqual(Array.from(result.branches, branch => branch.summary),
    ['Authorized second', 'Authorized first'])
  assert.deepEqual(h.reads, ['br_current_two', 'br_current_one'])
})

test('Council chooses the scenario active branch even when retired branches exist', async () => {
  const h = harness()
  const result = await h.invoke('getPossibleFutureCouncilBundle')
  assert.equal(result.branchId, 'br_current_two')
  assert.equal(result.branchSummary, 'Authorized second')
  assert.deepEqual(h.reads, ['br_current_two', 'br_current_one'])
})

test('Council denies a plausible but retired requested branch', async () => {
  const h = harness()
  await assert.rejects(h.invoke('getPossibleFutureCouncilBundle', { branchId: 'br_stale' }),
    err => err.code === 'not-found')
  assert.deepEqual(h.reads, [])
})

test('discarded futures cannot reenter a Council scene', async () => {
  const h = harness({ scenario: {
    ownerId: 'owner-synthetic', status: 'discarded', question: 'Discarded',
    branchIds: ['br_current_one'], activeBranchId: 'br_current_one',
  } })
  await assert.rejects(h.invoke('getPossibleFutureCouncilBundle'),
    err => err.code === 'not-found')
  assert.deepEqual(h.reads, [])
})

test('missing canonical branch is an integrity failure, not a fallback to an orphan', async () => {
  const h = harness({ branches: new Map([['br_stale', { label: 'Retired', summary: 'MUST NOT LEAK' }]]) })
  await assert.rejects(h.invoke('getPossibleFuture'),
    err => err.code === 'failed-precondition' && err.message === 'SCENARIO_ACTIVE_BRANCH_MISSING')
})

test('comparison only accepts canonical active branches, never retired ones', async () => {
  const h = harness()
  await assert.rejects(h.invoke('comparePossibleFutureBranches', {
    operationId: 'synthetic-operation', branchIds: ['br_stale', 'br_current_one'],
  }), err => err.code === 'not-found' || err.code === 'permission-denied')
  assert.deepEqual(h.reads, [])
  assert.deepEqual(h.writes, [])
})

test('Council fails closed if activeBranchId no longer exists in canonical list', async () => {
  const h = harness({ scenario: {ownerId: 'owner-synthetic', status: 'ready',
    question: 'What if?', branchIds: ['br_current_one'], activeBranchId: 'br_stale'} })
  await assert.rejects(h.invoke('getPossibleFutureCouncilBundle'),
    err => err.code === 'failed-precondition')
})

test('comparison of two distinct current branches still works', async () => {
  const h = harness()
  const result = await h.invoke('comparePossibleFutureBranches', {
    operationId: 'synthetic-operation', branchIds: ['br_current_two', 'br_current_one'],
  })
  assert.equal(result.comparisonId, 'cmp_synthetic')
  assert.equal(h.writes.length, 1)
  assert.deepEqual(h.reads, ['br_current_two', 'br_current_one'])
})

test('discarded scenario cannot be compared into new active decision', async () => {
  const h = harness({ scenario: {ownerId: 'owner-synthetic', status: 'discarded',
    question: 'What if?', branchIds: ['br_current_two', 'br_current_one'],activeBranchId:'br_current_two'} })
  await assert.rejects(h.invoke('comparePossibleFutureBranches', {
    operationId: 'synthetic-operation',branchIds: ['br_current_two','br_current_one']
  }), err => err.code === 'not-found')
  assert.deepEqual(h.writes, [])
})

test('comparison cannot select one identical branch twice', async () => {
  const h = harness()
  await assert.rejects(h.invoke('comparePossibleFutureBranches', {
    operationId: 'synthetic-operation',branchIds: ['br_current_one', 'br_current_one']
  }), err => err.code === 'invalid-argument')
  assert.deepEqual(h.writes, [])
})

test('comparison rejects a branch document belonging to another owner, even under the owner path', async () => {
  const h = harness({ branches: new Map([
    ['br_current_one', {ownerId:'owner-synthetic',summary:'Owned'}],
    ['br_current_two', {ownerId:'foreign-owner',summary:'NOT ALLOWED'}],
  ]) })
  await assert.rejects(h.invoke('comparePossibleFutureBranches', {
    operationId: 'synthetic-operation',branchIds:['br_current_one','br_current_two'],
  }),err=>err.code==='not-found')
  assert.deepEqual(h.writes, [])
})

test('comparison denies unknown scenario regardless of valid branch records', async () => {
  const h = harness({scenario: null})
  await assert.rejects(h.invoke('comparePossibleFutureBranches', {
    operationId:'synthetic-operation',branchIds:['br_current_one','br_current_two'],
  }),err=>err.code==='not-found')
  assert.deepEqual(h.writes, [])
})

test('transaction rechecks discard that happened after request setup, before comparison commit', async () => {
  const h = harness({scenarioOnTransaction: {ownerId:'owner-synthetic',status:'discarded',
    branchIds:['br_current_two','br_current_one'],activeBranchId:'br_current_two'}})
  await assert.rejects(h.invoke('comparePossibleFutureBranches', {
    operationId:'synthetic-operation',branchIds:['br_current_two','br_current_one'],
  }),err=>err.code==='not-found')
  assert.deepEqual(h.writes, [])
})

test('comparison refuses over-limit and invalid branch selectors before Firestore read', async () => {
  for (const branchIds of [
    ['br_current_one','br_current_two','br_three','br_four'],
    ['br_current_one','bad/path'],
    ['br_current_one',null],
  ]) {
    const h = harness()
    await assert.rejects(h.invoke('comparePossibleFutureBranches', {
      operationId:'synthetic-operation',branchIds,
    }),err=>err.code==='invalid-argument')
    assert.deepEqual(h.reads, [])
    assert.deepEqual(h.writes, [])
  }
})

test('direct owner scenario read denies a mismatched stored owner', async () => {
  const h = harness({scenario: {ownerId: 'foreign-owner', status: 'ready', question: 'Foreign',
    branchIds: ['br_current_one'], activeBranchId: 'br_current_one'}})
  await assert.rejects(h.invoke('getPossibleFuture'), err => err.code === 'not-found')
  assert.deepEqual(h.reads, [])
})
test('Council denies a mismatched stored scenario owner', async () => {
  const h = harness({scenario: {ownerId: 'foreign-owner', status: 'ready', question: 'Foreign',
    branchIds: ['br_current_one'], activeBranchId: 'br_current_one'}})
  await assert.rejects(h.invoke('getPossibleFutureCouncilBundle'), err => err.code === 'not-found')
  assert.deepEqual(h.reads, [])
})
test('Council rejects a foreign-owned branch document even within owner namespace', async () => {
  const h = harness({branches:new Map([
    ['br_current_one', {ownerId:'owner-synthetic',summary:'Owned'}],
    ['br_current_two', {ownerId:'foreign-owner',summary:'NOT ALLOWED'}],
  ])})
  await assert.rejects(h.invoke('getPossibleFutureCouncilBundle'),err=>err.code==='failed-precondition')
})
test('direct scenario read denies a discarded scenario before exposing retained branches', async () => {
  const h = harness({ scenario: {ownerId:'owner-synthetic',status:'discarded',question:'Discarded',
    branchIds:['br_current_one'],activeBranchId:'br_current_one'}})
  await assert.rejects(h.invoke('getPossibleFuture'),err=>err.code==='not-found')
  assert.deepEqual(h.reads, [])
})
test('direct scenario read denies a mismatched owner branch and never publishes media graph', async () => {
  const h = harness({branches:new Map([
    ['br_current_one',{ownerId:'foreign-owner',summary:'NOT ALLOWED'}],
    ['br_current_two',{ownerId:'owner-synthetic',summary:'Owned'}],
  ])})
  await assert.rejects(h.invoke('getPossibleFuture'),err=>err.code==='failed-precondition')
})
