import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
const ts = createRequire(import.meta.url)('typescript')
const source = fs.readFileSync(new URL('../src/scenarioOperations.ts', import.meta.url), 'utf8')
const helperSource = fs.readFileSync(new URL('../src/scenarioOwnerAuthority.ts', import.meta.url), 'utf8')
const helperTs = ts.transpileModule(helperSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, reportDiagnostics: true })
assert.deepEqual(helperTs.diagnostics ?? [], [])
const helperExports = {}
new Function('exports', helperTs.outputText)(helperExports)
const { scenarioOwnerAuthorityDecision } = helperExports
const segment = (a, b) => {
  const i = source.indexOf(a), j = source.indexOf(b, i + 1)
  assert.ok(i >= 0 && j > i, 'Callable boundary missing: ' + a)
  return source.slice(i, j)
}
const body = [
  segment('async function requireCurrentScenarioOwner', source.includes('function ensureScenarioId') ? 'function ensureScenarioId' : 'export const getPossibleFuture ='),
  segment('export const getPossibleFuture =', 'export const getPossibleFutureCouncilBundle ='),
  segment('export const getPossibleFutureCouncilBundle =', 'export const savePossibleFuture ='),
].join('\n')
const compiled = ts.transpileModule(body, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, reportDiagnostics: true })
assert.deepEqual(compiled.diagnostics ?? [], [])
class HttpsError extends Error { constructor(code, message) { super(message); this.code = code } }
const sid = 'scn_AAAAAAAAAAAA', bid = 'br_BBBBBBBBBBBB'
const path = 'users/owner/scenarios/' + sid
const base = {
  'users/owner': { accountStatus: 'active' },
  'users/owner/privacyRuntime/exportAuthority': { pendingDeletions: {} },
  [path]: { ownerId: 'owner', status: 'ready', question: 'What if?', branchIds: [bid], activeBranchId: bid },
  [path + '/basis/current']: { assumptionOnly: true, evidenceRefs: [] },
  [path + '/branches/' + bid]: { ownerId: 'owner', id: bid, label: 'Choice', summary: 'Unverified possibility' },
}
function runtime(changes = {}) {
  const rows = { ...base, ...changes }, reads = []
  const ref = p => ({ path: p, collection: name => ({ doc: id => ref(p + '/' + name + '/' + id) }) })
  const db = { doc: ref, runTransaction: f => f({ get: async r => {
    reads.push(r.path)
    const data = rows[r.path]
    return { id: r.path.split('/').at(-1), exists: data !== undefined, data: () => data, get: k => data?.[k] }
  } }) }
  const guard = (value, re) => { if (typeof value !== 'string' || !re.test(value)) throw new HttpsError('invalid-argument', 'Invalid ID'); return value }
  const exports = {}
  new Function('db', 'functions', 'uid', 'ensureScenarioId', 'scenarioRef', 'asStringArray', 'safeContextId', 'BRANCH_LIMIT', 'scenarioOwnerAuthorityDecision', 'exports', compiled.outputText)(
    db, { https: { onCall: f => f, HttpsError } },
    context => { if (!context.auth?.uid) throw new HttpsError('unauthenticated', 'Sign-in required'); return context.auth.uid },
    value => guard(value, /^scn_[A-Za-z0-9_-]{12,96}$/),
    (owner, id) => ref('users/' + owner + '/scenarios/' + id),
    (v, count = 64) => Array.isArray(v) ? v.filter(s => typeof s === 'string').slice(0, count) : [],
    value => /^[A-Za-z0-9:_-]{1,160}$/.test(String(value ?? '')) ? String(value) : '',
    3, scenarioOwnerAuthorityDecision, exports)
  return { ...exports, reads }
}
const input = { scenarioId: sid }, signed = { auth: { uid: 'owner' } }
test('current account returns current scenario and hypothetical Council branch', async () => {
  const r = runtime()
  assert.equal((await r.getPossibleFuture(input, signed)).branches[0].id, bid)
  const council = await r.getPossibleFutureCouncilBundle(input, signed)
  assert.equal(council.truthKind, 'scenario')
  assert.match(council.disclosure, /Not a memory, prediction/)
  assert.ok(r.reads.includes('users/owner/privacyRuntime/exportAuthority'))
})
test('deleted accounts and pending erasure deny both scenario read paths', async () => {
  for (const change of [
    { 'users/owner': { accountStatus: 'deleting' } },
    { 'privacyDeletionTombstones/owner': { deleted: true } },
    { 'users/owner/privacyRuntime/exportAuthority': { pendingDeletions: { erase: true } } },
  ]) {
    const r = runtime(change)
    for (const fn of [r.getPossibleFuture, r.getPossibleFutureCouncilBundle])
      await assert.rejects(fn(input, signed), err => ['permission-denied', 'failed-precondition'].includes(err?.code))
  }
})
test('foreign owner and missing branch cannot be recalled', async () => {
  const foreign = runtime({ [path]: { ...base[path], ownerId: 'another' } })
  await assert.rejects(foreign.getPossibleFuture(input, signed), err => err.code === 'not-found')
  const missing = runtime({ [path + '/branches/' + bid]: undefined })
  await assert.rejects(missing.getPossibleFuture(input, signed), err => err.code === 'failed-precondition')
  await assert.rejects(missing.getPossibleFutureCouncilBundle(input, signed), err => err.code === 'failed-precondition')
})

test('malformed deletion-fence and non-boolean deleted flags fail closed for Scenario and Council recall', async () => {
  const invalid = [
    { 'users/owner/privacyRuntime/exportAuthority': { pendingDeletions: { erase: 'true' } } },
    { 'users/owner/privacyRuntime/exportAuthority': { pendingDeletions: { erase: 1 } } },
    { 'users/owner/privacyRuntime/exportAuthority': { pendingDeletions: { erase: null } } },
    { 'users/owner/privacyRuntime/exportAuthority': { pendingDeletions: [] } },
    { 'users/owner': { accountStatus: 'active', deleted: 'false' } },
  ]
  for (const change of invalid) {
    const r = runtime(change)
    for (const fn of [r.getPossibleFuture, r.getPossibleFutureCouncilBundle])
      await assert.rejects(fn(input, signed), e => ['permission-denied', 'failed-precondition'].includes(e.code))
  }
})
