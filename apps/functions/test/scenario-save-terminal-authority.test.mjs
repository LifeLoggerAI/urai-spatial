import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import { createRequire } from 'node:module'
const localRequire = createRequire(import.meta.url)
const scenarioOwnerAuthorityDecision = localRequire('../lib/apps/functions/src/scenarioOwnerAuthority.js').scenarioOwnerAuthorityDecision
import ts from 'typescript'

// Compile the exact original callable, never a test-owned substitute.
const source = readFileSync(new URL('../src/scenarioOperations.ts', import.meta.url), 'utf8')
const start = source.indexOf('export const savePossibleFuture = functions.https.onCall(')
const end = source.indexOf('\nexport const discardPossibleFuture', start)
assert.ok(start >= 0 && end > start, 'original savePossibleFuture must remain available')
const ownerStart=source.indexOf('async function requireCurrentScenarioOwner(')
const ownerEnd=source.indexOf('\nfunction ensureScenarioId(', ownerStart)
assert.ok(ownerStart>=0&&ownerEnd>ownerStart,'Actual owner guard is required')
const compiled = ts.transpileModule(source.slice(ownerStart,ownerEnd) + '\n' + source.slice(start, end), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
})
assert.deepEqual(compiled.diagnostics ?? [], [])
class HttpsError extends Error { constructor(code, message) { super(message); this.code = code } }

function fixture({ exists = true, status = 'ready', storedOwner = 'owner-synthetic', txStatus } = {}) {
  const writes = [], reads = []
  const stored = { ownerId: storedOwner, status }
  const ref = {
    set(value) { writes.push({ kind:'merge-set', value }); Object.assign(stored, value); return Promise.resolve() },
    get() { reads.push('current'); return Promise.resolve({ exists, data: () => ({ ...stored, status: txStatus ?? stored.status }) }) },
  }
  const tx = {
    get: target => target.get(),
    update: (_target, value) => { writes.push({ kind: 'update', value }); Object.assign(stored, value) },
  }
  const exports = {}
  vm.runInNewContext(compiled.outputText, {
    exports, scenarioOwnerAuthorityDecision, functions: { https: { onCall: fn => fn, HttpsError } },
    uid: ctx => ctx.auth.uid,
    operationId: id => { assert.equal(id, 'operation_long_0001'); return id },
    ensureScenarioId: id => { assert.equal(id, 'scn_0123456789abcdef'); return id },
    scenarioRef: (ownerId, scenarioId) => {
      assert.equal(ownerId, 'owner-synthetic'); assert.equal(scenarioId, 'scn_0123456789abcdef'); return ref
    },
    db: { doc:location=>({get:async()=>({exists:location==='users/owner-synthetic',get:key=>key==='deleted'?false:key==='accountStatus'?'active':undefined})}),runTransaction: async fn => fn(tx) },
    fv: { serverTimestamp: () => 'TEST_TIME' },
  })
  return { invoke: () => exports.savePossibleFuture({ operationId:'operation_long_0001', scenarioId:'scn_0123456789abcdef' }, { auth: { uid:'owner-synthetic' } }), writes, reads, stored }
}

test('existing ready scenario can be saved with a read-before-update transaction', async () => {
  const h=fixture();const result=await h.invoke()
  assert.equal(result.status,'saved');assert.deepEqual(h.reads,['current']);assert.deepEqual(h.writes.map(w=>w.kind),['update'])
})
test('already saved current scenario remains safely idempotent', async()=>{
  const h=fixture({status:'saved'});const result=await h.invoke();assert.equal(result.status,'saved');assert.equal(h.stored.status,'saved');assert.equal(h.writes.length,1)
})
test('missing scenario must not be resurrected by a merge-set',async()=>{
  const h=fixture({exists:false});await assert.rejects(h.invoke(),e=>e.code==='not-found');assert.deepEqual(h.writes,[])
})
test('discarded future must not be revived by save',async()=>{
  const h=fixture({status:'discarded'});await assert.rejects(h.invoke(),e=>e.code==='not-found');assert.equal(h.stored.status,'discarded');assert.deepEqual(h.writes,[])
})
test('transaction reads a concurrent discard before deciding to save',async()=>{
  const h=fixture({status:'ready',txStatus:'discarded'});await assert.rejects(h.invoke(),e=>e.code==='not-found');assert.deepEqual(h.writes,[])
})
test('foreign-owner scenario stored at the current path must fail closed',async()=>{
  const h=fixture({storedOwner:'foreign-owner'});await assert.rejects(h.invoke(),e=>e.code==='not-found');assert.deepEqual(h.writes,[])
})
