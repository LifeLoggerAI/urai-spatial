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

test('canonical release operator is explicitly quarantined', () => {
  assert.match(operator, /process\.argv\.includes\('--deploy'\)/)
  assert.match(operator, /process\.argv\.includes\('--deploy-prebuilt'\)/)
  assert.match(operator, /URAI Spatial production release is NO-GO/)
  assert.match(operator, /No provider credentials were loaded and no production mutation was attempted\./)
})

test('canonical release operator contains no active Hosting mutation or recovery path', () => {
  assert.match(operator, /if \(deployRequested\) \{[\s\S]*throw new Error\(/)
  assert.match(operator, /WIF\/IAM least privilege/)
  assert.match(operator, /historical credential revocation/)
  assert.doesNotMatch(operator, /deployHostingWithTemporaryCredentials/)
  assert.doesNotMatch(operator, /recoverExactHostingVersion/)
  assert.doesNotMatch(operator, /discoverCurrentLiveRelease/)
})

test('dormant recovery implementation retains exact-version verification safeguards', () => {
  assert.match(recovery, /export async function verifyRestoredVersion/)
  assert.match(recovery, /restoreDiscoveredVersion/)
  assert.match(recovery, /listAllReleases/)
  assert.match(recovery, /verify-restored/)
})

test('strict smoke recovery remains isolated from direct deployment commands', () => {
  assert.match(smoke, /protectedDeployRecoveryContext/)
  assert.match(smoke, /await restoreDiscoveredVersion\(\)/)
  assert.match(smoke, /await verifyRestoredVersion\(\)/)
  assert.doesNotMatch(smoke, /gh workflow run/)
  assert.doesNotMatch(operator, /gh workflow run/)
})

test('both focused runners execute this quarantine-aware recovery contract', () => {
  assert.ok(focusedRunner.includes(`'${contractPath}'`))
  assert.ok(compactRunner.includes(`'${contractPath}'`))
})
