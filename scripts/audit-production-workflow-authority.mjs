#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const workflowsDir = path.join(root, '.github', 'workflows')
const canonicalWorkflowPath = '.github/workflows/spatial-live-deploy.yml'
const securityWorkflowPath = '.github/workflows/release-security-path-guard.yml'
const failures = []
const normalize = (value) => value.replace(/\r\n?/g, '\n')

function read(relativePath) {
  const absolute = path.join(root, relativePath)
  if (!existsSync(absolute)) {
    failures.push(`Missing required authority file: ${relativePath}`)
    return ''
  }
  return normalize(readFileSync(absolute, 'utf8'))
}
function requireAll(label, source, markers) {
  for (const marker of markers) if (!source.includes(marker)) failures.push(`${label} missing marker: ${marker}`)
}
function forbidAny(label, source, markers) {
  for (const marker of markers) if (source.includes(marker)) failures.push(`${label} contains forbidden marker: ${marker}`)
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

const productionWorkflows = []
if (!existsSync(workflowsDir)) failures.push('Missing .github/workflows directory')
else {
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
const verifyJob = jobSection(workflow, 'verify')
const buildTargetJob = jobSection(workflow, 'build-target')
const buildRecoveryJob = jobSection(workflow, 'build-recovery')
const attestJob = jobSection(workflow, 'attest-bundles')
const deployJob = jobSection(workflow, 'deploy')

requireAll('Canonical production workflow', workflow, [
  'name: URAI Canonical Production Release',
  'workflow_dispatch:',
  'name: Exact-head v2 release verification',
  'name: Build exact target static output without production credentials',
  'name: Build exact recovery static output without production credentials',
  'name: Attest target and recovery bundles with clean current authority',
  'name: Deploy target or restore exact attested recovery bundle on urai.app',
  'actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683',
  'actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020',
  'actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02',
  'actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093',
  'git merge-base --is-ancestor',
])
for (const [name, section] of Object.entries({ verifyJob, buildTargetJob, buildRecoveryJob, attestJob, deployJob })) {
  if (!section) failures.push(`Canonical workflow is missing ${name}`)
}

requireAll('Target build job', buildTargetJob, [
  'Checkout exact target only', 'path: target', 'pnpm install --frozen-lockfile', 'pnpm build:static',
  'Upload exact target raw output', 'urai-v2-target-raw-${{ env.TARGET_SHA }}',
])
requireAll('Recovery build job', buildRecoveryJob, [
  'Checkout exact recovery target only', 'path: recovery', 'pnpm install --frozen-lockfile', 'pnpm build:static',
  'Upload exact recovery raw output', 'urai-v2-recovery-raw-${{ env.RECOVERY_SHA }}',
])
for (const [label, section] of [['Target build job', buildTargetJob], ['Recovery build job', buildRecoveryJob]]) {
  forbidAny(label, section, ['environment: production', 'FIREBASE_SERVICE_ACCOUNT_JSON', 'GOOGLE_APPLICATION_CREDENTIALS', '--deploy-prebuilt'])
}

requireAll('Clean authority attestation job', attestJob, [
  'Checkout clean current authority only', 'Download target raw output', 'Download recovery raw output',
  'node scripts/verify-release-v2-boundary.mjs', 'node scripts/create-static-release-bundle.mjs',
  'Upload exact target bundle', 'Upload exact recovery bundle',
])
forbidAny('Clean authority attestation job', attestJob, [
  'environment: production', 'FIREBASE_SERVICE_ACCOUNT_JSON', 'GOOGLE_APPLICATION_CREDENTIALS',
  'working-directory: target', 'working-directory: recovery', 'pnpm build:static',
])

requireAll('Protected deploy job', deployJob, [
  'environment: production', 'Checkout current release authority only',
  'pnpm install --frozen-lockfile --ignore-scripts', 'Download exact target bundle',
  'Download exact recovery bundle', 'node scripts/verify-release-credential-boundary.mjs',
  'Verify exact target bundle before production credentials exist',
  'Verify exact recovery bundle before production credentials exist',
  'node scripts/live-release.mjs --verify-prebuilt', 'node scripts/live-release.mjs --deploy-prebuilt',
  'Primary operation failed with status', 'Recovery deployment succeeded; preserving failed release conclusion.',
  'Run canonical live smoke after successful target deployment', 'Remove temporary credentials',
])
forbidAny('Protected deploy job', deployJob, ['path: target', 'path: recovery', 'pnpm build:static', 'node ../authority/'])

const secretMarker = 'FIREBASE_SERVICE_ACCOUNT_JSON: ${{ secrets.FIREBASE_SERVICE_ACCOUNT_JSON }}'
const secretOccurrences = workflow.split(secretMarker).length - 1
if (secretOccurrences !== 1) failures.push(`Raw service-account secret must occur exactly once; found ${secretOccurrences}`)
if (!deployJob.includes(secretMarker)) failures.push('Raw service-account secret must exist only in the protected deploy job')
if (buildTargetJob.includes(secretMarker) || buildRecoveryJob.includes(secretMarker) || attestJob.includes(secretMarker)) {
  failures.push('Build and attestation jobs must not receive the raw service-account secret')
}
const deployStepsStart = deployJob.indexOf('\n    steps:')
const deployJobScope = deployStepsStart >= 0 ? deployJob.slice(0, deployStepsStart) : deployJob
if (deployJobScope.includes('FIREBASE_SERVICE_ACCOUNT_JSON')) failures.push('Raw service-account secret is exposed at deploy-job scope')

requireAll('Release security workflow', securityWorkflow, [
  'name: Release Security Path Guard', 'permissions:\n  contents: read', 'runs-on: ubuntu-24.04',
  'fetch-depth: 1', 'persist-credentials: false', 'show-progress: false',
  'node scripts/verify-release-security-path-guard.mjs', 'node scripts/verify-production-action-pins.mjs',
  'node scripts/audit-production-workflow-authority.mjs', 'node scripts/verify-release-credential-boundary.mjs',
  'node scripts/verify-live-rollback-provenance.mjs --self-test',
  'node urai-tier1/tests/exact-static-release-contract.test.mjs',
])
forbidAny('Release security workflow', securityWorkflow, [
  'pull_request_target:', 'environment: production', 'FIREBASE_SERVICE_ACCOUNT_JSON',
  'GOOGLE_APPLICATION_CREDENTIALS', 'contents: write', 'actions: write', 'id-token: write',
])
if (workflowExecutesProductionMutation(securityWorkflow)) failures.push('Release security workflow must not execute production mutation')

const operator = read('scripts/live-release.mjs')
requireAll('Canonical production operator', operator, [
  "const canonicalWorkflow = 'URAI Canonical Production Release'", "const canonicalRepository = 'LifeLoggerAI/urai-spatial'",
  "process.env.URAI_DEPLOY_CONFIRM !== 'DEPLOY_STATIC_URAI'", "process.env.GITHUB_ACTIONS !== 'true'",
  "process.env.GITHUB_EVENT_NAME !== 'workflow_dispatch'", "process.env.GITHUB_REF !== 'refs/heads/main'",
  "process.argv.includes('--verify-prebuilt')", "process.argv.includes('--deploy-prebuilt')",
  'validateAndMaterializePrebuiltBundle', "manifest.schemaVersion !== 'urai-static-release-bundle-1'",
  'Release bundle file set, sizes, or hashes do not match the manifest', 'Firebase CLI must resolve inside current authority',
  'delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON', "flag: 'wx'",
])

const bundle = read('scripts/create-static-release-bundle.mjs')
requireAll('Authority bundle attester', bundle, [
  "schemaVersion: 'urai-static-release-bundle-1'", 'assertCleanAuthorityCheckout()', 'writeAuthoritativeFingerprint()',
  'repository: canonicalRepository', 'authoritySha', 'targetSha', 'rollbackSha',
  "certification: 'pending-post-deploy-smoke'", 'workflowRunId',
  'Release bundle source must not contain symlinks', 'Copied release bundle bytes do not match the source output', 'fingerprintSha256',
])

const proof = read('scripts/aaa-launch-proof.mjs')
requireAll('Proof-only runner', proof, [
  "if (args.has('--deploy'))", 'process.exit(64)', 'sourceIdentityVerified', 'cleanWorkingTree',
  'productionDeploymentAttempted: false', "productionDeploymentAuthority: '.github/workflows/spatial-live-deploy.yml'",
])
if (workflowExecutesProductionMutation(proof)) failures.push('Proof-only runner contains a deploy-capable command')

const report = {
  schemaVersion: 'urai-production-authority-audit-8', ok: failures.length === 0,
  canonicalWorkflow: canonicalWorkflowPath, productionWorkflows: productionWorkflows.sort(),
  dualBundleAttestationRequired: true, artifactBackedRecoveryRequired: true,
  recoveredFailureMustRemainFailure: true, rawServiceAccountSecretOccurrences: secretOccurrences, failures,
}
console.log(JSON.stringify(report, null, 2))
for (const failure of failures) console.error(`::error title=Production authority audit::${failure.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A')}`)
if (failures.length) process.exitCode = 1
