import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { createRequire } from 'node:module'
const ts = createRequire(import.meta.url)('typescript')
const input = fs.readFileSync(new URL('../src/manualScenarioReceipt.ts', import.meta.url), 'utf8')
const out = ts.transpileModule(input, { compilerOptions: {
  module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022,
}, reportDiagnostics: true })
assert.deepEqual(out.diagnostics ?? [], [], 'Production helper must parse')
const { resolveManualBranchMutation: decide } = await import('data:text/javascript;charset=utf-8,' + encodeURIComponent(out.outputText))
const a = 'br_AAAAAAAAAAAA', b = 'br_BBBBBBBBBBBB'
const receipt = Object.freeze({
  kind: 'scenario-manual-branches', ownerId: 'owner', scenarioId: 'scn_CCCCCCCCCCCC',
  operationId: 'manual-operation-123456', requestHash: '1'.repeat(64), branchIds: [a, b],
})
const current = Object.freeze({
  ownerId: 'owner', scenarioId: receipt.scenarioId, operationId: receipt.operationId,
  requestHash: receipt.requestHash, scenarioStatus: 'ready',
  activeBranchIds: [a, b], receipt,
})
test('a new manual Scenario can accept one atomic branch write', () => {
  assert.deepEqual(decide({ ...current, receipt: null, scenarioStatus: 'awaiting-assumptions', activeBranchIds: [] }), { status: 'create' })
})
test('network retry of identical operation returns original branch IDs', () => {
  assert.deepEqual(decide(current), { status: 'repeat', branchIds: [a, b] })
})
test('retry after owner saves the Scenario still returns the original branches', () => {
  assert.deepEqual(decide({ ...current, scenarioStatus: 'saved' }), { status: 'repeat', branchIds: [a, b] })
})
test('one operation ID cannot authorize different branch text or basis revision', () => {
  assert.deepEqual(decide({ ...current, requestHash: '2'.repeat(64) }), { status: 'operation-conflict' })
})
test('one receipt cannot be replayed into another owner, scenario or operation', () => {
  for (const changes of [{ ownerId: 'another' }, { scenarioId: 'scn_DDDDDDDDDDDD' }, { operationId: 'manual-operation-222222' }]) {
    assert.equal(decide({ ...current, ...changes }).status, 'operation-conflict')
  }
})
test('a different operation cannot overwrite a ready Scenario', () => {
  assert.equal(decide({ ...current, receipt: null }).status, 'scenario-not-awaiting')
})
test('discarded or regressed Scenario refuses even a matching receipt', () => {
  for (const scenarioStatus of ['discarded', 'awaiting-assumptions', 'deleted']) {
    assert.equal(decide({ ...current, scenarioStatus }).status, 'receipt-stale')
  }
})
test('deleted, reordered, or replaced branch IDs invalidate a receipt', () => {
  for (const activeBranchIds of [[a], [b, a], ['br_DDDDDDDDDDDD', b]]) {
    assert.equal(decide({ ...current, activeBranchIds }).status, 'receipt-stale')
  }
})
test('fabricated, duplicated, or malformed receipt branch IDs fail closed', () => {
  for (const branchIds of [[a, a], [a, 'invalid'], [], [a,b,a,a]]) {
    assert.equal(decide({ ...current, receipt: { ...receipt, branchIds } }).status, 'receipt-stale')
  }
})
test('malformed or mismatched receipts never create a second set of branches', () => {
  for (const changed of [false, 42, {}, { ...receipt, kind: 'scenario-outcome' }]) {
    assert.equal(decide({ ...current, receipt: changed }).status, 'operation-conflict')
  }
})
