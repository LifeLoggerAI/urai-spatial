import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const normalizeNewlines = (source) => source.replace(/\r\n?/g, '\n')
const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const tier1Root = path.resolve(testDirectory, '..')
const repositoryRoot = path.resolve(tier1Root, '..')
const readTier1 = (relativePath) => normalizeNewlines(readFileSync(path.join(tier1Root, relativePath), 'utf8'))
const readRepository = (relativePath) => normalizeNewlines(readFileSync(path.join(repositoryRoot, relativePath), 'utf8'))

const hosting = JSON.parse(readRepository('firebase.static.json')).hosting
const layout = readTier1('src/app/layout.tsx')
const operator = readRepository('scripts/live-release.mjs')
const bundleBuilder = readRepository('scripts/create-static-release-bundle.mjs')
const bundleAlias = readRepository('scripts/attest-static-release-bundle.mjs')
const fingerprintWriter = readRepository('scripts/write-release-fingerprint.mjs')
const verifier = readRepository('scripts/urai-post-deploy-smoke.mjs')
const workflow = readRepository('.github/workflows/spatial-live-deploy.yml')
const credentialBoundary = readRepository('scripts/verify-release-credential-boundary.mjs')

function requireMarkers(source, markers, label) {
  for (const marker of markers) assert.ok(source.includes(marker), `missing ${label} marker: ${marker}`)
}

function jobSection(source, jobName) {
  const marker = `\n  ${jobName}:\n`
  const start = source.indexOf(marker)
  assert.ok(start >= 0, `missing workflow job: ${jobName}`)
  const rest = source.slice(start + marker.length)
  const next = rest.search(/\n  [A-Za-z0-9_-]+:\n/)
  return next < 0 ? rest : rest.slice(0, next)
}

test('static hosting publishes the canonical export without route masking', () => {
  assert.equal(hosting.public, 'urai-tier1/out')
  assert.equal(hosting.cleanUrls, true)
  assert.equal(hosting.trailingSlash, true)
  assert.deepEqual(hosting.rewrites, [])
})

test('public markup exposes exact deployment identity or unverified state', () => {
  requireMarkers(layout, [
    'NEXT_PUBLIC_URAI_BUILD_SHA',
    'process.env.GITHUB_SHA',
    'urai-deployed-sha',
    'data-deployed-sha',
    'data-deployment-evidence',
    'unverified',
  ], 'layout')
})

test('release operator is exact-SHA, rollback-aware, hosting-only, and shell-bounded', () => {
  requireMarkers(operator, [
    "requireFullSha('Release SHA', candidate)",
    'Current authority SHA',
    'ROLLBACK_SHA must be distinct from the release SHA',
    'write-release-fingerprint.mjs',
    'release-fingerprint.json',
    'fingerprintSha256',
    'URAI Canonical Production Release',
    'LifeLoggerAI/urai-spatial',
    'refs/heads/main',
    'CURRENT_MAIN_SHA',
    'urai-4dc1d',
    'firebase.static.json',
    'scripts/urai-post-deploy-smoke.mjs',
    'deployment-receipt',
    "process.argv.includes('--verify-prebuilt')",
    "process.argv.includes('--deploy-prebuilt')",
    "shell: process.platform === 'win32'",
  ], 'operator')
  assert.match(operator, /'--only', 'hosting'/)
  assert.doesNotMatch(operator, /hosting,firestore|firestore:indexes|functions/)
})

test('authority attester binds exact regular files to authority and fingerprint', () => {
  requireMarkers(bundleBuilder, [
    "schemaVersion: 'urai-static-release-bundle-1'",
    'assertCleanAuthorityCheckout()',
    'writeAuthoritativeFingerprint()',
    "attestedBy: 'scripts/create-static-release-bundle.mjs'",
    'authoritySha',
    'targetSha',
    'rollbackSha',
    'Release bundle source must not contain symlinks',
    'Copied release bundle bytes do not match the source output',
    'release-fingerprint.json',
    'fingerprintSha256',
    'Release bundle live URL is invalid or missing',
    'fileCount',
    'totalBytes',
    'sha256',
  ], 'attester')
  assert.match(bundleAlias, /import '\.\/create-static-release-bundle\.mjs'/)
})

test('target build, clean authority attestation, and production deploy are isolated', () => {
  const buildJob = jobSection(workflow, 'build-release-output')
  const attestJob = jobSection(workflow, 'attest-release-bundle')
  const deployJob = jobSection(workflow, 'deploy')

  requireMarkers(buildJob, [
    'Build exact static target without production authority or credentials',
    'needs: [verify, rollback-verify]',
    'Checkout exact release target only',
    'path: target',
    'pnpm install --frozen-lockfile',
    'pnpm build:static',
    'Upload unattested raw static output',
  ], 'build isolation')
  assert.doesNotMatch(buildJob, /environment:\s*production|FIREBASE_SERVICE_ACCOUNT_JSON|GOOGLE_APPLICATION_CREDENTIALS|create-static-release-bundle/)

  requireMarkers(attestJob, [
    'Attest raw static output with clean current authority',
    'needs: [verify, rollback-verify, build-release-output]',
    'Checkout clean current release authority only',
    'Download unattested raw static output',
    'node scripts/verify-release-credential-boundary.mjs',
    'node scripts/create-static-release-bundle.mjs',
    'Upload authority-attested static release bundle',
  ], 'attestation isolation')
  assert.doesNotMatch(attestJob, /environment:\s*production|FIREBASE_SERVICE_ACCOUNT_JSON|GOOGLE_APPLICATION_CREDENTIALS|working-directory:\s*target|pnpm\s+build:static/)

  requireMarkers(deployJob, [
    'Deploy or roll back verified static bundle on urai.app',
    'needs: [verify, rollback-verify, attest-release-bundle]',
    'Checkout current release authority only',
    'pnpm install --frozen-lockfile --ignore-scripts',
    'actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093',
    'node scripts/live-release.mjs --verify-prebuilt',
    'node scripts/live-release.mjs --deploy-prebuilt',
    'node scripts/urai-release-control-smoke.mjs',
  ], 'deploy isolation')
  assert.doesNotMatch(deployJob, /download-artifact@v\d|working-directory:\s*target|pnpm\s+build:static|node\s+\.\.\/authority\//)
})

test('credentials and deploy executable remain authority-isolated', () => {
  requireMarkers(operator, [
    'delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON',
    'delete process.env.GOOGLE_APPLICATION_CREDENTIALS',
    'delete env.FIREBASE_SERVICE_ACCOUNT_JSON',
    'delete env.GOOGLE_APPLICATION_CREDENTIALS',
    'managedCredentialFilename',
    'function resolveManagedCredentialPath({ required = false } = {})',
    'resolveManagedCredentialPath({ required: true })',
    'Credential path must stay inside RUNNER_TEMP',
    'validateAndMaterializePrebuiltBundle',
    'manifest.authoritySha !== authoritySha',
    'Release bundle file set, sizes, or hashes do not match the manifest',
    'resolveAuthorityFirebaseCli',
    'realpathSync(firebaseCliPath)',
    'writeTemporaryServiceAccount',
    "flag: 'wx'",
    'deployHostingWithTemporaryCredentials',
    'removeTemporaryServiceAccount',
  ], 'credential isolation')
  assert.match(workflow, /GOOGLE_APPLICATION_CREDENTIALS: \$\{\{ runner\.temp \}\}\/urai-firebase-service-account\.json/)
  assert.match(workflow, /URAI_FIREBASE_CLI: \$\{\{ github\.workspace \}\}\/node_modules\/\.bin\/firebase/)
  assert.doesNotMatch(operator, /pnpm\s+exec\s+firebase/)

  requireMarkers(credentialBoundary, [
    'normalizeNewlines',
    'urai-release-credential-boundary-4',
    'secretOccurrences !== 1',
    'lineEndingsNormalized: true',
    'targetBuildIsolated: true',
    'authorityAttestationIsolated: true',
    'targetCodeExecutesInProductionJob: false',
    'releaseOperatorFullBundleVerificationPresent',
    'downloadedBundleRunBound',
    'downloadedBundleFingerprintBound',
    'fullBundleVerificationStatus',
    'canonicalDeployBundleDirectory',
    "path.join(runnerTemp, 'urai-release-bundle')",
    'credentialsMaterializedByAuthorityOnly: true',
    'managedCredentialPathRequiredForProductionWrite: true',
    'firebaseCliResolvedFromCurrentAuthority: true',
  ], 'credential verifier')
})

test('fingerprint and live verifier bind route, SHA, authority, and canonical origin', () => {
  requireMarkers(fingerprintWriter, [
    'urai-release-fingerprint-1',
    'releaseSha',
    'rollbackSha',
    'authoritySha',
    'Release and rollback SHAs must be distinct',
    'urai-4dc1d',
    'https://urai.app',
    'hosting-only',
  ], 'fingerprint')
  requireMarkers(verifier, [
    'aaa-final-home-sky-ground-orb-body-portals',
    'walkable-first-person-ground-layer',
    'urai-r3f-canonical-lifemap',
    'replay-route-launch-fingerprint',
    'privacy-consent-console',
    'premium-emotional-weather-atlas',
    'urai-final-status-control-room',
    'URAI_EXPECTED_DEPLOYED_SHA',
    'URAI_EXPECTED_ROLLBACK_SHA',
    'release-fingerprint.json',
    "redirect: 'manual'",
    'finalUrl.origin === canonicalOrigin',
    'payload?.authoritySha === expectedAuthoritySha',
    'live-content-parity-3',
    'hydratedIdentityProof',
  ], 'post-deploy verifier')
})

test('production deploy and rollback remain manual, exact-SHA, and protected', () => {
  requireMarkers(workflow, [
    'workflow_dispatch:',
    "inputs.confirm == 'DEPLOY_URAI_APP' || inputs.confirm == 'ROLLBACK_URAI_APP'",
    'rollback-verify:',
    'build-release-output:',
    'attest-release-bundle:',
    'environment: production',
    'ROLLBACK_SHA: ${{ inputs.rollback_sha }}',
    'test "$RELEASE_SHA" = "$CURRENT_MAIN_SHA"',
    'test "$ROLLBACK_SHA" = "$CURRENT_MAIN_SHA"',
    'git merge-base --is-ancestor',
    'FIREBASE_SERVICE_ACCOUNT_JSON',
    'Remove temporary credentials',
    'gh workflow run spatial-live-deploy.yml --ref main',
  ], 'protected workflow')
})
