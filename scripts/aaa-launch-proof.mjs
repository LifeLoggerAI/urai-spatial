#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
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

This command is proof-only. Production deployment is available only through .github/workflows/spatial-live-deploy.yml.`)
  process.exit(0)
}

if (args.has('--deploy')) {
  console.error('Direct deployment is disabled. Use the protected URAI Canonical Production Release workflow.')
  process.exit(64)
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
  { route: '/', required: ['You are standing at the threshold', 'Ground', 'Life Map'] },
  { route: '/home', required: ['You are standing at the threshold', 'Ground', 'Life Map'] },
  { route: '/ground', required: ['Your private floor is open', 'Privacy sanctuary', 'Logistics bay'] },
  { route: '/life-map', required: ['Your memory constellation is online', 'The Quiet Reset', 'Enter Focus'] },
  { route: '/focus?memoryId=quiet-reset&manifestId=launch&node=quiet-reset', required: ['Selected memory chamber', 'The Quiet Reset', 'Enter Replay'] },
  { route: '/replay?memoryId=quiet-reset&manifestId=replay-recovery-thread&node=quiet-reset', required: ['Cinematic memory film', 'Replay the thread'] },
  { route: '/mirror', required: ['See the pattern clearly', 'Pattern intelligence', 'Consent layer'] },
  { route: '/passport', required: ['Your life stays yours', 'Identity', 'Provenance', 'Portability'] },
  { route: '/status', required: ['Evidence Control Room', 'Production certification pending', 'Certification boundary'], forbidden: ['World online. Route matrix visible', 'Primary Live'] },
  { route: '/privacy-controls', required: ['URAI Privacy Controls', 'Choose what the world can hold', 'Model access'], forbidden: ['Home threshold', 'Click the sky', 'Click the ground'] },
  { route: '/location-map', required: ['Location', 'Place'] },
  { route: '/spatial/ar-vr', required: ['AR', 'VR', 'XR'] },
]

const screenshotRoutes = routeExpectations.map(({ route }) => route)
const gitHead = runCapture('git', ['rev-parse', 'HEAD']).trim() || 'unknown'
const shortHead = gitHead === 'unknown' ? 'unknown' : gitHead.slice(0, 8)
const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const receiptDir = join(receiptBase, `aaa-launch-proof-${shortHead}-${stamp}`)
const logDir = join(receiptDir, 'logs')
const screenshotDir = join(receiptDir, 'screenshots')
mkdirSync(logDir, { recursive: true })
mkdirSync(screenshotDir, { recursive: true })

const steps = []

function runCapture(command, commandArgs) {
  const result = spawnSync(command, commandArgs, {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: { ...process.env, FORCE_COLOR: '0', CI: process.env.CI || '1' },
    maxBuffer: 1024 * 1024 * 48,
  })
  return result.status === 0 ? result.stdout || '' : ''
}

function runStep(name, command, commandArgs) {
  const startedAt = new Date().toISOString()
  const started = Date.now()
  const result = spawnSync(command, commandArgs, {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: { ...process.env, FORCE_COLOR: '0', CI: process.env.CI || '1' },
    maxBuffer: 1024 * 1024 * 48,
  })
  const record = {
    name,
    command: [command, ...commandArgs].join(' '),
    status: typeof result.status === 'number' ? result.status : 1,
    startedAt,
    endedAt: new Date().toISOString(),
    durationMs: Date.now() - started,
  }
  steps.push(record)
  writeFileSync(join(logDir, `${name}.log`), [
    `STEP=${name}`,
    `COMMAND=${record.command}`,
    `EXIT=${record.status}`,
    '',
    '===== STDOUT =====',
    result.stdout || '',
    '',
    '===== STDERR =====',
    result.stderr || '',
    result.error ? `ERROR=${String(result.error.message || result.error)}` : '',
  ].join('\n'))
  console.log(`${record.status === 0 ? 'PASS' : 'FAIL'} ${name}`)
  return record.status
}

function skipStep(name, reason) {
  steps.push({ name, command: reason, status: 0, skipped: true, startedAt: new Date().toISOString(), endedAt: new Date().toISOString(), durationMs: 0 })
}

function writeJson(name, value) {
  writeFileSync(join(receiptDir, name), `${JSON.stringify(value, null, 2)}\n`)
}

function evaluateFingerprint(text, expectation) {
  const required = expectation.required || []
  const forbidden = expectation.forbidden || []
  const missingRequired = required.filter((needle) => !text.includes(needle))
  const presentForbidden = forbidden.filter((needle) => text.includes(needle))
  return { missingRequired, presentForbidden, ok: missingRequired.length === 0 && presentForbidden.length === 0 }
}

async function smokeRoutes() {
  const rows = []
  for (const expectation of routeExpectations) {
    const requested = new URL(expectation.route, `${baseUrl}/`)
    try {
      const response = await fetch(requested, {
        redirect: 'follow',
        cache: 'no-store',
        signal: AbortSignal.timeout(20_000),
        headers: { accept: 'text/html,application/xhtml+xml', 'cache-control': 'no-cache', 'user-agent': 'urai-proof-only/2.0' },
      })
      const text = await response.text()
      const finalUrl = new URL(response.url)
      const fingerprint = evaluateFingerprint(text, expectation)
      const pathPreserved = finalUrl.pathname.replace(/\/$/, '') === requested.pathname.replace(/\/$/, '')
      const queryPreserved = finalUrl.search === requested.search
      const ok = response.ok && pathPreserved && queryPreserved && fingerprint.ok
      rows.push({
        route: expectation.route,
        requestedUrl: requested.toString(),
        finalUrl: finalUrl.toString(),
        status: response.status,
        pathPreserved,
        queryPreserved,
        missingRequired: fingerprint.missingRequired,
        presentForbidden: fingerprint.presentForbidden,
        ok,
      })
      console.log(`${ok ? 'OK' : 'FAIL'} ${response.status} ${expectation.route}`)
    } catch (error) {
      rows.push({ route: expectation.route, requestedUrl: requested.toString(), status: 0, pathPreserved: false, queryPreserved: false, missingRequired: expectation.required, presentForbidden: [], ok: false, error: String(error?.message || error) })
      console.log(`ERR ${expectation.route}`)
    }
  }
  writeJson('route-matrix.json', rows)
  writeFileSync(join(receiptDir, 'route-matrix.md'), [
    '# URAI live route matrix',
    '',
    `Base: ${baseUrl}`,
    '',
    '| Route | HTTP | Path | Query | Fingerprint | Overall |',
    '| --- | ---: | --- | --- | --- | --- |',
    ...rows.map((row) => `| ${row.route} | ${row.status} | ${row.pathPreserved ? 'yes' : 'no'} | ${row.queryPreserved ? 'yes' : 'no'} | ${row.missingRequired?.length || row.presentForbidden?.length ? 'fail' : 'yes'} | ${row.ok ? 'yes' : 'no'} |`),
    '',
  ].join('\n'))
  return rows
}

async function captureScreenshots() {
  const result = { requested: shouldScreenshots, captured: [], failures: [] }
  if (!shouldScreenshots) {
    writeJson('screenshots.json', result)
    return result
  }
  let chromium
  try {
    ({ chromium } = await import('playwright'))
  } catch (error) {
    result.failures.push(`Playwright import failed: ${String(error?.message || error)}`)
    writeJson('screenshots.json', result)
    return result
  }
  const browser = await chromium.launch({ headless: true })
  try {
    for (const route of screenshotRoutes) {
      for (const [label, viewport] of [['desktop', { width: 1440, height: 1100 }], ['mobile', { width: 390, height: 844 }]]) {
        const page = await browser.newPage({ viewport })
        const name = route.replace(/[?&=\/]+/g, '-').replace(/^-|-$/g, '') || 'root'
        const output = join(screenshotDir, `${name}-${label}.png`)
        try {
          await page.goto(new URL(route, `${baseUrl}/`).toString(), { waitUntil: 'domcontentloaded', timeout: 45_000 })
          await page.waitForTimeout(1_000)
          await page.screenshot({ path: output, fullPage: true })
          result.captured.push({ route, label, path: output })
        } catch (error) {
          result.failures.push(`${route} ${label}: ${String(error?.message || error)}`)
        } finally {
          await page.close()
        }
      }
    }
  } finally {
    await browser.close()
  }
  writeJson('screenshots.json', result)
  return result
}

console.log(`Receipt: ${receiptDir}`)
writeJson('repo-state.json', {
  generatedAt: new Date().toISOString(),
  gitHead,
  branch: runCapture('git', ['branch', '--show-current']).trim() || 'unknown',
  statusShort: runCapture('git', ['status', '--short']).trim(),
  baseUrl,
  deploymentCapability: 'disabled-use-canonical-workflow',
  shouldScreenshots,
})

if (!skipInstall) runStep('pnpm-install', 'pnpm', ['install', '--frozen-lockfile'])
else skipStep('pnpm-install', 'skipped by --skip-install')
if (!skipTypecheck) runStep('pnpm-typecheck', 'pnpm', ['typecheck'])
else skipStep('pnpm-typecheck', 'skipped by --skip-typecheck')
if (!skipAssets) runStep('pnpm-verify-assets', 'pnpm', ['verify:assets'])
else skipStep('pnpm-verify-assets', 'skipped by --skip-assets')
if (!skipTest) runStep('pnpm-test-if-present', 'pnpm', ['run', '--if-present', 'test'])
else skipStep('pnpm-test-if-present', 'skipped by --skip-test')
if (!skipBuild) runStep('pnpm-build-static', 'pnpm', ['build:static'])
else skipStep('pnpm-build-static', 'skipped by --skip-build')

const routeRows = await smokeRoutes()
const screenshots = await captureScreenshots()
const failedSteps = steps.filter((step) => step.status !== 0)
const failedRoutes = routeRows.filter((row) => !row.ok)
const expectedScreenshotCount = shouldScreenshots ? screenshotRoutes.length * 2 : 0
const screenshotsOk = !shouldScreenshots || (screenshots.failures.length === 0 && screenshots.captured.length === expectedScreenshotCount)
const status = failedSteps.length === 0 && failedRoutes.length === 0 && screenshotsOk ? 'GREEN' : 'REVIEW_REQUIRED'

const assetReceiptPath = join(process.cwd(), 'docs', 'final-asset-receipt.md')
const assetReceiptPresent = existsSync(assetReceiptPath)
const report = [
  '# URAI AAA proof-only receipt',
  '',
  `Generated: ${new Date().toISOString()}`,
  `Commit: ${gitHead}`,
  `Base URL: ${baseUrl}`,
  `Overall receipt status: ${status}`,
  '',
  '## Authority',
  '',
  'This runner cannot deploy. Production deployment is available only through `.github/workflows/spatial-live-deploy.yml`.',
  '',
  '## Steps',
  '',
  ...steps.map((step) => `- ${step.name}: ${step.status === 0 ? 'PASS' : 'FAIL'}${step.skipped ? ' (skipped)' : ''}`),
  '',
  '## Live routes',
  '',
  `Passed: ${routeRows.length - failedRoutes.length}/${routeRows.length}`,
  ...failedRoutes.map((row) => `- ${row.route}: HTTP ${row.status}; missing=${(row.missingRequired || []).join(', ') || 'none'}; forbidden=${(row.presentForbidden || []).join(', ') || 'none'}`),
  '',
  '## Screenshots',
  '',
  `Requested: ${shouldScreenshots ? 'yes' : 'no'}`,
  `Captured: ${screenshots.captured.length}/${expectedScreenshotCount}`,
  ...screenshots.failures.map((failure) => `- ${failure}`),
  '',
  '## Asset receipt',
  '',
  assetReceiptPresent ? `Present: ${assetReceiptPath}` : 'Missing: docs/final-asset-receipt.md',
  '',
  '## Honest limitations',
  '',
  '- This receipt does not prove physical Quest hardware behavior.',
  '- This receipt does not prove production Firebase data isolation or destructive account deletion.',
  '- Human visual approval remains separate from machine screenshot capture.',
  '',
].join('\n')

writeFileSync(join(receiptDir, 'final-report.md'), report)
writeJson('summary.json', { status, gitHead, baseUrl, steps, routeRows, screenshots, assetReceiptPresent })
console.log(`FINAL=${status}`)
if (status !== 'GREEN') process.exitCode = 1
