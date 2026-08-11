import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const repositoryRoot = path.resolve(testDirectory, '../..')
const read = (relativePath) => readFileSync(path.join(repositoryRoot, relativePath), 'utf8').replace(/\r\n?/g, '\n')

const entrypoint = read('scripts/live-release.mjs')
const operator = read('scripts/live-release-wif.mjs')
const smoke = read('scripts/urai-release-control-smoke.mjs')
const recovery = read('scripts/firebase-hosting-recovery.mjs')
const focusedRunner = read('urai-tier1/scripts/run-unit-contract-tests.mjs')
const compactRunner = read('urai-tier1/scripts/run-unit-contract-tests-compact.mjs')

const contractPath = 'tests/automatic-hosting-recovery-contract.test.mjs'

test('canonical entrypoint routes only to the WIF release operator', () => {
  assert.match(entrypoint, /import '\.\/live-release-wif\.mjs'/)
  assert.doesNotMatch(entrypoint, /FIREBASE_SERVICE_ACCOUNT_JSON|private_key|credentials_json/)
})

test('canonical operator captures the exact live Hosting version before mutation', () => {
  const capture = operator.indexOf('const hostingCapture = await discoverCurrentLiveRelease()')
  const deploy = operator.lastIndexOf('deployHostingWithFederatedCredentials()')
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
  assert.match(operator, /authMode: 'wif'/)
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

test('recovery accepts only GitHub OIDC/WIF federated ADC', () => {
  assert.match(recovery, /GOOGLE_GHA_CREDS_PATH/)
  assert.match(recovery, /GCP_WIF_PROVIDER/)
  assert.match(recovery, /GCP_DEPLOY_SERVICE_ACCOUNT/)
  assert.match(recovery, /external_account/)
  assert.match(recovery, /accessTokenFromFederatedAdc/)
  assert.match(recovery, /gcloud\(\['auth', 'print-access-token'\]\)/)
  assert.match(recovery, /verify-restored/)
  assert.doesNotMatch(recovery, /createSign|createServiceAccountAssertion|accessTokenFromServiceAccount|serviceAccountFromEnvironment/)
})

test('restore verification reuses one short-lived federated token across bounded polling', () => {
  const start = recovery.indexOf('export async function verifyRestoredVersion')
  const end = recovery.indexOf('export function selfTest', start)
  assert.ok(start >= 0 && end > start, 'restore verification implementation must be discoverable')
  const block = recovery.slice(start, end)
  assert.equal((block.match(/accessTokenFromFederatedAdc/g) || []).length, 1)
  assert.match(block, /listAllReleases\(accessToken, siteId\)/)
})

test('strict smoke retries transient request failures before recovery', () => {
  assert.match(smoke, /for \(let attempt = 1; attempt <= 3; attempt \+= 1\)/)
  assert.match(smoke, /AbortSignal\.timeout\(20_000\)/)
  assert.match(smoke, /setTimeout\(resolve, 1000 \* 2 \*\* \(attempt - 1\)\)/)
  assert.match(smoke, /throw lastError/)
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
