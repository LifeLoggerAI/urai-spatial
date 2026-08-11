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

for (const retired of [
  'scripts/deploy-exact-static-release.mjs',
  'scripts/firebase-studio-polish-deploy-node.sh',
  'scripts/urai-aaa-proof-loop.sh',
  'scripts/urai-firebase-studio-static-release.mjs',
  'scripts/urai-proof-loop.mjs',
  'scripts/urai-v1-autopilot-retry.sh',
  'scripts/urai-v1-autopilot.sh',
]) if (existsSync(path.join(root, retired))) failures.push(`Retired executable was restored: ${retired}`)

const workflow = read(canonicalWorkflowPath)
const securityWorkflow = read(securityWorkflowPath)
const operator = read('scripts/live-release.mjs')
const productionWorkflows = []
const rawCredentialWorkflows = []
let rawCredentialSecretOccurrences = 0
if (!existsSync(workflowsDir)) failures.push('Missing .github/workflows directory')
else {
  for (const name of readdirSync(workflowsDir).filter((entry) => /\.ya?ml$/.test(entry))) {
    const source = normalize(readFileSync(path.join(workflowsDir, name), 'utf8'))
    const relativePath = `.github/workflows/${name}`
    if (workflowExecutesProductionMutation(source)) productionWorkflows.push(relativePath)
    const credentialMatches = source.match(/(?:FIREBASE_SERVICE_ACCOUNT_JSON|FIREBASE_PRIVATE_KEY|FIREBASE_CLIENT_EMAIL):\s*\$\{\{\s*secrets\./g) ?? []
    if (credentialMatches.length) {
      rawCredentialWorkflows.push(relativePath)
      rawCredentialSecretOccurrences += credentialMatches.length
    }
  }
}

const secretMarker = 'FIREBASE_SERVICE_ACCOUNT_JSON: ${{ secrets.FIREBASE_SERVICE_ACCOUNT_JSON }}'
const secretOccurrences = workflow.split(secretMarker).length - 1
const quarantineMode =
  workflow.includes('name: URAI Canonical Production Release Verification') &&
  workflow.includes('Verify canonical source with production release quarantined') &&
  workflow.includes('Classification: NO-GO') &&
  workflow.includes('Production mutation is forbidden while provider WIF/IAM and runtime identity remain unproven.') &&
  operator.includes('URAI Spatial production release is NO-GO')

if (quarantineMode) {
  if (productionWorkflows.length !== 0) failures.push(`Quarantine must expose zero production mutation workflows; found ${productionWorkflows.sort().join(', ')}`)
  if (rawCredentialSecretOccurrences !== 0) {
    failures.push(`Quarantine must expose zero raw Google/Firebase credential secrets across all workflows; found ${rawCredentialSecretOccurrences} in ${rawCredentialWorkflows.sort().join(', ')}`)
  }
  requireAll('Quarantined canonical workflow', workflow, [
    'name: URAI Canonical Production Release Verification',
    'permissions:\n  contents: read',
    'name: Verify canonical source with production release quarantined',
    'persist-credentials: false',
    'node scripts/audit-production-workflow-authority.mjs',
    'node scripts/verify-release-credential-boundary.mjs',
    'node scripts/verify-release-credential-boundary-static.mjs',
    'Long-lived Google/Firebase credential material remains in the canonical production release boundary.',
    'Production mutation is forbidden while provider WIF/IAM and runtime identity remain unproven.',
    'Classification: NO-GO',
    'Production release and Hosting recovery are intentionally quarantined.',
    'actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683',
    'actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020',
    'actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02',
  ])
  forbidAny('Quarantined canonical workflow', workflow, [
    'environment: production',
    'id-token: write',
    secretMarker,
    'credentials_json:',
    'FIREBASE_PRIVATE_KEY',
    'FIREBASE_CLIENT_EMAIL',
    'firebase-service-account.json',
    'node scripts/live-release.mjs --deploy-prebuilt',
    'firebase deploy',
    'firebase-tools deploy',
  ])
  requireAll('Quarantined release operator', operator, [
    "process.argv.includes('--deploy')",
    "process.argv.includes('--deploy-prebuilt')",
    "'FIREBASE_SERVICE_ACCOUNT_JSON'",
    "'FIREBASE_PRIVATE_KEY'",
    "'FIREBASE_CLIENT_EMAIL'",
    "'FIREBASE_TOKEN'",
    'Refusing long-lived Firebase credential environment variable:',
    'URAI Spatial production release is NO-GO',
    'No provider credentials were loaded and no production mutation was attempted.',
  ])
  forbidAny('Quarantined release operator', operator, [
    'firebase deploy',
    'firebase-tools deploy',
    'credential.cert(',
    'createSign(',
    'writeTemporaryServiceAccount',
    'deployHostingWithTemporaryCredentials',
  ])
} else {
  if (productionWorkflows.length !== 1 || productionWorkflows[0] !== canonicalWorkflowPath) {
    failures.push(`Exactly one workflow may execute production mutation (${canonicalWorkflowPath}); found ${productionWorkflows.sort().join(', ') || 'none'}`)
  }
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
  requireAll('Target-only build job', buildJob, ['Checkout exact release target only', 'path: target', 'pnpm install --frozen-lockfile', 'pnpm build:static', 'Upload unattested raw static output'])
  forbidAny('Target-only build job', buildJob, ['environment: production', 'FIREBASE_SERVICE_ACCOUNT_JSON', 'GOOGLE_APPLICATION_CREDENTIALS', '--deploy-prebuilt'])
  requireAll('Clean authority attestation job', attestJob, ['Checkout clean current release authority only', 'Download unattested raw static output', 'node scripts/verify-release-credential-boundary.mjs', 'node scripts/create-static-release-bundle.mjs', 'Upload authority-attested static release bundle'])
  forbidAny('Clean authority attestation job', attestJob, ['environment: production', 'FIREBASE_SERVICE_ACCOUNT_JSON', 'GOOGLE_APPLICATION_CREDENTIALS', 'working-directory: target', 'pnpm build:static'])
  requireAll('Protected deploy job', deployJob, ['environment: production', 'Checkout current release authority only', 'pnpm install --frozen-lockfile --ignore-scripts', 'node scripts/verify-release-credential-boundary.mjs', 'node scripts/live-release.mjs --verify-prebuilt', 'node scripts/live-release.mjs --deploy-prebuilt', 'node scripts/urai-release-control-smoke.mjs', 'Remove temporary credentials'])
  forbidAny('Protected deploy job', deployJob, ['path: target', 'working-directory: target', 'pnpm build:static', 'node ../authority/'])
  if (secretOccurrences !== 1) failures.push(`Raw service-account secret must occur exactly once; found ${secretOccurrences}`)
  if (!deployJob.includes(secretMarker)) failures.push('Raw service-account secret must exist only in the protected deploy job')
  if (buildJob.includes(secretMarker) || attestJob.includes(secretMarker)) failures.push('Build and attestation jobs must not receive the raw service-account secret')
  requireAll('Canonical production operator', operator, [
    "const canonicalWorkflow = 'URAI Canonical Production Release'",
    "const canonicalRepository = 'LifeLoggerAI/urai-spatial'",
    "process.env.URAI_DEPLOY_CONFIRM !== 'DEPLOY_STATIC_URAI'",
    "process.env.GITHUB_ACTIONS !== 'true'",
    "process.env.GITHUB_EVENT_NAME !== 'workflow_dispatch'",
    "process.env.GITHUB_REF !== 'refs/heads/main'",
    "process.argv.includes('--verify-prebuilt')",
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
}

requireAll('Release security workflow', securityWorkflow, [
  'name: Release Security Path Guard',
  'permissions:\n  contents: read',
  'runs-on: ubuntu-24.04',
  'fetch-depth: 1',
  'persist-credentials: false',
  'node scripts/verify-release-security-path-guard.mjs',
  'node scripts/verify-production-action-pins.mjs',
  'node scripts/audit-production-workflow-authority.mjs',
  'node scripts/verify-release-credential-boundary.mjs',
  'node scripts/verify-live-rollback-provenance.mjs --self-test',
  'node urai-tier1/tests/exact-static-release-contract.test.mjs',
])
forbidAny('Release security workflow', securityWorkflow, ['pull_request_target:', 'environment: production', 'FIREBASE_SERVICE_ACCOUNT_JSON', 'GOOGLE_APPLICATION_CREDENTIALS', 'contents: write', 'actions: write', 'id-token: write'])
if (workflowExecutesProductionMutation(securityWorkflow)) failures.push('Release security workflow must not execute production mutation')

const report = {
  schemaVersion: 'urai-production-authority-audit-8',
  ok: failures.length === 0,
  mode: quarantineMode ? 'quarantine-no-go' : 'active-release',
  canonicalWorkflow: canonicalWorkflowPath,
  productionWorkflows: productionWorkflows.sort(),
  exactHeadSecurityCheckoutDepth: 1,
  canonicalRawServiceAccountSecretOccurrences: secretOccurrences,
  rawCredentialSecretOccurrences,
  rawCredentialWorkflows: rawCredentialWorkflows.sort(),
  productionMutationAvailable: productionWorkflows.length > 0,
  productionCredentialsAvailable: rawCredentialSecretOccurrences > 0,
  failures,
}
console.log(JSON.stringify(report, null, 2))
for (const failure of failures) {
  const escaped = failure.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A')
  console.error(`::error title=Production authority audit::${escaped}`)
}
if (failures.length) process.exitCode = 1
