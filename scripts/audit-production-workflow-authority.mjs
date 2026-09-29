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
if (productionWorkflows.length !== 1 || productionWorkflows[0] !== canonicalWorkflowPath) {
  failures.push(`Exactly one canonical production mutation workflow is required; found ${productionWorkflows.sort().join(', ') || 'none'}`)
}

const workflow = read(canonicalWorkflowPath)
const securityWorkflow = read(securityWorkflowPath)
const adcGuard = read(adcGuardPath)

requireAll('Canonical production workflow', workflow, [
  'name: URAI Canonical Production Release Verification',
  'workflow_dispatch:',
  'name: Verify canonical source and governed release boundary',
  'name: Governed production deploy',
  "if: github.event_name == 'workflow_dispatch'",
  'environment: production',
  'id-token: write',
  'checks: read',
  'pull-requests: read',
  'persist-credentials: false',
  'Release Governance Guard',
  "test \"$CONFIRM\" = 'DEPLOY_URAI_APP'",
  'git merge-base --is-ancestor "$ROLLBACK_SHA" "$RELEASE_SHA"',
  'google-github-actions/auth@7c6bc770dae815cd3e89ee6cdf493a5fab2cc093',
  "workload_identity_provider: 'projects/952723774155/locations/global/workloadIdentityPools/urai-github-prod/providers/github-actions'",
  "service_account: 'urai-spatial-github-deployer@urai-4dc1d.iam.gserviceaccount.com'",
  "access_token_scopes: 'https://www.googleapis.com/auth/cloud-platform'",
  'create_credentials_file: true',
  'export_environment_variables: true',
  'node scripts/firebase-hosting-recovery.mjs discover',
  'node scripts/live-release.mjs --deploy-prebuilt',
  'RESTORE_EXACT_HOSTING_VERSION',
  'node scripts/firebase-hosting-recovery.mjs verify-restored',
  'Classification: PREPARED / FAIL-CLOSED',
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

if (/\bsecrets\s*\./.test(workflow)) failures.push('Canonical production workflow must not reference repository long-lived secrets')
if (/contents\s*:\s*write|actions\s*:\s*write/.test(workflow)) failures.push('Canonical production workflow must not gain repository write authority')
if ((workflow.match(/id-token\s*:\s*write/g) || []).length !== 1) failures.push('Canonical production workflow must expose OIDC write authority exactly once')
if (!/environment\s*:\s*production/.test(workflow)) failures.push('Canonical production mutation must use the protected production environment')
if (!workflowExecutesProductionMutation(workflow)) failures.push('Canonical production workflow must expose the guarded prebuilt deployment operator')

if (/\bsecrets\s*\./.test(securityWorkflow)) failures.push('Release security workflow must not reference repository secrets')
if (/environment\s*:\s*production/.test(securityWorkflow)) failures.push('Release security workflow must remain independent of the production environment')
if (/id-token\s*:\s*write|contents\s*:\s*write|actions\s*:\s*write/.test(securityWorkflow)) failures.push('Release security workflow must remain read-only')
if (workflowExecutesProductionMutation(securityWorkflow)) failures.push('Release security workflow must not execute provider mutation')

const packageJson = JSON.parse(read('package.json') || '{}')
const scripts = packageJson.scripts || {}
for (const forbiddenAlias of ['studio:deploy:static', 'deploy:xr:firebase', 'deploy:xr:firebase:static', 'deploy:staging', 'deploy:prod', 'frb', 'live:deploy:static', 'publish:live:static']) {
  if (forbiddenAlias in scripts) failures.push(`Forbidden deploy alias remains in package.json: ${forbiddenAlias}`)
}

const report = {
  schemaVersion: 'urai-production-authority-audit-12',
  ok: failures.length === 0,
  canonicalWorkflow: canonicalWorkflowPath,
  canonicalAdcGuard: adcGuardPath,
  productionMutationQuarantined: false,
  productionMutationWorkflowCount: productionWorkflows.length,
  productionWorkflows: productionWorkflows.sort(),
  longLivedRepositoryCredentialAuthorityAllowed: false,
  mainOnlyShortLivedWifDeployConfigured: true,
  providerWifIamProofRequiredBeforeMutation: true,
  independentReviewRequiredBeforeMutation: true,
  rollbackCaptureRequiredBeforeMutation: true,
  releaseClassification: 'PREPARED',
  failures,
}

console.log(JSON.stringify(report, null, 2))
for (const failure of failures) console.error(`::error title=Production authority audit::${failure}`)
if (failures.length) process.exitCode = 1
