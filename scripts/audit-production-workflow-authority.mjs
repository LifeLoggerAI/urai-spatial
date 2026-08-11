#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const workflowsDir = path.join(root, '.github', 'workflows')
const canonicalWorkflowPath = '.github/workflows/spatial-live-deploy.yml'
const securityWorkflowPath = '.github/workflows/release-security-path-guard.yml'
const captureWorkflowPath = '.github/workflows/capture-legacy-hosting-recovery.yml'
const failures = []

function normalize(value) {
  return value.replace(/\r\n?/g, '\n')
}

function read(relativePath) {
  const absolute = path.join(root, relativePath)
  if (!existsSync(absolute)) {
    failures.push(`Missing required authority file: ${relativePath}`)
    return ''
  }
  return normalize(readFileSync(absolute, 'utf8'))
}

function requireAll(label, source, markers) {
  for (const marker of markers) {
    if (!source.includes(marker)) failures.push(`${label} missing marker: ${marker}`)
  }
}

function forbidAny(label, source, markers) {
  for (const marker of markers) {
    if (source.includes(marker)) failures.push(`${label} contains forbidden marker: ${marker}`)
  }
}

function jobSection(source, jobName) {
  const marker = `\n  ${jobName}:\n`
  const start = source.indexOf(marker)
  if (start < 0) return ''
  const remainder = source.slice(start + marker.length)
  const next = remainder.search(/\n  [A-Za-z0-9_-]+:\n/)
  return next < 0 ? remainder : remainder.slice(0, next)
}

function workflowExecutesProductionMutation(source) {
  return source.includes('node scripts/live-release.mjs --deploy-prebuilt') ||
    /(^|\n)\s*(?:run:\s*)?(?:npx\s+)?firebase(?:-tools)?(?:@[^\s]+)?\s+deploy\b/i.test(source) ||
    /(^|\n)\s*run:\s*pnpm\s+live:deploy\b/i.test(source)
}

for (const retired of [
  'scripts/deploy-exact-static-release.mjs',
  'scripts/firebase-studio-polish-deploy-node.sh',
  'scripts/urai-aaa-proof-loop.sh',
  'scripts/urai-firebase-studio-static-release.mjs',
  'scripts/urai-proof-loop.mjs',
  'scripts/urai-v1-autopilot-retry.sh',
  'scripts/urai-v1-autopilot.sh',
]) {
  if (existsSync(path.join(root, retired))) failures.push(`Retired executable was restored: ${retired}`)
}

const productionWorkflows = []
if (!existsSync(workflowsDir)) {
  failures.push('Missing .github/workflows directory')
} else {
  for (const name of readdirSync(workflowsDir).filter((entry) => /\.ya?ml$/.test(entry))) {
    const source = normalize(readFileSync(path.join(workflowsDir, name), 'utf8'))
    if (workflowExecutesProductionMutation(source)) productionWorkflows.push(`.github/workflows/${name}`)
  }
}
if (productionWorkflows.length !== 1 || productionWorkflows[0] !== canonicalWorkflowPath) {
  failures.push(`Exactly one workflow may execute production mutation (${canonicalWorkflowPath}); found ${productionWorkflows.sort().join(', ') || 'none'}`)
}

const workflow = read(canonicalWorkflowPath)
const securityWorkflow = read(securityWorkflowPath)
const captureWorkflow = read(captureWorkflowPath)
const buildJob = jobSection(workflow, 'build-release-output')
const attestJob = jobSection(workflow, 'attest-release-bundle')
const deployJob = jobSection(workflow, 'deploy')

requireAll('Canonical production workflow', workflow, [
  'name: URAI Canonical Production Release',
  'name: Exact-head release verification',
  'name: Prove rollback target with current authority',
  'name: Build exact static target without production authority or credentials',
  'name: Attest raw static output with clean current authority',
  'name: Deploy or roll back verified static bundle on urai.app',
  'actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683',
  'actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020',
  'actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02',
  'actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093',
  'google-github-actions/auth@7c6bc770dae815cd3e89ee6cdf493a5fab2cc093',
  'google-github-actions/setup-gcloud@aa5489c8933f4cc7a4f7d45035b3b1440c9c10db',
  'git merge-base --is-ancestor',
  'gh workflow run spatial-live-deploy.yml --ref main',
])

requireAll('Target-only build job', buildJob, [
  'Checkout exact release target only',
  'path: target',
  'pnpm install --frozen-lockfile',
  'pnpm build:static',
  'Upload unattested raw static output',
])
forbidAny('Target-only build job', buildJob, [
  'environment: production',
  'FIREBASE_SERVICE_ACCOUNT_JSON',
  'GOOGLE_APPLICATION_CREDENTIALS',
  'google-github-actions/auth@',
  'id-token: write',
  '--deploy-prebuilt',
])

requireAll('Clean authority attestation job', attestJob, [
  'Checkout clean current release authority only',
  'Download unattested raw static output',
  'node scripts/verify-release-credential-boundary.mjs',
  'node scripts/create-static-release-bundle.mjs',
  'Upload authority-attested static release bundle',
])
forbidAny('Clean authority attestation job', attestJob, [
  'environment: production',
  'FIREBASE_SERVICE_ACCOUNT_JSON',
  'GOOGLE_APPLICATION_CREDENTIALS',
  'google-github-actions/auth@',
  'id-token: write',
  'working-directory: target',
  'pnpm build:static',
])

requireAll('Protected deploy job', deployJob, [
  'environment: production',
  'permissions:\n      contents: read\n      id-token: write',
  'Checkout current release authority only',
  'pnpm install --frozen-lockfile --ignore-scripts',
  'node scripts/verify-release-credential-boundary.mjs',
  'Verify downloaded bundle before production authentication exists',
  'node scripts/live-release.mjs --verify-prebuilt',
  'Validate production WIF configuration',
  'Authenticate dedicated production deploy identity through GitHub OIDC/WIF',
  'google-github-actions/auth@7c6bc770dae815cd3e89ee6cdf493a5fab2cc093',
  'workload_identity_provider: ${{ vars.GCP_WIF_PROVIDER }}',
  'service_account: ${{ secrets.GCP_DEPLOY_SERVICE_ACCOUNT }}',
  'create_credentials_file: true',
  'export_environment_variables: true',
  'Install pinned Google Cloud CLI action',
  'google-github-actions/setup-gcloud@aa5489c8933f4cc7a4f7d45035b3b1440c9c10db',
  'Prove federated production identity without exposing credentials',
  "schemaVersion: 'urai-production-wif-auth-1'",
  "authMode: 'wif'",
  'longLivedServiceAccountKeyUsed: false',
  'node scripts/live-release.mjs --deploy-prebuilt',
  'node scripts/urai-release-control-smoke.mjs',
  'Verify long-lived credential fallback remained absent',
])
forbidAny('Protected deploy job', deployJob, [
  'path: target',
  'working-directory: target',
  'pnpm build:static',
  'node ../authority/',
  'credentials_json:',
  'FIREBASE_SERVICE_ACCOUNT_JSON: ${{ secrets.',
])

const rawSecretOccurrences = (workflow.match(/FIREBASE_SERVICE_ACCOUNT_JSON:\s*\$\{\{\s*secrets\./g) || []).length
if (rawSecretOccurrences !== 0) failures.push(`Raw service-account secret occurrences must be zero; found ${rawSecretOccurrences}`)
if (workflow.includes('GCP_MAPS_ADMIN_CREDENTIALS_JSON')) failures.push('Canonical production workflow must not inherit Maps JSON credentials')

const verifyBundleIndex = deployJob.indexOf('node scripts/live-release.mjs --verify-prebuilt')
const authIndex = deployJob.indexOf('Authenticate dedicated production deploy identity through GitHub OIDC/WIF')
const identityIndex = deployJob.indexOf('Prove federated production identity without exposing credentials')
const deployIndex = deployJob.indexOf('node scripts/live-release.mjs --deploy-prebuilt')
const smokeIndex = deployJob.indexOf('Run canonical live smoke with current authority')
if ([verifyBundleIndex, authIndex, identityIndex, deployIndex, smokeIndex].some((index) => index < 0) ||
    !(verifyBundleIndex < authIndex && authIndex < identityIndex && identityIndex < deployIndex && deployIndex < smokeIndex)) {
  failures.push('Protected deploy job must verify the bundle before WIF auth, prove identity before mutation, then smoke after deployment')
}

requireAll('Release security workflow', securityWorkflow, [
  'name: Release Security Path Guard',
  'permissions:\n  contents: read',
  'runs-on: ubuntu-24.04',
  'persist-credentials: false',
  'node scripts/verify-release-security-path-guard.mjs',
  'node scripts/verify-production-action-pins.mjs',
  'node scripts/audit-production-workflow-authority.mjs',
  'node scripts/verify-release-credential-boundary.mjs',
])
forbidAny('Release security workflow', securityWorkflow, [
  'pull_request_target:',
  'environment: production',
  'FIREBASE_SERVICE_ACCOUNT_JSON',
  'GOOGLE_APPLICATION_CREDENTIALS',
  'contents: write',
  'actions: write',
  'id-token: write',
])
if (workflowExecutesProductionMutation(securityWorkflow)) failures.push('Release security workflow must not execute production mutation')

requireAll('Protected Hosting recovery capture workflow', captureWorkflow, [
  'name: Capture legacy Firebase Hosting recovery',
  'environment: production',
  'permissions:\n      contents: read\n      id-token: write',
  'Validate production WIF configuration',
  'google-github-actions/auth@7c6bc770dae815cd3e89ee6cdf493a5fab2cc093',
  'workload_identity_provider: ${{ vars.GCP_WIF_PROVIDER }}',
  'service_account: ${{ secrets.GCP_DEPLOY_SERVICE_ACCOUNT }}',
  'google-github-actions/setup-gcloud@aa5489c8933f4cc7a4f7d45035b3b1440c9c10db',
  'node scripts/firebase-hosting-recovery.mjs discover',
])
forbidAny('Protected Hosting recovery capture workflow', captureWorkflow, [
  'FIREBASE_SERVICE_ACCOUNT_JSON',
  'credentials_json:',
  'FIREBASE_TOKEN',
])
if (workflowExecutesProductionMutation(captureWorkflow)) failures.push('Hosting recovery capture workflow must remain non-mutating')

const entrypoint = read('scripts/live-release.mjs')
requireAll('Canonical production entrypoint', entrypoint, [
  "import './live-release-wif.mjs'",
])
forbidAny('Canonical production entrypoint', entrypoint, [
  'FIREBASE_SERVICE_ACCOUNT_JSON',
  'private_key',
  'credentials_json',
])

const operator = read('scripts/live-release-wif.mjs')
requireAll('Canonical WIF production operator', operator, [
  "const canonicalWorkflow = 'URAI Canonical Production Release'",
  "const canonicalRepository = 'LifeLoggerAI/urai-spatial'",
  "process.argv.includes('--verify-prebuilt')",
  "process.argv.includes('--deploy-prebuilt')",
  'validateAndMaterializePrebuiltBundle',
  "manifest.schemaVersion !== 'urai-static-release-bundle-1'",
  'manifest.authoritySha !== authoritySha',
  'Release bundle file set, sizes, or hashes do not match the manifest',
  'Firebase CLI must resolve inside current authority',
  'function assertFederatedCredentialContext()',
  'GOOGLE_GHA_CREDS_PATH',
  "config?.type !== 'external_account'",
  'GCP_WIF_PROVIDER',
  'GCP_DEPLOY_SERVICE_ACCOUNT',
  'deployHostingWithFederatedCredentials',
  'discoverCurrentLiveRelease',
  'recoverExactHostingVersion',
  "authMode: 'wif'",
  'longLivedServiceAccountKeyUsed: false',
])
forbidAny('Canonical WIF production operator', operator, [
  'writeTemporaryServiceAccount',
  'createServiceAccountAssertion',
  'serviceAccountJson',
  'managedCredentialFilename',
  'FIREBASE_SERVICE_ACCOUNT_JSON ||',
])
if (/pnpm\s+exec\s+firebase/.test(operator)) failures.push('Canonical production operator resolves Firebase through a package manager')

const recovery = read('scripts/firebase-hosting-recovery.mjs')
requireAll('WIF Hosting recovery', recovery, [
  'function accessTokenFromFederatedAdc(options = {})',
  "gcloud(['auth', 'print-access-token'])",
  "schemaVersion: 'urai-firebase-hosting-recovery-2'",
  "authMode: 'wif'",
  "credentialClass: 'github-oidc-wif'",
  'RESTORE_EXACT_HOSTING_VERSION',
])
forbidAny('WIF Hosting recovery', recovery, [
  'createSign',
  'createServiceAccountAssertion',
  'serviceAccountFromEnvironment',
  'accessTokenFromServiceAccount',
])

const bundle = read('scripts/create-static-release-bundle.mjs')
requireAll('Authority bundle attester', bundle, [
  "schemaVersion: 'urai-static-release-bundle-1'",
  'assertCleanAuthorityCheckout()',
  'writeAuthoritativeFingerprint()',
  'repository: canonicalRepository',
  'authoritySha',
  'targetSha',
  'rollbackSha',
  "certification: 'pending-post-deploy-smoke'",
  'workflowRunId',
  'Release bundle source must not contain symlinks',
  'Copied release bundle bytes do not match the source output',
  'fingerprintSha256',
])

const credentialBoundary = read('scripts/verify-release-credential-boundary.mjs')
requireAll('Credential boundary verifier', credentialBoundary, [
  "schemaVersion: 'urai-release-credential-boundary-5'",
  'targetBuildIsolated: true',
  'authorityAttestationIsolated: true',
  'targetCodeExecutesInProductionJob: false',
  'downloadedBundleRunBound',
  'downloadedBundleFingerprintBound',
  'wifOnlyProductionAuth: true',
  'longLivedServiceAccountKeyForbidden: true',
  'firebaseCliResolvedFromCurrentAuthority: true',
])

const packageJson = JSON.parse(read('package.json') || '{}')
const scripts = packageJson.scripts || {}
if (scripts['live:deploy'] !== 'node scripts/live-release.mjs --deploy-prebuilt') failures.push('package.json live:deploy must route only through the canonical entrypoint --deploy-prebuilt')

const report = {
  schemaVersion: 'urai-production-authority-audit-8',
  ok: failures.length === 0,
  canonicalWorkflow: canonicalWorkflowPath,
  productionWorkflows: productionWorkflows.sort(),
  rawServiceAccountSecretOccurrences: rawSecretOccurrences,
  wifOnlyProductionAuth: true,
  longLivedServiceAccountKeyForbidden: true,
  buildAndAttestationCredentialFree: true,
  failures,
}

console.log(JSON.stringify(report, null, 2))
for (const failure of failures) {
  const escaped = failure.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A')
  console.error(`::error title=Production authority audit::${escaped}`)
}
if (failures.length) process.exitCode = 1
