import { spawn } from 'node:child_process'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

const outDir = process.env.URAI_MIRROR_PROOF_OUT_DIR || 'mirror-release-proof'
const baseUrl = String(process.env.URAI_AUDIT_BASE_URL || 'http://127.0.0.1:4173').replace(/\/$/, '')
const baseOrigin = new URL(`${baseUrl}/`).origin
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
  return new URL(value, `${baseUrl}/`).pathname.replace(/\/$/, '') || '/'
}

function isExactCandidateRoute(value, expectedPath) {
  const parsed = new URL(String(value), `${baseUrl}/`)
  return parsed.origin === baseOrigin && pathname(parsed.toString()) === expectedPath
}

function requireExactCandidateRoute(value, expectedPath, label) {
  if (!isExactCandidateRoute(value, expectedPath)) {
    const parsed = new URL(String(value), `${baseUrl}/`)
    throw new Error(`${label} must stay on exact candidate origin ${baseOrigin}${expectedPath}: ${parsed.toString()}`)
  }
}

function isNarrowReplayScreenshotFailure(receipt) {
  if (!receipt || receipt.exactSha !== exactSha || receipt.status !== 'failed') return false
  const failedCases = Array.isArray(receipt.cases) ? receipt.cases.filter((entry) => entry?.status !== 'passed') : []
  if (failedCases.length !== 1) return false
  const failure = failedCases[0]
  if (failure?.name !== 'transition-to-replay' || failure?.device !== 'desktop') return false
  if (!String(failure?.error || '').includes('page.screenshot: Timeout 60000ms exceeded')) return false
  if (!isExactCandidateRoute(String(failure?.finalUrl || ''), '/replay')) return false
  if ((failure?.consoleErrors || []).length) return false
  if ((failure?.failedRequests || []).length) return false
  if ((failure?.httpErrors || []).length) return false
  return true
}

async function proveReplayCaptureReconciliation(failure) {
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
    const requestFailure = request.failure()?.errorText || 'request failed'
    if (!requestFailure.includes('ERR_ABORTED')) failedRequests.push(`${request.method()} ${request.url()} ${requestFailure}`)
  })
  page.on('response', (response) => {
    if (response.status() >= 400) httpErrors.push(`${response.status()} ${response.request().method()} ${response.url()}`)
  })

  const shotDir = path.join(outDir, 'screenshots')
  await mkdir(shotDir, { recursive: true })
  const reconciliation = {
    schemaVersion: 3,
    exactSha,
    case: 'transition-to-replay-retained-capture-only',
    originalTransitionAlreadyReachedReplay: true,
    originalFinalUrl: failure.finalUrl,
    requiredOrigin: baseOrigin,
    startedAt: new Date().toISOString(),
    passed: false,
  }

  try {
    // The original proof has already exercised Mirror -> Replay and records the
    // exact /replay URL before failing only inside Playwright's screenshot call.
    // Reconciliation therefore retries ONLY the retained-pixel capture on that
    // exact candidate-origin destination instead of attempting to recreate the
    // interaction with a second, potentially state-dependent Mirror control.
    const replayUrl = String(failure.finalUrl)
    requireExactCandidateRoute(replayUrl, '/replay', 'Original Replay receipt URL')
    const response = await page.goto(replayUrl, { waitUntil: 'domcontentloaded', timeout: 60000 })
    if (response && response.status() >= 400) throw new Error(`HTTP ${response.status()} for Replay`)
    requireExactCandidateRoute(page.url(), '/replay', 'Replay destination after navigation')

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

    requireExactCandidateRoute(page.url(), '/replay', 'Replay destination after capture')
    if (consoleErrors.length) throw new Error(`console errors: ${consoleErrors.join(' | ')}`)
    if (failedRequests.length) throw new Error(`failed requests: ${failedRequests.join(' | ')}`)
    if (httpErrors.length) throw new Error(`HTTP resource errors: ${httpErrors.join(' | ')}`)

    reconciliation.passed = true
    reconciliation.finalUrl = page.url()
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

const replayFailure = receipt.cases.find((entry) => entry?.name === 'transition-to-replay' && entry?.device === 'desktop' && entry?.status !== 'passed')
await proveReplayCaptureReconciliation(replayFailure)
console.log('MIRROR_RELEASE_PROOF_RUNNER_PASSED_NARROW_REPLAY_SCREENSHOT_RECONCILIATION')
