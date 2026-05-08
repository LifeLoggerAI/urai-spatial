import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const rules = fs.readFileSync(path.resolve('firebase/firestore.rules'), 'utf8')
const flatRules = rules.replace(/\s+/g, ' ')

test('assetManifests boundary is explicit', () => {
  assert.match(flatRules, /match \/assetManifests\/\{manifestId\}/)
})

test('assetManifests read is limited to admin owner or launch-demo', () => {
  assert.match(flatRules, /allow get, list: if isAdmin\(\) \|\| isManifestOwner\(\) \|\| isLaunchDemoOwner\(resource\.data\.ownerId\);/)
})

test('assetManifests writes are admin-only with validation', () => {
  assert.match(flatRules, /allow create: if isAdmin\(\) && isValidSpatialManifestCreate\(\);/)
  assert.match(flatRules, /allow update: if isAdmin\(\) && isValidSpatialManifestCreate\(\);/)
  assert.match(flatRules, /allow delete: if isAdmin\(\);/)
})

test('manifest validation requires core fields', () => {
  assert.match(flatRules, /request\.resource\.data\.manifestId is string/)
  assert.match(flatRules, /request\.resource\.data\.manifestVersion == '1\.0'/)
  assert.match(flatRules, /request\.resource\.data\.ownerId is string/)
  assert.match(flatRules, /request\.resource\.data\.artifacts is list/)
  assert.match(flatRules, /request\.resource\.data\.spatialCompatibility is map/)
})

test('private spatial collections default to admin-only', () => {
  assert.match(flatRules, /match \/spatial\/\{doc=\*\*\}/)
  assert.match(flatRules, /allow read, write: if isAdmin\(\);/)
})
