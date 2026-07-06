import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const deploy = process.argv.includes('--deploy')
const project = process.env.FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT || process.env.GCLOUD_PROJECT || ''
const expectedProject = process.env.URAI_EXPECTED_FIREBASE_PROJECT || 'urai-4dc1d'
const liveUrl = process.env.URAI_LIVE_BASE_URL || process.env.LIVE_URL || 'https://urai.app'

function run(command, args, extraEnv = {}) {
  console.log(`[URAI release] $ ${command} ${args.join(' ')}`)
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, ...extraEnv },
  })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

function output(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8', shell: process.platform === 'win32' })
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed`)
  return result.stdout.trim()
}

function requireFile(file) {
  if (!existsSync(file)) throw new Error(`Required release file missing: ${file}`)
}

function sha256(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex')
}

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name)
    return entry.isDirectory() ? walk(absolute) : entry.isFile() ? [absolute] : []
  })
}

function resolveTargetSha() {
  const candidate = (
    process.env.NEXT_PUBLIC_URAI_BUILD_SHA ||
    process.env.URAI_TARGET_SHA ||
    process.env.GITHUB_SHA ||
    output('git', ['rev-parse', 'HEAD'])
  ).trim()
  if (!/^[0-9a-f]{40}$/.test(candidate)) throw new Error('Release SHA must be a full lowercase 40-character commit SHA')
  const head = output('git', ['rev-parse', 'HEAD'])
  if (head !== candidate) throw new Error(`Checked-out SHA ${head} does not match release SHA ${candidate}`)
  return candidate
}

function assertStaticConfig() {
  requireFile('firebase.static.json')
  const config = JSON.parse(readFileSync('firebase.static.json', 'utf8'))
  if (config.hosting?.public !== 'urai-tier1/out') throw new Error('firebase.static.json must publish urai-tier1/out')
  if (config.hosting?.cleanUrls !== true || config.hosting?.trailingSlash !== true) throw new Error('Static hosting must use clean URLs and trailing slashes')
  if (!Array.isArray(config.hosting?.rewrites) || config.hosting.rewrites.length !== 0) throw new Error('Static hosting must not mask routes with rewrites')
}

function assertReleaseSurface() {
  for (const file of [
    'package.json',
    'pnpm-lock.yaml',
    'firebase.static.json',
    'release/urai-spatial-live-manifest.json',
    'release/tier-xr-release-matrix.json',
    'docs/URAI_SPATIAL_DONE_DONE_LOCK.md',
    'docs/contracts/URAI_STUDIO_SPATIAL_HANDOFF.md',
    'urai-tier1/src/app/layout.tsx',
  ]) requireFile(file)
  assertStaticConfig()
}

function writeReceipt(targetSha, status, details = {}) {
  const directory = path.join('deployment-receipt', targetSha)
  mkdirSync(directory, { recursive: true })
  const receipt = {
    schemaVersion: 'urai-static-release-receipt-1',
    generatedAt: new Date().toISOString(),
    repository: process.env.GITHUB_REPOSITORY || 'LifeLoggerAI/urai-spatial',
    targetSha,
    firebaseProject: project || null,
    liveUrl: liveUrl || null,
    status,
    deploymentScope: 'hosting-only',
    workflowRunId: process.env.GITHUB_RUN_ID || null,
    ...details,
  }
  const receiptPath = path.join(directory, 'receipt.json')
  writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`)
  if (process.env.GITHUB_STEP_SUMMARY) {
    const summary = `\n## URAI static release\n\n- SHA: \`${targetSha}\`\n- Project: \`${project || 'not set'}\`\n- Scope: Hosting only\n- Status: **${status}**\n- Receipt: \`${receiptPath}\`\n`
    writeFileSync(process.env.GITHUB_STEP_SUMMARY, summary, { flag: 'a' })
  }
  return receiptPath
}

const targetSha = resolveTargetSha()
assertReleaseSurface()
run('pnpm', ['verify:release:critical'], { NEXT_PUBLIC_URAI_BUILD_SHA: targetSha })

if (!deploy) {
  writeReceipt(targetSha, 'verified-no-deploy')
  console.log('[URAI release] Verification passed. No deployment requested.')
  process.exit(0)
}

const authorized = process.env.URAI_DEPLOY_CONFIRM === 'DEPLOY_STATIC_URAI' || (
  process.env.GITHUB_ACTIONS === 'true' && process.env.GITHUB_EVENT_NAME === 'workflow_dispatch'
)
if (!authorized) throw new Error('Static deployment requires protected workflow dispatch or URAI_DEPLOY_CONFIRM=DEPLOY_STATIC_URAI')
if (!project) throw new Error('FIREBASE_PROJECT_ID is required')
if (project !== expectedProject) throw new Error(`Refusing project ${project}; expected ${expectedProject}`)

run('pnpm', ['build:static'], { NEXT_PUBLIC_URAI_BUILD_SHA: targetSha })
requireFile('urai-tier1/out/index.html')
const files = walk('urai-tier1/out')
const htmlFiles = files.filter((file) => file.endsWith('.html'))
if (!htmlFiles.some((file) => readFileSync(file, 'utf8').includes(targetSha))) {
  throw new Error('Static output does not contain the exact release SHA')
}
const receiptPath = writeReceipt(targetSha, 'built-awaiting-deploy', {
  outputFileCount: files.length,
  htmlFileCount: htmlFiles.length,
  indexSha256: sha256('urai-tier1/out/index.html'),
})

run('pnpm', ['exec', 'firebase', 'deploy', '--config', 'firebase.static.json', '--only', 'hosting', '--project', project])
if (liveUrl) run('node', ['scripts/urai-post-deploy-smoke.mjs'], { URAI_DEPLOY_URL: liveUrl, URAI_EXPECTED_DEPLOYED_SHA: targetSha })
writeReceipt(targetSha, 'deployed', {
  outputFileCount: files.length,
  htmlFileCount: htmlFiles.length,
  indexSha256: sha256('urai-tier1/out/index.html'),
  previousReceipt: receiptPath,
})
console.log('[URAI release] Static Hosting deployment completed.')
