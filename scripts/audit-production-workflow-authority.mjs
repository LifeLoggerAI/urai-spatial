#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const workflowsDir = path.join(root, '.github', 'workflows')
const canonicalWorkflowPath = '.github/workflows/spatial-live-deploy.yml'
const securityWorkflowPath = '.github/workflows/release-security-path-guard.yml'
const adcGuardPath = 'urai-tier1/src/lib/server/google-adc.ts'
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
const workflowExecutesProductionMutation = (source) =>
  /live-release\.mjs\s+--deploy(?:-prebuilt)?/.test(source) ||
  /firebase(?:-tools)?(?:@[^\s]+)?\s+deploy\b/i.test(source) ||
  /\bpnpm\s+live:deploy\b/i.test(source) ||
  /\bgcloud\s+deploy\b/i.test(source)

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
if (productionWorkflows.length !== 0) failures.push(`Production mutation must remain quarantined; found ${productionWorkflows.sort().join(', ')}`)

const workflow = read(canonicalWorkflowPath)
const securityWorkflow = read(securityWorkflowPath)
const adcGuard = read(adcGuardPath)

requireAll('Canonical production verification workflow', workflow, [
  'name: URAI Canonical Production Release Verification',
  'permissions:\n  contents: read',
  'EXACT_HEAD_SHA: ${{ github.event.pull_request.head.sha || github.sha }}',
  'name: Verify canonical source with production release quarantined',
  'name: Prove short-lived Google WIF identity',
  "if: github.event_name != 'pull_request' && github.ref == 'refs/heads/main'",
  'id-token: write',
  'persist-credentials: false',
  'google-github-actions/auth@7c6bc770dae815cd3e89ee6cdf493a5fab2cc093',
  "workload_identity_provider: 'projects/952723774155/locations/global/workloadIdentityPools/urai-github-prod/providers/github-actions'",
  "service_account: 'urai-spatial-github-deployer@urai-4dc1d.iam.gserviceaccount.com'",
  "access_token_scopes: 'https://www.googleapis.com/auth/cloud-platform.read-only'",
  'create_credentials_file: false',
  'export_environment_variables: false',
  'Production mutation command: none',
  'node scripts/audit-production-workflow-authority.mjs',
  'node scripts/verify-release-credential-boundary.mjs',
  'node scripts/verify-release-credential-boundary-static.mjs',
  'Classification: NO-GO',
  'Production release and Hosting recovery are intentionally quarantined.',
])
requireAll('Release security workflow', securityWorkflow, [
  'name: Release Security Path Guard',
  'permissions:\n  contents: read',
  'persist-credentials: false',
  'node scripts/verify-release-security-path-guard.mjs',
  'node scripts/verify-production-action-pins.mjs',
  'node scripts/audit-production-workflow-authority.mjs',
  'node scripts/verify-release-credential-boundary.mjs',
])
requireAll('Canonical Tier-1 external-account ADC guard', adcGuard, [
  'assertExternalAccountAdc', 'forbiddenCredentialVariables', "record.type !== 'external_account'", 'credential_source', 'private_key', 'client_email',
])

if (/\bsecrets\s*\./.test(workflow)) failures.push('Canonical production verification workflow must not reference repository secrets')
if (/environment\s*:\s*production/.test(workflow)) failures.push('Canonical production verification workflow must not enter the production environment')
if ((workflow.match(/id-token\s*:\s*write/g) || []).length !== 1) failures.push('Canonical production verification workflow must expose OIDC write authority exactly once, in the main-only proof job')
if (/contents\s*:\s*write|actions\s*:\s*write/.test(workflow)) failures.push('Canonical production verification workflow must not have repository write authority')
if (workflowExecutesProductionMutation(workflow)) failures.push('Canonical production verification workflow must not expose provider mutation commands')

if (/\bsecrets\s*\./.test(securityWorkflow)) failures.push('Release security workflow must not reference repository secrets while quarantined')
if (/environment\s*:\s*production/.test(securityWorkflow)) failures.push('Release security workflow must not enter the production environment while quarantined')
if (/id-token\s*:\s*write|contents\s*:\s*write|actions\s*:\s*write/.test(securityWorkflow)) failures.push('Release security workflow must remain read-only while quarantined')
if (workflowExecutesProductionMutation(securityWorkflow)) failures.push('Release security workflow must not expose provider mutation commands')

const packageJson = JSON.parse(read('package.json') || '{}')
const scripts = packageJson.scripts || {}
for (const forbiddenAlias of ['studio:deploy:static', 'deploy:xr:firebase', 'deploy:xr:firebase:static', 'deploy:staging', 'deploy:prod', 'frb', 'live:deploy:static', 'publish:live:static']) {
  if (forbiddenAlias in scripts) failures.push(`Forbidden deploy alias remains in package.json: ${forbiddenAlias}`)
}

const report = {
  schemaVersion: 'urai-production-authority-audit-11',
  ok: failures.length === 0,
  canonicalWorkflow: canonicalWorkflowPath,
  canonicalAdcGuard: adcGuardPath,
  productionMutationQuarantined: productionWorkflows.length === 0,
  productionWorkflows: productionWorkflows.sort(),
  longLivedRepositoryCredentialAuthorityAllowed: false,
  mainOnlyReadOnlyWifProofConfigured: true,
  providerWifIamProofRequiredBeforeMutation: true,
  independentReviewRequiredBeforeMutation: true,
  releaseClassification: 'NO-GO',
  failures,
}

console.log(JSON.stringify(report, null, 2))
for (const failure of failures) console.error(`::error title=Production authority audit::${failure}`)
if (failures.length) process.exitCode = 1
