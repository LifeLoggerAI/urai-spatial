import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import { createRequire } from 'node:module'
const ts = createRequire(import.meta.url)('typescript')
const source = fs.readFileSync(new URL('../src/providerOwnerAuthority.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
})
assert.deepEqual(compiled.diagnostics ?? [], [], 'Production source must parse')
const { providerOwnerAuthorityDecision: decide } = await import('data:text/javascript;charset=utf-8,' + encodeURIComponent(compiled.outputText))
const active = Object.freeze({
  ownerExists: true, ownerDeleted: false, accountStatus: 'active',
  tombstoneExists: false, fenceExists: false, pendingDeletions: undefined,
  ownerPrivacyRevision: 7, canonicalPolicyRevision: 7,
})
test('provider owner guard denies malformed deleted values before paid dispatch', () => {
  for (const ownerDeleted of ['true', 'false', 1, 0, {}, []]) {
    assert.equal(decide({ ...active, ownerDeleted }), 'inactive-owner', `unexpected authority for deleted=${JSON.stringify(ownerDeleted)}`)
  }
})
test('provider owner guard preserves permitted legacy absent-deleted owner', () => {
  assert.equal(decide({ ...active, ownerDeleted: undefined }), 'active')
  assert.equal(decide({ ...active, ownerDeleted: null }), 'active')
  assert.equal(decide({ ...active, ownerDeleted: false }), 'active')
})
