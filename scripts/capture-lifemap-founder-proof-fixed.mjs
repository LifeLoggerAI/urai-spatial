import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'

const requireFromTierOne = createRequire(new URL('../urai-tier1/package.json', import.meta.url))
const { chromium } = requireFromTierOne('playwright')
const base = process.env.URAI_PROOF_BASE || 'http://127.0.0.1:4173'
const outputDir = path.resolve(process.env.URAI_PROOF_DIR || 'artifacts/lifemap-founder-proof')
const exactHead = process.env.URAI_EXACT_HEAD || 'local'
const rawPr = String(process.env.URAI_PR_NUMBER || '').trim()
const pr = rawPr ? Number.parseInt(rawPr, 10) : null
if (pr !== null && (!Number.isInteger(pr) || pr <= 0)) throw new Error(`Invalid URAI_PR_NUMBER: ${rawPr}`)

const receipt = {
  schemaVersion: 'urai-lifemap-founder-proof-12',
  repository: 'LifeLoggerAI/urai-spatial',
  pr,
  exactHead,
  runId: process.env.GITHUB_RUN_ID || 'local',
  runner: 'checked-in-stable-module',
  capturedAt: new Date().toISOString(),
  captures: [],
  transitions: [],
  browserEvents: [],
}

let failed = false
await mkdir(outputDir, { recursive: true })
const browser = await chromium.launch({ headless: true })
const ROOT = '[data-testid="urai-true-3d-life-map"]'

async function stable(page, frames = 4) {
  await page.waitForTimeout(Math.max(80, frames * 20))
}

function recordPageEvents(page, label) {
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      receipt.browserEvents.push({ label, kind: `console:${message.type()}`, text: message.text() })
    }
  })
  page.on('pageerror', (error) => receipt.browserEvents.push({ label, kind: 'pageerror', text: String(error) }))
  page.on('requestfailed', (request) => {
    receipt.browserEvents.push({ label, kind: 'requestfailed', text: `${request.method()} ${request.url()} ${request.failure()?.errorText || ''}` })
  })
}

async function openPage(options = {}) {
  const context = await browser.newContext({
    viewport: options.viewport || { width: 1440, height: 900 },
    deviceScaleFactor: options.deviceScaleFactor ?? 1,
    reducedMotion: options.reducedMotion || 'no-preference',
    hasTouch: Boolean(options.hasTouch),
    isMobile: Boolean(options.isMobile),
  })
  if (options.disableWebGL) {
    await context.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext
      HTMLCanvasElement.prototype.getContext = function patched(type, ...args) {
        if (['webgl', 'webgl2', 'experimental-webgl'].includes(type)) return null
        return original.call(this, type, ...args)
      }
    })
  }
  const page = await context.newPage()
  recordPageEvents(page, options.label || 'page')
  return { context, page }
}

async function poll(label, sample, predicate, timeout = 30_000, interval = 75) {
  const deadline = Date.now() + timeout
  let last
  while (Date.now() < deadline) {
    try {
      last = await sample()
      if (predicate(last)) return last
    } catch (error) {
      last = String(error)
    }
    await new Promise((resolve) => setTimeout(resolve, interval))
  }
  throw new Error(`${label} timed out after ${timeout}ms; last=${JSON.stringify(last)}`)
}

async function goto(page, route, selector = ROOT) {
  const response = await page.goto(new URL(route, base).toString(), { waitUntil: 'domcontentloaded', timeout: 60_000 })
  if (!response || response.status() !== 200) throw new Error(`${route} returned ${response?.status()}`)
  if (selector === ROOT) {
    await page.locator('[data-testid="urai-r3f-canonical-lifemap"]').first().waitFor({ state: 'visible', timeout: 45_000 })
    const scene = page.locator(selector).first()
    await scene.waitFor({ state: 'visible', timeout: 45_000 })
    const box = await scene.boundingBox()
    const viewport = page.viewportSize()
    const geometryValid = box && viewport
      && box.width >= 240 && box.height >= 240
      && box.x + box.width > 0 && box.y + box.height > 0
      && box.x < viewport.width && box.y < viewport.height
    if (!geometryValid) throw new Error(`Life Map canonical root geometry invalid: ${JSON.stringify({ box, viewport })}`)
  } else {
    await page.locator(selector).first().waitFor({ state: 'visible', timeout: 45_000 })
  }
  await stable(page)
}

async function waitForState(page, attribute, expected, timeout = 30_000) {
  const root = page.locator(ROOT).first()
  await poll(`${attribute}=${expected}`, () => root.getAttribute(attribute), (value) => value === expected, timeout, 50)
}

async function observeRenderedPhase(page, expectedPhase, timeout = 45_000) {
  const root = page.locator(ROOT).first()
  return root.evaluate((element, input) => new Promise((resolve, reject) => {
    const startedAt = performance.now()
    const timeline = []
    let lastPhase = null
    let settled = false
    let framePending = false
    let timer = 0

    const cleanup = () => {
      observer.disconnect()
      window.clearTimeout(timer)
    }
    const record = (source) => {
      const phase = element.getAttribute('data-life-map-phase')
      if (phase !== lastPhase) {
        lastPhase = phase
        timeline.push({ phase, atMs: performance.now() - startedAt, source })
      }
      if (phase !== input.expectedPhase || framePending || settled) return
      framePending = true
      window.requestAnimationFrame((frameTime) => {
        framePending = false
        if (settled) return
        const framePhase = element.getAttribute('data-life-map-phase')
        if (framePhase !== input.expectedPhase) {
          record('phase-advanced-before-frame')
          return
        }
        settled = true
        cleanup()
        resolve({
          expectedPhase: input.expectedPhase,
          observedAtMs: timeline.find((entry) => entry.phase === input.expectedPhase)?.atMs ?? null,
          renderedFrameAtMs: frameTime - startedAt,
          renderedFramePhase: framePhase,
          timeline,
        })
      })
    }

    const observer = new MutationObserver(() => record('mutation'))
    observer.observe(element, { attributes: true, attributeFilter: ['data-life-map-phase'] })
    timer = window.setTimeout(() => {
      if (settled) return
      settled = true
      cleanup()
      reject(new Error(`data-life-map-phase=${input.expectedPhase} did not survive a rendered frame within ${input.timeout}ms; last=${lastPhase}`))
    }, input.timeout)
    record('armed')
  }), { expectedPhase, timeout })
}

async function waitForRenderedWorld(page, timeout = 30_000) {
  const root = page.locator(ROOT).first()
  return poll('rendered Life Map world', async () => ({
    ready: await root.getAttribute('data-life-map-render-ready'),
    anchors: Number(await root.getAttribute('data-life-map-visible-anchors') || 0),
    objects: Number(await root.getAttribute('data-life-map-visible-objects') || 0),
    calls: Number(await root.getAttribute('data-life-map-render-calls') || 0),
  }), (state) => state.ready === 'true' && state.anchors >= 8 && state.objects > 20 && state.calls > 0, timeout, 75)
}

async function waitForOverviewState(page, timeout = 30_000) {
  const root = page.locator(ROOT).first()
  return poll('overview route/state', async () => ({
    mode: await root.getAttribute('data-life-map-mode'),
    url: page.url(),
  }), ({ mode, url }) => {
    const destination = new URL(url)
    const memoryId = destination.searchParams.get('memoryId')
    const node = destination.searchParams.get('node')
    const identityIsAbsentOrRetained = (!memoryId && !node) || (memoryId === 'quiet-reset' && node === 'quiet-reset')
    return mode === 'overview'
      && destination.pathname.replace(/\/$/, '') === '/life-map'
      && destination.searchParams.get('overview') === '1'
      && identityIsAbsentOrRetained
  }, timeout, 50)
}

async function canvasSignal(page, screenshotBuffer) {
  const dataUrl = `data:image/png;base64,${screenshotBuffer.toString('base64')}`
  return page.evaluate(async ({ dataUrl }) => {
    const image = new Image()
    image.decoding = 'sync'
    const loaded = new Promise((resolve, reject) => {
      image.onload = resolve
      image.onerror = () => reject(new Error('retained PNG could not be decoded for distributed sampling'))
    })
    image.src = dataUrl
    await loaded
    const width = Math.max(1, image.naturalWidth)
    const height = Math.max(1, image.naturalHeight)
    const surface = document.createElement('canvas')
    surface.width = width
    surface.height = height
    const context = surface.getContext('2d', { willReadFrequently: true })
    if (!context) return null
    context.drawImage(image, 0, 0)
    const columns = 24
    const rows = 16
    const block = 3
    let count = 0
    let sum = 0
    let sumSquares = 0
    let nonDark = 0
    try {
      for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < columns; column += 1) {
          const x = Math.max(0, Math.min(width - block, Math.round(((column + 0.5) / columns) * width) - 1))
          const y = Math.max(0, Math.min(height - block, Math.round(((row + 0.5) / rows) * height) - 1))
          const pixels = context.getImageData(x, y, block, block).data
          for (let index = 0; index < pixels.length; index += 4) {
            const luminance = (pixels[index] + pixels[index + 1] + pixels[index + 2]) / 3
            count += 1
            sum += luminance
            sumSquares += luminance * luminance
            if (luminance > 8) nonDark += 1
          }
        }
      }
    } catch {
      return { width, height, variance: -1, nonDarkRatio: -1, sampleCount: 0, sampling: 'distributed-grid-24x16-3x3' }
    }
    const mean = sum / Math.max(1, count)
    return {
      width,
      height,
      variance: sumSquares / Math.max(1, count) - mean * mean,
      nonDarkRatio: nonDark / Math.max(1, count),
      sampleCount: count,
      sampling: 'distributed-grid-24x16-3x3',
      source: 'retained-png',
    }
  }, { dataUrl })
}

async function captureScreenshot(page, file) {
  const buffer = await page.screenshot({
    path: path.join(outputDir, file),
    fullPage: false,
    animations: 'disabled',
    caret: 'hide',
    scale: 'device',
    timeout: 120_000,
  })
  return { buffer, hash: createHash('sha256').update(buffer).digest('hex'), bytes: buffer.length }
}

async function canvasGeometry(page) {
  const canvas = page.locator('canvas').first()
  await canvas.waitFor({ state: 'visible', timeout: 30_000 })
  const box = await canvas.boundingBox()
  const viewport = page.viewportSize()
  const valid = box && viewport
    && box.width >= 240 && box.height >= 240
    && box.x + box.width > 0 && box.y + box.height > 0
    && box.x < viewport.width && box.y < viewport.height
  if (!valid) throw new Error(`Life Map canvas geometry invalid: ${JSON.stringify({ box, viewport })}`)
  return box
}

async function readRootState(root) {
  const entries = await Promise.all([
    ['source', 'data-life-map-source'],
    ['phase', 'data-life-map-phase'],
    ['mode', 'data-life-map-mode'],
    ['scale', 'data-life-map-scale'],
    ['renderReady', 'data-life-map-render-ready'],
    ['objects', 'data-life-map-visible-objects'],
    ['anchors', 'data-life-map-visible-anchors'],
    ['calls', 'data-life-map-render-calls'],
    ['triangles', 'data-life-map-render-triangles'],
    ['webgl', 'data-webgl-state'],
    ['privateMounted', 'data-private-memory-mounted'],
    ['fallback', 'data-life-map-fallback'],
  ].map(async ([key, attribute]) => [key, await root.getAttribute(attribute)]))
  return Object.fromEntries(entries)
}

async function shot(page, id, captureState, extra = {}) {
  const file = `${String(receipt.captures.length + 1).padStart(2, '0')}-${id}-${exactHead.slice(0, 12)}.png`
  const root = page.locator(`${ROOT}, [data-testid="urai-life-map-signed-out-threshold"], [data-testid="urai-life-map-authored-fallback"]`).first()
  const state = await root.count() ? await readRootState(root) : {}
  const { buffer, ...screenshot } = await captureScreenshot(page, file)
  const signal = await canvasSignal(page, buffer)
  receipt.captures.push({
    order: receipt.captures.length + 1,
    id,
    file,
    route: page.url(),
    viewport: page.viewportSize(),
    captureState,
    state,
    screenshot,
    signal,
    timestamp: new Date().toISOString(),
    ...extra,
  })
}

function selectedActions(page) {
  return page.locator('nav[aria-label="Selected memory actions"]').first()
}

function selectedAction(page, label) {
  return selectedActions(page).locator('button').filter({ has: page.getByText(label, { exact: true }) }).first()
}

async function selectQuietReset(page, options = {}) {
  const trigger = page.getByRole('button', { name: 'Search and navigate Life Map' }).first()
  await trigger.waitFor({ state: 'visible', timeout: 120_000 })
  if (options.touch) await trigger.tap({ timeout: 120_000 })
  else await trigger.click({ timeout: 120_000 })
  const navigator = page.getByRole('region', { name: 'Search and filter Life Map' }).first()
  await navigator.waitFor({ state: 'visible', timeout: 20_000 })
  const result = navigator.locator('[role="listitem"]').filter({ hasText: 'The Quiet Reset' }).first()
  await result.waitFor({ state: 'visible', timeout: 20_000 })
  if (options.keyboard) {
    await result.focus()
    await page.keyboard.press('Enter')
  } else if (options.touch) {
    await result.tap({ timeout: 120_000 })
  } else {
    await result.click({ timeout: 120_000 })
  }
  await navigator.waitFor({ state: 'detached', timeout: 20_000 }).catch(() => {})
  await waitForState(page, 'data-life-map-mode', 'selected')
}

async function selectAndCapturePhase(page, expectedPhase, id, options = {}) {
  const capturePromise = observeRenderedPhase(page, expectedPhase, 45_000)
    .then(async (transition) => {
      receipt.transitions.push({ id, route: page.url(), ...transition })
      await shot(page, id, expectedPhase, { transitionWitness: id, ...(options.evidence || {}) })
    })
  const selectionPromise = selectQuietReset(page, options.selection || {})
  await Promise.all([capturePromise, selectionPromise])
  const capture = receipt.captures.find((item) => item.id === id)
  const transition = receipt.transitions.find((item) => item.id === id)
  if (!capture || capture.state?.phase !== expectedPhase) {
    throw new Error(`${id} did not retain the observed ${expectedPhase} phase`)
  }
  if (!transition || transition.renderedFramePhase !== expectedPhase) {
    throw new Error(`${id} did not prove ${expectedPhase} survived a rendered frame`)
  }
}

async function waitForPath(page, destinationPath, timeout = 30_000) {
  await poll(`path=${destinationPath}`, () => Promise.resolve(page.url()), (url) => new URL(url).pathname.replace(/\/$/, '') === destinationPath, timeout, 50)
}

async function clickRouteAction(page, name, destinationPath, destinationSelector) {
  const action = selectedAction(page, name)
  await action.waitFor({ state: 'visible', timeout: 20_000 })
  await action.click({ timeout: 120_000 })
  await waitForPath(page, destinationPath)
  await page.locator(destinationSelector).first().waitFor({ state: 'visible', timeout: 30_000 })
  await stable(page)
}

function assertVisualSanity() {
  const byId = new Map(receipt.captures.map((capture) => [capture.id, capture]))
  const parallaxIds = ['desktop-overview', 'depth-travel-frame-1', 'depth-travel-frame-2', 'depth-travel-frame-3']
  const hashes = new Set(parallaxIds.map((id) => byId.get(id)?.screenshot?.hash).filter(Boolean))
  if (hashes.size < 3) throw new Error(`parallax proof produced duplicate captures; unique=${hashes.size}`)
  const required = [
    'desktop-overview', 'selection-start', 'mid-travel', 'approach', 'stable-arrival',
    'keyboard-selection', 'portrait-mobile-overview', 'portrait-mobile-travel',
    'portrait-mobile-selected', 'portrait-tall-overview', 'portrait-tall-travel',
    'portrait-tall-selected', 'reduced-motion-arrival', 'webgl-recovered',
    'context-recovery-state-preserved',
  ]
  for (const id of required) {
    const capture = byId.get(id)
    if (!capture) throw new Error(`missing required capture ${id}`)
    if (capture.state?.renderReady !== 'true') throw new Error(`${id} did not prove a rendered production world`)
    if (Number(capture.state?.anchors || 0) < 8) throw new Error(`${id} visible anchor count below production minimum`)
    if (capture.screenshot.bytes < 120_000) throw new Error(`${id} screenshot is suspiciously empty`)
    if (!capture.signal) throw new Error(`${id} did not provide a WebGL signal`)
    if (capture.signal.sampleCount !== 3456) throw new Error(`${id} WebGL sample count drifted`)
    if (capture.signal.sampling !== 'distributed-grid-24x16-3x3') throw new Error(`${id} WebGL sampling method drifted`)
    if (capture.signal.variance >= 0 && capture.signal.variance < 8) throw new Error(`${id} WebGL pixel variance is below the visible-world minimum`)
    if (capture.signal.nonDarkRatio >= 0 && capture.signal.nonDarkRatio <= 0) throw new Error(`${id} WebGL non-dark coverage is empty`)
  }
  const expectedPhases = {
    'selection-start': 'departure',
    'mid-travel': 'travel',
    approach: 'approach',
    'stable-arrival': 'arrival',
    'keyboard-selection': 'arrival',
    'portrait-mobile-travel': 'travel',
    'portrait-mobile-selected': 'arrival',
    'portrait-tall-travel': 'travel',
    'portrait-tall-selected': 'arrival',
    'reduced-motion-arrival': 'arrival',
    'webgl-recovered': 'arrival',
    'context-recovery-state-preserved': 'arrival',
  }
  for (const [id, expectedPhase] of Object.entries(expectedPhases)) {
    const actualPhase = byId.get(id)?.state?.phase
    if (actualPhase !== expectedPhase) throw new Error(`${id} phase drifted: expected=${expectedPhase} actual=${actualPhase}`)
  }
  const loss = byId.get('webgl-context-loss')
  if (!loss) throw new Error('missing required WebGL context-loss capture')
  if (!['lost', 'recovering'].includes(loss.state?.webgl)) throw new Error(`context-loss state drifted: ${loss.state?.webgl}`)
  for (const id of ['webgl-recovered', 'context-recovery-state-preserved']) {
    const capture = byId.get(id)
    if (capture.state?.webgl !== 'ready') throw new Error(`${id} did not prove WebGL restoration`)
    if (capture.state?.mode !== 'selected') throw new Error(`${id} did not preserve selected memory identity after recovery`)
  }
  const highResolutionOverview = byId.get('desktop-overview')
  if (!highResolutionOverview?.signal || !highResolutionOverview?.viewport
    || highResolutionOverview.signal.width < highResolutionOverview.viewport.width * 3
    || highResolutionOverview.signal.height < highResolutionOverview.viewport.height * 3) {
    throw new Error('desktop-overview did not retain the required 3x high-resolution PNG evidence')
  }
  const phases = required.map((id) => byId.get(id)?.captureState).filter(Boolean)
  if (!phases.includes('departure') || !phases.includes('travel') || !phases.includes('approach') || !phases.includes('arrival')) {
    throw new Error('Founder journey did not retain every required phase')
  }
  const blockingEvents = receipt.browserEvents.filter((event) => event.kind === 'pageerror' || event.kind === 'requestfailed' || (event.kind === 'console:error' && !/favicon/i.test(event.text)))
  if (blockingEvents.length) throw new Error(`browser emitted ${blockingEvents.length} blocking console or network events`)
}

async function highResolutionOverview() {
  const { context, page } = await openPage({ label: 'desktop-high-resolution', deviceScaleFactor: 3 })
  try {
    const overviewRoute = '/life-map/?demo=1&manifestId=replay-recovery-thread&overview=1'
    await goto(page, overviewRoute)
    await waitForRenderedWorld(page)
    await canvasGeometry(page)
    await shot(page, 'desktop-overview', 'overview', { evidenceResolution: '3x-device' })
  } finally {
    await context.close()
  }
}

async function desktopJourney() {
  const { context, page } = await openPage({ label: 'desktop' })
  try {
    const overviewRoute = '/life-map/?demo=1&manifestId=replay-recovery-thread&overview=1'
    const arrivalRoute = '/life-map/?demo=1&memoryId=quiet-reset&manifestId=replay-recovery-thread&node=quiet-reset'

    // Capture the short-lived real transition before any expensive software-WebGL readback.
    for (const [phase, id] of [
      ['departure', 'selection-start'],
      ['travel', 'mid-travel'],
      ['approach', 'approach'],
      ['arrival', 'stable-arrival'],
    ]) {
      await goto(page, overviewRoute)
      await waitForRenderedWorld(page)
      await selectAndCapturePhase(page, phase, id)
    }

    await clickRouteAction(page, 'Enter Focus', '/focus', '[data-testid="urai-final-focus-chamber"]')
    await goto(page, arrivalRoute)
    await waitForRenderedWorld(page)
    await waitForState(page, 'data-life-map-phase', 'arrival', 45_000)
    await clickRouteAction(page, 'Replay', '/replay', '[data-testid="urai-replay-surface"]')
    await goto(page, arrivalRoute)
    await waitForRenderedWorld(page)
    await waitForState(page, 'data-life-map-phase', 'arrival', 45_000)
    await clickRouteAction(page, 'Overview', '/life-map', ROOT)
    await waitForOverviewState(page)

    // Parallax evidence is retained after time-critical phase observation.
    await waitForRenderedWorld(page)
    await shot(page, 'depth-travel-frame-1', 'parallax-1')
    await page.mouse.move(1120, 250)
    await stable(page, 6)
    await shot(page, 'depth-travel-frame-2', 'parallax-2')
    await page.mouse.move(300, 620)
    await stable(page, 6)
    await shot(page, 'depth-travel-frame-3', 'parallax-3')
  } finally {
    await context.close()
  }
}

async function keyboardJourney() {
  const { context, page } = await openPage({ label: 'keyboard' })
  try {
    await goto(page, '/life-map/?demo=1&manifestId=replay-recovery-thread&overview=1')
    await waitForRenderedWorld(page)
    await selectQuietReset(page, { keyboard: true })
    await waitForState(page, 'data-life-map-phase', 'arrival', 45_000)
    await shot(page, 'keyboard-selection', 'arrival')
  } finally {
    await context.close()
  }
}

async function mobileJourney(viewport, label, ids) {
  const { context, page } = await openPage({ label, viewport, hasTouch: true, isMobile: true })
  try {
    await goto(page, '/life-map/?demo=1&manifestId=replay-recovery-thread&overview=1')
    await waitForRenderedWorld(page)
    await shot(page, ids.overview, 'overview')
    await selectAndCapturePhase(page, 'travel', ids.travel, { selection: { touch: true } })
    await waitForState(page, 'data-life-map-phase', 'arrival', 45_000)
    await shot(page, ids.selected, 'arrival')
  } finally {
    await context.close()
  }
}

async function reducedMotionJourney() {
  const { context, page } = await openPage({ label: 'reduced-motion', reducedMotion: 'reduce' })
  try {
    await goto(page, '/life-map/?demo=1&manifestId=replay-recovery-thread&overview=1')
    await waitForRenderedWorld(page)
    await selectQuietReset(page)
    await waitForState(page, 'data-life-map-phase', 'arrival', 45_000)
    await shot(page, 'reduced-motion-arrival', 'arrival')
  } finally {
    await context.close()
  }
}

async function privacyAndRecoveryJourneys() {
  const signedOut = await openPage({ label: 'signed-out-threshold' })
  try {
    await goto(signedOut.page, '/life-map/', '[data-testid="urai-life-map-signed-out-threshold"]')
    await shot(signedOut.page, 'signed-out-threshold', 'privacy')
  } finally {
    await signedOut.context.close()
  }

  const noWebGL = await openPage({ label: 'no-webgl', disableWebGL: true })
  try {
    await goto(noWebGL.page, '/life-map/?demo=1&manifestId=replay-recovery-thread&overview=1', '[data-testid="urai-life-map-authored-fallback"]')
    await shot(noWebGL.page, 'no-webgl-fallback', 'recovery')
  } finally {
    await noWebGL.context.close()
  }
}

async function contextRecoveryJourney() {
  const { context, page } = await openPage({ label: 'context-recovery' })
  try {
    const arrivalRoute = '/life-map/?demo=1&memoryId=quiet-reset&manifestId=replay-recovery-thread&node=quiet-reset'
    await goto(page, arrivalRoute)
    await waitForState(page, 'data-life-map-phase', 'arrival', 45_000)
    await waitForRenderedWorld(page, 45_000)
    const canvas = page.locator('canvas').first()
    const contextLossAvailable = await canvas.evaluate((element) => {
      const gl = element.getContext('webgl2') || element.getContext('webgl')
      const extension = gl?.getExtension('WEBGL_lose_context')
      if (!extension) return false
      window.__uraiFounderContextLoss = extension
      extension.loseContext()
      return true
    }, undefined, { timeout: 120_000 })
    if (!contextLossAvailable) throw new Error('WEBGL_lose_context unavailable for founder recovery proof')
    await page.locator('[data-webgl-state="lost"], [data-webgl-state="recovering"]').first().waitFor({ state: 'attached', timeout: 20_000 })
    await shot(page, 'webgl-context-loss', 'context-lost')
    await canvas.evaluate((element) => {
      window.__uraiFounderContextLoss?.restoreContext()
      delete window.__uraiFounderContextLoss
      element.style.visibility = ''
    }, undefined, { timeout: 120_000 })
    await waitForState(page, 'data-webgl-state', 'ready', 45_000)
    await waitForRenderedWorld(page, 45_000)
    await waitForState(page, 'data-life-map-mode', 'selected', 45_000)
    await waitForState(page, 'data-life-map-phase', 'arrival', 45_000)
    await shot(page, 'webgl-recovered', 'arrival')
    await shot(page, 'context-recovery-state-preserved', 'arrival')
  } finally {
    await context.close()
  }
}

try {
  await desktopJourney()
  await highResolutionOverview()
  await keyboardJourney()
  await mobileJourney({ width: 390, height: 844 }, 'portrait-mobile', {
    overview: 'portrait-mobile-overview',
    travel: 'portrait-mobile-travel',
    selected: 'portrait-mobile-selected',
  })
  await mobileJourney({ width: 430, height: 932 }, 'portrait-tall', {
    overview: 'portrait-tall-overview',
    travel: 'portrait-tall-travel',
    selected: 'portrait-tall-selected',
  })
  await reducedMotionJourney()
  await privacyAndRecoveryJourneys()
  await contextRecoveryJourney()
  assertVisualSanity()
  receipt.passed = true
} catch (error) {
  failed = true
  receipt.error = String(error?.stack || error)
  receipt.passed = false
} finally {
  receipt.completedAt = new Date().toISOString()
  await writeFile(path.join(outputDir, 'browser-events.json'), `${JSON.stringify(receipt.browserEvents, null, 2)}\n`)
  await writeFile(path.join(outputDir, 'receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`)
  await browser.close()
}

if (failed) process.exitCode = 1