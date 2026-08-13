#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const normalize = (value) => value.replace(/\r\n?/g, '\n')
const workflow = normalize(readFileSync(path.join(root, '.github', 'workflows', 'spatial-live-deploy.yml'), 'utf8'))
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
  "process.argv.includes('--deploy')",
  "process.argv.includes('--deploy-prebuilt')",
  'forbiddenCredentialEnv',
  'Refusing long-lived Firebase credential environment variable:',
  'URAI Spatial production release is NO-GO',
  'No provider credentials were loaded and no production mutation was attempted.',
]) requireMarker('Fail-closed release operator', operator, marker)

forbidPattern('Release verification workflow', workflow, /\bsecrets\s*\./, 'repository secret reference')
forbidPattern('Release verification workflow', workflow, /environment\s*:\s*production/, 'production environment')
forbidPattern('Release verification workflow', workflow, /id-token\s*:\s*write/, 'OIDC write authority')
forbidPattern('Release verification workflow', workflow, /contents\s*:\s*write|actions\s*:\s*write/, 'repository write authority')
forbidPattern('Release verification workflow', workflow, /live-release\.mjs\s+--deploy(?:-prebuilt)?/, 'release mutation command')
forbidPattern('Release verification workflow', workflow, /firebase(?:-tools)?(?:@[^\s]+)?\s+deploy|pnpm\s+live:deploy|gcloud\s+deploy/, 'provider mutation command')
forbidPattern('Fail-closed release operator', operator, /deployHostingWithTemporaryCredentials|writeTemporaryServiceAccount|createSign\s*\(/, 'credential materialization or provider mutation implementation')

const pinnedActions = [...workflow.matchAll(/uses:\s+([^\s]+)/g)].map((match) => match[1])
for (const action of pinnedActions) {
  if (/^[^/]+\/[^@]+@/.test(action) && !/@[0-9a-f]{40}$/.test(action)) failures.push(`Release verification workflow contains non-immutable action reference: ${action}`)
}

const report = {
  schemaVersion: 'urai-release-credential-boundary-static-6',
  ok: failures.length === 0,
  mode: 'quarantine-no-go',
  exactHeadVerificationOnly: true,
  productionMutationAvailable: false,
  productionCredentialsAvailable: false,
  repositorySecretsReferenced: false,
  providerWifIamProofRequiredBeforeMutation: true,
  independentReviewRequiredBeforeMutation: true,
  releaseClassification: 'NO-GO',
  failures,
}

console.log(JSON.stringify(report, null, 2))
if (failures.length) process.exitCode = 1
