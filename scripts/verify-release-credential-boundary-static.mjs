#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const normalizeNewlines = (source) => source.replace(/\r\n?/g, '\n')
const workflow = normalizeNewlines(readFileSync(path.join(root, '.github', 'workflows', 'spatial-live-deploy.yml'), 'utf8'))
const operator = normalizeNewlines(readFileSync(path.join(root, 'scripts', 'live-release.mjs'), 'utf8'))
const bundleBuilder = normalizeNewlines(readFileSync(path.join(root, 'scripts', 'create-static-release-bundle.mjs'), 'utf8'))
const failures = []

const immutableActions = {
  checkout: 'actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683',
  setupNode: 'actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020',
  uploadArtifact: 'actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02',
  downloadArtifact: 'actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093',
}

function requireMarker(label, source, marker) {
  if (!source.includes(marker)) failures.push(`${label} missing marker: ${marker}`)
}
function forbid(label, source, pattern, description) {
  if (pattern.test(source)) failures.push(`${label} contains forbidden ${description}`)
}
function jobSection(source, jobName) {
  const marker = `\n  ${jobName}:\n`
  const start = source.indexOf(marker)
  if (start < 0) return ''
  const rest = source.slice(start + marker.length)
  const next = rest.search(/\n  [A-Za-z0-9_-]+:\n/)
  return next < 0 ? rest : rest.slice(0, next)
}

const quarantineMode =
  workflow.includes('name: URAI Canonical Production Release Verification') &&
  workflow.includes('Verify canonical source with production release quarantined') &&
  workflow.includes('Classification: NO-GO') &&
  operator.includes('URAI Spatial production release is NO-GO')
const secretMarker = 'FIREBASE_SERVICE_ACCOUNT_JSON: ${{ secrets.FIREBASE_SERVICE_ACCOUNT_JSON }}'
const secretOccurrences = workflow.split(secretMarker).length - 1

forbid('Workflow', workflow, /uses:\s+actions\/(?:checkout|setup-node|upload-artifact|download-artifact)@v\d+(?:\.\d+){0,2}/, 'mutable release action tag')
forbid('Workflow', workflow, /uses:\s+actions\/(?:checkout|setup-node|upload-artifact|download-artifact)@(?![0-9a-f]{40}(?:\s|#|$))[^\s]+/, 'non-immutable release action reference')

if (quarantineMode) {
  const verifyJob = jobSection(workflow, 'verify')
  if (!verifyJob) failures.push('Quarantine workflow is missing verify job')
  for (const action of [immutableActions.checkout, immutableActions.setupNode, immutableActions.uploadArtifact]) requireMarker('Quarantine immutable action', workflow, action)
  requireMarker('Quarantine workflow', workflow, 'permissions:\n  contents: read')
  requireMarker('Quarantine workflow', workflow, 'persist-credentials: false')
  requireMarker('Quarantine workflow', workflow, 'Verify production authority is fail-closed')
  requireMarker('Quarantine workflow', workflow, 'Production mutation is forbidden while provider WIF/IAM and runtime identity remain unproven.')
  requireMarker('Quarantine workflow', workflow, 'Classification: NO-GO')
  if (secretOccurrences !== 0) failures.push(`Quarantine must contain zero raw service-account secrets; found ${secretOccurrences}`)
  forbid('Quarantine workflow', workflow, /environment:\s*production/, 'production environment')
  forbid('Quarantine workflow', workflow, /id-token:\s*write/, 'OIDC mutation authority')
  forbid('Quarantine workflow', workflow, /credentials_json\s*:|FIREBASE_PRIVATE_KEY|FIREBASE_CLIENT_EMAIL|firebase-service-account\.json/, 'long-lived credential material')
  forbid('Quarantine workflow', workflow, /node\s+scripts\/live-release\.mjs\s+--deploy(?:-prebuilt)?|firebase(?:-tools)?(?:@[^\s]+)?\s+deploy|pnpm\s+live:deploy/, 'production mutation command')
  for (const marker of [
    "process.argv.includes('--deploy')",
    "process.argv.includes('--deploy-prebuilt')",
    "'FIREBASE_SERVICE_ACCOUNT_JSON'",
    "'FIREBASE_PRIVATE_KEY'",
    "'FIREBASE_CLIENT_EMAIL'",
    "'FIREBASE_TOKEN'",
    'Refusing long-lived Firebase credential environment variable:',
    'URAI Spatial production release is NO-GO',
    'No provider credentials were loaded and no production mutation was attempted.',
  ]) requireMarker('Quarantine release operator', operator, marker)
  forbid('Quarantine release operator', operator, /firebase(?:-tools)?(?:@[^\s]+)?\s+deploy|credential\.cert\s*\(|createSign\s*\(|writeTemporaryServiceAccount|deployHostingWithTemporaryCredentials/, 'credential materialization or mutation path')
} else {
  const verifyJob = jobSection(workflow, 'verify')
  const rollbackJob = jobSection(workflow, 'rollback-verify')
  const buildJob = jobSection(workflow, 'build-release-output')
  const attestJob = jobSection(workflow, 'attest-release-bundle')
  const deployJob = jobSection(workflow, 'deploy')
  for (const [name, section] of Object.entries({ verifyJob, rollbackJob, buildJob, attestJob, deployJob })) {
    if (!section) failures.push(`Workflow is missing ${name}`)
  }
  for (const action of Object.values(immutableActions)) requireMarker('Active release immutable action', workflow, action)
  if (secretOccurrences !== 1) failures.push(`Workflow must scope the service-account secret to exactly one step; found ${secretOccurrences}`)
  if (!deployJob.includes(secretMarker)) failures.push('Raw service-account secret must occur only inside the protected deploy job')
  if (buildJob.includes(secretMarker) || attestJob.includes(secretMarker)) failures.push('Build and attestation jobs must not receive the raw service-account secret')
  for (const marker of ['name: Exact-head release verification', 'Verify target credential boundary']) requireMarker('Exact-head verify job', verifyJob, marker)
  for (const marker of ['name: Prove rollback target with current authority', 'Checkout current release authority', 'node scripts/verify-release-credential-boundary.mjs']) requireMarker('Rollback authority job', rollbackJob, marker)
  for (const marker of ['name: Build exact static target without production authority or credentials', 'Checkout exact release target only', 'path: target', 'pnpm install --frozen-lockfile', 'pnpm build:static', 'Upload unattested raw static output']) requireMarker('Target-only build job', buildJob, marker)
  forbid('Target-only build job', buildJob, /environment:\s*production|FIREBASE_SERVICE_ACCOUNT_JSON|GOOGLE_APPLICATION_CREDENTIALS|--deploy-prebuilt/, 'production authority, credential, or deploy command')
  for (const marker of ['name: Attest raw static output with clean current authority', 'Checkout clean current release authority only', immutableActions.downloadArtifact, 'node scripts/verify-release-credential-boundary.mjs', 'node scripts/create-static-release-bundle.mjs', 'Upload authority-attested static release bundle']) requireMarker('Authority attestation job', attestJob, marker)
  forbid('Authority attestation job', attestJob, /environment:\s*production|FIREBASE_SERVICE_ACCOUNT_JSON|GOOGLE_APPLICATION_CREDENTIALS|working-directory:\s*target|pnpm\s+build:static/, 'production authority or target execution')
  for (const marker of ['name: Deploy or roll back verified static bundle on urai.app', 'environment: production', 'Checkout current release authority only', 'pnpm install --frozen-lockfile --ignore-scripts', immutableActions.downloadArtifact, 'node scripts/verify-release-credential-boundary.mjs', 'node scripts/live-release.mjs --verify-prebuilt', 'node scripts/live-release.mjs --deploy-prebuilt', 'node scripts/urai-release-control-smoke.mjs', 'Remove temporary credentials']) requireMarker('Protected deploy job', deployJob, marker)
  forbid('Protected deploy job', deployJob, /path:\s*target|working-directory:\s*target|pnpm\s+build:static|node\s+\.\.\/authority\//, 'target execution')
  for (const marker of [
    "process.argv.includes('--verify-prebuilt')",
    "process.argv.includes('--deploy-prebuilt')",
    'function validateAndMaterializePrebuiltBundle',
    "manifest.schemaVersion !== 'urai-static-release-bundle-1'",
    'Release bundle file set, sizes, or hashes do not match the manifest',
    'function resolveAuthorityFirebaseCli()',
    'Firebase CLI must resolve inside current authority',
    'function writeTemporaryServiceAccount()',
    "flag: 'wx'",
    'function deployHostingWithTemporaryCredentials()',
  ]) requireMarker('Active release operator', operator, marker)
  forbid('Active release operator', operator, /pnpm\s+exec\s+firebase/, 'package-manager-resolved Firebase CLI')
}

for (const marker of [
  "schemaVersion: 'urai-static-release-bundle-1'",
  'assertCleanAuthorityCheckout()',
  'writeAuthoritativeFingerprint()',
  'Release bundle source must not contain symlinks',
  'Copied release bundle bytes do not match the source output',
  'fingerprintSha256',
  'authoritySha',
  'targetSha',
  'rollbackSha',
]) requireMarker('Authority bundle attester', bundleBuilder, marker)

const report = {
  schemaVersion: 'urai-release-credential-boundary-static-6',
  ok: failures.length === 0,
  mode: quarantineMode ? 'quarantine-no-go' : 'active-release',
  secretOccurrences,
  lineEndingsNormalized: true,
  thirdPartyActionsPinned: true,
  rollbackAuthorityVerifierUsesCurrentAuthority: true,
  targetBuildIsolated: true,
  authorityAttestationIsolated: true,
  targetCodeExecutesInProductionJob: false,
  releaseOperatorVerifiesFullBundleManifest: !quarantineMode,
  credentialsMaterializedByAuthorityOnly: !quarantineMode,
  unmanagedLocalCredentialPathsIgnoredDuringVerification: true,
  managedCredentialPathRequiredForProductionWrite: !quarantineMode,
  managedCredentialRetainedThroughStrictSmokeOnly: !quarantineMode,
  managedCredentialCleanupIsAlwaysRunAfterStrictSmoke: !quarantineMode,
  firebaseCliResolvedFromCurrentAuthority: !quarantineMode,
  productionMutationAvailable: !quarantineMode,
  productionCredentialsAvailable: !quarantineMode,
  failures,
}
console.log(JSON.stringify(report, null, 2))
if (failures.length) process.exitCode = 1
