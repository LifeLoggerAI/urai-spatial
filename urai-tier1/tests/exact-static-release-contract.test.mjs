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

test('target build, recovery build, authority attestation, and protected deploy are separate jobs', () => {
  const buildTarget = job(workflow, 'build-target')
  const buildRecovery = job(workflow, 'build-recovery')
  const attest = job(workflow, 'attest-bundles')
  const deploy = job(workflow, 'deploy')

  hasAll(buildTarget, [
    'Build exact target static output without production credentials',
    'Checkout exact target only',
    'path: target',
    'pnpm install --frozen-lockfile',
    'pnpm build:static',
    'Upload exact target raw output',
  ], 'target build job')
  assert.doesNotMatch(buildTarget, /environment:\s*production|FIREBASE_SERVICE_ACCOUNT_JSON|GOOGLE_APPLICATION_CREDENTIALS/)

  hasAll(buildRecovery, [
    'Build exact recovery static output without production credentials',
    'Checkout exact recovery target only',
    'path: recovery',
    'pnpm install --frozen-lockfile',
    'pnpm build:static',
    'Upload exact recovery raw output',
  ], 'recovery build job')
  assert.doesNotMatch(buildRecovery, /environment:\s*production|FIREBASE_SERVICE_ACCOUNT_JSON|GOOGLE_APPLICATION_CREDENTIALS/)

  hasAll(attest, [
    'Attest target and recovery bundles with clean current authority',
    'Checkout clean current authority only',
    'Download target raw output',
    'Download recovery raw output',
    'node scripts/create-static-release-bundle.mjs',
    'Upload exact target bundle',
    'Upload exact recovery bundle',
  ], 'attestation job')
  assert.doesNotMatch(attest, /environment:\s*production|FIREBASE_SERVICE_ACCOUNT_JSON|GOOGLE_APPLICATION_CREDENTIALS|pnpm\s+build:static/)

  hasAll(deploy, [
    'Deploy target or restore exact attested recovery bundle on urai.app',
    'environment: production',
    'Checkout current release authority only',
    'Initialize protected bundle paths',
    'TARGET_BUNDLE_DIR=${RUNNER_TEMP}/urai-v2-target-bundle',
    'RECOVERY_BUNDLE_DIR=${RUNNER_TEMP}/urai-v2-recovery-bundle',
    'pnpm install --frozen-lockfile --ignore-scripts',
    'Download exact target bundle',
    'Download exact recovery bundle',
    'node scripts/live-release.mjs --verify-prebuilt',
    'node scripts/live-release.mjs --deploy-prebuilt',
    'node scripts/urai-release-control-smoke.mjs',
    'Remove temporary credentials',
  ], 'deploy job')
  assert.match(deploy, /GOOGLE_APPLICATION_CREDENTIALS: \$\{\{ runner\.temp \}\}\/urai-firebase-service-account\.json/)
  assert.match(deploy, /URAI_FIREBASE_CLI: \$\{\{ github\.workspace \}\}\/node_modules\/\.bin\/firebase/)
  assert.doesNotMatch(deploy, /working-directory:\s*target|working-directory:\s*recovery|pnpm\s+build:static/)
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

test('legacy bootstrap is fingerprint-absence-only and recovery-bound', () => {
  hasAll(workflow, [
    'BOOTSTRAP_LEGACY_URAI_APP',
    "URAI_LEGACY_BOOTSTRAP: ${{ inputs.confirm == 'BOOTSTRAP_LEGACY_URAI_APP' && '1' || '0' }}",
    'URAI_LEGACY_BOOTSTRAP_CONFIRM: ${{ inputs.confirm }}',
    'git merge-base --is-ancestor "$ROLLBACK_SHA" "$RELEASE_SHA"',
  ], 'legacy bootstrap workflow')
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

test('static SHA proofs avoid pipefail SIGPIPE false negatives', () => {
  hasAll(workflow, [
    'grep -R --fixed-strings --include=\'*.html\' -q "$TARGET_SHA" target/urai-tier1/out',
    'grep -R --fixed-strings --include=\'*.html\' -q "$RECOVERY_SHA" recovery/urai-tier1/out',
  ], 'direct static SHA proof')
  assert.doesNotMatch(workflow, /--include='\*\.html' -l \| grep -q \./)
})

test('manual deploy and rollback preserve distinct target and recovery identities', () => {
  hasAll(workflow, [
    'workflow_dispatch:',
    'build-target:',
    'build-recovery:',
    'attest-bundles:',
    'ROLLBACK_SHA: ${{ inputs.rollback_sha }}',
    "inputs.confirm == 'DEPLOY_URAI_APP'",
    "inputs.confirm == 'ROLLBACK_URAI_APP'",
    'test "$RELEASE_SHA" = "$CURRENT_MAIN_SHA"',
    'test "$ROLLBACK_SHA" = "$CURRENT_MAIN_SHA"',
    'test "$RELEASE_SHA" != "$ROLLBACK_SHA"',
    'git merge-base --is-ancestor',
    "URAI_RELEASE_OPERATION: ${{ inputs.confirm == 'ROLLBACK_URAI_APP' && 'deploy' || 'rollback' }}",
    'if test "$PRIMARY_OPERATION" = \'deploy\'; then',
    "export URAI_RELEASE_OPERATION='rollback'",
    "export URAI_RELEASE_OPERATION='deploy'",
    'gh workflow run spatial-live-deploy-v2.yml --ref main',
  ], 'protected release workflow')
})
