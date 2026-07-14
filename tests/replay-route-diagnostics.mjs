import { chromium } from '@playwright/test'
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import process from 'node:process'

const port = Number(process.env.URAI_SPATIAL_DIAGNOSTIC_PORT || 3011)
const baseUrl = `http://127.0.0.1:${port}`
const artifactDir = process.env.URAI_SPATIAL_ARTIFACT_DIR || 'artifacts/replay-route-diagnostics'
const manifestId = process.env.URAI_SPATIAL_REPLAY_MANIFEST_ID || 'seed-memory-bloom'
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

mkdirSync(artifactDir, { recursive: true })

async function waitForServer(timeoutMs = 90000) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(baseUrl)
      if (response.ok || response.status < 500) return
    } catch {}
    await sleep(1000)
  }
  throw new Error(`Timed out waiting for ${baseUrl}`)
}

const child = spawn('pnpm', ['--filter', 'urai-tier1', 'dev', '--port', String(port)], {
  cwd: process.cwd(),
  env: { ...process.env, CI: '1' },
  stdio: ['ignore', 'pipe', 'pipe'],
  shell: process.platform === 'win32',
})

const serverOutput = []
child.stdout?.on('data', (chunk) => serverOutput.push(String(chunk)))
child.stderr?.on('data', (chunk) => serverOutput.push(String(chunk)))

let browser
const report = {
  schemaVersion: 'urai-replay-route-diagnostics-1',
  baseUrl,
  manifestId,
  responseStatus: null,
  finalUrl: null,
  title: null,
  console: [],
  pageErrors: [],
  requestFailures: [],
  selectors: {},
  bodyHtml: '',
  serverOutput: '',
  diagnosticError: null,
}

try {
  await waitForServer()
  browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  page.on('console', (message) => report.console.push({ type: message.type(), text: message.text() }))
  page.on('pageerror', (error) => report.pageErrors.push(error.stack || error.message))
  page.on('requestfailed', (request) => report.requestFailures.push({ url: request.url(), failure: request.failure()?.errorText || null }))

  const response = await page.goto(`${baseUrl}/replay?manifestId=${encodeURIComponent(manifestId)}`, {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  })
  report.responseStatus = response?.status() ?? null
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {})
  await sleep(2000)

  report.finalUrl = page.url()
  report.title = await page.title().catch(() => null)
  report.bodyHtml = await page.locator('body').innerHTML().catch(() => '')

  for (const [name, selector] of Object.entries({
    proofSurface: '[data-testid="urai-replay-surface"]',
    cinematicClient: '[data-testid="cinematic-replay-client"]',
    timeline: '[data-testid="urai-replay-timeline"]',
    metaPanel: '[data-testid="urai-replay-meta-panel"]',
    nextError: 'nextjs-portal',
  })) {
    const locator = page.locator(selector)
    const count = await locator.count().catch(() => 0)
    const first = locator.first()
    report.selectors[name] = {
      selector,
      count,
      visible: count > 0 ? await first.isVisible().catch(() => false) : false,
      boundingBox: count > 0 ? await first.boundingBox().catch(() => null) : null,
      display: count > 0 ? await first.evaluate((element) => getComputedStyle(element).display).catch(() => null) : null,
      visibility: count > 0 ? await first.evaluate((element) => getComputedStyle(element).visibility).catch(() => null) : null,
      opacity: count > 0 ? await first.evaluate((element) => getComputedStyle(element).opacity).catch(() => null) : null,
    }
  }

  await page.screenshot({ path: `${artifactDir}/replay-route.png`, fullPage: true }).catch(() => {})
} catch (error) {
  report.diagnosticError = error instanceof Error ? error.stack || error.message : String(error)
} finally {
  report.serverOutput = serverOutput.join('')
  writeFileSync(`${artifactDir}/replay-route-report.json`, `${JSON.stringify(report, null, 2)}\n`)
  if (browser) await browser.close().catch(() => {})
  child.kill('SIGTERM')
}

console.log(JSON.stringify({
  responseStatus: report.responseStatus,
  finalUrl: report.finalUrl,
  selectors: report.selectors,
  consoleErrors: report.console.filter((entry) => entry.type === 'error').length,
  pageErrors: report.pageErrors.length,
  requestFailures: report.requestFailures.length,
  diagnosticError: report.diagnosticError,
}, null, 2))
