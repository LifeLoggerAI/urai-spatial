#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const normalizeNewlines = (source) => source.replace(/\r\n?/g, '\n')
const workflow = normalizeNewlines(readFileSync(path.join(root, '.github', 'workflows', 'spatial-live-deploy.yml'), 'utf8'))
const entrypoint = normalizeNewlines(readFileSync(path.join(root, 'scripts', 'live-release.mjs'), 'utf8'))
const operator = normalizeNewlines(readFileSync(path.join(root, 'scripts', 'live-release-wif.mjs'), 'utf8'))
const recovery = normalizeNewlines(readFileSync(path.join(root, 'scripts', 'firebase-hosting-recovery.mjs'), 'utf8'))
const bundleBuilder = normalizeNewlines(readFileSync(path.join(root, 'scripts', 'create-static-release-bundle.mjs'), 'utf8'))
const failures = []

const immutableActions = {
  checkout: 'actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683',
  setupNode: 'actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020',
  uploadArtifact: 'actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02',
  downloadArtifact: 'actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093',
  googleAuth: 'google-github-actions/auth@7c6bc770dae815cd3e89ee6cdf493a5fab2cc093',
  setupGcloud: 'google-github-actions/setup-gcloud@aa5489c8933f4cc7a4f7d45035b3b1440c9c10db',
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

const verifyJob = jobSection(workflow, 'verify')
const rollbackJob = jobSection(workflow, 'rollback-verify')
const buildJob = jobSection(workflow, 'build-release-output')
const attestJob = jobSection(workflow, 'attest-release-bundle')
const deployJob = jobSection(workflow, 'deploy')
for (const [name, section] of Object.entries({ verifyJob, rollbackJob, buildJob, attestJob, deployJob })) {
  if (!section) failures.push(`Workflow is missing ${name}`)
}

for (const [name, action] of Object.entries(immutableActions)) requireMarker(`Immutable ${name} action`, workflow, action)
forbid('Workflow', workflow, /uses:\s+(?:actions|google-github-actions)\/[^\s]+@v\d+(?:\.\d+){0,2}/, 'mutable release action tag')
forbid('Workflow', workflow, /uses:\s+(?:actions|google-github-actions)\/[^\s]+@(?![0-9a-f]{40}(?:\s|#|$))[^\s]+/, 'non-immutable release action reference')

for (const marker of [
  'name: Exact-head release verification',
  'Verify target credential boundary',
]) requireMarker('Exact-head verify job', verifyJob, marker)
forbid('Exact-head verify job', verifyJob, /id-token:\s*write|google-github-actions\/auth@|GOOGLE_APPLICATION_CREDENTIALS|GCP_DEPLOY_SERVICE_ACCOUNT/, 'production federation authority')

for (const marker of [
  'name: Prove rollback target with current authority',
  'Checkout current release authority',
  'Verify current credential boundary',
  'working-directory: authority',
]) requireMarker('Rollback authority job', rollbackJob, marker)
forbid('Rollback authority job', rollbackJob, /id-token:\s*write|google-github-actions\/auth@|GCP_DEPLOY_SERVICE_ACCOUNT/, 'production federation authority')

for (const marker of [
  'name: Build exact static target without production authority or credentials',
  'needs: [verify, rollback-verify]',
  'Checkout exact release target only',
  'path: target',
  'pnpm install --frozen-lockfile',
  'pnpm build:static',
  'Upload unattested raw static output',
]) requireMarker('Target-only build job', buildJob, marker)
forbid('Target-only build job', buildJob, /environment:\s*production|id-token:\s*write|google-github-actions\/auth@|FIREBASE_SERVICE_ACCOUNT_JSON|GOOGLE_APPLICATION_CREDENTIALS|GCP_DEPLOY_SERVICE_ACCOUNT/, 'production authority or credentials')
forbid('Target-only build job', buildJob, /firebase\s+deploy|--deploy-prebuilt/, 'deployment command')

for (const marker of [
  'name: Attest raw static output with clean current authority',
  'needs: [verify, rollback-verify, build-release-output]',
  'Checkout clean current release authority only',
  immutableActions.downloadArtifact,
  'Download unattested raw static output',
  'node scripts/verify-release-credential-boundary.mjs',
  'node scripts/create-static-release-bundle.mjs',
  'Upload authority-attested static release bundle',
]) requireMarker('Authority attestation job', attestJob, marker)
forbid('Authority attestation job', attestJob, /environment:\s*production|id-token:\s*write|google-github-actions\/auth@|FIREBASE_SERVICE_ACCOUNT_JSON|GOOGLE_APPLICATION_CREDENTIALS|GCP_DEPLOY_SERVICE_ACCOUNT/, 'production authority or credentials')
forbid('Authority attestation job', attestJob, /path:\s*target|working-directory:\s*target|pnpm\s+(?:install|build:static)/, 'target checkout or execution')

const protectedDeployCommand = 'node scripts/live-release.mjs --deploy-prebuilt'
for (const marker of [
  'name: Deploy or roll back verified static bundle on urai.app',
  'needs: [verify, rollback-verify, attest-release-bundle]',
  'environment: production',
  'permissions:\n      contents: read\n      id-token: write',
  'Checkout current release authority only',
  'pnpm install --frozen-lockfile --ignore-scripts',
  immutableActions.downloadArtifact,
  'node scripts/verify-release-credential-boundary.mjs',
  'Verify downloaded bundle before production authentication exists',
  'node scripts/live-release.mjs --verify-prebuilt',
  'test -z "${GOOGLE_APPLICATION_CREDENTIALS:-}"',
  'Validate production WIF configuration',
  immutableActions.googleAuth,
  'workload_identity_provider: ${{ vars.GCP_WIF_PROVIDER }}',
  'service_account: ${{ secrets.GCP_DEPLOY_SERVICE_ACCOUNT }}',
  'create_credentials_file: true',
  'export_environment_variables: true',
  immutableActions.setupGcloud,
  'Prove federated production identity without exposing credentials',
  "schemaVersion: 'urai-production-wif-auth-1'",
  'externalAccountConfigVerified: true',
  'longLivedServiceAccountKeyUsed: false',
  protectedDeployCommand,
  'node scripts/urai-release-control-smoke.mjs',
  'Verify long-lived credential fallback remained absent',
  'URAI_FIREBASE_CLI: ${{ github.workspace }}/node_modules/.bin/firebase',
]) requireMarker('Protected deploy job', deployJob, marker)
forbid('Protected deploy job', deployJob, /path:\s*target|working-directory:\s*target|Checkout (?:frozen|exact) (?:release )?target/, 'target checkout')
forbid('Protected deploy job', deployJob, /pnpm\s+build:static|node\s+\.\.\/authority\//, 'target build or cross-checkout authority execution')
forbid('Protected deploy job', deployJob, /pnpm\s+install\s+--frozen-lockfile(?!\s+--ignore-scripts)/, 'lifecycle-enabled dependency install')
forbid('Protected deploy job', deployJob, /credentials_json\s*:|FIREBASE_SERVICE_ACCOUNT_JSON:\s*\$\{\{\s*secrets\./, 'long-lived JSON credential binding')

const rawSecretOccurrences = (workflow.match(/FIREBASE_SERVICE_ACCOUNT_JSON:\s*\$\{\{\s*secrets\./g) || []).length
if (rawSecretOccurrences !== 0) failures.push(`Workflow must contain zero raw service-account secret bindings; found ${rawSecretOccurrences}`)

const sequence = [
  'Verify downloaded bundle before production authentication exists',
  'Validate production WIF configuration',
  'Authenticate dedicated production deploy identity through GitHub OIDC/WIF',
  'Install pinned Google Cloud CLI action',
  'Prove federated production identity without exposing credentials',
  protectedDeployCommand,
  'Run canonical live smoke with current authority',
].map((marker) => deployJob.indexOf(marker))
if (sequence.some((index) => index < 0) || sequence.some((value, index) => index > 0 && value <= sequence[index - 1])) {
  failures.push('Protected deploy job must preserve verify, WIF auth, identity proof, deploy, and smoke ordering')
}

requireMarker('Release entrypoint', entrypoint, "import './live-release-wif.mjs'")
forbid('Release entrypoint', entrypoint, /FIREBASE_SERVICE_ACCOUNT_JSON|writeTemporaryServiceAccount/, 'legacy service-account key logic')

for (const marker of [
  "process.argv.includes('--verify-prebuilt')",
  "process.argv.includes('--deploy-prebuilt')",
  'function validateAndMaterializePrebuiltBundle',
  "manifest.schemaVersion !== 'urai-static-release-bundle-1'",
  'manifest.authoritySha !== authoritySha',
  'Release bundle file set, sizes, or hashes do not match the manifest',
  'Release bundle manifest totals do not match the verified files',
  'Materialized hosting output does not match the verified release bundle',
  'function resolveAuthorityFirebaseCli()',
  'Firebase CLI must resolve inside current authority',
  'function assertFederatedCredentialContext()',
  'GOOGLE_GHA_CREDS_PATH',
  "config?.type !== 'external_account'",
  'GCP_WIF_PROVIDER',
  'GCP_DEPLOY_SERVICE_ACCOUNT',
  'function deployHostingWithFederatedCredentials()',
  'const hostingCapture = await discoverCurrentLiveRelease()',
  'await recoverExactHostingVersion({',
  'federatedCredentialAvailableForStrictSmoke: true',
  'longLivedServiceAccountKeyUsed: false',
]) requireMarker('WIF release operator', operator, marker)
forbid('WIF release operator', operator, /writeTemporaryServiceAccount|removeTemporaryServiceAccount|createServiceAccountAssertion|serviceAccountJson|managedCredentialFilename/, 'long-lived service-account key logic')
forbid('WIF release operator', operator, /pnpm\s+exec\s+firebase/, 'package-manager-resolved Firebase CLI')

const captureIndex = operator.indexOf('const hostingCapture = await discoverCurrentLiveRelease()')
const deployCallIndex = operator.indexOf('deployHostingWithFederatedCredentials()', captureIndex)
const recoveryIndex = operator.indexOf('await recoverExactHostingVersion({', deployCallIndex)
const finalReceiptIndex = operator.indexOf("writeReceipt(targetSha, 'deployed'", recoveryIndex)
if ([captureIndex, deployCallIndex, recoveryIndex, finalReceiptIndex].some((index) => index < 0) || !(captureIndex < deployCallIndex && deployCallIndex < recoveryIndex && recoveryIndex < finalReceiptIndex)) {
  failures.push('WIF release operator must capture previous Hosting state before mutation and retain recovery before final receipt')
}

for (const marker of [
  'function accessTokenFromFederatedAdc(options = {})',
  "gcloud(['auth', 'print-access-token'])",
  "schemaVersion: 'urai-firebase-hosting-recovery-2'",
  "authMode: 'wif'",
  "credentialClass: 'github-oidc-wif'",
  'RESTORE_EXACT_HOSTING_VERSION',
]) requireMarker('WIF Hosting recovery', recovery, marker)
forbid('WIF Hosting recovery', recovery, /createSign|createServiceAccountAssertion|serviceAccountFromEnvironment|accessTokenFromServiceAccount/, 'private-key token minting')

for (const marker of [
  "schemaVersion: 'urai-static-release-bundle-1'",
  'assertCleanAuthorityCheckout()',
  'writeAuthoritativeFingerprint()',
  "attestedBy: 'scripts/create-static-release-bundle.mjs'",
  'Release bundle source must not contain symlinks',
  'Copied release bundle bytes do not match the source output',
  'fingerprintSha256',
  'authoritySha',
  'targetSha',
  'rollbackSha',
  'fileCount',
  'totalBytes',
]) requireMarker('Authority bundle attester', bundleBuilder, marker)

const report = {
  schemaVersion: 'urai-release-credential-boundary-static-6',
  ok: failures.length === 0,
  rawServiceAccountSecretOccurrences: rawSecretOccurrences,
  lineEndingsNormalized: true,
  thirdPartyActionsPinned: true,
  rollbackAuthorityVerifierUsesCurrentAuthority: true,
  targetBuildIsolated: true,
  authorityAttestationIsolated: true,
  targetCodeExecutesInProductionJob: false,
  releaseOperatorVerifiesFullBundleManifest: true,
  wifOnlyProductionAuth: true,
  longLivedServiceAccountKeyForbidden: true,
  federatedCredentialFileRequiredForProductionWrite: true,
  federatedCredentialRetainedThroughStrictSmokeByAuthAction: true,
  firebaseCliResolvedFromCurrentAuthority: true,
  failures,
}

console.log(JSON.stringify(report, null, 2))
if (failures.length) process.exitCode = 1
