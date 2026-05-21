import fs from 'node:fs'
import { spawn } from 'node:child_process'
import process from 'node:process'

const mode = process.argv.includes('--deploy') ? 'deploy' : 'check'
const deployProject = process.env.FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT || process.env.GCLOUD_PROJECT
const manifestPath = 'release/urai-spatial-live-manifest.json'

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

function assertArrayIncludes(manifest, key, expectedValues) {
  if (!Array.isArray(manifest[key])) {
    throw new Error(`Release manifest field ${key} must be an array.`)
  }
  const missing = expectedValues.filter((value) => !manifest[key].includes(value))
  if (missing.length) {
    throw new Error(`Release manifest field ${key} is missing: ${missing.join(', ')}`)
  }
}

function assertReleaseManifest() {
  const manifest = readJson(manifestPath)

  const expectedScalars = {
    repository: 'LifeLoggerAI/urai-spatial',
    system: 'urai-spatial',
    appPackage: 'urai-tier1',
    releaseGate: 'pnpm live:check',
    liveStatusFile: 'release/LIVE_STATUS.md',
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
  assertArrayIncludes(manifest, 'requiredExternalInputsBeforeLive', [
    'firebase_project_id',
    'firebase_service_account_or_token',
    'deployed_live_url',
    'passing_live_smoke_result',
  ])

  if (!manifest.liveClaims || manifest.liveClaims.webxr !== 'disabled-until-provider-validated') {
    throw new Error('Release manifest must keep WebXR live claim disabled until provider validation.')
  }

  requireFile(manifest.liveStatusFile)

  return manifest
}

function assertReleaseFiles() {
  const required = [
    'REPO_PURPOSE.md',
    'LIVE_RELEASE.md',
    'release/LIVE_STATUS.md',
    manifestPath,
    'README.md',
    'firebase.json',
    '.firebaserc.example',
    'package.json',
    'pnpm-lock.yaml',
    'urai-tier1/package.json',
    'urai-tier1/src/app/page.tsx',
    'urai-tier1/src/app/home/page.tsx',
    'urai-tier1/src/spatial/v1/UraiSpatialStage.tsx',
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

  console.log('[URAI Spatial Live] Validating release manifest.')
  const manifest = assertReleaseManifest()
  console.log(`[URAI Spatial Live] Manifest: ${manifest.name} (${manifest.canonicalStatus})`)

  console.log('[URAI Spatial Live] Running full release verification.')
  await runPnpm(['verify:release:full'])

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
  ])

  console.log('\n[URAI Spatial Live] Deploy completed.')
  console.log('[URAI Spatial Live] Run live smoke against the deployed URL with: HOST=https://<your-host> corepack pnpm smoke')
}

main().catch((error) => {
  console.error(`\n[URAI Spatial Live] ${error.message}`)
  process.exit(1)
})