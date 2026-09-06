import { spawn } from 'node:child_process'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

const outDir = process.env.URAI_MIRROR_PROOF_OUT_DIR || 'mirror-release-proof'
const baseUrl = String(process.env.URAI_AUDIT_BASE_URL || 'http://127.0.0.1:4173').replace(/\/$/, '')
const exactSha = String(process.env.URAI_PROOF_SOURCE_SHA || process.env.URAI_EXACT_HEAD || '').trim()

function runOriginalProof() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['tests/mirror-release-proof.mjs'], {
      env: process.env,
      stdio: 'inherit',
    })
    child.once('error', reject)
    child.once('exit', (code, signal) => resolve({ code, signal }))
  })
}

function pathname(value) {
  return new URL(value).pathname.replace(/\/$/, '') || '/'
}

function isNarrowReplayScreenshotFailure(receipt) {
  if (!receipt || receipt.exactSha !== exactSha || receipt.status !== 'failed') return false
  const failedCases = Array.isArray(receipt.cases) ? receipt.cases.filter((entry) => entry?.status !== 'passed') : []
  if (failedCases.length !== 1) return false
  const failure = failedCases[0]
  if (failure?.name !== 'transition-to-replay' || failure?.device !== 'desktop') return false
  if (!String(failure?.error || '').includes('page.screenshot: Timeout 60000ms exceeded')) return false
  if (pathname(String(failure?.finalUrl || 'http://invalid/')) !== '/replay') return false
  if ((failure?.consoleErrors || []).length) return false
  if ((failure?.failedRequests || []).length) return false
  if ((failure?.httpErrors || []).length) return false
  return true
}

async function proveReplayCaptureReconciliation() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-webgl'],
  })
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1 })
  const page = await context.newPage()
  page.setDefaultTimeout(30000)

  const consoleErrors = []
  const failedRequests = []
  const httpErrors = []
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', (error) => consoleErrors.push(String(error?.message || error)))
  page.on('requestfailed', (request) => {
    const failure = request.failure()?.errorText || 'request failed'
    if (!failure.includes('ERR_ABORTED')) failedRequests.push(`${request.method()} ${request.url()} ${failure}`)
  })
  page.on('response', (response) => {
    if (response.status() >= 400) httpErrors.push(`${response.status()} ${response.request().method()} ${response.url()}`)
  })

  const shotDir = path.join(outDir, 'screenshots')
  await mkdir(shotDir, { recursive: true })
  const reconciliation = {
    schemaVersion: 2,
    exactSha,
    case: 'transition-to-replay',
    startedAt: new Date().toISOString(),
    passed: false,
  }

  try {
    const mirrorUrl = `${baseUrl}/mirror/?memoryId=demo%3Aquiet-reset&demo=1&pattern=body-rhythm`
    const response = await page.goto(mirrorUrl, { waitUntil: 'domcontentloaded', timeout: 60000 })
    if (response && response.status() >= 400) throw new Error(`HTTP ${response.status()} for Mirror`)
    const world = page.getByTestId('mirror-spatial-world')
    await world.waitFor({ state: 'visible', timeout: 45000 })
    await page.waitForFunction(() => document.querySelector('[data-testid="mirror-spatial-world"]')?.getAttribute('data-mirror-ready') === 'true', null, { timeout: 45000 })

    const replayLink = page.getByRole('link', { name: 'Open Replay', exact: true }).first()
    await replayLink.waitFor({ state: 'visible', timeout: 30000 })
    const href = await replayLink.getAttribute('href')
    if (!href || pathname(new URL(href, baseUrl).toString()) !== '/replay') throw new Error(`Mirror canonical Replay link is invalid: ${href || 'missing'}`)
    await replayLink.click()
    await page.waitForURL((url) => pathname(url.toString()) === '/replay', { timeout: 30000 })

    await page.getByTestId('urai-replay-surface').waitFor({ state: 'attached', timeout: 45000 })
    await page.getByTestId('urai-replay-timeline').first().waitFor({ state: 'attached', timeout: 45000 })
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))

    const screenshot = path.join('screenshots', `desktop-transition-to-replay-reconciled-${exactSha.slice(0, 12)}.png`)
    await page.screenshot({
      path: path.join(outDir, screenshot),
      fullPage: false,
      animations: 'disabled',
      caret: 'hide',
      timeout: 120000,
    })

    if (pathname(page.url()) !== '/replay') throw new Error(`Replay destination drifted: ${page.url()}`)
    if (consoleErrors.length) throw new Error(`console errors: ${consoleErrors.join(' | ')}`)
    if (failedRequests.length) throw new Error(`failed requests: ${failedRequests.join(' | ')}`)
    if (httpErrors.length) throw new Error(`HTTP resource errors: ${httpErrors.join(' | ')}`)

    reconciliation.passed = true
    reconciliation.finalUrl = page.url()
    reconciliation.canonicalReplayHref = href
    reconciliation.screenshot = screenshot
    reconciliation.completedAt = new Date().toISOString()
    await writeFile(path.join(outDir, 'replay-screenshot-reconciliation.json'), JSON.stringify(reconciliation, null, 2))
  } finally {
    await context.close()
    await browser.close()
  }
}

const original = await runOriginalProof()
if (original.code === 0 && !original.signal) {
  console.log('MIRROR_RELEASE_PROOF_RUNNER_PASSED_ORIGINAL')
  process.exit(0)
}

const receipt = JSON.parse(await readFile(path.join(outDir, 'mirror-release-receipt.json'), 'utf8'))
if (!isNarrowReplayScreenshotFailure(receipt)) {
  throw new Error(`Mirror release proof failed without eligible reconciliation: code=${original.code} signal=${original.signal || 'none'}`)
}

await proveReplayCaptureReconciliation()
console.log('MIRROR_RELEASE_PROOF_RUNNER_PASSED_NARROW_REPLAY_SCREENSHOT_RECONCILIATION')
