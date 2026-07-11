import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const normalizeNewlines = (source) => source.replace(/\r\n?/g, '\n')
const hosting = JSON.parse(readFileSync('../firebase.static.json', 'utf8')).hosting
const layout = normalizeNewlines(readFileSync('src/app/layout.tsx', 'utf8'))
const operator = normalizeNewlines(readFileSync('../scripts/live-release.mjs', 'utf8'))
const bundleBuilder = normalizeNewlines(readFileSync('../scripts/create-static-release-bundle.mjs', 'utf8'))
const fingerprintWriter = normalizeNewlines(readFileSync('../scripts/write-release-fingerprint.mjs', 'utf8'))
const verifier = normalizeNewlines(readFileSync('../scripts/urai-post-deploy-smoke.mjs', 'utf8'))
const workflow = normalizeNewlines(readFileSync('../.github/workflows/spatial-live-deploy.yml', 'utf8'))
const credentialBoundary = normalizeNewlines(readFileSync('../scripts/verify-release-credential-boundary.mjs', 'utf8'))

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

test('static bundle is hash-bound to authority, target, rollback, and exact regular files', () => {
  for (const marker of [
    "schemaVersion: 'urai-static-release-bundle-1'",
    'authoritySha',
    'targetSha',
    'rollbackSha',
    'Release bundle source must not contain symlinks',
    'Copied release bundle bytes do not match the source output',
    'release-fingerprint.json',
    'fileCount',
    'totalBytes',
    'sha256',
  ]) assert.ok(bundleBuilder.includes(marker), `missing bundle marker: ${marker}`)
})

test('target build is isolated from the protected production runner', () => {
  const prepareStart = workflow.indexOf('\n  prepare-release-bundle:')
  const deployStart = workflow.indexOf('\n  deploy:')
  assert.ok(prepareStart >= 0)
  assert.ok(deployStart > prepareStart)
  const prepareJob = workflow.slice(prepareStart, deployStart)
  const deployJob = workflow.slice(deployStart)

  for (const marker of [
    'Prepare exact static release bundle without production credentials',
    'path: target',
    'pnpm install --frozen-lockfile',
    'pnpm build:static',
    'node ../authority/scripts/create-static-release-bundle.mjs',
    'actions/upload-artifact@v4',
  ]) assert.match(prepareJob, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  assert.doesNotMatch(prepareJob, /environment:\s*production/)
  assert.doesNotMatch(prepareJob, /FIREBASE_SERVICE_ACCOUNT_JSON/)
  assert.doesNotMatch(prepareJob, /GOOGLE_APPLICATION_CREDENTIALS/)

  for (const marker of [
    'Deploy or roll back verified static bundle on urai.app',
    'Checkout current release authority only',
    'pnpm install --frozen-lockfile --ignore-scripts',
    'actions/download-artifact@v4',
    'node scripts/live-release.mjs --verify-prebuilt',
    'node scripts/live-release.mjs --deploy-prebuilt',
    'node scripts/urai-release-control-smoke.mjs',
  ]) assert.ok(deployJob.includes(marker), `missing deploy-isolation marker: ${marker}`)
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
  assert.match(credentialBoundary, /urai-release-credential-boundary-1/)
  assert.match(credentialBoundary, /secretOccurrences !== 1/)
  assert.match(credentialBoundary, /lineEndingsNormalized: true/)
  assert.match(credentialBoundary, /targetBuildIsolatedOnNoSecretRunner: true/)
  assert.match(credentialBoundary, /targetCodeExecutesInProductionJob: false/)
  assert.match(credentialBoundary, /prebuiltArtifactHashVerified: true/)
  assert.match(credentialBoundary, /unmanagedLocalCredentialPathsIgnoredDuringVerification: true/)
  assert.match(credentialBoundary, /managedCredentialPathRequiredForProductionWrite: true/)
  assert.match(credentialBoundary, /managedCredentialPathConstrained: true/)
  assert.match(credentialBoundary, /firebaseCliResolvedFromCurrentAuthority: true/)
  assert.match(credentialBoundary, /staleCredentialsRemovedBeforeAllVerification: true/)
  assert.match(credentialBoundary, /materializationCoveredByCleanup: true/)
  assert.match(credentialBoundary, /targetCommandsReceiveRawSecret: false/)
  assert.match(credentialBoundary, /targetCommandsReceiveCredentialPath: false/)
  assert.match(credentialBoundary, /targetFirebaseCliReceivesCredentials: false/)
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
    'prepare-release-bundle:',
    'needs: [verify, rollback-verify, prepare-release-bundle]',
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
