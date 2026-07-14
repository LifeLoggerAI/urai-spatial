import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const repositoryRoot = path.resolve(testDirectory, '../..')
const read = (relativePath) => readFileSync(path.join(repositoryRoot, relativePath), 'utf8').replace(/\r\n?/g, '\n')

const operator = read('scripts/live-release.mjs')
const smoke = read('scripts/urai-release-control-smoke.mjs')
const recovery = read('scripts/firebase-hosting-recovery.mjs')
const focusedRunner = read('urai-tier1/scripts/run-unit-contract-tests.mjs')
const compactRunner = read('urai-tier1/scripts/run-unit-contract-tests-compact.mjs')

const contractPath = 'tests/automatic-hosting-recovery-contract.test.mjs'

test('canonical operator captures the exact live Hosting version before mutation', () => {
  const capture = operator.indexOf('const hostingCapture = await discoverCurrentLiveRelease()')
  const deploy = operator.lastIndexOf('deployHostingWithTemporaryCredentials()')
  assert.ok(capture >= 0, 'operator must capture the live Hosting version')
  assert.ok(deploy > capture, 'capture must occur before Firebase Hosting mutation')
  assert.match(operator, /URAI_HOSTING_RECOVERY_RECEIPT/)
  assert.match(operator, /discoverCurrentLiveRelease/)
})

test('canonical operator restores and verifies the exact version on deploy or post-deploy failure', () => {
  assert.match(operator, /catch \(error\) \{[\s\S]*await recoverExactHostingVersion\(\{/)
  assert.match(operator, /restoreDiscoveredVersion/)
  assert.match(operator, /verifyRestoredVersion/)
  assert.match(operator, /URAI_HOSTING_RESTORE_CONFIRM/)
  assert.match(operator, /RESTORE_EXACT_HOSTING_VERSION/)
  assert.match(operator, /operator-recovery\.json/)
  assert.match(operator, /recovery-final-state\.json/)
  assert.match(operator, /restored-previous-hosting-version/)
})

test('strict release-control smoke independently recovers before reporting failure', () => {
  assert.match(smoke, /protectedDeployRecoveryContext/)
  assert.match(smoke, /process\.env\.GITHUB_JOB === 'deploy'/)
  assert.match(smoke, /await restoreDiscoveredVersion\(\)/)
  assert.match(smoke, /await verifyRestoredVersion\(\)/)
  assert.match(smoke, /strict-smoke-recovery\.json/)
  assert.match(smoke, /strict-smoke-final-state\.json/)
  assert.match(smoke, /if \(!protectedDeployRecoveryContext\(\)\) throw originalError/)
  assert.match(smoke, /throw new AggregateError/)
})

test('recovery accepts only the managed runner credential or the one scoped raw secret', () => {
  assert.match(recovery, /managedCredentialFilename = 'urai-firebase-service-account\.json'/)
  assert.match(recovery, /Managed Firebase credential path/)
  assert.match(recovery, /must be a regular non-symlinked file/)
  assert.match(recovery, /FIREBASE_SERVICE_ACCOUNT_JSON/)
  assert.match(recovery, /verify-restored/)
})

test('recovery remains inside the single canonical production authority', () => {
  assert.doesNotMatch(recovery, /firebase(?:-tools)?(?:@[^\s]+)?\s+deploy/)
  assert.doesNotMatch(smoke, /firebase(?:-tools)?(?:@[^\s]+)?\s+deploy/)
  assert.doesNotMatch(operator, /gh workflow run/)
})

test('both focused runners execute this recovery contract', () => {
  assert.ok(focusedRunner.includes(`'${contractPath}'`))
  assert.ok(compactRunner.includes(`'${contractPath}'`))
})
