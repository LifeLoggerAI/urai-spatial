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
  schemaVersion: 'urai-lifemap-founder-proof-13',
  repository: 'LifeLoggerAI/urai-spatial',
  pr,
  exactHead,
  runId: process.env.GITHUB_RUN_ID || 'local',
  runner: 'checked-in-stable-module',
  capturePolicy: 'one-explicit-3x-high-resolution-proof-plus-complete-1x-interaction-matrix',
  capturedAt: new Date().toISOString(),
  captures: [],
  browserEvents: [],
}

let failed = false
await mkdir(outputDir, { recursive: true })
const browser = await chromium.launch({ headless: true })
const ROOT = '[data-testid="urai-true-3d-life-map"]'
const JOURNEY_WATCH_STORAGE_KEY = '__uraiFounderJourneyPhaseWatchRecord'

async function stable(page, frames = 4) {
  await page.waitForTimeout(Math.max(80, frames * 20))
}

function recordPageEvents(page, label) {
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      const location = message.location()
      receipt.browserEvents.push({
        label,
        kind: `console:${message.type()}`,
        text: message.text(),
        url: location?.url || null,
        lineNumber: Number.isInteger(location?.lineNumber) ? location.lineNumber : null,
        columnNumber: Number.isInteger(location?.columnNumber) ? location.columnNumber : null,
      })
    }
  })
  page.on('pageerror', (error) => receipt.browserEvents.push({ label, kind: 'pageerror', text: String(error) }))
  page.on('response', (response) => {
    if (response.status() >= 400) {
      receipt.browserEvents.push({
        label,
        kind: 'http-error',
        text: `${response.status()} ${response.request().method()} ${response.url()} resource=${response.request().resourceType()}`,
        url: response.url(),
      })
    }
  })
  page.on('requestfailed', (request) => {
    receipt.browserEvents.push({ label, kind: 'requestfailed', text: `${request.method()} ${request.url()} ${request.failure()?.errorText || ''}`, url: request.url() })
  })
}

async function openPage(options = {}, browserInstance = browser) {
  const context = await browserInstance.newContext({
    viewport: options.viewport || { width: 1440, height: 900 },
    deviceScaleFactor: options.deviceScaleFactor || 1,
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
  await context.addInitScript(({ rootSelector, storageKey }) => {
    let record = null
    try {
      record = JSON.parse(sessionStorage.getItem(storageKey) || 'null')
    } catch {
      record = null
    }
    if (!record?.expectedPhase) return
    const phase = record.expectedPhase
    const watch = { expectedPhase: phase, observed: record.observed || null, observer: null }
    const inspect = () => {
      if (watch.observed) return
      const root = document.querySelector(rootSelector)
      if (!(root instanceof HTMLElement)) return
      if (root.dataset.lifeMapMode === 'selected' && root.dataset.lifeMapPhase === phase) {
        const observed = {
          phase: root.dataset.lifeMapPhase,
          mode: root.dataset.lifeMapMode,
          scale: root.dataset.lifeMapScale || null,
          observedAt: performance.now(),
        }
        watch.observed = observed
        try {
          sessionStorage.setItem(storageKey, JSON.stringify({ expectedPhase: phase, observed }))
        } catch {
          // Browser proof metadata remains available on window when storage is unavailable.
        }
      }
    }
    const observer = new MutationObserver(inspect)
    watch.observer = observer
    window.__uraiFounderJourneyPhaseWatch = watch
    observer.observe(document, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['data-life-map-phase', 'data-life-map-mode', 'data-life-map-scale'],
    })
    inspect()
  }, { rootSelector: ROOT, storageKey: JOURNEY_WATCH_STORAGE_KEY })
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
    const box = await page.evaluate((rootSelector) => {
      const element = document.querySelector(rootSelector)
      if (!(element instanceof Element)) return null
      const rect = element.getBoundingClientRect()
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
    }, selector)
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

async function waitForRenderedWorld(page, timeout = 30_000) {
  return poll('rendered Life Map world', () => page.evaluate((rootSelector) => {
    const element = document.querySelector(rootSelector)
    if (!(element instanceof HTMLElement)) return null
    return {
      ready: element.dataset.lifeMapRenderReady || null,
      anchors: Number(element.dataset.lifeMapVisibleAnchors || 0),
      objects: Number(element.dataset.lifeMapVisibleObjects || 0),
      calls: Number(element.dataset.lifeMapRenderCalls || 0),
    }
  }, ROOT), (state) => Boolean(
    state
    && state.ready === 'true'
    && state.anchors >= 8
    && state.objects > 20
    && state.calls > 0
  ), timeout, 75)
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

async function armJourneyPhaseWatch(page, expectedPhase) {
  await page.evaluate(({ rootSelector, phase, storageKey }) => {
    const initialRoot = document.querySelector(rootSelector)
    if (!(initialRoot instanceof HTMLElement)) throw new Error(`missing Life Map root for phase watch: ${rootSelector}`)
    try {
      sessionStorage.setItem(storageKey, JSON.stringify({ expectedPhase: phase, observed: null }))
    } catch {
      // The live window watcher remains authoritative if storage is unavailable.
    }
    const previous = window.__uraiFounderJourneyPhaseWatch
    if (previous?.observer) previous.observer.disconnect()
    const watch = { expectedPhase: phase, observed: null, observer: null }
    const inspect = () => {
      if (watch.observed) return
      const root = document.querySelector(rootSelector)
      if (!(root instanceof HTMLElement)) return
      if (root.dataset.lifeMapMode === 'selected' && root.dataset.lifeMapPhase === phase) {
        const observed = {
          phase: root.dataset.lifeMapPhase,
          mode: root.dataset.lifeMapMode,
          scale: root.dataset.lifeMapScale || null,
          observedAt: performance.now(),
        }
        watch.observed = observed
        try {
          sessionStorage.setItem(storageKey, JSON.stringify({ expectedPhase: phase, observed }))
        } catch {
          // Browser proof metadata remains available on window when storage is unavailable.
        }
      }
    }
    const observer = new MutationObserver(inspect)
    watch.observer = observer
    window.__uraiFounderJourneyPhaseWatch = watch
    observer.observe(document, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['data-life-map-phase', 'data-life-map-mode', 'data-life-map-scale'],
    })
    inspect()
  }, { rootSelector: ROOT, phase: expectedPhase, storageKey: JOURNEY_WATCH_STORAGE_KEY })
}

async function readJourneyPhaseWatch(page, expectedPhase, timeout = 12_000) {
  const observed = await poll(`observed journey phase=${expectedPhase}`, () => page.evaluate(({ phase, storageKey }) => {
    const watch = window.__uraiFounderJourneyPhaseWatch
    if (watch?.expectedPhase === phase && watch.observed) return watch.observed
    try {
      const record = JSON.parse(sessionStorage.getItem(storageKey) || 'null')
      if (record?.expectedPhase === phase) return record.observed || null
    } catch {
      return null
    }
    return null
  }, { phase: expectedPhase, storageKey: JOURNEY_WATCH_STORAGE_KEY }), Boolean, timeout, 25)
  if (observed.phase !== expectedPhase || observed.mode !== 'selected') {
    throw new Error(`phase watch drifted: ${JSON.stringify({ expectedPhase, observed })}`)
  }
  return observed
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

function selectedActionSelector(name) {
  const actionClass = {
    'Enter Focus': 'focus-threshold',
    Replay: 'replay-threshold',
    Overview: 'overview-return',
  }[name]
  if (!actionClass) throw new Error(`unknown selected-memory action: ${name}`)
  return `nav[aria-label="Selected memory actions"] button.${actionClass}`
}

async function canonicalControlGeometry(page, selector, label, timeout = 20_000) {
  const viewport = page.viewportSize()
  return poll(label, () => page.evaluate((controlSelector) => {
    const element = document.querySelector(controlSelector)
    if (!(element instanceof HTMLElement)) return null
    element.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' })
    const rect = element.getBoundingClientRect()
    const style = getComputedStyle(element)
    const fractions = [0.5, 0.25, 0.75, 0.125, 0.875]
    let ownedPoint = null
    let lastHit = null
    for (const yFraction of fractions) {
      for (const xFraction of fractions) {
        const candidateX = rect.x + rect.width * xFraction
        const candidateY = rect.y + rect.height * yFraction
        const hit = document.elementFromPoint(candidateX, candidateY)
        lastHit = hit
        if (hit && (hit === element || element.contains(hit))) {
          ownedPoint = { x: candidateX, y: candidateY, xFraction, yFraction }
          break
        }
      }
      if (ownedPoint) break
    }
    return {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      disabled: element instanceof HTMLButtonElement ? element.disabled : false,
      display: style.display,
      visibility: style.visibility,
      pointerEvents: style.pointerEvents,
      ariaLabel: element.getAttribute('aria-label'),
      text: element.textContent || '',
      hitOwned: Boolean(ownedPoint),
      hitPoint: ownedPoint,
      hitTag: lastHit?.tagName || null,
      hitNodeId: lastHit instanceof Element ? lastHit.closest('[data-life-map-node-id]')?.getAttribute('data-life-map-node-id') || null : null,
    }
  }, selector), (geometry) => Boolean(
    geometry && viewport
    && !geometry.disabled
    && geometry.display !== 'none'
    && geometry.visibility !== 'hidden'
    && geometry.pointerEvents !== 'none'
    && geometry.width > 0 && geometry.height > 0
    && geometry.x + geometry.width > 0 && geometry.y + geometry.height > 0
    && geometry.x < viewport.width && geometry.y < viewport.height
    && geometry.hitOwned
    && geometry.hitPoint
  ), timeout, 50)
}

async function activateCanonicalControl(page, selector, geometry, interaction) {
  if (interaction === 'keyboard') {
    const focused = await page.evaluate((controlSelector) => {
      const element = document.querySelector(controlSelector)
      if (!(element instanceof HTMLElement)) return false
      element.focus()
      return document.activeElement === element
    }, selector)
    if (!focused) throw new Error(`keyboard focus failed for ${selector}`)
    await page.keyboard.press('Enter')
    return
  }
  const live = await canonicalControlGeometry(page, selector, `canonical hit target for ${selector}`, 10_000)
  if (!live.hitOwned || !live.hitPoint) throw new Error(`canonical hit target drifted for ${selector}: ${JSON.stringify(live)}`)
  const { x, y } = live.hitPoint
  if (interaction === 'touch') await page.touchscreen.tap(x, y)
  else await page.mouse.click(x, y)
}

async function selectQuietReset(page, options = {}) {
  const triggerSelector = 'button.life-map-search-trigger[aria-label="Search and navigate Life Map"]'
  const trigger = await canonicalControlGeometry(page, triggerSelector, 'canonical Life Map search trigger')
  if (trigger.ariaLabel !== 'Search and navigate Life Map') throw new Error(`Life Map search trigger semantic label drifted: ${trigger.ariaLabel}`)
  await activateCanonicalControl(page, triggerSelector, trigger, options.touch ? 'touch' : options.keyboard ? 'keyboard' : 'pointer')

  const navigatorSelector = 'section.life-map-navigator[aria-label="Search and filter Life Map"]'
  await poll('canonical Life Map semantic navigator', () => page.evaluate((selector) => Boolean(document.querySelector(selector)), navigatorSelector), Boolean, 20_000, 50)

  const resultSelector = `${navigatorSelector} button[data-life-map-semantic-result][data-life-map-node-id="quiet-reset"]`
  const result = await canonicalControlGeometry(page, resultSelector, 'canonical Quiet Reset semantic result')
  if (!/The Quiet Reset/i.test(result.text)) throw new Error(`Quiet Reset semantic result text drifted: ${result.text}`)
  if (options.targetPhase) await armJourneyPhaseWatch(page, options.targetPhase)
  await activateCanonicalControl(page, resultSelector, result, options.keyboard ? 'keyboard' : options.touch ? 'touch' : 'pointer')

  const observedPhase = options.targetPhase ? await readJourneyPhaseWatch(page, options.targetPhase) : null
  await poll('selected Quiet Reset identity', async () => {
    const root = page.locator(ROOT).first()
    const destination = new URL(page.url())
    return {
      mode: await root.getAttribute('data-life-map-mode'),
      memoryId: destination.searchParams.get('memoryId'),
      node: destination.searchParams.get('node'),
    }
  }, (state) => state.mode === 'selected' && state.memoryId === 'quiet-reset' && state.node === 'quiet-reset', 20_000, 50)
  await waitForState(page, 'data-life-map-mode', 'selected')
  return observedPhase
}

async function waitForPath(page, destinationPath, timeout = 30_000) {
  await poll(`path=${destinationPath}`, () => Promise.resolve(page.url()), (url) => new URL(url).pathname.replace(/\/$/, '') === destinationPath, timeout, 50)
}

async function clickRouteAction(page, name, destinationPath, destinationSelector) {
  const action = selectedAction(page, name)
  await action.waitFor({ state: 'visible', timeout: 20_000 })
  const selector = selectedActionSelector(name)
  const geometry = await canonicalControlGeometry(page, selector, `canonical ${name} action`)
  if (!geometry.text.includes(name)) throw new Error(`${name} action text drifted: ${geometry.text}`)
  await activateCanonicalControl(page, selector, geometry, 'pointer')
  await waitForPath(page, destinationPath)
  await page.locator(destinationSelector).first().waitFor({ state: 'visible', timeout: 30_000 })
  await stable(page)
}

function assertVisualSanity() {
  const byId = new Map(receipt.captures.map((capture) => [capture.id, capture]))
  const highResolution = byId.get('desktop-overview-high-resolution')
  if (!highResolution) throw new Error('missing dedicated high-resolution Founder capture')
  if (!highResolution.signal || highResolution.signal.width < 4320 || highResolution.signal.height < 2700) {
    throw new Error(`high-resolution Founder capture dimensions drifted: ${JSON.stringify(highResolution.signal)}`)
  }
  if (!highResolution.screenshot || highResolution.screenshot.bytes < 1_000_000) throw new Error('high-resolution Founder capture is suspiciously small')

  const parallaxIds = ['desktop-overview', 'depth-travel-frame-1', 'depth-travel-frame-2', 'depth-travel-frame-3']
  const hashes = new Set(parallaxIds.map((id) => byId.get(id)?.screenshot?.hash).filter(Boolean))
  if (hashes.size < 3) throw new Error(`parallax proof produced duplicate captures; unique=${hashes.size}`)

  const required = [
    'desktop-overview', 'selection-start', 'mid-travel', 'approach', 'stable-arrival',
    'keyboard-selection', 'portrait-mobile-overview', 'portrait-mobile-travel',
    'portrait-mobile-selected', 'portrait-tall-overview', 'portrait-tall-selected',
    'reduced-motion-arrival',
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

  const observedPhases = new Map([
    ['selection-start', 'departure'],
    ['mid-travel', 'travel'],
    ['approach', 'approach'],
    ['portrait-mobile-travel', 'travel'],
  ])
  for (const [id, expectedPhase] of observedPhases) {
    const observed = byId.get(id)?.observedPhase
    if (observed?.phase !== expectedPhase || observed?.mode !== 'selected') {
      throw new Error(`${id} did not observe the authoritative ${expectedPhase} phase: ${JSON.stringify(observed)}`)
    }
  }

  const phases = required.map((id) => byId.get(id)?.captureState).filter(Boolean)
  if (!phases.includes('departure') || !phases.includes('travel') || !phases.includes('approach') || !phases.includes('arrival')) {
    throw new Error('Founder journey did not retain every required phase')
  }
  const isExpectedNavigationFontAbort = (event) => event.kind === 'requestfailed'
    && /GET https:\/\/fonts\.gstatic\.com\/.*\.woff2 net::ERR_ABORTED$/.test(event.text)
  const blockingEvents = receipt.browserEvents.filter((event) => !isExpectedNavigationFontAbort(event) && (
    event.kind === 'pageerror'
    || event.kind === 'requestfailed'
    || event.kind === 'http-error'
    || (event.kind === 'console:error' && !/favicon/i.test(event.text))
  ))
  if (blockingEvents.length) throw new Error(`browser emitted ${blockingEvents.length} blocking console or network events: ${JSON.stringify(blockingEvents.slice(0, 8))}`)
}

async function highResolutionOverview() {
  const { context, page } = await openPage({ label: 'high-resolution-overview', deviceScaleFactor: 3 })
  try {
    await goto(page, '/life-map/?demo=1&manifestId=replay-recovery-thread&overview=1')
    await waitForRenderedWorld(page)
    await shot(page, 'desktop-overview-high-resolution', 'high-resolution-overview', { deviceScaleFactor: 3 })
  } finally {
    await context.close()
  }
}

async function captureIsolatedJourneyPhase({ id, targetPhase, captureState, interaction = 'pointer', viewport, hasTouch = false, isMobile = false }) {
  const isolatedBrowser = await chromium.launch({ headless: true })
  let isolated = null
  try {
    isolated = await openPage({
      label: `isolated-${id}`,
      viewport,
      hasTouch,
      isMobile,
    }, isolatedBrowser)
    const overviewRoute = '/life-map/?demo=1&manifestId=replay-recovery-thread&overview=1'
    await goto(isolated.page, overviewRoute)
    await waitForRenderedWorld(isolated.page)
    const observedPhase = await selectQuietReset(isolated.page, {
      targetPhase,
      keyboard: interaction === 'keyboard',
      touch: interaction === 'touch',
    })
    await shot(isolated.page, id, captureState, {
      memoryId: 'quiet-reset',
      interaction,
      observedPhase,
    })
  } finally {
    await isolated?.context.close()
    await isolatedBrowser.close()
  }
}

async function isolatedJourneyPhases() {
  await captureIsolatedJourneyPhase({ id: 'selection-start', targetPhase: 'departure', captureState: 'departure' })
  await captureIsolatedJourneyPhase({ id: 'mid-travel', targetPhase: 'travel', captureState: 'travel' })
  await captureIsolatedJourneyPhase({ id: 'approach', targetPhase: 'approach', captureState: 'approach' })
  await captureIsolatedJourneyPhase({
    id: 'portrait-mobile-travel',
    targetPhase: 'travel',
    captureState: 'travel',
    interaction: 'touch',
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  })
}

async function desktopJourney() {
  const { context, page } = await openPage({ label: 'desktop' })
  try {
    const overviewRoute = '/life-map/?demo=1&manifestId=replay-recovery-thread&overview=1'

    await goto(page, overviewRoute)
    await waitForRenderedWorld(page)
    await shot(page, 'desktop-overview', 'overview')
    const box = await page.evaluate(() => {
      const element = document.querySelector('canvas')
      if (!(element instanceof HTMLCanvasElement)) return null
      const rect = element.getBoundingClientRect()
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
    })
    if (!box || box.width <= 0 || box.height <= 0) throw new Error(`canvas geometry invalid: ${JSON.stringify(box)}`)
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5)
    await stable(page, 12)
    await shot(page, 'depth-travel-frame-1', 'parallax-1')
    await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.32, { steps: 18 })
    await stable(page, 14)
    await shot(page, 'depth-travel-frame-2', 'parallax-2')
    await page.mouse.move(box.x + box.width * 0.82, box.y + box.height * 0.68, { steps: 18 })
    await stable(page, 14)
    await shot(page, 'depth-travel-frame-3', 'parallax-3')
  } finally {
    await context.close()
  }
}

async function desktopArrivalEvidence() {
  const arrivalBrowser = await chromium.launch({ headless: true })
  let arrivalPage = null
  try {
    arrivalPage = await openPage({ label: 'desktop-arrival' }, arrivalBrowser)
    const { page } = arrivalPage
    const arrivalRoute = '/life-map/?demo=1&memoryId=quiet-reset&manifestId=replay-recovery-thread&node=quiet-reset'
    await goto(page, arrivalRoute)
    await waitForRenderedWorld(page)
    await waitForState(page, 'data-life-map-phase', 'arrival')
    await selectedActions(page).waitFor({ state: 'visible', timeout: 30_000 })
    await shot(page, 'stable-arrival', 'arrival', { memoryId: 'quiet-reset' })
    await shot(page, 'selected-memory-arrival', 'selected-arrival', { memoryId: 'quiet-reset' })
    await shot(page, 'focus-replay-thresholds', 'thresholds', { memoryId: 'quiet-reset' })
  } finally {
    await arrivalPage?.context.close()
    await arrivalBrowser.close()
  }
}

async function desktopActionsAndKeyboard() {
  const actionBrowser = await chromium.launch({ headless: true })
  let actionPage = null
  try {
    actionPage = await openPage({ label: 'desktop-actions' }, actionBrowser)
    const { page } = actionPage
    const overviewRoute = '/life-map/?demo=1&manifestId=replay-recovery-thread&overview=1'
    const arrivalRoute = '/life-map/?demo=1&memoryId=quiet-reset&manifestId=replay-recovery-thread&node=quiet-reset'

    await goto(page, arrivalRoute)
    await waitForRenderedWorld(page)
    await waitForState(page, 'data-life-map-phase', 'arrival')

    await clickRouteAction(page, 'Enter Focus', '/focus', '[data-testid="urai-final-focus-chamber"]')
    await shot(page, 'focus-destination', 'focus', { memoryId: 'quiet-reset' })

    await goto(page, arrivalRoute)
    await waitForRenderedWorld(page)
    await waitForState(page, 'data-life-map-phase', 'arrival')
    await clickRouteAction(page, 'Replay', '/replay', 'main')
    await shot(page, 'replay-destination', 'replay', { memoryId: 'quiet-reset' })

    await goto(page, arrivalRoute)
    await waitForRenderedWorld(page)
    await waitForState(page, 'data-life-map-phase', 'arrival')
    const overviewSelector = selectedActionSelector('Overview')
    const overviewAction = selectedAction(page, 'Overview')
    await overviewAction.waitFor({ state: 'visible', timeout: 20_000 })
    const overviewGeometry = await canonicalControlGeometry(page, overviewSelector, 'canonical Overview action')
    if (!overviewGeometry.text.includes('Overview')) throw new Error(`Overview action text drifted: ${overviewGeometry.text}`)
    await activateCanonicalControl(page, overviewSelector, overviewGeometry, 'pointer')
    await waitForOverviewState(page)
    await shot(page, 'overview-reset', 'overview-reset')

    await goto(page, overviewRoute)
    await waitForRenderedWorld(page)
    await selectQuietReset(page, { keyboard: true })
    await shot(page, 'keyboard-selection', 'keyboard-selection', { memoryId: 'quiet-reset', interaction: 'keyboard' })
    await page.keyboard.press('Escape')
    await waitForOverviewState(page)
    await shot(page, 'escape-unwind', 'escape-unwind')
  } finally {
    await actionPage?.context.close()
    await actionBrowser.close()
  }
}

async function mobileAndReduced() {
  const overviewRoute = '/life-map/?demo=1&manifestId=replay-recovery-thread&overview=1'
  const arrivalRoute = '/life-map/?demo=1&memoryId=quiet-reset&manifestId=replay-recovery-thread&node=quiet-reset'

  const mobile = await openPage({ viewport: { width: 390, height: 844 }, label: 'portrait', hasTouch: true, isMobile: true })
  try {
    await goto(mobile.page, overviewRoute)
    await waitForRenderedWorld(mobile.page)
    await shot(mobile.page, 'portrait-mobile-overview', 'mobile-overview')
    await goto(mobile.page, arrivalRoute)
    await waitForRenderedWorld(mobile.page)
    await waitForState(mobile.page, 'data-life-map-phase', 'arrival')
    await shot(mobile.page, 'portrait-mobile-selected', 'mobile-selected', { memoryId: 'quiet-reset', interaction: 'touch' })
  } finally {
    await mobile.context.close()
  }

  const tall = await openPage({ viewport: { width: 430, height: 932 }, label: 'portrait-tall', hasTouch: true, isMobile: true })
  try {
    await goto(tall.page, overviewRoute)
    await waitForRenderedWorld(tall.page)
    await shot(tall.page, 'portrait-tall-overview', 'mobile-tall-overview')
    await goto(tall.page, arrivalRoute)
    await waitForRenderedWorld(tall.page)
    await waitForState(tall.page, 'data-life-map-phase', 'arrival')
    await shot(tall.page, 'portrait-tall-selected', 'mobile-tall-selected', { memoryId: 'quiet-reset' })
  } finally {
    await tall.context.close()
  }

  const reduced = await openPage({ reducedMotion: 'reduce', label: 'reduced-motion' })
  try {
    await goto(reduced.page, arrivalRoute)
    await waitForRenderedWorld(reduced.page)
    await waitForState(reduced.page, 'data-life-map-phase', 'arrival')
    await shot(reduced.page, 'reduced-motion-arrival', 'reduced-motion-arrival', { memoryId: 'quiet-reset' })
  } finally {
    await reduced.context.close()
  }
}

async function privacyAndRecovery() {
  const signed = await openPage({ label: 'signed-out' })
  try {
    await goto(signed.page, '/life-map/', '[data-testid="urai-life-map-signed-out-threshold"]')
    await shot(signed.page, 'signed-out-private-threshold', 'signed-out')
  } finally {
    await signed.context.close()
  }

  const sample = await openPage({ label: 'disclosed-demo' })
  try {
    await goto(sample.page, '/life-map/?demo=1&manifestId=replay-recovery-thread&overview=1')
    await waitForRenderedWorld(sample.page)
    await shot(sample.page, 'explicit-disclosed-sample', 'explicit-demo')
  } finally {
    await sample.context.close()
  }

  const fallback = await openPage({ disableWebGL: true, label: 'no-webgl' })
  try {
    await goto(fallback.page, '/life-map/?demo=1', '[data-testid="urai-life-map-authored-fallback"]')
    await shot(fallback.page, 'no-webgl-fallback', 'no-webgl')
  } finally {
    await fallback.context.close()
  }

  const recovery = await openPage({ label: 'context-recovery' })
  try {
    await goto(recovery.page, '/life-map/?demo=1&memoryId=quiet-reset&manifestId=replay-recovery-thread&node=quiet-reset')
    await waitForState(recovery.page, 'data-life-map-phase', 'arrival')
    await waitForRenderedWorld(recovery.page)
    const contextLossAvailable = await recovery.page.evaluate(() => {
      const element = document.querySelector('canvas')
      if (!(element instanceof HTMLCanvasElement)) return false
      const gl = element.getContext('webgl2') || element.getContext('webgl')
      const extension = gl?.getExtension('WEBGL_lose_context')
      if (!extension) return false
      window.__uraiFounderContextLoss = extension
      extension.loseContext()
      return true
    })
    if (!contextLossAvailable) throw new Error('WEBGL_lose_context unavailable for founder recovery proof')
    await recovery.page.locator('[data-webgl-state="lost"], [data-webgl-state="recovering"]').first().waitFor({ state: 'attached', timeout: 10_000 })
    await shot(recovery.page, 'webgl-context-loss', 'context-lost', { memoryId: 'quiet-reset' })
    await recovery.page.evaluate(() => {
      const element = document.querySelector('canvas')
      window.__uraiFounderContextLoss?.restoreContext()
      delete window.__uraiFounderContextLoss
      if (element instanceof HTMLCanvasElement) element.style.visibility = ''
    })
    await waitForState(recovery.page, 'data-webgl-state', 'ready', 20_000)
    await waitForRenderedWorld(recovery.page)
    await shot(recovery.page, 'webgl-recovered', 'context-recovered', { memoryId: 'quiet-reset' })
    await shot(recovery.page, 'context-recovery-state-preserved', 'context-recovered-selected', { memoryId: 'quiet-reset' })
  } finally {
    await recovery.context.close()
  }
}

try {
  await highResolutionOverview()
  await desktopJourney()
  await desktopArrivalEvidence()
  await desktopActionsAndKeyboard()
  await isolatedJourneyPhases()
  await mobileAndReduced()
  await privacyAndRecovery()
  assertVisualSanity()
} catch (error) {
  failed = true
  receipt.error = String(error)
} finally {
  await browser.close()
  receipt.completedAt = new Date().toISOString()
  receipt.passed = !failed && receipt.captures.length >= 28
  await writeFile(path.join(outputDir, 'browser-events.json'), JSON.stringify(receipt.browserEvents, null, 2))
  await writeFile(path.join(outputDir, 'receipt.json'), JSON.stringify(receipt, null, 2))
  if (!receipt.passed) process.exitCode = 1
}
