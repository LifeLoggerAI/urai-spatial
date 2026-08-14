#!/usr/bin/env node
import { existsSync, lstatSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const directory = path.dirname(fileURLToPath(import.meta.url))
const root = process.cwd()
const staticVerifierPath = path.join(directory, 'verify-release-credential-boundary-static.mjs')
const releaseOperatorPath = path.join(directory, 'live-release.mjs')
const workflowPath = path.join(root, '.github', 'workflows', 'spatial-live-deploy.yml')
const wifWorkflowPath = path.join(root, '.github', 'workflows', 'google-wif-runtime-identity-proof.yml')
const failures = []

const requireRegularFile = (label, file) => {
  if (!existsSync(file)) { failures.push(`${label} is missing: ${file}`); return false }
  const stats = lstatSync(file)
  if (!stats.isFile() || stats.isSymbolicLink()) { failures.push(`${label} must be a regular file: ${file}`); return false }
  return true
}
const readNormalized = (label, file) => requireRegularFile(label, file) ? readFileSync(file, 'utf8').replace(/\r\n?/g, '\n') : ''
const requireMarkers = (label, source, markers) => { for (const marker of markers) if (!source.includes(marker)) failures.push(`${label} missing marker: ${marker}`) }

const staticSource = readNormalized('Static credential-boundary verifier', staticVerifierPath)
const operator = readNormalized('Release operator', releaseOperatorPath)
const workflow = readNormalized('Canonical release workflow', workflowPath)
const wifWorkflow = readNormalized('WIF identity proof workflow', wifWorkflowPath)

requireMarkers('Static credential-boundary verifier', staticSource, [
  "schemaVersion: 'urai-release-credential-boundary-static-8'",
  "mode: 'quarantine-no-go-with-isolated-read-only-wif-proof'",
  'exactHeadVerificationOnly: true',
  'productionMutationAvailable: false',
  'longLivedProductionCredentialsAvailable: false',
  'mainOnlyReadOnlyWifProofConfigured: true',
  "releaseClassification: 'NO-GO'",
])
requireMarkers('Release operator', operator, [
  "process.argv.includes('--deploy')", "process.argv.includes('--deploy-prebuilt')", 'forbiddenCredentialEnv',
  'URAI Spatial production release is NO-GO', 'No provider credentials were loaded and no production mutation was attempted.',
])
requireMarkers('Canonical release workflow', workflow, [
  'name: URAI Canonical Production Release Verification', 'Verify canonical source with production release quarantined',
  'Classification: NO-GO', 'Production release and Hosting recovery are intentionally quarantined.',
])
requireMarkers('WIF identity proof workflow', wifWorkflow, [
  'name: Google WIF Runtime Identity Proof', 'Prove short-lived Google WIF identity', 'id-token: write',
  'google-github-actions/auth@7c6bc770dae815cd3e89ee6cdf493a5fab2cc093', 'Production mutation command: none',
])

await import('./verify-release-credential-boundary-static.mjs')

const requestedOperation = String(process.env.URAI_RELEASE_OPERATION || '').trim().toLowerCase()
const githubJob = String(process.env.GITHUB_JOB || '').trim().toLowerCase()
const mutationRequested = ['deploy', 'rollback', 'publish', 'release'].includes(requestedOperation) || githubJob === 'deploy'
if (mutationRequested) failures.push('Production mutation is forbidden while the release boundary is quarantined')

if (/\bsecrets\s*\./.test(workflow)) failures.push('Quarantined release workflow must not reference repository secrets')
if (/environment\s*:\s*production/.test(workflow)) failures.push('Quarantined release workflow must not enter the production environment')
if (/id-token\s*:\s*write|contents\s*:\s*write|actions\s*:\s*write/.test(workflow)) failures.push('Quarantined release workflow must remain read-only with no OIDC authority')
if (/live-release\.mjs\s+--deploy(?:-prebuilt)?|firebase(?:-tools)?(?:@[^\s]+)?\s+deploy|pnpm\s+live:deploy|gcloud\s+deploy/.test(workflow)) failures.push('Quarantined release workflow must not expose a provider mutation command')
if (/\bsecrets\s*\./.test(wifWorkflow)) failures.push('WIF identity proof workflow must not reference repository secrets')
if (/environment\s*:\s*production|contents\s*:\s*write|actions\s*:\s*write/.test(wifWorkflow)) failures.push('WIF identity proof workflow must not enter production environment or gain repository write authority')
if ((wifWorkflow.match(/id-token\s*:\s*write/g) || []).length !== 1) failures.push('WIF identity proof workflow must expose OIDC write authority exactly once')
if (/live-release\.mjs\s+--deploy(?:-prebuilt)?|firebase(?:-tools)?(?:@[^\s]+)?\s+deploy|pnpm\s+live:deploy|gcloud\s+deploy/.test(wifWorkflow)) failures.push('WIF identity proof workflow must not expose a provider mutation command')

const report = {
  schemaVersion: 'urai-release-credential-boundary-6', ok: failures.length === 0 && process.exitCode !== 1,
  mode: 'quarantine-no-go', exactHeadVerificationOnly: true, productionMutationAvailable: false,
  productionCredentialsAvailable: false, longLivedProductionCredentialsAvailable: false,
  mainOnlyReadOnlyWifProofConfigured: true, runtimeMutationIntentDetected: mutationRequested,
  providerWifIamProofRequiredBeforeMutation: true, independentReviewRequiredBeforeMutation: true,
  releaseClassification: 'NO-GO', failures,
}
console.log(JSON.stringify(report, null, 2))
if (failures.length) process.exitCode = 1
