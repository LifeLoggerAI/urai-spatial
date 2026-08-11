#!/usr/bin/env node

import { copyFileSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

const releaseWorkflows = [
  '.github/workflows/spatial-production-lock.yml',
  '.github/workflows/aaa-final-proof.yml',
  '.github/workflows/urai-spatial-lock.yml',
  '.github/workflows/urai-spatial-release-certification.yml',
  '.github/workflows/spatial-live-deploy.yml',
]

const failures = []

const readRequired = (file) => {
  try {
    return readFileSync(file, 'utf8')
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    failures.push(`Could not read ${file}: ${detail}`)
    return ''
  }
}

const triggerBlockFor = (source) => source.split(/\r?\n\s*jobs\s*:/)[0]
const mergedMainTrigger = /\n\s*push\s*:[\s\S]*?branches\s*:\s*(?:\r?\n\s*-\s*['"]?main['"]?|\[\s*['"]?main['"]?\s*\])/

for (const file of releaseWorkflows) {
  const source = readRequired(file)
  const triggerBlock = triggerBlockFor(source)

  if (!/\n\s*workflow_dispatch\s*:/.test(triggerBlock)) failures.push(`${file} must retain an explicit manual verification or release path`)
  if (!mergedMainTrigger.test(triggerBlock)) failures.push(`${file} must retain merged-main verification`)
  if (!source.includes('pnpm install --frozen-lockfile')) failures.push(`${file} must keep frozen dependency installation`)
  if (source.includes('URAI_SPATIAL_AUTO_DEPLOY')) failures.push(`${file} must not permit automatic production deployment from a repository variable`)
}

const aaaPath = '.github/workflows/aaa-final-proof.yml'
const aaa = readRequired(aaaPath)
const aaaTrigger = triggerBlockFor(aaa)
const aaaBuildIndex = aaa.indexOf('- name: Static build')
const aaaPrepareIndex = aaa.indexOf('- name: Prepare exact clean proof source')
const aaaProofIndex = aaa.indexOf('- name: Final launch proof receipt')
const exactTargetExpression = '${{ inputs.target_sha || github.sha }}'

if (!/\n\s*workflow_call\s*:/.test(aaaTrigger)) failures.push(`${aaaPath} must expose a reusable exact-head proof path`)
if (!aaaTrigger.includes('target_sha:') || !aaaTrigger.includes('required: true') || !aaaTrigger.includes('type: string')) {
  failures.push(`${aaaPath} workflow_call must require a string target_sha input`)
}
if (/\n\s*pull_request\s*:/.test(aaaTrigger)) failures.push(`${aaaPath} must not register a duplicate pull_request proof; PR proof belongs to workflow-phase-boundaries.yml`)

for (const marker of [
  `group: urai-aaa-final-proof-${exactTargetExpression}`,
  `TARGET_SHA: ${exactTargetExpression}`,
  `URAI_PROOF_SOURCE_SHA: ${exactTargetExpression}`,
  'ref: ${{ env.TARGET_SHA }}',
  'test "$(git rev-parse HEAD)" = "$TARGET_SHA"',
  'test "$(git write-tree)" = "$(git rev-parse \'HEAD^{tree}\')"',
  'test -z "$(git ls-files --others --exclude-standard)"',
  'PROOF_SOURCE="$GITHUB_WORKSPACE/.urai-proof-source-${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}"',
  'git clone --no-hardlinks --no-checkout "$GITHUB_WORKSPACE" "$PROOF_SOURCE"',
  'git -C "$PROOF_SOURCE" checkout --detach "$TARGET_SHA"',
  'test "$(git -C "$PROOF_SOURCE" rev-parse HEAD)" = "$TARGET_SHA"',
  'test -z "$(git -C "$PROOF_SOURCE" status --porcelain --untracked-files=all)"',
  'echo "URAI_PROOF_SOURCE_ROOT=$PROOF_SOURCE" >> "$GITHUB_ENV"',
  'cd "$URAI_PROOF_SOURCE_ROOT"',
  'name: urai-aaa-final-proof-${{ env.TARGET_SHA }}',
]) {
  if (!aaa.includes(marker)) failures.push(`${aaaPath} must retain exact-proof marker: ${marker}`)
}
if (aaa.includes('URAI_PROOF_SOURCE_SHA: ${{ env.TARGET_SHA }}')) failures.push(`${aaaPath} must not construct job env from the env context; bind proof SHA directly from inputs/github`)
if (aaaBuildIndex < 0 || aaaPrepareIndex <= aaaBuildIndex || aaaProofIndex <= aaaPrepareIndex) failures.push(`${aaaPath} must build first, then prepare an exact clean proof source, then run final proof`)
if (aaa.includes('git reset --hard') || aaa.includes('git clean -fdx')) failures.push(`${aaaPath} must not destructively reset the build workspace or delete ignored build output`)

const phasePath = '.github/workflows/workflow-phase-boundaries.yml'
const phase = readRequired(phasePath)
const phaseTrigger = triggerBlockFor(phase)
const phaseVerifyIndex = phase.indexOf('\n  verify:')
const phaseProofIndex = phase.indexOf('\n  aaa-proof:')

if (!/\n\s*pull_request\s*:/.test(phaseTrigger)) failures.push(`${phasePath} must remain the sole pull-request proof authority`)
for (const path of [
  '.github/workflows/aaa-final-proof.yml',
  '.github/workflows/workflow-phase-boundaries.yml',
  'scripts/aaa-launch-proof.mjs',
  'scripts/check-workflow-phase-boundaries.mjs',
]) {
  if (!phaseTrigger.includes(`- "${path}"`)) failures.push(`${phasePath} pull-request trigger must include ${path}`)
}
for (const marker of [
  'group: workflow-phase-boundaries-${{ github.event.pull_request.head.sha || github.sha }}',
  'uses: ./.github/workflows/aaa-final-proof.yml',
  'target_sha: ${{ github.event.pull_request.head.sha }}',
  'base_url: http://127.0.0.1:4173',
  'screenshots: "true"',
  'needs: verify',
]) {
  if (!phase.includes(marker)) failures.push(`${phasePath} must retain reusable AAA proof marker: ${marker}`)
}
if (phaseVerifyIndex < 0 || phaseProofIndex <= phaseVerifyIndex) failures.push(`${phasePath} must run static boundary verification before exact PR-head AAA proof`)

const deployPath = '.github/workflows/spatial-live-deploy.yml'
const deploy = readRequired(deployPath)
const productionEnvironment = /environment\s*:\s*(?:['"]?production['"]?|\r?\n\s*name\s*:\s*['"]?production['"]?)/
const deployJobStart = deploy.indexOf('\n  deploy:')
const deployJob = deployJobStart >= 0 ? deploy.slice(deployJobStart) : ''
const deployStepsIndex = deployJob.indexOf('\n    steps:')
const deployJobScope = deployStepsIndex >= 0 ? deployJob.slice(0, deployStepsIndex) : deployJob

if (deployJobStart < 0) failures.push('spatial-live-deploy.yml must retain the protected deploy job')
if (!deployJob.includes("github.event_name == 'workflow_dispatch'")) failures.push('spatial-live-deploy.yml deploy job must require manual workflow dispatch')
if (!deployJob.includes("github.ref == 'refs/heads/main'")) failures.push('spatial-live-deploy.yml deploy job must require refs/heads/main')
if (!deployJob.includes("inputs.confirm == 'DEPLOY_URAI_APP'") || !deployJob.includes("inputs.confirm == 'ROLLBACK_URAI_APP'")) failures.push('spatial-live-deploy.yml must retain explicit deploy and rollback confirmations')
if (!productionEnvironment.test(deployJob)) failures.push('spatial-live-deploy.yml must use the protected production environment')
if (!/permissions:\n\s+contents: read\n\s+id-token: write/.test(deployJobScope)) failures.push('spatial-live-deploy.yml protected deploy job must grant only contents:read plus id-token:write')
for (const marker of [
  'Validate production WIF configuration',
  'google-github-actions/auth@7c6bc770dae815cd3e89ee6cdf493a5fab2cc093',
  'workload_identity_provider: ${{ vars.GCP_WIF_PROVIDER }}',
  'service_account: ${{ secrets.GCP_DEPLOY_SERVICE_ACCOUNT }}',
  'create_credentials_file: true',
  'export_environment_variables: true',
  'google-github-actions/setup-gcloud@aa5489c8933f4cc7a4f7d45035b3b1440c9c10db',
  'Prove federated production identity without exposing credentials',
]) {
  if (!deployJob.includes(marker)) failures.push(`spatial-live-deploy.yml must retain production WIF marker: ${marker}`)
}
if (deploy.includes('FIREBASE_TOKEN')) failures.push('spatial-live-deploy.yml must not restore legacy Firebase CLI tokens')
if (deploy.includes('FIREBASE_SERVICE_ACCOUNT_JSON')) failures.push('spatial-live-deploy.yml must not contain long-lived Firebase service-account JSON')
if (deploy.includes('credentials_json:')) failures.push('spatial-live-deploy.yml must not contain a credentials_json fallback')
if (!deploy.includes('persist-credentials: false')) failures.push('spatial-live-deploy.yml must not retain repository checkout credentials')

const verifyBundleIndex = deploy.indexOf('node scripts/live-release.mjs --verify-prebuilt')
const authIndex = deploy.indexOf('Authenticate dedicated production deploy identity through GitHub OIDC/WIF')
const identityIndex = deploy.indexOf('Prove federated production identity without exposing credentials')
const deployIndex = deploy.indexOf('node scripts/live-release.mjs --deploy-prebuilt')
const smokeIndex = deploy.indexOf('Run canonical live smoke with current authority')
if ([verifyBundleIndex, authIndex, identityIndex, deployIndex, smokeIndex].some((index) => index < 0) ||
  !(verifyBundleIndex < authIndex && authIndex < identityIndex && identityIndex < deployIndex && deployIndex < smokeIndex)) {
  failures.push('spatial-live-deploy.yml must verify the bundle before WIF auth, verify identity before deploy, and smoke after deploy')
}

if (failures.length) {
  console.error('Workflow phase-boundary check failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

const retainedSourceFiles = [
  'urai-tier1/src/components/lifemap/AdaptiveLifeMapScene.tsx',
  'urai-tier1/src/components/lifemap/useLifeMapEvents.ts',
  'urai-tier1/src/spatial/lifemap/SpatialLifeMapCanonical.tsx',
  'scripts/capture-continuous-spatial-proof.mjs',
  'urai-tier1/tests/lifemap-scene-behavior.test.mjs',
  'urai-tier1/tests/lifemap-data-boundary.test.mjs',
  'urai-tier1/tests/lifemap-trust-loop.test.mjs',
  'urai-tier1/tests/continuous-spatial-restoration-contract.test.mjs',
]
for (const file of retainedSourceFiles) {
  const destination = join('receipt-ledger', 'source-export', file)
  mkdirSync(dirname(destination), { recursive: true })
  copyFileSync(file, destination)
}

console.log(`Workflow phase-boundary check passed for ${releaseWorkflows.length} release workflows.`)
console.log(`Retained ${retainedSourceFiles.length} bounded Life Map source files for exact-head repair.`)
