import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { createRequire } from 'node:module'
const ts = createRequire(import.meta.url)('typescript')
const code = fs.readFileSync(new URL('../src/scenarioOwnerAuthority.ts', import.meta.url), 'utf8')
const result = ts.transpileModule(code, {compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }, reportDiagnostics: true})
assert.deepEqual(result.diagnostics ?? [], [])
const { scenarioOwnerAuthorityDecision: decide } = await import('data:text/javascript;charset=utf-8,' + encodeURIComponent(result.outputText))
const current = () => ({ ownerExists: true, ownerDeleted: false, accountStatus: 'active', tombstoneExists: false, fenceExists: true, pendingDeletions: {} })
test('active owner with empty/clean deletion fence is authorized', () => {
  assert.equal(decide(current()), 'active')
  assert.equal(decide({...current(),pendingDeletions: {jobA:false, jobB:false}}), 'active')
  assert.equal(decide({...current(),fenceExists: false,pendingDeletions: undefined}), 'active')
})
test('pending deletion blocks writes and reads', () => {
  assert.equal(decide({...current(),pendingDeletions:{jobA:false, jobB:true}}), 'deletion-pending')
})
test('malformed deletion states fail closed rather than being interpreted as false', () => {
  for(const bad of ['true', 'false', 'pending', 'completed', 1, 0, null, [], {}, undefined]) {
    assert.equal(decide({...current(),pendingDeletions: {jobA: bad}}), 'deletion-fence-invalid')
  }
})
test('non-object or absent deletion fences fail closed', () => {
  for(const bad of [null, undefined, 'nope', true, 0, [], ['false']]) {
    assert.equal(decide({...current(),pendingDeletions: bad}), 'deletion-fence-invalid')
  }
})
test('disabled and deleting/deleted owners cannot access Scenarios', () => {
  for(const accountStatus of ['deleting','deleted','disabled'])
    assert.equal(decide({...current(),accountStatus}), 'inactive-owner')
})
test('missing owner, tombstone, deleted=true block Scenario authority', () => {
  assert.equal(decide({...current(),ownerExists:false}), 'inactive-owner')
  assert.equal(decide({...current(),tombstoneExists:true}), 'inactive-owner')
  assert.equal(decide({...current(),ownerDeleted:true}), 'inactive-owner')
})
test('malformed deleted flag cannot resurrect owner authority', () => {
  for (const ownerDeleted of ['false', 'true', 1, 0, {}, []])
    assert.equal(decide({...current(),ownerDeleted}), 'inactive-owner')
})
test('legacy owner without deletion field is authorized only if otherwise active', () => {
  assert.equal(decide({...current(),ownerDeleted:undefined}), 'active')
  assert.equal(decide({...current(),ownerDeleted:null}), 'active')
  assert.equal(decide({...current(),ownerDeleted:null,pendingDeletions:{x:true}}), 'deletion-pending')
})
