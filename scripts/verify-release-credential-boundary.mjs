#!/usr/bin/env node
import { existsSync, lstatSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const directory = path.dirname(fileURLToPath(import.meta.url))
const root = process.cwd()
const staticVerifierPath = path.join(directory, 'verify-release-credential-boundary-static.mjs')
const releaseOperatorPath = path.join(directory, 'live-release.mjs')
const recoveryPath = path.join(directory, 'firebase-hosting-recovery.mjs')
const workflowPath = path.join(root, '.github', 'workflows', 'spatial-live-deploy.yml')
const failures = []

const requireRegularFile = (label, file) => {
  if (!existsSync(file)) { failures.push(`${label} is missing: ${file}`); return false }
  const stats = lstatSync(file)
  if (!stats.isFile() || stats.isSymbolicLink()) { failures.push(`${label} must be a regular file: ${file}`); return false }
  return true
}
const readNormalized = (label, file) => requireRegularFile(label, file) ? readFileSync(file, 'utf8').replace(/\r\n?/g, '\n') : ''
const requireMarkers = (label, source, markers) => {
  for (const marker of markers) if (!source.includes(marker)) failures.push(`${label} missing marker: ${marker}`)
}

const staticSource = readNormalized('Static credential-boundary verifier', staticVerifierPath)
const operator = readNormalized('Release operator', releaseOperatorPath)
const recovery = readNormalized('Hosting recovery', recoveryPath)
const workflow = readNormalized('Canonical release workflow', workflowPath)

requireMarkers('Static credential-boundary verifier', staticSource, [
  "schemaVersion: 'urai-release-credential-boundary-static-10'",
  "mode: 'governed-main-only-wif-deploy'",
  'productionMutationAvailable: true',
  'productionMutationManualDispatchOnly: true',
  'longLivedProductionCredentialsAvailable: false',
  'shortLivedWifDeploymentConfigured: true',
  'rollbackCaptureRequiredBeforeMutation: true',
  'independentReviewRequiredBeforeMutation: true',
  "releaseClassification: 'PREPARED'",
])
requireMarkers('Release operator', operator, [
  "process.argv.includes('--deploy-prebuilt')",
  'forbiddenCredentialEnv',
  "process.env.GITHUB_ACTIONS !== 'true'",
  "process.env.GITHUB_REF !== 'refs/heads/main'",
  'URAI_GOVERNED_DEPLOY_AUTHORIZED',
  'DEPLOY_URAI_APP',
  'external_account',
  'URAI_HOSTING_RECOVERY_RECEIPT',
  'firebase.static.json',
])
requireMarkers('Hosting recovery', recovery, [
  'accessTokenFromWif',
  'GOOGLE_WIF_ACCESS_TOKEN',
  'Long-lived Google/Firebase credential variable is prohibited',
])
requireMarkers('Canonical release workflow', workflow, [
  'name: URAI Canonical Production Release Verification',
  'name: Verify canonical source and governed release boundary',
  'name: Governed production deploy',
  "if: github.event_name == 'workflow_dispatch'",
  'environment: production',
  'Release Governance Guard',
  'google-github-actions/auth@7c6bc770dae815cd3e89ee6cdf493a5fab2cc093',
  'node scripts/firebase-hosting-recovery.mjs discover',
  'node scripts/live-release.mjs --deploy-prebuilt',
  'RESTORE_EXACT_HOSTING_VERSION',
  'Classification: PREPARED / FAIL-CLOSED',
])

await import('./verify-release-credential-boundary-static.mjs')

if (/\bsecrets\s*\./.test(workflow)) failures.push('Governed release workflow must not reference repository long-lived secrets')
if (/contents\s*:\s*write|actions\s*:\s*write/.test(workflow)) failures.push('Governed release workflow must not have repository write authority')
if ((workflow.match(/id-token\s*:\s*write/g) || []).length !== 1) failures.push('Governed release workflow must expose OIDC write authority exactly once')
if (!/environment\s*:\s*production/.test(workflow)) failures.push('Governed production mutation must be protected by the production environment')
if (!/live-release\.mjs\s+--deploy-prebuilt/.test(workflow)) failures.push('Governed workflow must expose exactly the prebuilt release operator')
if (/FIREBASE_SERVICE_ACCOUNT_JSON\s*:\s*\$\{\{|FIREBASE_PRIVATE_KEY\s*:\s*\$\{\{|FIREBASE_TOKEN\s*:\s*\$\{\{/.test(workflow)) {
  failures.push('Governed release workflow must not source long-lived Firebase credentials')
}

const report = {
  schemaVersion: 'urai-release-credential-boundary-8',
  ok: failures.length === 0 && process.exitCode !== 1,
  mode: 'governed-main-only-wif-deploy',
  exactHeadVerificationOnly: true,
  productionMutationAvailable: true,
  productionMutationManualDispatchOnly: true,
  productionCredentialsAvailable: true,
  longLivedProductionCredentialsAvailable: false,
  shortLivedWifDeploymentConfigured: true,
  rollbackCaptureRequiredBeforeMutation: true,
  independentReviewRequiredBeforeMutation: true,
  releaseClassification: 'PREPARED',
  failures,
}
console.log(JSON.stringify(report, null, 2))
if (failures.length) process.exitCode = 1
