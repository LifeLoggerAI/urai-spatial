#!/usr/bin/env node
import { governedWorkflowIsManualOnly } from './governed-workflow-trigger.mjs'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const workflowsDir = path.join(root, '.github', 'workflows')
const canonicalWorkflowPath = '.github/workflows/spatial-live-deploy.yml'
const governedDeployWorkflowPath = '.github/workflows/spatial-governed-wif-deploy.yml'
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
const forbiddenWorkflowDispatchers = []
if (!existsSync(workflowsDir)) {
  failures.push('Missing .github/workflows directory')
} else {
  for (const name of readdirSync(workflowsDir).filter((entry) => /\.ya?ml$/.test(entry))) {
    const source = normalize(readFileSync(path.join(workflowsDir, name), 'utf8'))
    const workflowPath = `.github/workflows/${name}`
    if (workflowExecutesProductionMutation(source)) productionWorkflows.push(workflowPath)
    const dispatchesAnotherWorkflow = /createWorkflowDispatch\s*\(|\/actions\/workflows\//.test(source)
    const targetsProtectedReleaseWorkflow =
      source.includes('spatial-live-deploy.yml') || source.includes('spatial-governed-wif-deploy.yml')
    if (
      workflowPath !== governedDeployWorkflowPath &&
      dispatchesAnotherWorkflow &&
      targetsProtectedReleaseWorkflow
    ) forbiddenWorkflowDispatchers.push(workflowPath)
  }
}
const expectedProductionWorkflows = [governedDeployWorkflowPath]
if (JSON.stringify(productionWorkflows.sort()) !== JSON.stringify(expectedProductionWorkflows)) {
  failures.push(`Production mutation is restricted to ${governedDeployWorkflowPath}; found ${productionWorkflows.sort().join(', ') || 'none'}`)
}
if (forbiddenWorkflowDispatchers.length) {
  failures.push(`Protected release workflows must remain manual/non-chained; obsolete workflow dispatchers found: ${forbiddenWorkflowDispatchers.sort().join(', ')}`)
}

const workflow = read(canonicalWorkflowPath)
const governedDeployWorkflow = read(governedDeployWorkflowPath)
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

requireAll('Governed WIF production workflow', governedDeployWorkflow, [
  'name: URAI Governed WIF Production Deploy',
  'workflow_dispatch:',
  'release_sha:',
  'rollback_sha:',
  'pull_request:',
  'confirm:',
  "environment: production",
  'id-token: write',
  'actions: read',
  'pull-requests: read',
  'Release Governance Guard',
  'release-governance-guard.yml/runs?event=pull_request&status=success&head_sha=$RELEASE_SHA',
  'ref: ${{ env.RELEASE_SHA }}',
  'persist-credentials: false',
  'git merge-base --is-ancestor "$ROLLBACK_SHA" "$RELEASE_SHA"',
  'node scripts/create-static-release-bundle.mjs',
  'google-github-actions/auth@7c6bc770dae815cd3e89ee6cdf493a5fab2cc093',
  'projects/952723774155/locations/global/workloadIdentityPools/urai-github-prod/providers/github-actions',
  'urai-spatial-github-deployer@urai-4dc1d.iam.gserviceaccount.com',
  'create_credentials_file: true',
  'external_account',
  'firebase-tools@15.22.3 deploy',
  '--only hosting',
  'node scripts/urai-post-deploy-smoke.mjs',
  'firebasehosting.googleapis.com/v1beta1/sites/$FIREBASE_PROJECT/releases',
  'Roll back Hosting if live certification fails',
  'DEPLOY_URAI_APP',
])

if (!governedWorkflowIsManualOnly(governedDeployWorkflow)) failures.push('Governed WIF production workflow must declare only the top-level workflow_dispatch event')
if (/\bsecrets\s*\./.test(governedDeployWorkflow)) failures.push('Governed WIF production workflow must not reference repository secrets')
if (/FIREBASE_SERVICE_ACCOUNT_JSON|FIREBASE_PRIVATE_KEY|FIREBASE_CLIENT_EMAIL|FIREBASE_TOKEN/.test(governedDeployWorkflow)) {
  failures.push('Governed WIF production workflow must not reference long-lived Firebase credential material')
}
if (/contents\s*:\s*write|actions\s*:\s*write|deployments\s*:\s*write|packages\s*:\s*write/.test(governedDeployWorkflow)) {
  failures.push('Governed WIF production workflow must not gain repository mutation permissions')
}
if ((governedDeployWorkflow.match(/id-token\s*:\s*write/g) || []).length !== 1) {
  failures.push('Governed WIF production workflow must expose id-token: write exactly once')
}

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
  schemaVersion: 'urai-production-authority-audit-12',
  ok: failures.length === 0,
  canonicalWorkflow: canonicalWorkflowPath,
  canonicalAdcGuard: adcGuardPath,
  productionMutationQuarantined: false,
  governedWifProductionMutationAvailable: productionWorkflows.length === 1 && productionWorkflows[0] === governedDeployWorkflowPath,
  productionWorkflows: productionWorkflows.sort(),
  governedDeployWorkflow: governedDeployWorkflowPath,
  legacyAutoDispatchersRetired: forbiddenWorkflowDispatchers.length === 0,
  longLivedRepositoryCredentialAuthorityAllowed: false,
  mainOnlyReadOnlyWifProofConfigured: true,
  providerWifIamProofRequiredBeforeMutation: true,
  independentReviewRequiredBeforeMutation: true,
  releaseClassification: 'GOVERNED-PATH-AVAILABLE',
  failures,
}

console.log(JSON.stringify(report, null, 2))
for (const failure of failures) console.error(`::error title=Production authority audit::${failure}`)
if (failures.length) process.exitCode = 1
