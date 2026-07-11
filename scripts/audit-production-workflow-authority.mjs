#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const workflowsDir = path.join(root, '.github', 'workflows')
const canonicalWorkflowPath = '.github/workflows/spatial-live-deploy.yml'
const securityWorkflowPath = '.github/workflows/release-security-path-guard.yml'
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
const buildJob = jobSection(workflow, 'build-release-output')
const attestJob = jobSection(workflow, 'attest-release-bundle')
const deployJob = jobSection(workflow, 'deploy')

requireAll('Canonical production workflow', workflow, [
  'name: URAI Canonical Production Release',
  "inputs.confirm == 'DEPLOY_URAI_APP' || inputs.confirm == 'ROLLBACK_URAI_APP'",
  'name: Exact-head release verification',
  'name: Prove rollback target with current authority',
  'name: Build exact static target without production authority or credentials',
  'name: Attest raw static output with clean current authority',
  'name: Deploy or roll back verified static bundle on urai.app',
  'actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683',
  'actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020',
  'actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02',
  'actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093',
  'git merge-base --is-ancestor',
  'gh workflow run spatial-live-deploy.yml --ref main',
])
if (!buildJob) failures.push('Canonical workflow is missing build-release-output')
if (!attestJob) failures.push('Canonical workflow is missing attest-release-bundle')
if (!deployJob) failures.push('Canonical workflow is missing deploy')

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
  'working-directory: target',
  'pnpm build:static',
])

requireAll('Protected deploy job', deployJob, [
  'environment: production',
  'Checkout current release authority only',
  'pnpm install --frozen-lockfile --ignore-scripts',
  'node scripts/verify-release-credential-boundary.mjs',
  'node scripts/live-release.mjs --verify-prebuilt',
  'node scripts/live-release.mjs --deploy-prebuilt',
  'node scripts/urai-release-control-smoke.mjs',
  'Remove temporary credentials',
])
forbidAny('Protected deploy job', deployJob, [
  'path: target',
  'working-directory: target',
  'pnpm build:static',
  'node ../authority/',
])

const secretMarker = 'FIREBASE_SERVICE_ACCOUNT_JSON: ${{ secrets.FIREBASE_SERVICE_ACCOUNT_JSON }}'
const secretOccurrences = workflow.split(secretMarker).length - 1
if (secretOccurrences !== 1) failures.push(`Raw service-account secret must occur exactly once; found ${secretOccurrences}`)
if (!deployJob.includes(secretMarker)) failures.push('Raw service-account secret must exist only in the protected deploy job')
if (buildJob.includes(secretMarker) || attestJob.includes(secretMarker)) failures.push('Build and attestation jobs must not receive the raw service-account secret')

requireAll('Release security workflow', securityWorkflow, [
  'name: Release Security Path Guard',
  'permissions:\n  contents: read',
  'runs-on: ubuntu-24.04',
  'fetch-depth: 1',
  'persist-credentials: false',
  'show-progress: false',
  'node scripts/verify-release-security-path-guard.mjs',
  'node scripts/verify-production-action-pins.mjs',
  'node scripts/audit-production-workflow-authority.mjs',
  'node scripts/verify-release-credential-boundary.mjs',
  'node scripts/verify-live-rollback-provenance.mjs --self-test',
  'node urai-tier1/tests/exact-static-release-contract.test.mjs',
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

const operator = read('scripts/live-release.mjs')
requireAll('Canonical production operator', operator, [
  "const canonicalWorkflow = 'URAI Canonical Production Release'",
  "const canonicalRepository = 'LifeLoggerAI/urai-spatial'",
  "process.env.URAI_DEPLOY_CONFIRM !== 'DEPLOY_STATIC_URAI'",
  "process.env.GITHUB_ACTIONS !== 'true'",
  "process.env.GITHUB_EVENT_NAME !== 'workflow_dispatch'",
  "process.env.GITHUB_REF !== 'refs/heads/main'",
  "process.argv.includes('--verify-prebuilt')",
  "process.argv.includes('--deploy-prebuilt')",
  'validateAndMaterializePrebuiltBundle',
  "manifest.schemaVersion !== 'urai-static-release-bundle-1'",
  'manifest.authoritySha !== authoritySha',
  'Release bundle file set, sizes, or hashes do not match the manifest',
  'Firebase CLI must resolve inside current authority',
  'delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON',
  'writeFileSync(managedCredentialsPath',
  "flag: 'wx'",
])
if (/pnpm\s+exec\s+firebase/.test(operator)) failures.push('Canonical production operator resolves Firebase through a package manager')

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
  "schemaVersion: 'urai-release-credential-boundary-4'",
  'targetBuildIsolated: true',
  'authorityAttestationIsolated: true',
  'targetCodeExecutesInProductionJob: false',
  'downloadedBundleRunBound',
  'downloadedBundleFingerprintBound',
  'credentialsMaterializedByAuthorityOnly: true',
  'firebaseCliResolvedFromCurrentAuthority: true',
])

const smoke = read('scripts/urai-release-control-smoke.mjs')
requireAll('Release-control smoke', smoke, [
  "schemaVersion: 'urai-release-control-smoke-5'",
  'assertExactQueryIdentity',
  "await context.route('**/*'",
  "await route.abort('blockedbyclient')",
  'blockedExternalRequests',
  "waitUntil: 'domcontentloaded'",
  "animations: 'disabled'",
  "'/mirror'",
  "'/location-map'",
])
if (/from ['"]playwright['"]/.test(smoke)) failures.push('Release-control smoke must resolve Playwright through the current authority workspace')
if (/waitUntil:\s*['"]networkidle['"]/.test(smoke)) failures.push('Release-control smoke must not rely on networkidle')

const packageJson = JSON.parse(read('package.json') || '{}')
const scripts = packageJson.scripts || {}
if (scripts['live:deploy'] !== 'node scripts/live-release.mjs --deploy-prebuilt') failures.push('package.json live:deploy must route only through --deploy-prebuilt')
for (const forbiddenAlias of ['studio:deploy:static', 'deploy:xr:firebase', 'deploy:xr:firebase:static', 'deploy:staging', 'deploy:prod', 'frb', 'live:deploy:static', 'publish:live:static']) {
  if (forbiddenAlias in scripts) failures.push(`Forbidden deploy alias remains in package.json: ${forbiddenAlias}`)
}

const proof = read('scripts/aaa-launch-proof.mjs')
requireAll('Proof-only runner', proof, [
  "if (args.has('--deploy'))",
  'process.exit(64)',
  'sourceIdentityVerified',
  'cleanWorkingTree',
  'productionDeploymentAttempted: false',
  "productionDeploymentAuthority: '.github/workflows/spatial-live-deploy.yml'",
])
if (workflowExecutesProductionMutation(proof)) failures.push('Proof-only runner contains a deploy-capable command')

const report = {
  schemaVersion: 'urai-production-authority-audit-7',
  ok: failures.length === 0,
  canonicalWorkflow: canonicalWorkflowPath,
  productionWorkflows: productionWorkflows.sort(),
  releaseSmokeSchema: 'urai-release-control-smoke-5',
  exactHeadSecurityCheckoutDepth: 1,
  preRequestNetworkBlockingRequired: true,
  exactQueryIdentityRequired: true,
  rawServiceAccountSecretOccurrences: secretOccurrences,
  executableUniquenessDelegatedToCredentialBoundaryVerifier: true,
  failures,
}

console.log(JSON.stringify(report, null, 2))
for (const failure of failures) {
  const escaped = failure.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A')
  console.error(`::error title=Production authority audit::${escaped}`)
}
if (failures.length) process.exitCode = 1
