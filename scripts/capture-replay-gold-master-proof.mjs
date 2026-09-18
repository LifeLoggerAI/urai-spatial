import { mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'

const requireFromTierOne = createRequire(new URL('../urai-tier1/package.json', import.meta.url))
const { chromium } = requireFromTierOne('playwright')

const base = process.env.URAI_PROOF_BASE || 'http://127.0.0.1:4173'
const outputDir = path.resolve(process.env.URAI_PROOF_DIR || 'artifacts/replay-gold-master-proof')
const exactHead = process.env.URAI_EXACT_HEAD || 'local'
const query = 'memoryId=demo%3Aquiet-reset&manifestId=replay-recovery-thread&node=quiet-reset&returnNode=quiet-reset&demo=1&from=focus-artifact&entryPortal=focus-memory-aperture&cameraCheckpoint=focus%3Aquiet-reset&privacyMode=held-private'
const replayAuthority = 'v221-world-first-readable-spatial-memory-cove-mobile-clearance'

const specs = [
  { id: 'desktop-16x10', width: 1440, height: 900, isMobile: false, hasTouch: false },
  { id: 'phone-portrait', width: 390, height: 844, isMobile: true, hasTouch: true },
  { id: 'phone-landscape', width: 844, height: 390, isMobile: true, hasTouch: true },
  { id: 'reduced-motion-desktop-16x10', width: 1440, height: 900, isMobile: false, hasTouch: false, reducedMotion: 'reduce' },
]

await mkdir(outputDir, { recursive: true })

const receipt = {
  schemaVersion: 'urai-replay-gold-master-proof-1',
  exactHead,
  capturedAt: new Date().toISOString(),
  base,
  authority: replayAuthority,
  scope: {
    proves: [
      'actual /replay spatial-memory-world rendering',
      'desktop and phone portrait/landscape responsive rendering',
      'reduced-motion Replay rendering',
      'truthful explicit-demo identity and selected-memory continuity',
      'Begin memory -> Hold memory pacing behavior',
      'Replay -> Focus unwind continuity',
    ],
    doesNotProve: [
      'subjective founder visual acceptance',
      'independent review or governance approval',
      'production deployment or live-host parity',
      'recorded-media rendering for a memory that actually contains recorded media',
    ],
  },
  captures: [],
  journey: null,
  errors: [],
}

const urlForReplay = () => `${base}/replay/?${query}`
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function diagnosticsFor(page, label) {
  const consoleErrors = []
  const pageErrors = []
  const failedRequests = []
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()) })
  page.on('pageerror', (error) => pageErrors.push(String(error)))
  page.on('requestfailed', (request) => {
    try {
      const parsed = new URL(request.url())
      if (parsed.origin === new URL(base).origin) failedRequests.push({ url: request.url(), failure: request.failure()?.errorText || 'unknown' })
    } catch {
      failedRequests.push({ url: request.url(), failure: request.failure()?.errorText || 'unknown' })
    }
  })
  return () => ({ label, consoleErrors, pageErrors, failedRequests })
}

function blockingFailures(requests, allowNavigationAborts = false) {
  return requests.filter((request) => {
    if (!allowNavigationAborts || request.failure !== 'net::ERR_ABORTED') return true
    try {
      const parsed = new URL(request.url)
      return !(parsed.pathname.startsWith('/_next/static/') || parsed.pathname.endsWith('/index.txt'))
    } catch {
      return true
    }
  })
}

async function waitFrames(page, count = 4) {
  await page.evaluate((frames) => new Promise((resolve) => {
    let left = frames
    const tick = () => { if (--left <= 0) resolve(); else requestAnimationFrame(tick) }
    requestAnimationFrame(tick)
  }), count)
}

async function waitReplay(page) {
  const root = page.locator('[data-testid="cinematic-replay-client"][data-replay-spatial-owner="r3f-memory-theater"]:visible').first()
  await root.waitFor({ state: 'visible', timeout: 45_000 })
  await page.waitForFunction((authority) => {
    const roots = [...document.querySelectorAll('[data-testid="cinematic-replay-client"]')]
    const root = roots.find((candidate) => {
      const style = getComputedStyle(candidate)
      const rect = candidate.getBoundingClientRect()
      return style.display !== 'none' && style.visibility !== 'hidden' && Number.parseFloat(style.opacity || '1') > 0.02
        && rect.width > 100 && rect.height > 100
    })
    return root?.getAttribute('data-memory-status') === 'demo'
      && root?.getAttribute('data-memory-id') === 'demo:quiet-reset'
      && root?.getAttribute('data-manifest-id') === 'replay-recovery-thread'
      && root?.getAttribute('data-star-id') === 'quiet-reset'
      && root?.getAttribute('data-replay-composition') === authority
  }, replayAuthority, { timeout: 45_000 })
  await root.locator('canvas').first().waitFor({ state: 'visible', timeout: 45_000 })
  await delay(900)
  await waitFrames(page)
  return root
}

async function describeReplay(page, { playingExpected = false, reducedExpected = false } = {}) {
  return page.evaluate(({ authority, playingExpected, reducedExpected }) => {
    const roots = [...document.querySelectorAll('[data-testid="cinematic-replay-client"]')]
    const root = roots.find((candidate) => {
      const style = getComputedStyle(candidate)
      const rect = candidate.getBoundingClientRect()
      return style.display !== 'none' && style.visibility !== 'hidden' && Number.parseFloat(style.opacity || '1') > 0.02
        && rect.width > 100 && rect.height > 100
    }) ?? roots[0] ?? null
    const canvas = root?.querySelector('canvas')
    const canvasRect = canvas?.getBoundingClientRect()
    const rootRect = root?.getBoundingClientRect()
    const pacing = root?.querySelector('.memoryPacing')
    const pacingRect = pacing?.getBoundingClientRect()
    const caption = root?.querySelector('.caption')
    const captionRect = caption?.getBoundingClientRect()
    const action = root?.querySelector('.memoryPacing button')
    const actionRect = action?.getBoundingClientRect()
    const progress = root?.querySelector('[role="progressbar"]')
    const rootText = root?.textContent || ''
    const legacyVisible = ['Film beats', 'Memory film.', 'Cinematic memory camera film'].filter((value) => rootText.includes(value))
    const boundsOkay = Boolean(rootRect && rootRect.width >= innerWidth * 0.98 && rootRect.height >= innerHeight * 0.98)
      && Boolean(canvasRect && canvasRect.width >= innerWidth * 0.95 && canvasRect.height >= innerHeight * 0.95)
      && Boolean(pacingRect && pacingRect.left >= -1 && pacingRect.right <= innerWidth + 1 && pacingRect.top >= -1 && pacingRect.bottom <= innerHeight + 1)
      && Boolean(captionRect && captionRect.left >= -1 && captionRect.right <= innerWidth + 1)
      && Boolean(actionRect && actionRect.width >= 44 && actionRect.height >= 44)
    const actionLabel = action?.getAttribute('aria-label') || ''
    const progressLabel = progress?.getAttribute('aria-label') || ''
    const reducedMatches = matchMedia('(prefers-reduced-motion: reduce)').matches
    const playing = root?.getAttribute('data-playing') === 'true'
    const result = {
      memoryStatus: root?.getAttribute('data-memory-status') || null,
      memoryId: root?.getAttribute('data-memory-id') || null,
      manifestId: root?.getAttribute('data-manifest-id') || null,
      starId: root?.getAttribute('data-star-id') || null,
      composition: root?.getAttribute('data-replay-composition') || null,
      spatialOwner: root?.getAttribute('data-replay-spatial-owner') || null,
      truth: root?.getAttribute('data-replay-truth') || null,
      playing,
      actionLabel,
      progressLabel,
      demoDisclosure: rootText.includes('DEMO FIXTURE · NOT PERSONAL DATA'),
      memoryContextDisclosure: rootText.includes('explicit demonstration memory'),
      legacyVisible,
      reducedMatches,
      boundsOkay,
      canvasWidth: canvasRect ? Math.round(canvasRect.width) : 0,
      canvasHeight: canvasRect ? Math.round(canvasRect.height) : 0,
    }
    result.passed = result.memoryStatus === 'demo'
      && result.memoryId === 'demo:quiet-reset'
      && result.manifestId === 'replay-recovery-thread'
      && result.starId === 'quiet-reset'
      && result.composition === authority
      && result.spatialOwner === 'r3f-memory-theater'
      && result.demoDisclosure
      && result.memoryContextDisclosure
      && result.legacyVisible.length === 0
      && result.boundsOkay
      && result.progressLabel.startsWith('Memory unfolding,')
      && (playingExpected ? (result.playing && result.actionLabel === 'Hold memory') : (!result.playing && result.actionLabel === 'Begin memory'))
      && (!reducedExpected || result.reducedMatches)
    return result
  }, { authority: replayAuthority, playingExpected, reducedExpected })
}

async function screenshot(page, id) {
  const file = `replay-${id}-${exactHead.slice(0, 12)}.png`
  await page.screenshot({ path: path.join(outputDir, file), fullPage: false, animations: 'disabled', caret: 'hide' })
  return file
}

async function captureSpec(browser, spec) {
  const context = await browser.newContext({
    viewport: { width: spec.width, height: spec.height },
    isMobile: spec.isMobile,
    hasTouch: spec.hasTouch,
    reducedMotion: spec.reducedMotion,
  })
  const page = await context.newPage()
  const getDiagnostics = diagnosticsFor(page, spec.id)
  await page.goto(urlForReplay(), { waitUntil: 'domcontentloaded', timeout: 45_000 })
  await waitReplay(page)

  const initialVerification = await describeReplay(page, { reducedExpected: spec.reducedMotion === 'reduce' })
  const initial = {
    id: spec.id,
    route: '/replay/',
    viewport: spec,
    screenshot: await screenshot(page, spec.id),
    verification: initialVerification,
  }
  receipt.captures.push(initial)

  if (spec.id === 'desktop-16x10') {
    const begin = page.getByRole('button', { name: 'Begin memory' }).first()
    await begin.click()
    await page.waitForFunction(() => document.querySelector('[data-testid="cinematic-replay-client"]')?.getAttribute('data-playing') === 'true', null, { timeout: 8_000 })
    await delay(650)
    const playingVerification = await describeReplay(page, { playingExpected: true })
    receipt.captures.push({
      id: 'desktop-after-begin',
      route: '/replay/',
      viewport: spec,
      screenshot: await screenshot(page, 'desktop-after-begin'),
      verification: playingVerification,
    })

    await page.keyboard.press('Escape')
    await page.waitForFunction(() => window.location.pathname.replace(/\/+$/, '') === '/focus', null, { timeout: 12_000 })
    const focus = page.locator('[data-testid="urai-final-focus-chamber"]:visible').first()
    await focus.waitFor({ state: 'visible', timeout: 30_000 })
    const returnIdentity = await page.evaluate(() => {
      const root = [...document.querySelectorAll('[data-testid="urai-final-focus-chamber"]')].find((candidate) => {
        const rect = candidate.getBoundingClientRect()
        const style = getComputedStyle(candidate)
        return rect.width > 100 && rect.height > 100 && style.display !== 'none' && style.visibility !== 'hidden'
      })
      const params = new URLSearchParams(location.search)
      return {
        pathname: location.pathname.replace(/\/+$/, '') || '/',
        memoryId: root?.getAttribute('data-memory-id') || null,
        manifestId: root?.getAttribute('data-manifest-id') || null,
        queryMemoryId: params.get('memoryId'),
        queryManifestId: params.get('manifestId'),
      }
    })
    receipt.journey = {
      id: 'replay-to-focus-unwind',
      screenshot: await screenshot(page, 'to-focus-restored'),
      ...returnIdentity,
      passed: returnIdentity.pathname === '/focus'
        && returnIdentity.memoryId === 'demo:quiet-reset'
        && returnIdentity.manifestId === 'replay-recovery-thread',
    }
  }

  const diagnosticResult = getDiagnostics()
  const blockers = blockingFailures(diagnosticResult.failedRequests, spec.id === 'desktop-16x10')
  const records = receipt.captures.filter((capture) => capture.viewport.id === spec.id)
  if (records.some((capture) => !capture.verification.passed)
    || diagnosticResult.consoleErrors.length
    || diagnosticResult.pageErrors.length
    || blockers.length
    || (spec.id === 'desktop-16x10' && !receipt.journey?.passed)) {
    receipt.errors.push({ spec: spec.id, diagnostics: { ...diagnosticResult, blockingFailedRequests: blockers } })
  }
  await context.close()
}

const browser = await chromium.launch({ headless: true })
try {
  for (const spec of specs) await captureSpec(browser, spec)
} catch (error) {
  receipt.errors.push({ fatal: String(error), stack: error?.stack || null })
} finally {
  await browser.close()
}

await writeFile(path.join(outputDir, 'receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`)
console.log(JSON.stringify(receipt, null, 2))
if (receipt.errors.length) process.exit(1)
