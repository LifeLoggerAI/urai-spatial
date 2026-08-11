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
const entrypoint = readRepo('scripts/live-release.mjs')
const operator = readRepo('scripts/live-release-wif.mjs')
const recovery = readRepo('scripts/firebase-hosting-recovery.mjs')
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
  hasAll(layout, ['NEXT_PUBLIC_URAI_BUILD_SHA', 'process.env.GITHUB_SHA', 'data-deployed-sha', 'data-deployment-evidence', 'unverified'], 'layout')
})

test('canonical entrypoint routes only to the WIF operator', () => {
  assert.match(entrypoint, /import '\.\/live-release-wif\.mjs'/)
  assert.doesNotMatch(entrypoint, /FIREBASE_SERVICE_ACCOUNT_JSON|private_key|credentials_json/)
})

test('release operator is exact-SHA, rollback-aware, hosting-only, and WIF bounded', () => {
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
    'assertFederatedCredentialContext',
    'GOOGLE_GHA_CREDS_PATH',
    "config?.type !== 'external_account'",
    'GCP_WIF_PROVIDER',
    'GCP_DEPLOY_SERVICE_ACCOUNT',
    'resolveAuthorityFirebaseCli',
    'deployHostingWithFederatedCredentials',
    'longLivedServiceAccountKeyUsed: false',
  ], 'operator')
  assert.match(operator, /'--only', 'hosting'/)
  assert.doesNotMatch(operator, /hosting,firestore|firestore:indexes|functions|pnpm\s+exec\s+firebase/)
  assert.doesNotMatch(operator, /writeTemporaryServiceAccount|createServiceAccountAssertion|accessTokenFromServiceAccount|serviceAccountFromEnvironment/)
})

test('Hosting recovery obtains short-lived access through federated gcloud ADC', () => {
  hasAll(recovery, [
    'accessTokenFromFederatedAdc',
    "gcloud(['auth', 'print-access-token'])",
    "schemaVersion: 'urai-firebase-hosting-recovery-2'",
    "authMode: 'wif'",
    "credentialClass: 'github-oidc-wif'",
  ], 'recovery')
  assert.doesNotMatch(recovery, /createSign|createServiceAccountAssertion|accessTokenFromServiceAccount|serviceAccountFromEnvironment/)
})

test('bundle producer and verifier use one global manifest path order', () => {
  const marker = 'return files.sort((left, right) => left.relative.localeCompare(right.relative))'
  assert.ok(bundleBuilder.includes(marker), 'bundle attester must globally sort paths')
  assert.ok(operator.includes(marker), 'bundle verifier must globally sort paths')
})

test('build, authority attestation, and protected WIF deploy are separate jobs', () => {
  const build = job(workflow, 'build-release-output')
  const attest = job(workflow, 'attest-release-bundle')
  const deploy = job(workflow, 'deploy')

  hasAll(build, ['Build exact static target without production authority or credentials', 'Checkout exact release target only', 'pnpm install --frozen-lockfile', 'pnpm build:static', 'Upload unattested raw static output'], 'build job')
  assert.doesNotMatch(build, /environment:\s*production|id-token:\s*write|google-github-actions\/auth@|GOOGLE_APPLICATION_CREDENTIALS|GCP_DEPLOY_SERVICE_ACCOUNT/)

  hasAll(attest, ['Attest raw static output with clean current authority', 'Checkout clean current release authority only', 'Download unattested raw static output', 'node scripts/verify-release-credential-boundary.mjs', 'node scripts/create-static-release-bundle.mjs', 'Upload authority-attested static release bundle'], 'attestation job')
  assert.doesNotMatch(attest, /environment:\s*production|id-token:\s*write|google-github-actions\/auth@|GOOGLE_APPLICATION_CREDENTIALS|GCP_DEPLOY_SERVICE_ACCOUNT|pnpm\s+build:static/)

  hasAll(deploy, [
    'Deploy or roll back verified static bundle on urai.app',
    'environment: production',
    'permissions:\n      contents: read\n      id-token: write',
    'Checkout current release authority only',
    'pnpm install --frozen-lockfile --ignore-scripts',
    'Verify downloaded bundle before production authentication exists',
    'node scripts/live-release.mjs --verify-prebuilt',
    'google-github-actions/auth@7c6bc770dae815cd3e89ee6cdf493a5fab2cc093',
    'google-github-actions/setup-gcloud@aa5489c8933f4cc7a4f7d45035b3b1440c9c10db',
    'workload_identity_provider: ${{ vars.GCP_WIF_PROVIDER }}',
    'service_account: ${{ secrets.GCP_DEPLOY_SERVICE_ACCOUNT }}',
    'Prove federated production identity without exposing credentials',
    'node scripts/live-release.mjs --deploy-prebuilt',
    'node scripts/urai-release-control-smoke.mjs',
  ], 'deploy job')
  assert.match(deploy, /URAI_FIREBASE_CLI: \$\{\{ github\.workspace \}\}\/node_modules\/\.bin\/firebase/)
  assert.doesNotMatch(deploy, /credentials_json\s*:|FIREBASE_SERVICE_ACCOUNT_JSON:\s*\$\{\{\s*secrets\./)
  assert.doesNotMatch(deploy, /working-directory:\s*target|pnpm\s+build:static/)
})

test('bundle verification precedes WIF authentication and mutation', () => {
  const deploy = job(workflow, 'deploy')
  const verifyBundleIndex = deploy.indexOf('node scripts/live-release.mjs --verify-prebuilt')
  const authIndex = deploy.indexOf('Authenticate dedicated production deploy identity through GitHub OIDC/WIF')
  const identityIndex = deploy.indexOf('Prove federated production identity without exposing credentials')
  const deployIndex = deploy.indexOf('node scripts/live-release.mjs --deploy-prebuilt')
  const liveSmokeIndex = deploy.indexOf('node scripts/urai-release-control-smoke.mjs')
  assert.ok(verifyBundleIndex >= 0)
  assert.ok(authIndex > verifyBundleIndex)
  assert.ok(identityIndex > authIndex)
  assert.ok(deployIndex > identityIndex)
  assert.ok(liveSmokeIndex > deployIndex)
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
    'Copied release bundle bytes do not match the source output',
    'fingerprintSha256',
    'fileCount',
    'totalBytes',
    'sha256',
  ], 'bundle attester')
  hasAll(credentialBoundary, [
    'urai-release-credential-boundary-5',
    'targetBuildIsolated: true',
    'authorityAttestationIsolated: true',
    'targetCodeExecutesInProductionJob: false',
    'wifOnlyProductionAuth: true',
    'longLivedServiceAccountKeyForbidden: true',
    'federatedCredentialFileRequiredForProductionWrite: true',
    'firebaseCliResolvedFromCurrentAuthority: true',
    'downloadedBundleRunBound',
    'downloadedBundleFingerprintBound',
    'liveRollbackEvidenceDirectory',
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
  assert.ok(verifier.includes(expected))
  assert.ok(!verifier.includes(obsolete))
})

test('legacy bootstrap remains fingerprint-absence-only and recovery-bound', () => {
  hasAll(workflow, [
    'BOOTSTRAP_LEGACY_URAI_APP',
    "URAI_LEGACY_BOOTSTRAP: ${{ inputs.confirm == 'BOOTSTRAP_LEGACY_URAI_APP' && '1' || '0' }}",
    'URAI_LEGACY_BOOTSTRAP_CONFIRM: ${{ inputs.confirm }}',
    'git merge-base --is-ancestor "$ROLLBACK_SHA" "$RELEASE_SHA"',
  ], 'legacy bootstrap workflow')
  hasAll(credentialBoundary, ['legacyBootstrapRequested', 'legacyBootstrapProofRequired', 'verifyLegacyLiveBootstrap', 'legacyBootstrapProofVerified'], 'legacy bootstrap credential boundary')
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
    'grep -R --fixed-strings --include=\'*.html\' -q "$PROOF_SHA" urai-tier1/out',
    'grep -R --fixed-strings --include=\'*.html\' -q "$RELEASE_SHA" target/urai-tier1/out',
  ], 'direct static SHA proof')
  assert.doesNotMatch(workflow, /--include='\*\.html' -l \| grep -q \./)
})

test('manual deploy and rollback preserve distinct target and recovery identities', () => {
  hasAll(workflow, [
    'workflow_dispatch:',
    'rollback-verify:',
    'build-release-output:',
    'attest-release-bundle:',
    'ROLLBACK_SHA: ${{ inputs.rollback_sha }}',
    'test "$RELEASE_SHA" = "$CURRENT_MAIN_SHA"',
    'test "$ROLLBACK_SHA" = "$CURRENT_MAIN_SHA"',
    'test "$RELEASE_SHA" != "$CURRENT_MAIN_SHA"',
    'git merge-base --is-ancestor',
    'gh workflow run spatial-live-deploy.yml --ref main',
  ], 'protected release workflow')
})
