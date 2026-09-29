#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const normalize = (value) => value.replace(/\r\n?/g, '\n')
const workflow = normalize(readFileSync(path.join(root, '.github', 'workflows', 'spatial-live-deploy.yml'), 'utf8'))
const operator = normalize(readFileSync(path.join(root, 'scripts', 'live-release.mjs'), 'utf8'))
const recovery = normalize(readFileSync(path.join(root, 'scripts', 'firebase-hosting-recovery.mjs'), 'utf8'))
const failures = []

const requireMarker = (label, source, marker) => {
  if (!source.includes(marker)) failures.push(`${label} missing marker: ${marker}`)
}
const forbidPattern = (label, source, pattern, description) => {
  if (pattern.test(source)) failures.push(`${label} contains forbidden ${description}`)
}

for (const marker of [
  'name: URAI Canonical Production Release Verification',
  'workflow_dispatch:',
  'source_pr:',
  'approved_source_sha:',
  'release_sha:',
  'rollback_sha:',
  'confirm:',
  "if: github.event_name == 'workflow_dispatch'",
  'environment: production',
  'checks: read',
  'pull-requests: read',
  'id-token: write',
  'name: Authorize exact merged release and independent source approval',
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
  'node scripts/write-release-fingerprint.mjs',
  'node scripts/live-release.mjs --deploy-prebuilt',
  'RESTORE_EXACT_HOSTING_VERSION',
  'node scripts/firebase-hosting-recovery.mjs restore',
  'node scripts/firebase-hosting-recovery.mjs verify-restored',
  'persist-credentials: false',
  'Classification: PREPARED / FAIL-CLOSED',
]) requireMarker('Release workflow', workflow, marker)

for (const marker of [
  "process.argv.includes('--deploy')",
  "process.argv.includes('--deploy-prebuilt')",
  'forbiddenCredentialEnv',
  "process.env.GITHUB_ACTIONS !== 'true'",
  "process.env.GITHUB_REF !== 'refs/heads/main'",
  "URAI_GOVERNED_DEPLOY_AUTHORIZED",
  'DEPLOY_URAI_APP',
  'Production deployment requires short-lived external_account WIF ADC',
  'URAI_HOSTING_RECOVERY_RECEIPT',
  'firebase.static.json',
  '--only',
  'hosting',
]) requireMarker('Fail-closed release operator', operator, marker)

for (const marker of [
  'function accessTokenFromWif()',
  'GOOGLE_WIF_ACCESS_TOKEN',
  'Long-lived Google/Firebase credential variable is prohibited',
]) requireMarker('Hosting recovery', recovery, marker)

forbidPattern('Release workflow', workflow, /\bsecrets\s*\./, 'repository secret reference')
forbidPattern('Release workflow', workflow, /contents\s*:\s*write|actions\s*:\s*write/, 'repository write permission')
forbidPattern('Release operator', operator, /FIREBASE_SERVICE_ACCOUNT_JSON[^\n]*\|\||process\.env\.FIREBASE_SERVICE_ACCOUNT_JSON[^\n]*deploy/i, 'service-account deployment fallback')

if ((workflow.match(/id-token\s*:\s*write/g) || []).length !== 1) {
  failures.push('Release workflow must expose OIDC write authority exactly once')
}

const pinnedActions = [...workflow.matchAll(/uses:\s+([^\s]+)/g)].map((match) => match[1])
for (const action of pinnedActions) {
  if (/^[^/]+\/[^@]+@/.test(action) && !/@[0-9a-f]{40}$/.test(action)) {
    failures.push(`Release workflow contains non-immutable action reference: ${action}`)
  }
}

const report = {
  schemaVersion: 'urai-release-credential-boundary-static-10',
  ok: failures.length === 0,
  mode: 'governed-main-only-wif-deploy',
  exactHeadVerificationOnly: true,
  productionMutationAvailable: true,
  productionMutationManualDispatchOnly: true,
  longLivedProductionCredentialsAvailable: false,
  shortLivedWifDeploymentConfigured: true,
  rollbackCaptureRequiredBeforeMutation: true,
  independentReviewRequiredBeforeMutation: true,
  releaseClassification: 'PREPARED',
  failures,
}

console.log(JSON.stringify(report, null, 2))
if (failures.length) process.exitCode = 1
