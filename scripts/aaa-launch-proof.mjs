#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const args = new Set(process.argv.slice(2))
const getArg = (name, fallback) => {
  const prefix = `${name}=`
  const match = process.argv.slice(2).find((arg) => arg.startsWith(prefix))
  return match ? match.slice(prefix.length) : fallback
}

if (args.has('--deploy')) {
  console.error('The --deploy option is disabled. Use the protected URAI Canonical Production Release workflow.')
  process.exit(1)
}

if (args.has('--help') || args.has('-h')) {
  console.log('URAI AAA verification-only proof runner. Deployment is protected-workflow only.')
  process.exit(0)
}

const baseUrl = getArg('--base', process.env.URAI_BASE_URL || 'https://urai.app').replace(/\/$/, '')
const receiptBase = process.env.URAI_RECEIPT_ROOT || join(homedir(), 'urai-final-receipts')
const shouldScreenshots = args.has('--screenshots')
const skipInstall = args.has('--skip-install')
const skipAssets = args.has('--skip-assets')
const skipTest = args.has('--skip-test')
const skipBuild = args.has('--skip-build')
const skipTypecheck = args.has('--skip-typecheck')

const routeExpectations = [
  { route: '/', required: ['Own your life', 'Step inside yourself'] },
  { route: '/home', required: ['Own your life', 'Step inside yourself'] },
  { route: '/ground', required: ['Ground'] },
  { route: '/life-map', required: ['Life Map'] },
  { route: '/focus?memoryId=quiet-reset', required: ['The Quiet Reset'] },
  { route: '/replay?memoryId=quiet-reset&manifestId=replay-recovery-thread', required: ['Replay'] },
  { route: '/mirror', required: ['Mirror'] },
  { route: '/passport', required: ['Passport'] },
  { route: '/status', required: ['Launch locked', 'Pending proof'], forbidden: ['World online. Route matrix visible'] },
  { route: '/privacy-controls', required: ['Privacy Controls'], forbidden: ['Home threshold'] },
  { route: '/location-map', required: ['Location'] },
  { route: '/spatial/ar-vr', required: ['XR'] },
  { route: '/demo/replay-film', required: ['Replay'] },
]

function run(command) {
  const result = spawnSync(command, {
    shell: true,
    cwd: process.cwd(),
    encoding: 'utf8',
    env: { ...process.env, FORCE_COLOR: '0', CI: process.env.CI || '1' },
    maxBuffer: 1024 * 1024 * 48,
  })
  return { command, status: typeof result.status === 'number' ? result.status : 1, stdout: result.stdout || '', stderr: result.stderr || '' }
}

const gitHead = run('git rev-parse HEAD').stdout.trim() || 'unknown'
const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const receiptDir = join(receiptBase, `aaa-launch-proof-${gitHead.slice(0, 8)}-${stamp}`)
const logDir = join(receiptDir, 'logs')
const screenshotDir = join(receiptDir, 'screenshots')
mkdirSync(logDir, { recursive: true })
mkdirSync(screenshotDir, { recursive: true })
const steps = []

function writeJson(name, value) {
  writeFileSync(join(receiptDir, name), `${JSON.stringify(value, null, 2)}\n`)
}

function step(name, command, skipped = false) {
  if (skipped) {
    steps.push({ name, command, status: 0, skipped: true })
    return
  }
  const result = run(command)
  steps.push({ name, command, status: result.status })
  writeFileSync(join(logDir, `${name}.log`), `${result.stdout}\n${result.stderr}`)
  if (result.status !== 0) console.error(`FAIL ${name}`)
}

step('git-state', 'git status --short && git rev-parse HEAD')
step('install', 'pnpm install --frozen-lockfile', skipInstall)
step('typecheck', 'pnpm typecheck', skipTypecheck)
step('assets', 'pnpm verify:assets', skipAssets)
step('tests', 'pnpm run --if-present test', skipTest)
step('build-static', 'pnpm build:static', skipBuild)

const routeRows = []
for (const expectation of routeExpectations) {
  const requested = new URL(expectation.route, `${baseUrl}/`)
  try {
    const response = await fetch(requested, { redirect: 'follow', cache: 'no-store', signal: AbortSignal.timeout(20_000) })
    const text = await response.text()
    const finalUrl = new URL(response.url)
    const missing = expectation.required.filter((marker) => !text.toLowerCase().includes(marker.toLowerCase()))
    const forbidden = (expectation.forbidden || []).filter((marker) => text.toLowerCase().includes(marker.toLowerCase()))
    const queryPreserved = finalUrl.search === requested.search
    const pathPreserved = finalUrl.pathname.replace(/\/$/, '') === requested.pathname.replace(/\/$/, '')
    routeRows.push({ route: expectation.route, status: response.status, finalUrl: response.url, missing, forbidden, queryPreserved, pathPreserved, ok: response.ok && missing.length === 0 && forbidden.length === 0 && queryPreserved && pathPreserved })
  } catch (error) {
    routeRows.push({ route: expectation.route, status: 0, ok: false, error: String(error?.message || error) })
  }
}
writeJson('route-matrix.json', routeRows)

const screenshotResult = { requested: shouldScreenshots, captured: [], failures: [] }
if (shouldScreenshots) {
  let browser
  try {
    const { chromium } = await import('playwright')
    browser = await chromium.launch({ headless: true })
    for (const row of routeRows) {
      for (const [label, viewport] of [['desktop', { width: 1440, height: 1100 }], ['mobile', { width: 390, height: 844 }]]) {
        const page = await browser.newPage({ viewport })
        try {
          await page.goto(new URL(row.route, `${baseUrl}/`).toString(), { waitUntil: 'domcontentloaded', timeout: 45_000 })
          await page.waitForTimeout(1_200)
          const filename = `${row.route.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'root'}-${label}.png`
          await page.screenshot({ path: join(screenshotDir, filename), fullPage: true, animations: 'disabled' })
          screenshotResult.captured.push(filename)
        } catch (error) {
          screenshotResult.failures.push(`${row.route} ${label}: ${String(error?.message || error)}`)
        } finally {
          await page.close().catch(() => {})
        }
      }
    }
  } finally {
    if (browser) await browser.close().catch(() => {})
  }
}
writeJson('screenshots.json', screenshotResult)

const assetReceipt = existsSync('docs/final-asset-receipt.md') ? readFileSync('docs/final-asset-receipt.md', 'utf8').slice(0, 4_000) : 'missing'
const failedSteps = steps.filter((item) => item.status !== 0)
const failedRoutes = routeRows.filter((item) => !item.ok)
const status = failedSteps.length === 0 && failedRoutes.length === 0 && screenshotResult.failures.length === 0 ? 'GREEN' : 'REVIEW_REQUIRED'
writeJson('summary.json', { status, gitHead, baseUrl, deploymentAttempted: false, steps, routeRows, screenshotResult, assetReceiptPresent: assetReceipt !== 'missing' })
writeFileSync(join(receiptDir, 'final-report.md'), `# URAI verification-only proof receipt\n\nGenerated: ${new Date().toISOString()}\nCommit: ${gitHead}\nBase: ${baseUrl}\nStatus: ${status}\nDeployment attempted: no; protected workflow only.\nFailed steps: ${failedSteps.length}\nFailed routes: ${failedRoutes.length}\nScreenshot failures: ${screenshotResult.failures.length}\n`)

console.log(`Receipt: ${receiptDir}`)
console.log(`STATUS=${status}`)
if (status !== 'GREEN') process.exitCode = 1
