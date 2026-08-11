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
  try { return readFileSync(file, 'utf8') }
  catch (error) {
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
if (!aaaTrigger.includes('target_sha:') || !aaaTrigger.includes('required: true') || !aaaTrigger.includes('type: string')) failures.push(`${aaaPath} workflow_call must require a string target_sha input`)
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
]) if (!aaa.includes(marker)) failures.push(`${aaaPath} must retain exact-proof marker: ${marker}`)
if (aaa.includes('URAI_PROOF_SOURCE_SHA: ${{ env.TARGET_SHA }}')) failures.push(`${aaaPath} must not construct job env from the env context; bind proof SHA directly from inputs/github`)
if (aaaBuildIndex < 0 || aaaPrepareIndex <= aaaBuildIndex || aaaProofIndex <= aaaPrepareIndex) failures.push(`${aaaPath} must build first, then prepare an exact clean proof source, then run final proof`)
if (aaa.includes('git reset --hard') || aaa.includes('git clean -fdx')) failures.push(`${aaaPath} must not destructively reset the build workspace or delete ignored build output`)

const phasePath = '.github/workflows/workflow-phase-boundaries.yml'
const phase = readRequired(phasePath)
const phaseTrigger = triggerBlockFor(phase)
const phaseVerifyIndex = phase.indexOf('\n  verify:')
const phaseProofIndex = phase.indexOf('\n  aaa-proof:')
if (!/\n\s*pull_request\s*:/.test(phaseTrigger)) failures.push(`${phasePath} must remain the sole pull-request proof authority`)
for (const path of ['.github/workflows/aaa-final-proof.yml', '.github/workflows/workflow-phase-boundaries.yml', 'scripts/aaa-launch-proof.mjs', 'scripts/check-workflow-phase-boundaries.mjs']) {
  if (!phaseTrigger.includes(`- "${path}"`)) failures.push(`${phasePath} pull-request trigger must include ${path}`)
}
for (const marker of [
  'group: workflow-phase-boundaries-${{ github.event.pull_request.head.sha || github.sha }}',
  'uses: ./.github/workflows/aaa-final-proof.yml',
  'target_sha: ${{ github.event.pull_request.head.sha }}',
  'base_url: http://127.0.0.1:4173',
  'screenshots: "true"',
  'needs: verify',
]) if (!phase.includes(marker)) failures.push(`${phasePath} must retain reusable AAA proof marker: ${marker}`)
if (phaseVerifyIndex < 0 || phaseProofIndex <= phaseVerifyIndex) failures.push(`${phasePath} must run static boundary verification before exact PR-head AAA proof`)

const deployPath = '.github/workflows/spatial-live-deploy.yml'
const deploy = readRequired(deployPath)
const quarantineMode = deploy.includes('name: URAI Canonical Production Release Verification') && deploy.includes('Verify canonical source with production release quarantined') && deploy.includes('Classification: NO-GO')
if (deploy.includes('FIREBASE_TOKEN')) failures.push('spatial-live-deploy.yml must not restore legacy Firebase CLI tokens')
if (!deploy.includes('persist-credentials: false')) failures.push('spatial-live-deploy.yml must not retain repository checkout credentials')

if (quarantineMode) {
  if (!deploy.includes('permissions:\n  contents: read')) failures.push('quarantined spatial-live-deploy.yml must remain read-only')
  if (!deploy.includes('name: Verify canonical source with production release quarantined')) failures.push('quarantined spatial-live-deploy.yml must retain the source-verification job')
  if (!deploy.includes('Verify production authority is fail-closed')) failures.push('quarantined spatial-live-deploy.yml must actively verify the release boundary is fail-closed')
  if (!deploy.includes('Production mutation is forbidden while provider WIF/IAM and runtime identity remain unproven.')) failures.push('quarantined spatial-live-deploy.yml must explicitly reject production mutation')
  if (!deploy.includes('Classification: NO-GO')) failures.push('quarantined spatial-live-deploy.yml must record NO-GO classification')
  if (/\n\s*deploy\s*:/.test(deploy)) failures.push('quarantined spatial-live-deploy.yml must not expose a deploy job')
  if (/environment\s*:\s*(?:['"]?production['"]?|\r?\n\s*name\s*:\s*['"]?production['"]?)/.test(deploy)) failures.push('quarantined spatial-live-deploy.yml must not expose the production environment')
  if (/FIREBASE_SERVICE_ACCOUNT_JSON:\s*\$\{\{\s*secrets\.|FIREBASE_PRIVATE_KEY|FIREBASE_CLIENT_EMAIL|credentials_json\s*:|firebase-service-account\.json/.test(deploy)) failures.push('quarantined spatial-live-deploy.yml must not expose long-lived credential material')
  if (/id-token:\s*write/.test(deploy)) failures.push('quarantined spatial-live-deploy.yml must not expose OIDC write authority')
  if (/node\s+scripts\/live-release\.mjs\s+--deploy(?:-prebuilt)?|firebase(?:-tools)?(?:@[^\s]+)?\s+deploy|pnpm\s+live:deploy/.test(deploy)) failures.push('quarantined spatial-live-deploy.yml must not expose a production mutation command')
} else {
  failures.push('spatial-live-deploy.yml must remain in checks-only NO-GO quarantine until a separately reviewed WIF-only authority exists')
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
console.log(`Workflow phase-boundary check passed for ${releaseWorkflows.length} release workflows in ${quarantineMode ? 'quarantine' : 'active-release'} mode.`)
console.log(`Retained ${retainedSourceFiles.length} bounded Life Map source files for exact-head repair.`)
