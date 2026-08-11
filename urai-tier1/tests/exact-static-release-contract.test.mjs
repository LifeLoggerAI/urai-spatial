import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const normalize = (source) => source.replace(/\r\n?/g, '\n')
const testDir = path.dirname(fileURLToPath(import.meta.url))
const tier1Root = path.resolve(testDir, '..')
const repoRoot = path.resolve(tier1Root, '..')
const readTier1 = (file) => normalize(readFileSync(path.join(tier1Root, file), 'utf8'))
const readRepo = (file) => normalize(readFileSync(path.join(repoRoot, file), 'utf8'))

const hosting = JSON.parse(readRepo('firebase.static.json')).hosting
const layout = readTier1('src/app/layout.tsx')
const operator = readRepo('scripts/live-release.mjs')
const recovery = readRepo('scripts/firebase-hosting-recovery.mjs')
const workflow = readRepo('.github/workflows/spatial-live-deploy.yml')
const staticBoundary = readRepo('scripts/verify-release-credential-boundary-static.mjs')
const authorityAudit = readRepo('scripts/audit-production-workflow-authority.mjs')

function hasAll(source, markers, label) {
  for (const marker of markers) assert.ok(source.includes(marker), `missing ${label} marker: ${marker}`)
}

test('Firebase publishes only the canonical static export', () => {
  assert.equal(hosting.public, 'urai-tier1/out')
  assert.equal(hosting.cleanUrls, true)
  assert.equal(hosting.trailingSlash, true)
  assert.deepEqual(hosting.rewrites, [])
  assert.ok(hosting.ignore.includes('**/.*'))
})

test('public output carries exact deployment identity or an unverified state', () => {
  hasAll(layout, [
    'NEXT_PUBLIC_URAI_BUILD_SHA',
    'process.env.GITHUB_SHA',
    'data-deployed-sha',
    'data-deployment-evidence',
    'unverified',
  ], 'layout')
})

test('canonical workflow is verification-only and exact-head bound', () => {
  hasAll(workflow, [
    'name: URAI Canonical Production Release Verification',
    'workflow_dispatch:',
    'permissions:\n  contents: read',
    'Verify canonical source with production release quarantined',
    'ref: ${{ github.event.pull_request.head.sha || github.sha }}',
    'persist-credentials: false',
    'node scripts/audit-production-workflow-authority.mjs',
    'node scripts/verify-release-credential-boundary.mjs',
    'node scripts/verify-release-credential-boundary-static.mjs',
    'Classification: NO-GO',
    'Production release and Hosting recovery are intentionally quarantined.',
  ], 'quarantine workflow')

  assert.doesNotMatch(workflow, /environment:\s*production|id-token:\s*write|credentials_json\s*:|FIREBASE_(?:SERVICE_ACCOUNT_JSON|PRIVATE_KEY|CLIENT_EMAIL|TOKEN)|firebase-service-account\.json/)
  assert.doesNotMatch(workflow, /node\s+scripts\/live-release\.mjs\s+--deploy(?:-prebuilt)?|firebase(?:-tools)?(?:@[^\s]+)?\s+deploy|pnpm\s+live:deploy/)
})

test('release operator cannot load credentials or mutate production', () => {
  hasAll(operator, [
    "process.argv.includes('--deploy')",
    "process.argv.includes('--deploy-prebuilt')",
    "'FIREBASE_SERVICE_ACCOUNT_JSON'",
    "'FIREBASE_PRIVATE_KEY'",
    "'FIREBASE_CLIENT_EMAIL'",
    "'FIREBASE_TOKEN'",
    'Refusing long-lived Firebase credential environment variable:',
    'URAI Spatial production release is NO-GO',
    'No provider credentials were loaded and no production mutation was attempted.',
  ], 'quarantine operator')

  assert.doesNotMatch(operator, /node:(?:child_process|fs)|firebase(?:-tools)?(?:@[^\s]+)?\s+deploy|credential\.cert\s*\(|createSign\s*\(|writeTemporaryServiceAccount|deployHostingWithTemporaryCredentials/)
})

test('Hosting recovery cannot authenticate, call provider APIs, or restore a version', () => {
  hasAll(recovery, [
    'URAI Spatial Firebase Hosting recovery is NO-GO',
    'function refuseRecovery()',
    'throw new Error(quarantineMessage)',
    'export async function discoverCurrentLiveRelease()',
    'export async function restoreDiscoveredVersion()',
    'export async function verifyRestoredVersion()',
    'process.exitCode = 1',
  ], 'quarantine recovery')

  assert.doesNotMatch(recovery, /FIREBASE_|GOOGLE_APPLICATION_CREDENTIALS|credential\.cert\s*\(|createSign\s*\(|accessToken|fetch\s*\(|https?:\/\//)
})

test('credential verifiers and authority audit classify quarantine as NO-GO', () => {
  hasAll(staticBoundary, [
    "mode: quarantineMode ? 'quarantine-no-go' : 'active-release'",
    'productionMutationAvailable: !quarantineMode',
    'productionCredentialsAvailable: !quarantineMode',
    'targetCodeExecutesInProductionJob: false',
  ], 'static boundary')

  hasAll(authorityAudit, [
    "mode: quarantineMode ? 'quarantine-no-go' : 'active-release'",
    'productionMutationAvailable: productionWorkflows.length > 0',
    'productionCredentialsAvailable: secretOccurrences > 0',
    'Quarantine must expose zero production mutation workflows',
    'Quarantine must expose zero raw service-account secrets',
  ], 'authority audit')
})
