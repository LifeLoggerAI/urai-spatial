import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const rules = fs.readFileSync('firebase/firestore.rules', 'utf8')
const fields = ['entitlementTier', 'isAdmin', 'founderOverride', 'deleted', 'accountStatus', 'privacyRevision']
const functionMatch = rules.match(/function serverOwnedUserRootFields\(\)\s*\{\s*return\s*\[([\s\S]*?)\];\s*\}/)

// This static guard must be paired with the real emulator test; it cannot prove Firestore authorization.
test('privileged and deletion authority fields share one canonical reserved list', () => {
  assert.ok(functionMatch, 'server-owned root field function required')
  const actualFields = [...functionMatch[1].matchAll(/'([^']+)'/g)].map(x => x[1])
  assert.deepEqual(actualFields, fields)
})

test('owner root creation forbids server-owned fields', () => {
  const section = rules.slice(rules.indexOf('match /users/{uid} {'), rules.indexOf('match /privacyPolicy/{docId}'))
  assert.match(section, /allow create:[\s\S]*?!request\.resource\.data\.keys\(\)\.hasAny\(serverOwnedUserRootFields\(\)\)/)
})

test('owner root update forbids added, changed and deleted authority fields', () => {
  const section = rules.slice(rules.indexOf('match /users/{uid} {'), rules.indexOf('match /privacyPolicy/{docId}'))
  assert.match(section, /allow update:[\s\S]*?!request\.resource\.data\.diff\(resource\.data\)\.affectedKeys\(\)\.hasAny\(serverOwnedUserRootFields\(\)\)/)
  assert.doesNotMatch(section, /\.changedKeys\(\)/, 'changedKeys cannot cover newly added or removed fields')
})

test('legitimate owner profile writes are not universally disabled', () => {
  const section = rules.slice(rules.indexOf('match /users/{uid} {'), rules.indexOf('match /privacyPolicy/{docId}'))
  assert.match(section, /allow update: if isSelf\(uid\)/)
  assert.match(section, /isPrivateSpatialPayloadSafe\(\)/)
})
