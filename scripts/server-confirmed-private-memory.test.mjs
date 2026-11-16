import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { isServerConfirmedSnapshot } from '../urai-tier1/src/spatial/memory/serverConfirmedSnapshot.ts'

const original = readFileSync(new URL('../urai-tier1/src/spatial/memory/useSelectedMemory.ts', import.meta.url), 'utf8')

test('current server-confirmed memory state passes the browser presentation guard', () => {
  assert.equal(isServerConfirmedSnapshot({ fromCache: false, hasPendingWrites: false }), true)
})
test('cached consent or memory never confers current private rendering authority', () => {
  assert.equal(isServerConfirmedSnapshot({ fromCache: true, hasPendingWrites: false }), false)
})
test('locally pending writes do not grant private access before server acknowledgment', () => {
  assert.equal(isServerConfirmedSnapshot({ fromCache: false, hasPendingWrites: true }), false)
  assert.equal(isServerConfirmedSnapshot({ fromCache: true, hasPendingWrites: true }), false)
})
test('missing or incomplete metadata fails closed', () => {
  assert.equal(isServerConfirmedSnapshot(null), false)
  assert.equal(isServerConfirmedSnapshot(undefined), false)
  assert.equal(isServerConfirmedSnapshot({}), false)
})
test('both Firestore listeners use the real options-before-callback overload', () => {
  assert.equal((original.match(/includeMetadataChanges:\s*true/g) ?? []).length, 2)
  assert.equal((original.match(/isServerConfirmedSnapshot\(snapshot\.metadata\)/g) ?? []).length, 2)
  assert.match(original, /doc\(getFirebaseDb\(\), 'users', user\.uid, 'memories', memoryId\),\s*\{ includeMetadataChanges: true \},\s*\(snapshot\) => \{/)
  assert.match(original, /doc\(getFirebaseDb\(\), 'users', user\.uid, 'privacyPolicy', 'current'\),\s*\{ includeMetadataChanges: true \},\s*\(snapshot\) => \{/)
})
test('cached consent detaches the private memory listener before declining access', () => {
  assert.match(original, /if \(!isServerConfirmedSnapshot\(snapshot\.metadata\)\) \{\s*detachMemory\(\)\s*setResult\(unavailable\('Private memory consent requires a current server confirmation\.'\)\)/)
})
test('cached private memory cannot be parsed or rendered as selected memory', () => {
  assert.match(original, /if \(!isServerConfirmedSnapshot\(snapshot\.metadata\)\) \{\s*setResult\(unavailable\('Private memory requires a current server confirmation\.'\)\)\s*return/)
})
test('demo memory remains explicitly isolated from private Firestore selection', () => {
  assert.match(original, /if \(requestedDemoMemoryId\) \{/)
  assert.match(original, /if \(!firebasePublicEnvReady\) \{/)
})
