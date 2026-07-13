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
    "segment.startsWith('.')",
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
  assert.match(operator, /'--only', 'hosting'/)
  assert.doesNotMatch(operator, /hosting,firestore|firestore:indexes|functions|pnpm\s+exec\s+firebase/)
})

test('build, authority attestation, and protected deploy are separate jobs', () => {
  const build = job(workflow, 'build-release-output')
  const attest = job(workflow, 'attest-release-bundle')
  const deploy = job(workflow, 'deploy')

  hasAll(build, [
    'Build exact static target without production authority or credentials',
    'Checkout exact release target only',
    'pnpm install --frozen-lockfile',
    'pnpm build:static',
    'Upload unattested raw static output',
  ], 'build job')
  assert.doesNotMatch(build, /environment:\s*production|FIREBASE_SERVICE_ACCOUNT_JSON|GOOGLE_APPLICATION_CREDENTIALS/)

  hasAll(attest, [
    'Attest raw static output with clean current authority',
    'Checkout clean current release authority only',
    'Download unattested raw static output',
    'node scripts/verify-release-credential-boundary.mjs',
    'node scripts/create-static-release-bundle.mjs',
    'Upload authority-attested static release bundle',
  ], 'attestation job')
  assert.doesNotMatch(attest, /environment:\s*production|FIREBASE_SERVICE_ACCOUNT_JSON|GOOGLE_APPLICATION_CREDENTIALS|pnpm\s+build:static/)

  hasAll(deploy, [
    'Deploy or roll back verified static bundle on urai.app',
    'environment: production',
    'Checkout current release authority only',
    'pnpm install --frozen-lockfile --ignore-scripts',
    'node scripts/live-release.mjs --verify-prebuilt',
    'node scripts/live-release.mjs --deploy-prebuilt',
    'node scripts/urai-release-control-smoke.mjs',
    'Remove temporary credentials',
  ], 'deploy job')
  assert.match(deploy, /GOOGLE_APPLICATION_CREDENTIALS: \$\{\{ runner\.temp \}\}\/urai-firebase-service-account\.json/)
  assert.match(deploy, /URAI_FIREBASE_CLI: \$\{\{ github\.workspace \}\}\/node_modules\/\.bin\/firebase/)
  assert.doesNotMatch(deploy, /working-directory:\s*target|pnpm\s+build:static/)
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
    "path.posix.basename(relative).startsWith('.')",
    'Release bundle manifest must not contain Firebase-ignored dotfiles',
    'Copied release bundle bytes do not match the source output',
    'fingerprintSha256',
    'fileCount',
    'totalBytes',
    'sha256',
  ], 'bundle attester')
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
