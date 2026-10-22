import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const ts = require('typescript')
const source = fs.readFileSync(new URL('../src/providerOwnerAuthority.ts', import.meta.url), 'utf8')
const built = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
})
assert.deepEqual(built.diagnostics ?? [], [], 'Authority module must transpile.')
const { providerOwnerAuthorityDecision: decide } = await import('data:text/javascript;charset=utf-8,' + encodeURIComponent(built.outputText))
const base = Object.freeze({
  ownerExists: true, ownerDeleted: false, accountStatus: 'active',
  tombstoneExists: false, fenceExists: false, pendingDeletions: undefined,
  ownerPrivacyRevision: 7, canonicalPolicyRevision: 7,
})
test('current owner and matching revision may proceed to separate model checks', () => {
  assert.equal(decide(base), 'active')
})
test('deleted or missing account fails closed', () => {
  assert.equal(decide({ ...base, ownerExists: false }), 'inactive-owner')
  assert.equal(decide({ ...base, ownerDeleted: true }), 'inactive-owner')
  for (const status of ['deleting', 'deleted', 'disabled']) {
    assert.equal(decide({ ...base, accountStatus: status }), 'inactive-owner')
  }
})
test('account deletion tombstone prohibits provider authorization', () => {
  assert.equal(decide({ ...base, tombstoneExists: true }), 'inactive-owner')
})
test('pending deletion fence prevents new provider requests', () => {
  assert.equal(decide({ ...base, fenceExists: true, pendingDeletions: { job: true } }), 'deletion-pending')
  assert.equal(decide({ ...base, fenceExists: true, pendingDeletions: { old: false, next: true } }), 'deletion-pending')
})
test('corrupt deletion fence is rejected instead of silently opening it', () => {
  for (const pending of [null, undefined, [], 'unknown', { job: 'true' }, { job: 1 }]) {
    assert.equal(decide({ ...base, fenceExists: true, pendingDeletions: pending }), 'deletion-fence-invalid')
  }
})
test('completed deletion markers and empty fence permit independent consent evaluation', () => {
  assert.equal(decide({ ...base, fenceExists: true, pendingDeletions: {} }), 'active')
  assert.equal(decide({ ...base, fenceExists: true, pendingDeletions: { done: false } }), 'active')
})
test('stale and malformed privacy revision projections fail', () => {
  for (const revision of [6, 8, '7', NaN, -1]) {
    assert.equal(decide({ ...base, ownerPrivacyRevision: revision }), 'privacy-revision-mismatch')
  }
  assert.equal(decide({ ...base, canonicalPolicyRevision: -1 }), 'privacy-revision-mismatch')
})
test('legacy owner without projected revision is handled safely', () => {
  assert.equal(decide({ ...base, ownerPrivacyRevision: undefined }), 'active')
  assert.equal(decide({ ...base, ownerPrivacyRevision: null }), 'active')
})
