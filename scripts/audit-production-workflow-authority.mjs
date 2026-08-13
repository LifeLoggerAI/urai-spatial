#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const workflowsDir = path.join(root, '.github', 'workflows')
const canonicalWorkflowPath = '.github/workflows/spatial-live-deploy.yml'
const securityWorkflowPath = '.github/workflows/release-security-path-guard.yml'
const failures = []

const normalize = (value) => value.replace(/\r\n?/g, '\n')
const read = (relativePath) => {
  const absolute = path.join(root, relativePath)
  if (!existsSync(absolute)) {
    failures.push(`Missing required authority file: ${relativePath}`)
    return ''
  }
  return normalize(readFileSync(absolute, 'utf8'))
}
const requireAll = (label, source, markers) => {
  for (const marker of markers) if (!source.includes(marker)) failures.push(`${label} missing marker: ${marker}`)
}
const forbidAny = (label, source, markers) => {
  for (const marker of markers) if (source.includes(marker)) failures.push(`${label} contains forbidden marker: ${marker}`)
}
const workflowExecutesProductionMutation = (source) =>
  source.includes('node scripts/live-release.mjs --deploy-prebuilt') ||
  /(^|\n)\s*(?:run:\s*)?(?:npx\s+)?firebase(?:-tools)?(?:@[^\s]+)?\s+deploy\b/i.test(source) ||
  /(^|\n)\s*run:\s*pnpm\s+live:deploy\b/i.test(source) ||
  /(^|\n)\s*run:\s*gcloud\s+deploy\b/i.test(source)

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
if (productionWorkflows.length !== 0) {
  failures.push(`Production mutation must remain quarantined until provider WIF/IAM is independently proven; found ${productionWorkflows.sort().join(', ')}`)
}

const workflow = read(canonicalWorkflowPath)
const securityWorkflow = read(securityWorkflowPath)

requireAll('Canonical production verification workflow', workflow, [
  'name: URAI Canonical Production Release Verification',
  'permissions:\n  contents: read',
  'EXACT_HEAD_SHA: ${{ github.event.pull_request.head.sha || github.sha }}',
  'name: Verify canonical source with production release quarantined',
  'ref: ${{ env.EXACT_HEAD_SHA }}',
  'fetch-depth: 0',
  'persist-credentials: false',
  'test "$(git rev-parse HEAD)" = "$EXACT_HEAD_SHA"',
  'node scripts/audit-production-workflow-authority.mjs',
  'node scripts/verify-release-credential-boundary.mjs',
  'node scripts/verify-release-credential-boundary-static.mjs',
  'Classification: NO-GO',
  'Production release and Hosting recovery are intentionally quarantined.',
  'actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683',
  'actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020',
  'actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02',
])
forbidAny('Canonical production verification workflow', workflow, [
  'environment: production',
  'FIREBASE_SERVICE_ACCOUNT_JSON',
  'FIREBASE_TOKEN',
  'GOOGLE_APPLICATION_CREDENTIALS',
  'id-token: write',
  'contents: write',
  'actions: write',
  'node scripts/live-release.mjs --deploy-prebuilt',
])
if (/\n  deploy\s*:/.test(workflow)) failures.push('Canonical production verification workflow must not restore a deploy job before provider WIF/IAM proof')
if (workflowExecutesProductionMutation(workflow)) failures.push('Canonical production verification workflow must remain read-only')

requireAll('Release security workflow', securityWorkflow, [
  'name: Release Security Path Guard',
  'permissions:\n  contents: read',
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
  'FIREBASE_TOKEN',
  'GOOGLE_APPLICATION_CREDENTIALS',
  'contents: write',
  'actions: write',
  'id-token: write',
])
if (workflowExecutesProductionMutation(securityWorkflow)) failures.push('Release security workflow must not execute production mutation')

const adcGuard = read('scripts/assert-external-account-adc.mjs')
requireAll('External-account ADC guard', adcGuard, [
  'FIREBASE_SERVICE_ACCOUNT_JSON',
  'GOOGLE_APPLICATION_CREDENTIALS',
])

const packageJson = JSON.parse(read('package.json') || '{}')
const scripts = packageJson.scripts || {}
for (const forbiddenAlias of ['studio:deploy:static', 'deploy:xr:firebase', 'deploy:xr:firebase:static', 'deploy:staging', 'deploy:prod', 'frb', 'live:deploy:static', 'publish:live:static']) {
  if (forbiddenAlias in scripts) failures.push(`Forbidden deploy alias remains in package.json: ${forbiddenAlias}`)
}

const report = {
  schemaVersion: 'urai-production-authority-audit-8',
  ok: failures.length === 0,
  canonicalWorkflow: canonicalWorkflowPath,
  productionMutationQuarantined: productionWorkflows.length === 0,
  productionWorkflows: productionWorkflows.sort(),
  longLivedRepositoryCredentialAuthorityAllowed: false,
  providerWifIamProofRequiredBeforeMutation: true,
  independentReviewRequiredBeforeMutation: true,
  releaseClassification: 'NO-GO',
  failures,
}

console.log(JSON.stringify(report, null, 2))
for (const failure of failures) {
  const escaped = failure.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A')
  console.error(`::error title=Production authority audit::${escaped}`)
}
if (failures.length) process.exitCode = 1
