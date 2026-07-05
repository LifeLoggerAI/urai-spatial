import fs from 'node:fs'
import { spawn } from 'node:child_process'
import process from 'node:process'

const mode = process.argv.includes('--deploy') ? 'deploy' : 'check'
const deployProject = process.env.FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT || process.env.GCLOUD_PROJECT
const manifestPath = 'release/urai-spatial-live-manifest.json'
const tierXrMatrixPath = 'release/tier-xr-release-matrix.json'
const doneDoneLockPath = 'docs/URAI_SPATIAL_DONE_DONE_LOCK.md'
const studioSpatialHandoffPath = 'docs/contracts/URAI_STUDIO_SPATIAL_HANDOFF.md'
const studioSpatialValidatorPath = 'urai-tier1/src/lib/studio-spatial-handoff.ts'
const studioSpatialValidatorTestPath = 'urai-tier1/tests/studio-spatial-handoff.test.mjs'

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const displayCommand = options.displayCommand ?? command
    const displayArgs = options.displayArgs ?? args
    console.log(`\n[URAI Spatial Live] $ ${displayCommand} ${displayArgs.join(' ')}`)
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: false,
      env: { ...process.env, ...(options.env ?? {}) },
      cwd: options.cwd ?? process.cwd(),
    })

    child.on('error', reject)
    child.on('exit', (code, signal) => {
      if (code === 0) resolve({ code, signal })
      else reject(new Error(`${displayCommand} ${displayArgs.join(' ')} failed with code ${code ?? signal}`))
    })
  })
}

function resolvePnpmCommand() {
  const npmExecPath = process.env.npm_execpath
  if (npmExecPath && /pnpm/i.test(npmExecPath) && fs.existsSync(npmExecPath)) {
    return { command: process.execPath, argsPrefix: [npmExecPath], displayCommand: 'pnpm' }
  }

  return { command: 'pnpm', argsPrefix: [], displayCommand: 'pnpm' }
}

function runPnpm(args, options = {}) {
  const pnpm = resolvePnpmCommand()
  return run(pnpm.command, [...pnpm.argsPrefix, ...args], {
    ...options,
    displayCommand: pnpm.displayCommand,
    displayArgs: args,
  })
}

function requireFile(path) {
  if (!fs.existsSync(path)) {
    throw new Error(`Required release file missing: ${path}`)
  }
}

function readJson(path) {
  requireFile(path)
  try {
    return JSON.parse(fs.readFileSync(path, 'utf8'))
  } catch (error) {
    throw new Error(`Invalid JSON in ${path}: ${error.message}`)
  }
}

function readText(path) {
  requireFile(path)
  return fs.readFileSync(path, 'utf8')
}

function assertTextIncludes(path, expectedValues, label = path) {
  const text = readText(path)
  const missing = expectedValues.filter((value) => !text.includes(value))
  if (missing.length) {
    throw new Error(`${label} is missing required terms: ${missing.join(', ')}`)
  }
}

function assertArrayIncludes(source, key, expectedValues, label = key) {
  if (!Array.isArray(source[key])) {
    throw new Error(`Release manifest field ${label} must be an array.`)
  }
  const missing = expectedValues.filter((value) => !source[key].includes(value))
  if (missing.length) {
    throw new Error(`Release manifest field ${label} is missing: ${missing.join(', ')}`)
  }
}

function assertTierXrMatrix(manifest) {
  if (manifest.tierXrReleaseMatrix !== tierXrMatrixPath) {
    throw new Error(`Release manifest field tierXrReleaseMatrix must be ${tierXrMatrixPath}.`)
  }

  const matrix = readJson(tierXrMatrixPath)
  if (matrix.repository !== 'LifeLoggerAI/urai-spatial') throw new Error('Tier/XR matrix repository mismatch.')
  if (matrix.runtimeRoot !== 'urai-tier1') throw new Error('Tier/XR matrix runtimeRoot must be urai-tier1.')
  if (matrix.releaseGate !== 'pnpm live:check') throw new Error('Tier/XR matrix releaseGate must be pnpm live:check.')

  const tiers = Array.isArray(matrix.tiers) ? matrix.tiers : []
  const xrTargets = Array.isArray(matrix.xrTargets) ? matrix.xrTargets : []
  for (const id of ['tier-1', 'tier-2', 'tier-3', 'tier-4', 'tier-5']) {
    if (!tiers.some((entry) => entry.id === id)) throw new Error(`Tier/XR matrix missing tier: ${id}`)
  }
  for (const id of ['web-spatial', 'webxr', 'quest-vr', 'visionos', 'ar-handheld']) {
    if (!xrTargets.some((entry) => entry.id === id)) throw new Error(`Tier/XR matrix missing XR target: ${id}`)
  }

  for (const target of xrTargets.filter((entry) => entry.id !== 'web-spatial')) {
    if (target.currentEvidenceStatus !== 'not-validated') {
      throw new Error(`XR target ${target.id} must remain not-validated until provider/device evidence exists.`)
    }
  }

  return matrix
}

function assertBlockedXrClaims(manifest) {
  const expectedClaims = {
    ar: 'disabled-until-provider-validated',
    vr: 'disabled-until-device-validated',
    xr: 'disabled-until-provider-and-device-validated',
    webxr: 'disabled-until-provider-validated',
    questVr: 'disabled-until-device-validated',
    visionOs: 'disabled-until-platform-target-validated',
  }

  for (const [claim, expected] of Object.entries(expectedClaims)) {
    if (manifest.liveClaims?.[claim] !== expected) {
      throw new Error(`Release manifest live claim ${claim} must be ${expected}.`)
    }
  }
}

function assertDoneDoneLock() {
  assertTextIncludes(doneDoneLockPath, [
    'Canonical runtime root: `urai-tier1`',
    'V1 Genesis spatial home',
    'V2 mirror, memory, and timeline surface',
    'V3 relationship, shadow, and pattern surfaces',
    'V4 WebXR / AR / VR pathway',
    'V5 Mirror of Becoming / legacy spatial release',
    'disabled until provider/browser validation exists',
    'live-working verified',
  ], 'URAI Spatial done-done lock')
}

function assertStudioSpatialHandoffContract() {
  assertTextIncludes(studioSpatialHandoffPath, [
    'StudioSpatialExport',
    'producer: \'urai-studio\'',
    'consumer: \'urai-spatial\'',
    'web-spatial',
    'webxr-disabled',
    'quest-vr-disabled',
    'visionos-disabled',
    'ar-handheld-disabled',
    'consentReceipt',
    'safetyBoundaries',
    'pattern_support_not_diagnosis',
    'UraiSpatialHandoffValidation',
  ], 'URAI Studio Spatial handoff contract')
}

function assertStudioSpatialRuntimeValidator() {
  assertTextIncludes(studioSpatialValidatorPath, [
    'StudioSpatialExport',
    'validateStudioSpatialExport',
    'UraiSpatialHandoffValidation',
    'web-spatial',
    'webxr-disabled',
    'quest-vr-disabled',
    'visionos-disabled',
    'ar-handheld-disabled',
    'consentReceipt',
    'safetyBoundaries',
    'pattern_support_not_diagnosis',
  ], 'URAI Studio Spatial runtime validator')
  assertTextIncludes(studioSpatialValidatorTestPath, [
    'validateStudioSpatialExport',
    'accepts launch-safe web-spatial exports',
    'rejects unsupported live XR targets',
    'rejects missing consent receipt',
    'rejects unsafe asset uri and mime type',
  ], 'URAI Studio Spatial runtime validator tests')
}

function assertReleaseManifest() {
  const manifest = readJson(manifestPath)

  const expectedScalars = {
    repository: 'LifeLoggerAI/urai-spatial',
    system: 'urai-spatial',
    appPackage: 'urai-tier1',
    releaseGate: 'pnpm live:check',
    liveStatusFile: 'release/LIVE_STATUS.md',
    doneDoneLock: doneDoneLockPath,
    studioSpatialHandoffContract: studioSpatialHandoffPath,
  }

  for (const [key, expected] of Object.entries(expectedScalars)) {
    if (manifest[key] !== expected) {
      throw new Error(`Release manifest field ${key} must be ${expected}.`)
    }
  }

  assertArrayIncludes(manifest, 'routes', ['/', '/u/adamclamp', '/spatial', '/life-map', '/privacy', '/terms'])
  assertArrayIncludes(manifest, 'apiRoutes', [
    '/api/system/health',
    '/api/system/manifest',
    '/api/system/capabilities',
    '/api/system/integration-contract',
    '/api/body-biometric',
    '/api/orb-companion',
  ])
  assertArrayIncludes(manifest, 'tierReleaseScope', [
    'tier-1-runtime-authority',
    'tier-2-system-governance',
    'tier-3-feature-route-governance',
    'tier-4-implementation-governance',
    'tier-5-operational-release-governance',
  ])
  assertArrayIncludes(manifest, 'xrReleaseScope', ['web-spatial', 'webxr', 'quest-vr', 'visionos', 'ar-handheld'])
  assertArrayIncludes(manifest, 'releaseGuards', ['done-done-lock', 'studio-spatial-handoff-contract', 'xr-contract', 'xr-navmesh-bake', 'xr-firebase-preflight', 'tier-xr-release-evidence'])
  assertArrayIncludes(manifest, 'requiredExternalInputsBeforeLive', [
    'firebase_project_id',
    'firebase_service_account_or_token',
    'deployed_live_url',
    'passing_live_smoke_result',
    'tier_1_5_release_gate_artifact',
    'webxr_provider_validation',
    'quest_device_lab_evidence',
    'visionos_device_or_simulator_evidence',
    'handheld_ar_privacy_review',
    'store_or_distribution_packet_when_applicable',
    'privacy_compliance_signoff',
  ])

  assertBlockedXrClaims(manifest)
  assertTierXrMatrix(manifest)
  requireFile(manifest.liveStatusFile)
  requireFile(manifest.doneDoneLock)
  requireFile(manifest.studioSpatialHandoffContract)

  return manifest
}

function assertReleaseFiles() {
  const required = [
    'REPO_PURPOSE.md',
    'LIVE_RELEASE.md',
    'release/LIVE_STATUS.md',
    manifestPath,
    tierXrMatrixPath,
    doneDoneLockPath,
    studioSpatialHandoffPath,
    studioSpatialValidatorPath,
    studioSpatialValidatorTestPath,
    'README.md',
    'firebase.json',
    '.firebaserc.example',
    'package.json',
    'pnpm-lock.yaml',
    'urai-tier1/package.json',
    'urai-tier1/src/app/page.tsx',
    'urai-tier1/src/app/home/page.tsx',
    'urai-tier1/src/spatial/v1/UraiSpatialStage.tsx',
    'urai-tier1/src/spatial/xr/uraiXrRoomRuntime.ts',
    'urai-tier1/src/spatial/xr/useUraiXrRoom.ts',
    'urai-tier1/tests/xr-runtime-contract.test.mjs',
    'urai-tier1/scripts/xr/bake-navmesh.mjs',
    'urai-tier1/scripts/xr/quest-device-validation.mjs',
  ]

  for (const file of required) requireFile(file)
}

function assertDeployInputs() {
  if (mode !== 'deploy') return
  if (!deployProject) {
    throw new Error('FIREBASE_PROJECT_ID, FIREBASE_PROJECT, or GCLOUD_PROJECT must be set before live deploy.')
  }
}

async function main() {
  console.log(`[URAI Spatial Live] Mode: ${mode}`)
  assertDeployInputs()

  console.log('[URAI Spatial Live] Validating release file surface.')
  assertReleaseFiles()

  console.log('[URAI Spatial Live] Validating done-done lock.')
  assertDoneDoneLock()

  console.log('[URAI Spatial Live] Validating Studio to Spatial handoff contract.')
  assertStudioSpatialHandoffContract()

  console.log('[URAI Spatial Live] Validating Studio to Spatial runtime validator.')
  assertStudioSpatialRuntimeValidator()

  console.log('[URAI Spatial Live] Validating release manifest and Tier/XR matrix.')
  const manifest = assertReleaseManifest()
  console.log(`[URAI Spatial Live] Manifest: ${manifest.name} (${manifest.canonicalStatus})`)

  const liveVerifyScript =
    process.env.URAI_LIVE_VERIFY_SCRIPT ||
    (process.env.GITHUB_ACTIONS === 'true' ? 'verify:release:critical' : 'verify:release:full')

  console.log(`[URAI Spatial Live] Running release verification: ${liveVerifyScript}`)
  await runPnpm([liveVerifyScript])

  if (mode !== 'deploy') {
    console.log('\n[URAI Spatial Live] Live check passed. No deploy requested.')
    console.log('[URAI Spatial Live] To deploy, set FIREBASE_PROJECT_ID and run: corepack pnpm live:deploy')
    return
  }

  console.log(`[URAI Spatial Live] Deploying to Firebase project: ${deployProject}`)
  await run('firebase', [
    'deploy',
    '--project',
    deployProject,
    '--only',
    'hosting,firestore:rules,firestore:indexes,functions',
  ], {
    env: {
      FIREBASE_CLI_EXPERIMENTS: process.env.FIREBASE_CLI_EXPERIMENTS || 'webframeworks',
    },
  })

  console.log('\n[URAI Spatial Live] Deploy completed.')
  console.log('[URAI Spatial Live] Run live smoke against the deployed URL with: HOST=https://<your-host> corepack pnpm smoke')
}

main().catch((error) => {
  console.error(`\n[URAI Spatial Live] ${error.message}`)
  process.exit(1)
})
