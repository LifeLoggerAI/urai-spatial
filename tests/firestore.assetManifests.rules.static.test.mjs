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

function assertManifestWriteBoundary(text) {
  const block = text.match(/match \/assetManifests\/\{manifestId\}\s*\{([^}]+)\}/)?.[1]
  assert.ok(block, 'asset manifest collection boundary must exist')
  const grants = [...block.matchAll(/allow\s+([^:]+):\s*if\s+([^;]+);/g)]
  for (const operation of ['create', 'update', 'delete']) {
    const conditions = grants.filter(grant => {
      const operations = grant[1].split(',').map(value => value.trim())
      return operations.includes(operation) || operations.includes('write')
    }).map(grant => grant[2].trim())
    assert.deepEqual(conditions, [operation === 'delete' ? 'isAdmin()' : 'isAdmin() && isValidSpatialManifestCreate()'], `${operation} must have exactly one restricted grant`)
  }
}

test('assetManifests writes are admin-only with validation', () => {
  assertManifestWriteBoundary(flatRules)
})

test('manifest boundary rejects added permissive or unvalidated write grants', () => {
  for (const grant of ['allow write: if true;', 'allow create: if isAdmin();', 'allow update: if isSignedIn();']) {
    assert.throws(() => assertManifestWriteBoundary(flatRules.replace('allow delete: if isAdmin();', `allow delete: if isAdmin(); ${grant}`)))
  }
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
