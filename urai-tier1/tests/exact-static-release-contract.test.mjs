import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const hosting = JSON.parse(readFileSync('../firebase.static.json', 'utf8')).hosting
const layout = readFileSync('src/app/layout.tsx', 'utf8')
const operator = readFileSync('../scripts/live-release.mjs', 'utf8')
const fingerprintWriter = readFileSync('../scripts/write-release-fingerprint.mjs', 'utf8')
const verifier = readFileSync('../scripts/urai-post-deploy-smoke.mjs', 'utf8')
const workflow = readFileSync('../.github/workflows/spatial-live-deploy.yml', 'utf8')
const credentialBoundary = readFileSync('../scripts/verify-release-credential-boundary.mjs', 'utf8')

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
    'Checked-out SHA',
    'ROLLBACK_SHA must be a full lowercase 40-character commit SHA',
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
  ]) assert.ok(operator.includes(marker), `missing operator marker: ${marker}`)
  assert.match(operator, /'--only', 'hosting'/)
  assert.doesNotMatch(operator, /hosting,firestore/)
  assert.doesNotMatch(operator, /firestore:indexes/)
  assert.doesNotMatch(operator, /functions/)
})

test('release credentials and deploy executable are isolated from target-controlled code', () => {
  for (const marker of [
    'delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON',
    'delete process.env.GOOGLE_APPLICATION_CREDENTIALS',
    'delete env.FIREBASE_SERVICE_ACCOUNT_JSON',
    'delete env.GOOGLE_APPLICATION_CREDENTIALS',
    'resolveAuthorityFirebaseCli',
    "realpathSync(path.resolve(authorityDirectory, '..'))",
    'realpathSync(firebaseCliPath)',
    'writeTemporaryServiceAccount',
    'deployHostingWithTemporaryCredentials',
    'removeTemporaryServiceAccount',
    'mode: 0o600',
    'shell: false',
  ]) assert.ok(operator.includes(marker), `missing credential-isolation marker: ${marker}`)

  assert.match(workflow, /GOOGLE_APPLICATION_CREDENTIALS: \$\{\{ runner\.temp \}\}\/urai-firebase-service-account\.json/)
  assert.match(workflow, /URAI_FIREBASE_CLI: \$\{\{ github\.workspace \}\}\/authority\/node_modules\/\.bin\/firebase/)
  assert.match(workflow, /Install current authority dependencies without production credentials/)
  assert.match(workflow, /Install frozen target dependencies without production credentials/)
  assert.match(workflow, /Deploy exact target with current authority and ephemeral credentials/)
  assert.match(workflow, /node scripts\/verify-release-credential-boundary\.mjs/)
  assert.doesNotMatch(workflow, /printf\s+['"]%s['"]\s+"\$FIREBASE_SERVICE_ACCOUNT_JSON"\s*>\s*"\$GOOGLE_APPLICATION_CREDENTIALS"/)
  assert.doesNotMatch(operator, /pnpm\s+exec\s+firebase/)

  assert.match(credentialBoundary, /urai-release-credential-boundary-1/)
  assert.match(credentialBoundary, /secretOccurrences !== 1/)
  assert.match(credentialBoundary, /firebaseCliResolvedFromCurrentAuthority: true/)
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
    'needs: [verify, rollback-verify]',
    'environment: production',
    'ROLLBACK_SHA: ${{ inputs.rollback_sha }}',
    'test "$RELEASE_SHA" = "$CURRENT_MAIN_SHA"',
    'test "$ROLLBACK_SHA" = "$CURRENT_MAIN_SHA"',
    'git merge-base --is-ancestor',
    'FIREBASE_SERVICE_ACCOUNT_JSON',
    'pnpm install --frozen-lockfile',
    'Remove temporary credentials',
    'gh workflow run spatial-live-deploy.yml --ref main',
  ]) assert.ok(workflow.includes(marker), `missing workflow marker: ${marker}`)
})
