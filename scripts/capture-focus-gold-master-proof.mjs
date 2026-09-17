import { mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'

const requireFromTierOne = createRequire(new URL('../urai-tier1/package.json', import.meta.url))
const { chromium } = requireFromTierOne('playwright')

const base = process.env.URAI_PROOF_BASE || 'http://127.0.0.1:4173'
const outputDir = path.resolve(process.env.URAI_PROOF_DIR || 'artifacts/focus-gold-master-proof')
const videoDir = path.join(outputDir, 'videos')
const exactHead = process.env.URAI_EXACT_HEAD || 'local'
const selectedQuery = 'memoryId=demo%3Aquiet-reset&manifestId=replay-recovery-thread&demo=1&from=life-map&entryPortal=life-map-memory-star&cameraCheckpoint=life-map%3Aquiet-reset'

const viewports = [
  { id: 'desktop-16x9', width: 1440, height: 810, isMobile: false, hasTouch: false },
  { id: 'desktop-16x10', width: 1440, height: 900, isMobile: false, hasTouch: false },
  { id: 'ultrawide', width: 1720, height: 720, isMobile: false, hasTouch: false },
  { id: 'tablet-landscape', width: 1024, height: 768, isMobile: false, hasTouch: true },
  { id: 'tablet-portrait', width: 768, height: 1024, isMobile: true, hasTouch: true },
  { id: 'phone-portrait', width: 390, height: 844, isMobile: true, hasTouch: true },
  { id: 'phone-landscape', width: 844, height: 390, isMobile: true, hasTouch: true },
]

await mkdir(outputDir, { recursive: true })
await mkdir(videoDir, { recursive: true })

const receipt = {
  schemaVersion: 'urai-focus-gold-master-proof-2',
  exactHead,
  capturedAt: new Date().toISOString(),
  base,
  scope: {
    proves: [
      'actual /focus runtime selected-memory rendering',
      'Focus Observatory direct-entry rendering',
      'desktop/tablet/mobile responsive rendering',
      'reduced-motion Focus rendering',
      'semantic no-WebGL Focus fallback',
      'Focus -> Replay -> Focus -> Life Map route continuity',
    ],
    doesNotProve: [
      'Life Map -> Focus camera approach choreography',
      'subjective founder visual acceptance',
      'independent review or governance approval',
      'production deployment or live-host parity',
    ],
  },
  captures: [],
  journey: null,
  errors: [],
}

function safeName(value) { return value.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-|-$/g, '') }
function urlFor(route, query = '') { return `${base}${route}${query ? `?${query}` : ''}` }
function delay(ms) { return new Promise((resolve) => setTimeout(resolve, ms)) }

async function waitFrames(page, count = 3) {
  await page.evaluate((frameCount) => new Promise((resolve) => {
    let remaining = frameCount
    const tick = () => { if (--remaining <= 0) resolve(); else requestAnimationFrame(tick) }
    requestAnimationFrame(tick)
  }), count)
}

async function waitForPathname(page, expected, timeout = 12_000) {
  await page.waitForFunction((pathname) => window.location.pathname.replace(/\/+$/, '') === pathname, expected, { timeout })
}

function attachDiagnostics(page, label) {
  const consoleErrors = []
  const pageErrors = []
  const failedRequests = []
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()) })
  page.on('pageerror', (error) => pageErrors.push(String(error)))
  page.on('requestfailed', (request) => {
    try {
      const requestUrl = new URL(request.url())
      if (requestUrl.origin === new URL(base).origin) {
        failedRequests.push({ url: request.url(), failure: request.failure()?.errorText || 'unknown' })
      }
    } catch {
      failedRequests.push({ url: request.url(), failure: request.failure()?.errorText || 'unknown' })
    }
  })
  return () => ({ label, consoleErrors, pageErrors, failedRequests })
}

const JOURNEY_SOURCE_VISUAL_ABORTS = new Set([
  '/assets/urai/generated/models/focus-memory-chamber-v1.glb',
  '/assets/urai/final/tier2/focus/focus-memory-chamber-desktop.svg',
  '/assets/urai/final/tier2/replay/replay-cinematic-stage-desktop.svg',
  '/assets/urai/final/tier2/life-map/lifemap-galaxy-field-desktop.svg',
])

function blockingFailedRequests(failedRequests, { allowJourneySourceVisualAbort = false } = {}) {
  return failedRequests.filter((request) => {
    // Next.js can abort chunks/RSC resources after an intentional client route
    // commits. Preserve every failure in diagnostics. The only non-framework
    // exceptions are the exact source-page visual assets listed above, and those
    // are permitted only in the full journey proof where the five path states are
    // independently verified. Static/direct captures still fail on these assets.
    let requestUrl = null
    try { requestUrl = new URL(request.url) } catch { requestUrl = null }
    const expectedNavigationAbort = request.failure === 'net::ERR_ABORTED' && Boolean(requestUrl) && (
      requestUrl.pathname.startsWith('/_next/static/')
      || (requestUrl.pathname.endsWith('/index.txt') && requestUrl.searchParams.has('_rsc'))
    )
    const expectedSourceVisualAbort = allowJourneySourceVisualAbort
      && request.failure === 'net::ERR_ABORTED'
      && Boolean(requestUrl)
      && requestUrl.origin === new URL(base).origin
      && JOURNEY_SOURCE_VISUAL_ABORTS.has(requestUrl.pathname)
    return !(expectedNavigationAbort || expectedSourceVisualAbort)
  })
}

async function openContext(browser, spec, options = {}) {
  const context = await browser.newContext({
    viewport: { width: spec.width, height: spec.height },
    isMobile: spec.isMobile,
    hasTouch: spec.hasTouch,
    reducedMotion: options.reducedMotion,
    ...(options.recordVideo ? { recordVideo: { dir: videoDir, size: { width: spec.width, height: spec.height } } } : {}),
  })
  if (options.disableWebGL) {
    await context.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext
      HTMLCanvasElement.prototype.getContext = function patchedGetContext(type, ...args) {
        if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') return null
        return original.call(this, type, ...args)
      }
    })
  }
  const page = await context.newPage()
  return { context, page }
}

async function waitWorldIdle(page) {
  const transition = page.locator('.urai-world-transition').first()
  if (!(await transition.count())) return
  await page.waitForFunction(() => {
    const node = document.querySelector('.urai-world-transition')
    return !node || node.getAttribute('data-phase') === 'idle'
  }, null, { timeout: 12_000 }).catch(() => undefined)
}

async function waitForFocus(page, { selected = false, noWebGL = false } = {}) {
  const shell = page.locator('[data-testid="urai-final-focus-chamber"]:visible').first()
  await shell.waitFor({ state: 'visible', timeout: 45_000 })
  if (selected) {
    await page.waitForFunction(() => {
      const nodes = [...document.querySelectorAll('[data-testid="urai-final-focus-chamber"]')]
      const node = nodes.find((candidate) => {
        const style = getComputedStyle(candidate)
        const rect = candidate.getBoundingClientRect()
        return style.display !== 'none' && style.visibility !== 'hidden' && Number.parseFloat(style.opacity || '1') > 0.02
          && rect.width > 100 && rect.height > 100
      })
      return node?.getAttribute('data-memory-status') === 'demo'
        && node?.getAttribute('data-memory-id') === 'demo:quiet-reset'
        && node?.getAttribute('data-manifest-id') === 'replay-recovery-thread'
        && node?.getAttribute('data-star-id') === 'quiet-reset'
    }, null, { timeout: 45_000 })
  }
  if (noWebGL) {
    await page.locator('[data-focus-fallback="semantic"]:visible').first().waitFor({ state: 'visible', timeout: 15_000 })
  } else {
    await shell.locator('canvas').first().waitFor({ state: 'visible', timeout: 45_000 })
    await delay(850)
    await waitFrames(page, 4)
  }
  await waitWorldIdle(page)
  return shell
}

async function describeFocus(page, { selected = false, noWebGL = false } = {}) {
  return page.evaluate(({ selectedExpected, noWebGLExpected }) => {
    const shells = [...document.querySelectorAll('[data-testid="urai-final-focus-chamber"]')]
    const shell = shells.find((candidate) => {
      const style = getComputedStyle(candidate)
      const rect = candidate.getBoundingClientRect()
      return style.display !== 'none' && style.visibility !== 'hidden' && Number.parseFloat(style.opacity || '1') > 0.02
        && rect.width > 100 && rect.height > 100
    }) ?? shells[0] ?? null
    const canvas = shell?.querySelector('canvas')
    const canvasRect = canvas?.getBoundingClientRect()
    const text = shell?.textContent || ''
    const visibleButtons = [...(shell?.querySelectorAll('button') || [])]
      .filter((button) => {
        const style = getComputedStyle(button)
        const rect = button.getBoundingClientRect()
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 4 && rect.height > 4
      })
      .map((button) => (button.textContent || '').trim())
    const result = {
      memoryStatus: shell?.getAttribute('data-memory-status') || null,
      memoryId: shell?.getAttribute('data-memory-id') || null,
      manifestId: shell?.getAttribute('data-manifest-id') || null,
      starId: shell?.getAttribute('data-star-id') || null,
      chamberState: shell?.getAttribute('data-chamber-state') || null,
      webglState: shell?.getAttribute('data-webgl-state') || null,
      quality: shell?.getAttribute('data-spatial-quality') || null,
      canvasVisible: Boolean(canvas && canvasRect && canvasRect.width > 100 && canvasRect.height > 100),
      canvasWidth: canvasRect ? Math.round(canvasRect.width) : 0,
      canvasHeight: canvasRect ? Math.round(canvasRect.height) : 0,
      semanticFallbackVisible: Boolean(shell?.querySelector('[data-focus-fallback="semantic"]')),
      demoDisclosure: text.includes('DEMO FIXTURE · NOT PERSONAL DATA'),
      observatoryHeading: text.includes('Focus Observatory'),
      enterReplay: visibleButtons.includes('Enter Replay'),
      returnLifeMap: visibleButtons.some((value) => value.includes('Life Map')),
      legacyPublicCopy: ['Focus session', 'Deep Work', 'Start Replay'].filter((phrase) => text.toLowerCase().includes(phrase.toLowerCase())),
    }
    const identityOkay = !selectedExpected || (
      result.memoryStatus === 'demo'
      && result.memoryId === 'demo:quiet-reset'
      && result.manifestId === 'replay-recovery-thread'
      && result.starId === 'quiet-reset'
      && result.demoDisclosure
      && result.enterReplay
    )
    const renderOkay = noWebGLExpected ? result.semanticFallbackVisible : result.canvasVisible
    const observatoryOkay = selectedExpected || result.observatoryHeading
    return { ...result, passed: identityOkay && renderOkay && observatoryOkay && result.returnLifeMap && result.legacyPublicCopy.length === 0 }
  }, { selectedExpected: selected, noWebGLExpected: noWebGL })
}

async function captureFocus(browser, spec, state) {
  const id = `${state.id}-${spec.id}`
  const { context, page } = await openContext(browser, spec, state)
  const diagnostics = attachDiagnostics(page, id)
  const query = state.selected ? selectedQuery : ''
  await page.goto(urlFor('/focus/', query), { waitUntil: 'domcontentloaded', timeout: 45_000 })
  await waitForFocus(page, { selected: state.selected, noWebGL: state.disableWebGL })
  const verification = await describeFocus(page, { selected: state.selected, noWebGL: state.disableWebGL })
  const screenshot = path.join(outputDir, `${safeName(id)}-${exactHead.slice(0, 12)}.png`)
  await page.screenshot({ path: screenshot, fullPage: false })
  const diagnosticResult = diagnostics()
  await context.close()
  const record = {
    id,
    route: '/focus/',
    query,
    viewport: spec,
    reducedMotion: state.reducedMotion || null,
    noWebGL: Boolean(state.disableWebGL),
    screenshot: path.relative(outputDir, screenshot),
    verification,
    diagnostics: diagnosticResult,
  }
  receipt.captures.push(record)
  if (!verification.passed || diagnosticResult.pageErrors.length || blockingFailedRequests(diagnosticResult.failedRequests).length) receipt.errors.push(record)
}

async function captureJourney(browser) {
  const spec = viewports.find((value) => value.id === 'desktop-16x10')
  const id = 'focus-replay-focus-lifemap-journey'
  const { context, page } = await openContext(browser, spec, { recordVideo: true })
  const diagnostics = attachDiagnostics(page, id)
  const steps = []
  const shot = async (step) => {
    const screenshot = path.join(outputDir, `${safeName(step)}-${exactHead.slice(0, 12)}.png`)
    await page.screenshot({ path: screenshot, fullPage: false })
    steps.push({ step, pathname: new URL(page.url()).pathname, url: page.url(), screenshot: path.relative(outputDir, screenshot) })
  }

  await page.goto(urlFor('/focus/', selectedQuery), { waitUntil: 'domcontentloaded', timeout: 45_000 })
  await waitForFocus(page, { selected: true })
  await shot('focus-selected-before-replay')

  const replayAction = page.locator('button:visible').filter({ hasText: 'Enter Replay' }).first()
  await replayAction.click()
  await delay(650)
  await shot('focus-to-replay-transition')
  await waitForPathname(page, '/replay')
  const replay = page.locator('[data-testid="cinematic-replay-client"]:visible').first()
  await replay.waitFor({ state: 'visible', timeout: 45_000 })
  await page.waitForFunction(() => {
    const nodes = [...document.querySelectorAll('[data-testid="cinematic-replay-client"]')]
    const node = nodes.find((candidate) => {
      const style = getComputedStyle(candidate)
      const rect = candidate.getBoundingClientRect()
      return style.display !== 'none' && style.visibility !== 'hidden' && Number.parseFloat(style.opacity || '1') > 0.02
        && rect.width > 100 && rect.height > 100
    })
    return node?.getAttribute('data-memory-status') === 'demo'
      && node?.getAttribute('data-memory-id') === 'demo:quiet-reset'
      && node?.getAttribute('data-manifest-id') === 'replay-recovery-thread'
      && node?.getAttribute('data-star-id') === 'quiet-reset'
  }, null, { timeout: 45_000 })
  await waitWorldIdle(page)
  await delay(700)
  await shot('replay-arrival')

  await page.keyboard.press('Escape')
  await waitForPathname(page, '/focus')
  await waitForFocus(page, { selected: true })
  await shot('replay-to-focus-restored')

  await page.keyboard.press('Escape')
  await waitForPathname(page, '/life-map')
  await page.locator('body').waitFor({ state: 'visible', timeout: 15_000 })
  await delay(900)
  await shot('focus-to-lifemap-restored')

  const diagnosticResult = diagnostics()
  const video = page.video()
  await context.close()
  let videoPath = null
  if (video) {
    const target = path.join(videoDir, `${id}-${exactHead.slice(0, 12)}.webm`)
    await video.saveAs(target)
    videoPath = path.relative(outputDir, target)
  }

  const expectedPaths = ['/focus', '/replay', '/replay', '/focus', '/life-map']
  const actualPaths = steps.map((step) => step.pathname.replace(/\/+$/, '') || '/')
  const pathSequencePassed = expectedPaths.every((expected, index) => actualPaths[index] === expected)
  const blockingFailures = blockingFailedRequests(diagnosticResult.failedRequests, { allowJourneySourceVisualAbort: pathSequencePassed })
  const passed = pathSequencePassed
    && diagnosticResult.pageErrors.length === 0
    && blockingFailures.length === 0
  receipt.journey = {
    id,
    steps,
    video: videoPath,
    expectedPaths,
    actualPaths,
    passed,
    diagnostics: { ...diagnosticResult, blockingFailedRequests: blockingFailures },
  }
  if (!passed) receipt.errors.push(receipt.journey)
}

const browser = await chromium.launch({ headless: true })
try {
  await captureFocus(browser, viewports[1], { id: 'focus-observatory', selected: false })
  for (const spec of viewports) await captureFocus(browser, spec, { id: 'focus-selected', selected: true })
  await captureFocus(browser, viewports[1], { id: 'focus-selected-reduced-motion', selected: true, reducedMotion: 'reduce' })
  await captureFocus(browser, viewports[1], { id: 'focus-selected-no-webgl', selected: true, disableWebGL: true })
  await captureJourney(browser)
} catch (error) {
  receipt.errors.push({ fatal: String(error), stack: error?.stack || null })
} finally {
  await browser.close()
}

await writeFile(path.join(outputDir, 'receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`)
console.log(JSON.stringify(receipt, null, 2))
if (receipt.errors.length) process.exit(1)