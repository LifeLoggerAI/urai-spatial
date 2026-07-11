import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const normalizeNewlines = (source) => source.replace(/\r\n?/g, '\n')
const hosting = JSON.parse(readFileSync('../firebase.static.json', 'utf8')).hosting
const layout = normalizeNewlines(readFileSync('src/app/layout.tsx', 'utf8'))
const operator = normalizeNewlines(readFileSync('../scripts/live-release.mjs', 'utf8'))
const bundleBuilder = normalizeNewlines(readFileSync('../scripts/create-static-release-bundle.mjs', 'utf8'))
const bundleAlias = normalizeNewlines(readFileSync('../scripts/attest-static-release-bundle.mjs', 'utf8'))
const fingerprintWriter = normalizeNewlines(readFileSync('../scripts/write-release-fingerprint.mjs', 'utf8'))
const verifier = normalizeNewlines(readFileSync('../scripts/urai-post-deploy-smoke.mjs', 'utf8'))
const workflow = normalizeNewlines(readFileSync('../.github/workflows/spatial-live-deploy.yml', 'utf8'))
const credentialBoundary = normalizeNewlines(readFileSync('../scripts/verify-release-credential-boundary.mjs', 'utf8'))

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

test('public markup embeds exact build identity or reports unverified', () => {
  assert.match(layout, /NEXT_PUBLIC_URAI_BUILD_SHA/)
  assert.match(layout, /process\.env\.GITHUB_SHA/)
  assert.match(layout, /urai-deployed-sha/)
  assert.match(layout, /data-deployed-sha/)
  assert.match(layout, /data-deployment-evidence/)
  assert.match(layout, /unverified/)
})

test('release operator is exact-SHA, rollback-aware, protected, fingerprinted, and hosting-only', () => {
  for (const marker of [
    'Release SHA must be a full lowercase 40-character commit SHA',
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
  ]) assert.ok(operator.includes(marker), `missing operator marker: ${marker}`)
  assert.match(operator, /'--only', 'hosting'/)
  assert.doesNotMatch(operator, /hosting,firestore/)
  assert.doesNotMatch(operator, /firestore:indexes/)
  assert.doesNotMatch(operator, /functions/)
})

test('authority attester binds exact regular files to authority, target, rollback, and fingerprint', () => {
  for (const marker of [
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
  ]) assert.ok(bundleBuilder.includes(marker), `missing attester marker: ${marker}`)
  assert.match(bundleAlias, /import '\.\/create-static-release-bundle\.mjs'/)
})

test('target build, clean authority attestation, and production deploy use separate jobs', () => {
  const buildJob = jobSection(workflow, 'build-release-output')
  const attestJob = jobSection(workflow, 'attest-release-bundle')
  const deployJob = jobSection(workflow, 'deploy')

  for (const marker of [
    'Build exact static target without production authority or credentials',
    'needs: [verify, rollback-verify]',
    'Checkout exact release target only',
    'path: target',
    'pnpm install --frozen-lockfile',
    'pnpm build:static',
    'Upload unattested raw static output',
  ]) assert.ok(buildJob.includes(marker), `missing build-isolation marker: ${marker}`)
  assert.doesNotMatch(buildJob, /environment:\s*production/)
  assert.doesNotMatch(buildJob, /FIREBASE_SERVICE_ACCOUNT_JSON|GOOGLE_APPLICATION_CREDENTIALS/)
  assert.doesNotMatch(buildJob, /node scripts\/create-static-release-bundle\.mjs/)

  for (const marker of [
    'Attest raw static output with clean current authority',
    'needs: [verify, rollback-verify, build-release-output]',
    'Checkout clean current release authority only',
    'Download unattested raw static output',
    'node scripts/verify-release-credential-boundary.mjs',
    'node scripts/create-static-release-bundle.mjs',
    'Upload authority-attested static release bundle',
  ]) assert.ok(attestJob.includes(marker), `missing attestation-isolation marker: ${marker}`)
  assert.doesNotMatch(attestJob, /environment:\s*production/)
  assert.doesNotMatch(attestJob, /FIREBASE_SERVICE_ACCOUNT_JSON|GOOGLE_APPLICATION_CREDENTIALS/)
  assert.doesNotMatch(attestJob, /path:\s*target|working-directory:\s*target|pnpm\s+build:static/)

  for (const marker of [
    'Deploy or roll back verified static bundle on urai.app',
    'needs: [verify, rollback-verify, attest-release-bundle]',
    'Checkout current release authority only',
    'pnpm install --frozen-lockfile --ignore-scripts',
    'actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093',
    'node scripts/live-release.mjs --verify-prebuilt',
    'node scripts/live-release.mjs --deploy-prebuilt',
    'node scripts/urai-release-control-smoke.mjs',
  ]) assert.ok(deployJob.includes(marker), `missing deploy-isolation marker: ${marker}`)
  assert.doesNotMatch(deployJob, /uses:\s+actions\/download-artifact@v\d/)
  assert.doesNotMatch(deployJob, /path:\s*target/)
  assert.doesNotMatch(deployJob, /working-directory:\s*target/)
  assert.doesNotMatch(deployJob, /pnpm\s+build:static/)
  assert.doesNotMatch(deployJob, /node\s+\.\.\/authority\//)
})

test('release credentials and deploy executable are isolated from target-controlled code', () => {
  for (const marker of [
    'delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON',
    'delete process.env.GOOGLE_APPLICATION_CREDENTIALS',
    'delete env.FIREBASE_SERVICE_ACCOUNT_JSON',
    'delete env.GOOGLE_APPLICATION_CREDENTIALS',
    'managedCredentialFilename',
    'function resolveManagedCredentialPath({ required = false } = {})',
    'resolveManagedCredentialPath({ required: true })',
    'Credential path must stay inside RUNNER_TEMP',
    'if (required) throw new Error(`Credential path must use the dedicated managed filename',
    '\nremoveTemporaryServiceAccount()\nconst authoritySha',
    'validateAndMaterializePrebuiltBundle',
    'manifest.authoritySha !== authoritySha',
    'Release bundle file set, sizes, or hashes do not match the manifest',
    'resolveAuthorityFirebaseCli',
    'realpathSync(firebaseCliPath)',
    'writeTemporaryServiceAccount',
    "flag: 'wx'",
    'deployHostingWithTemporaryCredentials',
    'removeTemporaryServiceAccount',
    'shell: false',
  ]) assert.ok(operator.includes(marker), `missing credential-isolation marker: ${marker}`)

  assert.match(workflow, /GOOGLE_APPLICATION_CREDENTIALS: \$\{\{ runner\.temp \}\}\/urai-firebase-service-account\.json/)
  assert.match(workflow, /URAI_FIREBASE_CLI: \$\{\{ github\.workspace \}\}\/node_modules\/\.bin\/firebase/)
  assert.match(workflow, /node scripts\/verify-release-credential-boundary\.mjs/)
  assert.doesNotMatch(workflow, /printf\s+['"]%s['"]\s+"\$FIREBASE_SERVICE_ACCOUNT_JSON"\s*>\s*"\$GOOGLE_APPLICATION_CREDENTIALS"/)
  assert.doesNotMatch(operator, /pnpm\s+exec\s+firebase/)

  assert.match(credentialBoundary, /normalizeNewlines/)
  assert.match(credentialBoundary, /urai-release-credential-boundary-4/)
  assert.match(credentialBoundary, /secretOccurrences !== 1/)
  assert.match(credentialBoundary, /lineEndingsNormalized: true/)
  assert.match(credentialBoundary, /targetBuildIsolated: true/)
  assert.match(credentialBoundary, /authorityAttestationIsolated: true/)
  assert.match(credentialBoundary, /targetCodeExecutesInProductionJob: false/)
  assert.match(credentialBoundary, /releaseOperatorFullBundleVerificationPresent/)
  assert.match(credentialBoundary, /downloadedBundleRunBound/)
  assert.match(credentialBoundary, /downloadedBundleFingerprintBound/)
  assert.match(credentialBoundary, /fullBundleVerificationStatus/)
  assert.match(credentialBoundary, /canonicalDeployBundleDirectory/)
  assert.match(credentialBoundary, /path\.join\(runnerTemp, 'urai-release-bundle'\)/)
  assert.match(credentialBoundary, /credentialsMaterializedByAuthorityOnly: true/)
  assert.match(credentialBoundary, /unmanagedLocalCredentialPathsIgnoredDuringVerification: true/)
  assert.match(credentialBoundary, /managedCredentialPathRequiredForProductionWrite: true/)
  assert.match(credentialBoundary, /firebaseCliResolvedFromCurrentAuthority: true/)
})

test('fingerprint writer publishes exact release and distinct recovery authority', () => {
  assert.match(fingerprintWriter, /urai-release-fingerprint-1/)
  assert.match(fingerprintWriter, /releaseSha/)
  assert.match(fingerprintWriter, /rollbackSha/)
  assert.match(fingerprintWriter, /Release and rollback SHAs must be distinct/)
  assert.match(fingerprintWriter, /urai-4dc1d/)
  assert.match(fingerprintWriter, /https:\/\/urai\.app/)
  assert.match(fingerprintWriter, /hosting-only/)
})

test('post-deploy verifier checks current routes, stale markers, queries, SHA, and public fingerprint', () => {
  for (const marker of [
    'aaa-final-home-sky-ground-orb-body-portals',
    'walkable-first-person-ground-layer',
    'urai-r3f-canonical-lifemap',
    'replay-route-launch-fingerprint',
    'privacy-consent-console',
    'premium-emotional-weather-atlas',
    'urai-final-status-control-room',
    'Home threshold',
    'World online. Route matrix visible.',
  ]) assert.ok(verifier.includes(marker), `missing verifier marker: ${marker}`)
  assert.match(verifier, /URAI_EXPECTED_DEPLOYED_SHA/)
  assert.match(verifier, /URAI_EXPECTED_ROLLBACK_SHA/)
  assert.match(verifier, /release-fingerprint\.json/)
  assert.match(verifier, /urai-release-fingerprint-1/)
  assert.match(verifier, /finalUrl\.search === requested\.search/)
  assert.match(verifier, /sha === expectedSha/)
  assert.match(verifier, /fingerprint\.passed/)
  assert.match(verifier, /live-content-parity-2/)
  assert.match(verifier, /hydratedIdentityProof/)
})

test('production deploy and rollback remain manual, exact-SHA, distinct-recovery, and protected', () => {
  for (const marker of [
    'workflow_dispatch:',
    "inputs.confirm == 'DEPLOY_URAI_APP' || inputs.confirm == 'ROLLBACK_URAI_APP'",
    'rollback-verify:',
    'build-release-output:',
    'attest-release-bundle:',
    'needs: [verify, rollback-verify, build-release-output]',
    'needs: [verify, rollback-verify, attest-release-bundle]',
    'environment: production',
    'ROLLBACK_SHA: ${{ inputs.rollback_sha }}',
    'test "$RELEASE_SHA" = "$CURRENT_MAIN_SHA"',
    'test "$ROLLBACK_SHA" = "$CURRENT_MAIN_SHA"',
    'git merge-base --is-ancestor',
    'FIREBASE_SERVICE_ACCOUNT_JSON',
    'Remove temporary credentials',
    'gh workflow run spatial-live-deploy.yml --ref main',
  ]) assert.ok(workflow.includes(marker), `missing workflow marker: ${marker}`)
})
