#!/usr/bin/env node

import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const argv = process.argv.slice(2)
const args = new Set(argv)
const getArg = (name, fallback) => {
  const prefix = `${name}=`
  const match = argv.find((arg) => arg.startsWith(prefix))
  return match ? match.slice(prefix.length) : fallback
}

if (args.has('--help') || args.has('-h')) {
  console.log(`URAI AAA proof runner

Usage:
  node scripts/aaa-launch-proof.mjs [--screenshots] [--skip-install] [--skip-assets] [--skip-test] [--skip-build] [--skip-typecheck] [--base=https://urai.app]

This command is proof-only. It requires an exact clean Git commit. Production deployment is available only through .github/workflows/spatial-live-deploy.yml.`)
  process.exit(0)
}

if (args.has('--deploy')) {
  console.error('Direct deployment is disabled. Use the protected URAI Canonical Production Release workflow.')
  process.exit(64)
}

const capture = (command, commandArgs) => {
  const result = spawnSync(command, commandArgs, {
    cwd: process.cwd(),
    encoding: 'utf8',
    shell: process.platform === 'win32',
  })
  return {
    status: typeof result.status === 'number' ? result.status : 1,
    stdout: String(result.stdout || '').trim(),
    stderr: String(result.stderr || '').trim(),
  }
}

const headResult = capture('git', ['rev-parse', 'HEAD'])
const statusResult = capture('git', ['status', '--porcelain'])
const sourceSha = headResult.status === 0 && /^[0-9a-f]{40}$/.test(headResult.stdout) ? headResult.stdout : 'unverified'
const explicitExpectedSha = String(process.env.URAI_PROOF_SOURCE_SHA || '').trim()
const workflowExpectedSha = process.env.GITHUB_EVENT_NAME === 'pull_request' ? '' : String(process.env.GITHUB_SHA || '').trim()
const expectedSourceSha = explicitExpectedSha || workflowExpectedSha
const cleanWorkingTree = statusResult.status === 0 && statusResult.stdout.length === 0
const sourceIdentityVerified = sourceSha !== 'unverified' && cleanWorkingTree && (!expectedSourceSha || expectedSourceSha === sourceSha)

const baseUrl = getArg('--base', process.env.URAI_BASE_URL || 'https://urai.app').replace(/\/$/, '')
const receiptBase = process.env.URAI_RECEIPT_ROOT || join(homedir(), 'urai-final-receipts')
const loopName = String(process.env.LOOP_NAME || 'manual-proof')
  .trim()
  .slice(0, 80)
  .replace(/[^A-Za-z0-9._-]+/g, '-')
  .replace(/^-+|-+$/g, '') || 'manual-proof'
const shouldScreenshots = args.has('--screenshots')
const skipInstall = args.has('--skip-install')
const skipAssets = args.has('--skip-assets')
const skipTest = args.has('--skip-test')
const skipBuild = args.has('--skip-build')
const skipTypecheck = args.has('--skip-typecheck')
const demoMemoryQuery = 'memoryId=demo%3Aquiet-reset&manifestId=replay-recovery-thread&node=quiet-reset&demo=1'

const routeExpectations = [
  { route: '/', markers: ['WALK THE SANCTUARY', 'URAI destination home. World layer living-world.'] },
  { route: '/home', markers: ['WALK THE SANCTUARY', 'URAI destination home. World layer living-world.'] },
  { route: '/ground', markers: ['URAI Ground', 'Private infrastructure, embodied.', 'Reception', 'Archive'] },
  { route: '/life-map', markers: ['Step inside the map.', 'Life Map independent memory universe', 'Map controls'] },
  { route: `/focus?${demoMemoryQuery}`, markers: ['The Quiet Reset', 'Selected memory', 'Enter Replay'] },
  { route: `/replay?${demoMemoryQuery}`, markers: ['The Quiet Reset', 'Memory', 'Play'] },
  { route: '/mirror', markers: ['Mirror does not judge.', 'Patterns become visible without turning your life into a score.'] },
  { route: '/passport', markers: ['Your life remains yours.', 'OWNERSHIP VAULT'] },
  {
    route: '/status',
    markers: [
      'Launch locked. Proof before expansion.',
      'Tracked',
      'Production fingerprint is read only on urai.app.',
      'authority unresolved',
    ],
  },
  { route: '/privacy-controls', markers: ['Nothing moves without you.', 'Consent remains reversible'] },
  { route: '/location-map', markers: ['Places carry signal.', 'EMOTIONAL WEATHER'] },
  { route: '/spatial/ar-vr', markers: ['Explorable entry chamber', 'Enter VR in Quest', 'Desktop and mobile'] },
  { route: '/demo', markers: ['Your life is a world.', 'Demo fixture', 'Play the proof rail'] },
  { route: '/demo/replay-film', markers: ['Your life is a world.', 'Demo fixture', 'Play the proof rail'] },
]

const startedAt = new Date().toISOString()
const runId = startedAt.replace(/[:.]/g, '-')
const shortSha = sourceSha === 'unverified' ? sourceSha : sourceSha.slice(0, 12)
const receiptDir = join(receiptBase, `aaa-launch-proof-${loopName}-${shortSha}-${runId}`)
mkdirSync(receiptDir, { recursive: true })

const commands = []
const writeReceipt = (status, failedStep = '') => {
  const receipt = {
    status,
    failedStep,
    loopName,
    sourceSha,
    expectedSourceSha: expectedSourceSha || null,
    cleanWorkingTree,
    sourceIdentityVerified,
    sourceIdentityErrors: {
      gitHead: headResult.status === 0 ? null : headResult.stderr || 'git rev-parse failed',
      gitStatus: statusResult.status === 0 ? null : statusResult.stderr || 'git status failed',
      expectedShaMismatch: Boolean(expectedSourceSha && expectedSourceSha !== sourceSha),
    },
    startedAt,
    finishedAt: new Date().toISOString(),
    baseUrl,
    productionDeploymentAttempted: false,
    productionDeploymentAuthority: '.github/workflows/spatial-live-deploy.yml',
    routeExpectations,
    commands,
  }
  writeFileSync(join(receiptDir, 'receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`)
  writeFileSync(join(receiptDir, 'README.md'), `# URAI AAA proof receipt\n\n- Status: ${status}\n- Loop: ${loopName}\n- Source SHA: ${sourceSha}\n- Expected source SHA: ${expectedSourceSha || 'not provided'}\n- Clean working tree: ${cleanWorkingTree ? 'yes' : 'no'}\n- Source identity verified: ${sourceIdentityVerified ? 'yes' : 'no'}\n- Started: ${startedAt}\n- Base URL: ${baseUrl}\n- Production deployment attempted: no\n- Production authority: \`.github/workflows/spatial-live-deploy.yml\`\n${failedStep ? `- Failed step: ${failedStep}\n` : ''}\n`)
}

if (!sourceIdentityVerified) {
  writeReceipt('failed', 'source-identity')
  console.error(`Proof requires an exact clean Git commit. Receipt: ${receiptDir}`)
  process.exit(65)
}

const run = (label, command, commandArgs, options = {}) => {
  const result = spawnSync(command, commandArgs, {
    cwd: options.cwd || process.cwd(),
    stdio: 'inherit',
    env: { ...process.env, ...(options.env || {}) },
    shell: process.platform === 'win32',
  })
  commands.push({ label, command: [command, ...commandArgs].join(' '), status: result.status })
  if (result.status !== 0) {
    writeReceipt('failed', label)
    process.exit(result.status || 1)
  }
}

if (!skipInstall) run('install', 'node', ['scripts/run-pnpm.mjs', 'install', '--frozen-lockfile'])
if (!skipAssets && existsSync('scripts/check-spatial-assets.mjs')) run('asset-check', 'node', ['scripts/check-spatial-assets.mjs'])
if (!skipTypecheck) run('typecheck', 'node', ['scripts/run-pnpm.mjs', 'check:types'])
if (!skipTest) run('unit-tests', 'node', ['scripts/run-pnpm.mjs', 'test:unit'])
if (!skipBuild) run('build', 'node', ['scripts/run-pnpm.mjs', 'build'])

run('production-authority-audit', 'node', ['scripts/audit-production-workflow-authority.mjs'])
run('route-exposure', 'node', ['scripts/check-production-route-exposure.mjs'])
run('copy-policy', 'node', ['scripts/check-spatial-copy.mjs'])

if (shouldScreenshots) {
  run('live-visual-audit', 'node', ['scripts/run-live-visual-audit-current.mjs'], {
    env: {
      URAI_AUDIT_BASE_URL: baseUrl,
      URAI_AUDIT_OUT_DIR: join(receiptDir, 'live-visual-audit'),
    },
  })
}

writeReceipt('passed')
console.log(`URAI AAA proof passed. Receipt: ${receiptDir}`)
