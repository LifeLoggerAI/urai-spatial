import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const repositoryRoot = path.resolve(testDirectory, '../..')
const read = (relativePath) => readFileSync(path.join(repositoryRoot, relativePath), 'utf8').replace(/\r\n?/g, '\n')

const operator = read('scripts/live-release.mjs')
const recovery = read('scripts/firebase-hosting-recovery.mjs')
const workflow = read('.github/workflows/spatial-live-deploy.yml')
const focusedRunner = read('urai-tier1/scripts/run-unit-contract-tests.mjs')
const compactRunner = read('urai-tier1/scripts/run-unit-contract-tests-compact.mjs')

const contractPath = 'tests/automatic-hosting-recovery-contract.test.mjs'

test('canonical operator rejects long-lived credentials and every deploy request', () => {
  for (const marker of [
    "process.argv.includes('--deploy')",
    "process.argv.includes('--deploy-prebuilt')",
    "'FIREBASE_SERVICE_ACCOUNT_JSON'",
    "'FIREBASE_PRIVATE_KEY'",
    "'FIREBASE_CLIENT_EMAIL'",
    "'FIREBASE_TOKEN'",
    'Refusing long-lived Firebase credential environment variable:',
    'URAI Spatial production release is NO-GO',
    'No provider credentials were loaded and no production mutation was attempted.',
  ]) assert.ok(operator.includes(marker), `missing fail-closed operator marker: ${marker}`)

  assert.doesNotMatch(operator, /node:(?:child_process|fs)|firebase(?:-tools)?(?:@[^\s]+)?\s+deploy|credential\.cert\s*\(|createSign\s*\(|writeTemporaryServiceAccount|deployHostingWithTemporaryCredentials/)
})

test('Hosting recovery exports only fail-closed operations', () => {
  for (const marker of [
    'URAI Spatial Firebase Hosting recovery is NO-GO',
    'function refuseRecovery()',
    'throw new Error(quarantineMessage)',
    'export async function discoverCurrentLiveRelease()',
    'export async function restoreDiscoveredVersion()',
    'export async function verifyRestoredVersion()',
    'process.exitCode = 1',
  ]) assert.ok(recovery.includes(marker), `missing fail-closed recovery marker: ${marker}`)

  assert.doesNotMatch(recovery, /FIREBASE_|GOOGLE_APPLICATION_CREDENTIALS|credential\.cert\s*\(|createSign\s*\(|accessToken|fetch\s*\(|https?:\/\//)
})

test('canonical workflow cannot invoke deploy, recovery, or strict live smoke', () => {
  assert.match(workflow, /Verify canonical source with production release quarantined/)
  assert.match(workflow, /Classification: NO-GO/)
  assert.doesNotMatch(workflow, /node\s+scripts\/live-release\.mjs\s+--deploy(?:-prebuilt)?/)
  assert.doesNotMatch(workflow, /node\s+scripts\/firebase-hosting-recovery\.mjs/)
  assert.doesNotMatch(workflow, /node\s+scripts\/urai-release-control-smoke\.mjs/)
  assert.doesNotMatch(workflow, /environment:\s*production|id-token:\s*write/)
})

test('both focused runners execute this quarantine contract', () => {
  assert.ok(focusedRunner.includes(`'${contractPath}'`))
  assert.ok(compactRunner.includes(`'${contractPath}'`))
})
