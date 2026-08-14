#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const normalize = (value) => value.replace(/\r\n?/g, '\n')
const workflow = normalize(readFileSync(path.join(root, '.github', 'workflows', 'spatial-live-deploy.yml'), 'utf8'))
const wifWorkflow = normalize(readFileSync(path.join(root, '.github', 'workflows', 'google-wif-runtime-identity-proof.yml'), 'utf8'))
const operator = normalize(readFileSync(path.join(root, 'scripts', 'live-release.mjs'), 'utf8'))
const failures = []

const requireMarker = (label, source, marker) => {
  if (!source.includes(marker)) failures.push(`${label} missing marker: ${marker}`)
}
const forbidPattern = (label, source, pattern, description) => {
  if (pattern.test(source)) failures.push(`${label} contains forbidden ${description}`)
}

for (const marker of [
  'name: URAI Canonical Production Release Verification',
  'permissions:\n  contents: read',
  'EXACT_HEAD_SHA: ${{ github.event.pull_request.head.sha || github.sha }}',
  'name: Verify canonical source with production release quarantined',
  'persist-credentials: false',
  'Classification: NO-GO',
  'Production release and Hosting recovery are intentionally quarantined.',
]) requireMarker('Release verification workflow', workflow, marker)

for (const marker of [
  'name: Google WIF Runtime Identity Proof',
  'branches: [main]',
  "if: github.ref == 'refs/heads/main'",
  'id-token: write',
  'persist-credentials: false',
  'google-github-actions/auth@7c6bc770dae815cd3e89ee6cdf493a5fab2cc093',
  "workload_identity_provider: 'projects/952723774155/locations/global/workloadIdentityPools/urai-github-prod/providers/github-actions'",
  "service_account: 'urai-spatial-github-deployer@urai-4dc1d.iam.gserviceaccount.com'",
  "access_token_scopes: 'https://www.googleapis.com/auth/cloud-platform.read-only'",
  'create_credentials_file: false',
  'export_environment_variables: false',
  'Production mutation command: none',
]) requireMarker('WIF identity proof workflow', wifWorkflow, marker)

for (const marker of [
  "process.argv.includes('--deploy')",
  "process.argv.includes('--deploy-prebuilt')",
  'forbiddenCredentialEnv',
  'Refusing long-lived Firebase credential environment variable:',
  'URAI Spatial production release is NO-GO',
  'No provider credentials were loaded and no production mutation was attempted.',
]) requireMarker('Fail-closed release operator', operator, marker)

forbidPattern('Release verification workflow', workflow, /\bsecrets\s*\./, 'repository secret reference')
forbidPattern('Release verification workflow', workflow, /environment\s*:\s*production/, 'production environment')
forbidPattern('Release verification workflow', workflow, /id-token\s*:\s*write|contents\s*:\s*write|actions\s*:\s*write/, 'OIDC or repository write authority')
forbidPattern('Release verification workflow', workflow, /live-release\.mjs\s+--deploy(?:-prebuilt)?/, 'release mutation command')
forbidPattern('Release verification workflow', workflow, /firebase(?:-tools)?(?:@[^\s]+)?\s+deploy|pnpm\s+live:deploy|gcloud\s+deploy/, 'provider mutation command')
forbidPattern('WIF identity proof workflow', wifWorkflow, /\bsecrets\s*\./, 'repository secret reference')
forbidPattern('WIF identity proof workflow', wifWorkflow, /environment\s*:\s*production|contents\s*:\s*write|actions\s*:\s*write/, 'production environment or repository write authority')
if ((wifWorkflow.match(/id-token\s*:\s*write/g) || []).length !== 1) failures.push('WIF identity proof workflow must expose exactly one OIDC write permission')
forbidPattern('WIF identity proof workflow', wifWorkflow, /live-release\.mjs\s+--deploy(?:-prebuilt)?|firebase(?:-tools)?(?:@[^\s]+)?\s+deploy|pnpm\s+live:deploy|gcloud\s+deploy/, 'provider mutation command')
forbidPattern('Fail-closed release operator', operator, /deployHostingWithTemporaryCredentials|writeTemporaryServiceAccount|createSign\s*\(/, 'credential materialization or provider mutation implementation')

for (const [label, source] of [['Release verification workflow', workflow], ['WIF identity proof workflow', wifWorkflow]]) {
  const pinnedActions = [...source.matchAll(/uses:\s+([^\s]+)/g)].map((match) => match[1])
  for (const action of pinnedActions) {
    if (/^[^/]+\/[^@]+@/.test(action) && !/@[0-9a-f]{40}$/.test(action)) failures.push(`${label} contains non-immutable action reference: ${action}`)
  }
}

const report = {
  schemaVersion: 'urai-release-credential-boundary-static-8',
  ok: failures.length === 0,
  mode: 'quarantine-no-go-with-isolated-read-only-wif-proof',
  exactHeadVerificationOnly: true,
  productionMutationAvailable: false,
  longLivedProductionCredentialsAvailable: false,
  mainOnlyReadOnlyWifProofConfigured: true,
  repositorySecretsReferenced: false,
  providerWifIamProofRequiredBeforeMutation: true,
  independentReviewRequiredBeforeMutation: true,
  releaseClassification: 'NO-GO',
  failures,
}

console.log(JSON.stringify(report, null, 2))
if (failures.length) process.exitCode = 1
