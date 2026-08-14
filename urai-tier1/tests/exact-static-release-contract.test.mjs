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
const workflow = readRepo('.github/workflows/spatial-live-deploy.yml')
const bundleBuilder = readRepo('scripts/create-static-release-bundle.mjs')
const credentialBoundary = readRepo('scripts/verify-release-credential-boundary.mjs')
const verifier = readRepo('scripts/urai-post-deploy-smoke.mjs')
const legacyBootstrapVerifier = readRepo('scripts/verify-legacy-live-bootstrap.mjs')

function hasAll(source, markers, label) {
  for (const marker of markers) assert.ok(source.includes(marker), `missing ${label} marker: ${marker}`)
}

function job(source, name) {
  const marker = `\n  ${name}:\n`
  const start = source.indexOf(marker)
  assert.ok(start >= 0, `missing workflow job: ${name}`)
  const rest = source.slice(start + marker.length)
  const next = rest.search(/\n  [A-Za-z0-9_-]+:\n/)
  return next < 0 ? rest : rest.slice(0, next)
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

test('release operator is fail-closed and rejects production mutation and long-lived credentials', () => {
  hasAll(operator, [
    "process.argv.includes('--deploy')",
    "process.argv.includes('--deploy-prebuilt')",
    'forbiddenCredentialEnv',
    'FIREBASE_SERVICE_ACCOUNT_JSON',
    'FIREBASE_PRIVATE_KEY',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_TOKEN',
    'Refusing long-lived Firebase credential environment variable',
    'URAI Spatial production release is NO-GO',
    'short-lived provider identity',
    'WIF/IAM least privilege',
    'runtime read-back',
    'rollback evidence',
    'historical credential revocation',
    'No provider credentials were loaded and no production mutation was attempted.',
  ], 'operator')
  assert.doesNotMatch(operator, /firebase\s+deploy|firebase\s+hosting:clone|hosting,firestore|firestore:indexes|functions/)
})

test('bundle producer preserves one global manifest path order while mutation remains quarantined', () => {
  const marker = 'return files.sort((left, right) => left.relative.localeCompare(right.relative))'
  assert.ok(bundleBuilder.includes(marker), 'bundle attester must globally sort paths')
  assert.ok(!operator.includes('validateAndMaterializePrebuiltBundle'), 'quarantined operator must not expose a prebuilt deployment verifier')
})

test('canonical production workflow is exact-head verification-only and credential-free', () => {
  const verify = job(workflow, 'verify')

  hasAll(workflow, [
    'name: URAI Canonical Production Release Verification',
    'permissions:',
    'contents: read',
    'EXACT_HEAD_SHA: ${{ github.event.pull_request.head.sha || github.sha }}',
    'workflow_dispatch:',
  ], 'verification workflow')
  hasAll(verify, [
    'Verify canonical source with production release quarantined',
    'Checkout exact source',
    'ref: ${{ env.EXACT_HEAD_SHA }}',
    'persist-credentials: false',
    'Prove exact clean source',
    'pnpm install --frozen-lockfile',
    'node scripts/audit-production-workflow-authority.mjs',
    'node scripts/verify-release-credential-boundary.mjs',
    'node scripts/verify-release-credential-boundary-static.mjs',
    'Record NO-GO release classification',
    'Production release and Hosting recovery are intentionally quarantined.',
    'Upload verification evidence',
  ], 'verification job')
  assert.doesNotMatch(workflow, /environment:\s*production/)
  assert.doesNotMatch(workflow, /FIREBASE_SERVICE_ACCOUNT_JSON|GOOGLE_APPLICATION_CREDENTIALS/)
  assert.doesNotMatch(workflow, /node scripts\/live-release\.mjs --deploy-prebuilt/)
  assert.doesNotMatch(workflow, /firebase\s+deploy|firebase\s+hosting:clone/)
})

test('authority bundle remains deterministic while credential verifier enforces quarantine', () => {
  hasAll(bundleBuilder, [
    "schemaVersion: 'urai-static-release-bundle-1'",
    'assertCleanAuthorityCheckout()',
    'authoritySha',
    'targetSha',
    'rollbackSha',
    'Release bundle source must not contain symlinks',
    'isFirebaseIgnoredPath',
    "relative.split('/').some((segment) => segment.startsWith('.'))",
    'Static output contains a Firebase-ignored dot path',
    'Copied release bundle bytes do not match the source output',
    'fingerprintSha256',
    'fileCount',
    'totalBytes',
    'sha256',
  ], 'bundle attester')
  assert.doesNotMatch(bundleBuilder, /path\.posix\.basename\(relative\)\.startsWith\('\.'\)/)
  hasAll(credentialBoundary, [
    "schemaVersion: 'urai-release-credential-boundary-5'",
    "mode: 'quarantine-no-go'",
    'exactHeadVerificationOnly: true',
    'productionMutationAvailable: false',
    'productionCredentialsAvailable: false',
    'runtimeMutationIntentDetected: mutationRequested',
    'providerWifIamProofRequiredBeforeMutation: true',
    'independentReviewRequiredBeforeMutation: true',
    "releaseClassification: 'NO-GO'",
    'Production mutation is forbidden while the release boundary is quarantined',
    'Quarantined release workflow must not reference repository secrets',
    'Quarantined release workflow must remain read-only',
    'Quarantined release workflow must not expose a provider mutation command',
  ], 'credential boundary')
})

test('live verification binds canonical routes, origin, SHA, authority, and fingerprint', () => {
  hasAll(verifier, [
    'URAI_EXPECTED_DEPLOYED_SHA',
    'URAI_EXPECTED_ROLLBACK_SHA',
    'release-fingerprint.json',
    'urai-release-fingerprint-1',
    "redirect: 'manual'",
    'finalUrl.origin === canonicalOrigin',
    'payload?.authoritySha === expectedAuthoritySha',
    'sha === expectedSha',
    'live-content-parity-3',
    'hydratedIdentityProof',
  ], 'live verifier')
})

test('Focus live verification requires the real static chamber and rejects the obsolete loading shell', () => {
  const expected = "['/focus?memoryId=quiet-reset&manifestId=replay-recovery-thread&node=quiet-reset', ['urai-final-focus-chamber', 'Selected memory chamber.'], ['Focus loading']]"
  const obsolete = "['/focus?memoryId=quiet-reset&manifestId=replay-recovery-thread&node=quiet-reset', ['Focus loading'], []]"
  assert.ok(verifier.includes(expected), 'Focus live contract must bind the real static chamber and forbid the old shell')
  assert.ok(!verifier.includes(obsolete), 'Focus live contract must not contain the obsolete loading shell')
})

test('legacy bootstrap remains recovery-bounded but has no executable path through the quarantine boundary', () => {
  assert.ok(!workflow.includes('BOOTSTRAP_LEGACY_URAI_APP'), 'quarantined workflow must not expose legacy bootstrap mutation input')
  assert.ok(!workflow.includes('URAI_LEGACY_BOOTSTRAP_CONFIRM'), 'quarantined workflow must not expose legacy bootstrap confirmation')
  assert.ok(!credentialBoundary.includes('legacyBootstrapRequested'), 'quarantine verifier must not expose legacy bootstrap mutation state')
  assert.ok(!credentialBoundary.includes('verifyLegacyLiveBootstrap'), 'quarantine verifier must not execute legacy bootstrap verification')
  hasAll(legacyBootstrapVerifier, [
    "schemaVersion: 'urai-legacy-live-bootstrap-provenance-1'",
    'valid release fingerprint already exists',
    'recognized-legacy-html',
    'Legacy bootstrap recovery SHA must be distinct from current main',
    "runGit(['merge-base', '--is-ancestor', recoverySha, currentMainSha])",
    "path.join(evidenceDirectory, 'live-rollback-provenance.json')",
    'normalFingerprintDeployRequiredAfterBootstrap: true',
  ], 'legacy bootstrap verifier')
})

test('quarantined production verification binds exact source identity without claiming live SHA proof', () => {
  hasAll(workflow, [
    'EXACT_HEAD_SHA: ${{ github.event.pull_request.head.sha || github.sha }}',
    'test "$(git rev-parse HEAD)" = "$EXACT_HEAD_SHA"',
    'test -z "$(git status --porcelain --untracked-files=all)"',
    'Classification: NO-GO',
    'Commit: $EXACT_HEAD_SHA',
  ], 'exact source verification')
  assert.doesNotMatch(workflow, /grep -R --fixed-strings --include='\*\.html'/)
  assert.doesNotMatch(workflow, /URAI_EXPECTED_DEPLOYED_SHA|URAI_EXPECTED_ROLLBACK_SHA/)
})

test('manual trigger remains verification-only and exposes no deploy or rollback path', () => {
  hasAll(workflow, [
    'workflow_dispatch:',
    'Verify production authority is fail-closed',
    'Production mutation is forbidden while provider WIF/IAM and runtime identity remain unproven.',
    'Re-enable only after short-lived provider identity, WIF/IAM trust, least privilege, runtime read-back, rollback evidence, and historical credential revocation are independently verified.',
  ], 'quarantined manual verification')
  assert.doesNotMatch(workflow, /rollback_sha:|release_sha:|confirm:/)
  assert.doesNotMatch(workflow, /build-release-output:|attest-release-bundle:|rollback-verify:|\n  deploy:\n/)
  assert.doesNotMatch(workflow, /gh workflow run spatial-live-deploy\.yml/)
})
