import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

// Offline source boundary only. Native allow/deny tests still require real Firebase emulators.
const project = 'demo-urai-firestore-owner-rules'
const suites = [
  'tests/firestore.assetManifests.rules.test.mjs',
  'tests/firestore.privacyConsent.rules.test.mjs',
  'tests/firestore.lifeModel.rules.test.mjs',
  'tests/firestore.userAuthority.rules.test.mjs',
]

for (const file of suites) {
  test(file + ' uses the exact fictional emulator project', () => {
    const source = fs.readFileSync(path.resolve(file), 'utf8')
    assert.match(source, /^const projectId = 'demo-urai-firestore-owner-rules'$/m)
    assert.match(source, /initializeTestEnvironment\(\{\s*projectId,\s*firestore:/)
    assert.doesNotMatch(source, /^const projectId = .*Date\.now\(\)/m)
  })
}

test('native runner pins a single project and serializes the Rules suites', () => {
  const source = fs.readFileSync(path.resolve('scripts/run-firestore-rules-tests.mjs'), 'utf8')
  assert.match(source, /const project = 'demo-urai-firestore-owner-rules'/)
  assert.match(source, /'--project', project/)
  assert.match(source, /node --test --test-concurrency=1 tests\/firestore\.assetManifests\.rules\.test\.mjs/)
  assert.match(source, /URAI_REQUIRE_FIRESTORE_EMULATOR === '1'/)
})

test('original exact-head acceptance includes the project boundary check', () => {
  const source = fs.readFileSync(path.resolve('scripts/genesis-r799-exact-head-acceptance.sh'), 'utf8')
  assert.match(source, /run firestore_static_boundary 90 node --test [^\n]*tests\/firestore\.nativeProjectBoundary\.static\.test\.mjs/)
  assert.match(source, /run firestore_owner_emulator 600 env URAI_REQUIRE_FIRESTORE_EMULATOR=1/)
})
