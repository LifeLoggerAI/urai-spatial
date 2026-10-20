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
  callable('getPossibleFuture') + '\n' + callable('getPossibleFutureCouncilBundle'),
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
  branches = new Map([
    ['br_stale', { label: 'Retired', summary: 'MUST NOT LEAK' }],
    ['br_current_one', { label: 'First', summary: 'Authorized first' }],
    ['br_current_two', { label: 'Second', summary: 'Authorized second' }],
  ]),
} = {}) {
  const reads = []
  const snapshot = (id, value) => ({ id, exists: value !== undefined && value !== null, data: () => value })
  const ref = {
    get: async () => snapshot('scn_synthetic', scenario),
    collection(name) {
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
  })
  const invoke = (name, data = {}) =>
    exports[name]({ scenarioId: 'scn_synthetic', ...data }, { auth: { uid: 'owner-synthetic' } })
  return { invoke, reads }
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
