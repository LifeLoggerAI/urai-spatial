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

test('release operator is exact-SHA, rollback-aware, hosting-only, and credential bounded', () => {
  hasAll(operator, [
    "requireFullSha('Release SHA', candidate)",
    'CURRENT_MAIN_SHA',
    'ROLLBACK_SHA must be distinct from the release SHA',
    "process.argv.includes('--verify-prebuilt')",
    "process.argv.includes('--deploy-prebuilt')",
    'validateAndMaterializePrebuiltBundle',
    'Release bundle file set, sizes, or hashes do not match the manifest',
    "relative.split('/').some((segment) => segment.startsWith('.'))",
    'Release surface contains a Firebase-ignored dot path',
    'live-rollback-provenance.json',
    'fingerprint.repository !== canonicalRepository',
    'fingerprint.authoritySha !== authoritySha',
    'manifest.fingerprintSha256 !== sha256(fingerprintPath)',
    'delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON',
    'delete process.env.GOOGLE_APPLICATION_CREDENTIALS',
    'resolveManagedCredentialPath({ required: true })',
    'Credential path must stay inside RUNNER_TEMP',
    'resolveAuthorityFirebaseCli',
    'writeTemporaryServiceAccount',
    "flag: 'wx'",
    'removeTemporaryServiceAccount',
  ], 'operator')
  assert.match(operator, /relative\.split\('\/'\)\.some\(\(segment\) => segment\.startsWith\('\.'\)\)/)
  assert.doesNotMatch(operator, /path\.posix\.basename\(relative\)\.startsWith\('\.'\)/)
  assert.match(operator, /'--only', 'hosting'/)
  assert.doesNotMatch(operator, /hosting,firestore|firestore:indexes|functions|pnpm\s+exec\s+firebase/)
})

test('bundle producer and verifier use one global manifest path order', () => {
  const marker = 'return files.sort((left, right) => left.relative.localeCompare(right.relative))'
  assert.ok(bundleBuilder.includes(marker), 'bundle attester must globally sort paths')
  assert.ok(operator.includes(marker), 'bundle verifier must globally sort paths')
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

test('authority bundle and credential verifier bind the complete immutable hosted release', () => {
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
    'urai-release-credential-boundary-4',
    'targetBuildIsolated: true',
    'authorityAttestationIsolated: true',
    'targetCodeExecutesInProductionJob: false',
    'credentialsMaterializedByAuthorityOnly: true',
    'managedCredentialPathRequiredForProductionWrite: true',
    'firebaseCliResolvedFromCurrentAuthority: true',
    'downloadedBundleRunBound',
    'downloadedBundleFingerprintBound',
    'liveRollbackEvidenceDirectory',
    'evidenceDirectory: liveRollbackEvidenceDirectory',
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

test('legacy bootstrap machinery remains recovery-bounded but is not executable from the quarantined workflow', () => {
  assert.ok(!workflow.includes('BOOTSTRAP_LEGACY_URAI_APP'), 'quarantined workflow must not expose legacy bootstrap mutation input')
  assert.ok(!workflow.includes('URAI_LEGACY_BOOTSTRAP_CONFIRM'), 'quarantined workflow must not expose legacy bootstrap confirmation')
  hasAll(credentialBoundary, [
    'legacyBootstrapRequested',
    'legacyBootstrapProofRequired',
    'verifyLegacyLiveBootstrap',
    'legacyBootstrapProofVerified',
  ], 'legacy bootstrap credential boundary')
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
