#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const workflowPath = path.join(root, '.github', 'workflows', 'spatial-live-deploy.yml')
const workflow = readFileSync(workflowPath, 'utf8').replace(/\r\n?/g, '\n')
const failures = []

function requireMarker(label, marker) {
  if (!workflow.includes(marker)) failures.push(`${label} missing marker: ${marker}`)
}
function forbid(label, source, pattern, description) {
  if (pattern.test(source)) failures.push(`${label} contains forbidden ${description}`)
}
function jobSection(jobName) {
  const marker = `\n  ${jobName}:\n`
  const start = workflow.indexOf(marker)
  if (start < 0) return ''
  const rest = workflow.slice(start + marker.length)
  const next = rest.search(/\n  [A-Za-z0-9_-]+:\n/)
  return next < 0 ? rest : rest.slice(0, next)
}

const verifyJob = jobSection('verify')
const buildTargetJob = jobSection('build-target')
const buildRecoveryJob = jobSection('build-recovery')
const attestJob = jobSection('attest-bundles')
const deployJob = jobSection('deploy')
for (const [name, section] of Object.entries({ verifyJob, buildTargetJob, buildRecoveryJob, attestJob, deployJob })) {
  if (!section) failures.push(`Workflow is missing ${name}`)
}

for (const marker of [
  'name: URAI Canonical Production Release', 'workflow_dispatch:',
  "group: ${{ github.event_name == 'workflow_dispatch' && 'urai-app-production-v2'",
  "cancel-in-progress: ${{ github.event_name != 'workflow_dispatch' }}",
]) requireMarker('Workflow authority', marker)

const immutableActions = [
  'actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683',
  'actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020',
  'actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02',
  'actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093',
]
for (const action of immutableActions) requireMarker('Immutable action', action)
forbid('Workflow', workflow, /uses:\s+actions\/(?:checkout|setup-node|upload-artifact|download-artifact)@v\d+/, 'mutable core action tag')

const secretMarker = 'FIREBASE_SERVICE_ACCOUNT_JSON: ${{ secrets.FIREBASE_SERVICE_ACCOUNT_JSON }}'
const secretOccurrences = workflow.split(secretMarker).length - 1
if (secretOccurrences !== 1) failures.push(`Raw Firebase secret must occur exactly once; found ${secretOccurrences}`)
if (!deployJob.includes(secretMarker)) failures.push('Raw Firebase secret must be scoped to the protected deploy job')
const deployStepsStart = deployJob.indexOf('\n    steps:')
const deployJobScope = deployStepsStart >= 0 ? deployJob.slice(0, deployStepsStart) : deployJob
if (deployJobScope.includes('FIREBASE_SERVICE_ACCOUNT_JSON')) failures.push('Raw Firebase secret is exposed at deploy-job scope')
for (const [name, section] of Object.entries({ verifyJob, buildTargetJob, buildRecoveryJob, attestJob })) {
  if (section.includes('FIREBASE_SERVICE_ACCOUNT_JSON') || section.includes('GOOGLE_APPLICATION_CREDENTIALS')) failures.push(`${name} must not receive production credentials`)
}

for (const marker of ['name: Exact-head v2 release verification', 'node scripts/verify-release-v2-boundary.mjs', 'pnpm verify:release:critical']) requireMarker('Verify job', marker)
for (const marker of ['name: Build exact target static output without production credentials', 'urai-v2-target-raw-${{ env.TARGET_SHA }}', 'pnpm build:static']) requireMarker('Target build', marker)
for (const marker of ['name: Build exact recovery static output without production credentials', 'urai-v2-recovery-raw-${{ env.RECOVERY_SHA }}', 'pnpm build:static']) requireMarker('Recovery build', marker)
for (const marker of ['name: Attest target and recovery bundles with clean current authority', 'node scripts/create-static-release-bundle.mjs', 'urai-v2-target-bundle-${{ env.TARGET_SHA }}', 'urai-v2-recovery-bundle-${{ env.RECOVERY_SHA }}']) requireMarker('Bundle attestation', marker)
for (const marker of [
  'name: Deploy target or restore exact attested recovery bundle on urai.app', 'environment: production',
  "URAI_SMOKE_FETCH_ATTEMPTS: '8'", "URAI_SMOKE_RETRY_BASE_MS: '2000'",
  'Download exact target bundle', 'Download exact recovery bundle', 'node scripts/verify-release-credential-boundary.mjs',
  'Verify exact recovery bundle before production credentials exist', 'id: protected_operation', 'primary_rc=$?',
  'Recovery deployment succeeded; preserving failed release conclusion', 'exit 70',
  'Run canonical live smoke after successful target deployment', "if: steps.protected_operation.outcome == 'success'",
  'Remove temporary credentials', 'if: always()',
]) requireMarker('Protected deploy', marker)

const targetDownload = deployJob.indexOf('Download exact target bundle')
const recoveryDownload = deployJob.indexOf('Download exact recovery bundle')
const boundary = deployJob.indexOf('node scripts/verify-release-credential-boundary.mjs')
const recoveryVerify = deployJob.indexOf('Verify exact recovery bundle before production credentials exist')
const secretIndex = deployJob.indexOf(secretMarker)
const primaryDeploy = deployJob.indexOf('node scripts/live-release.mjs --deploy-prebuilt', secretIndex)
const strictSmoke = deployJob.indexOf('Run canonical live smoke after successful target deployment')
const cleanup = deployJob.indexOf('name: Remove temporary credentials')
const sequence = [targetDownload, recoveryDownload, boundary, recoveryVerify, secretIndex, primaryDeploy, strictSmoke, cleanup]
if (sequence.some((value) => value < 0) || sequence.some((value, index) => index > 0 && value <= sequence[index - 1])) failures.push('Protected deploy ordering must be target/recovery download, boundary checks, secret, deploy, smoke, cleanup')
forbid('Protected deploy', deployJob, /pnpm\s+build:static/, 'in-job production build')
forbid('Protected deploy', deployJob, /uses:\s+[^\n]+@(?:main|master|v\d+)/, 'mutable action reference')

const report = {
  schemaVersion: 'urai-release-v2-boundary-3', ok: failures.length === 0,
  workflow: '.github/workflows/spatial-live-deploy.yml', dualBundleAttestation: true,
  recoveryBundleRequired: true, rawSecretOccurrences: secretOccurrences,
  recoveryPreservesFailureConclusion: true, boundedPropagationAttempts: 8, failures,
}
console.log(JSON.stringify(report, null, 2))
if (failures.length) process.exit(1)
