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
if (productionWorkflows.length !== 0) {
  failures.push(`Production mutation must remain quarantined; found ${productionWorkflows.sort().join(', ')}`)
}

const workflow = read(canonicalWorkflowPath)
const securityWorkflow = read(securityWorkflowPath)
const adcGuard = read(adcGuardPath)

requireAll('Canonical production verification workflow', workflow, [
  'name: URAI Canonical Production Release Verification',
  'permissions:\n  contents: read',
  'EXACT_HEAD_SHA: ${{ github.event.pull_request.head.sha || github.sha }}',
  'name: Verify canonical source with production release quarantined',
  'persist-credentials: false',
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
  'assertExternalAccountAdc',
  'forbiddenCredentialVariables',
  "record.type !== 'external_account'",
  'credential_source',
  'private_key',
  'client_email',
])

for (const [label, source] of [
  ['Canonical production verification workflow', workflow],
  ['Release security workflow', securityWorkflow],
]) {
  if (/\bsecrets\s*\./.test(source)) failures.push(`${label} must not reference repository secrets while quarantined`)
  if (/environment\s*:\s*production/.test(source)) failures.push(`${label} must not enter the production environment while quarantined`)
  if (/id-token\s*:\s*write|contents\s*:\s*write|actions\s*:\s*write/.test(source)) failures.push(`${label} must remain read-only while quarantined`)
  if (workflowExecutesProductionMutation(source)) failures.push(`${label} must not expose provider mutation commands`)
}

const packageJson = JSON.parse(read('package.json') || '{}')
const scripts = packageJson.scripts || {}
for (const forbiddenAlias of ['studio:deploy:static', 'deploy:xr:firebase', 'deploy:xr:firebase:static', 'deploy:staging', 'deploy:prod', 'frb', 'live:deploy:static', 'publish:live:static']) {
  if (forbiddenAlias in scripts) failures.push(`Forbidden deploy alias remains in package.json: ${forbiddenAlias}`)
}

const report = {
  schemaVersion: 'urai-production-authority-audit-8',
  ok: failures.length === 0,
  canonicalWorkflow: canonicalWorkflowPath,
  canonicalAdcGuard: adcGuardPath,
  productionMutationQuarantined: productionWorkflows.length === 0,
  productionWorkflows: productionWorkflows.sort(),
  longLivedRepositoryCredentialAuthorityAllowed: false,
  providerWifIamProofRequiredBeforeMutation: true,
  independentReviewRequiredBeforeMutation: true,
  releaseClassification: 'NO-GO',
  failures,
}

console.log(JSON.stringify(report, null, 2))
for (const failure of failures) console.error(`::error title=Production authority audit::${failure}`)
if (failures.length) process.exitCode = 1
