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
    deviceScaleFactor: 3,
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
    const box = await scene.evaluate((element) => {
      const rect = element.getBoundingClientRect()
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
    })
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
  await trigger.waitFor({ state: 'visible', timeout: 20_000 })
  if (options.touch) await trigger.tap()
  else await trigger.click()
  const navigator = page.getByRole('region', { name: 'Search and filter Life Map' }).first()
  await navigator.waitFor({ state: 'visible', timeout: 20_000 })
  const result = navigator.locator('[role="listitem"]').filter({ hasText: 'The Quiet Reset' }).first()
  await result.waitFor({ state: 'visible', timeout: 20_000 })
  if (options.keyboard) {
    await result.focus()
    await page.keyboard.press('Enter')
  } else if (options.touch) {
    await result.tap()
  } else {
    await result.click()
  }
  await navigator.waitFor({ state: 'detached', timeout: 20_000 }).catch(() => {})
  await waitForState(page, 'data-life-map-mode', 'selected')
}

async function waitForPath(page, destinationPath, timeout = 30_000) {
  await poll(`path=${destinationPath}`, () => Promise.resolve(page.url()), (url) => new URL(url).pathname.replace(/\/$/, '') === destinationPath, timeout, 50)
}

async function clickRouteAction(page, name, destinationPath, destinationSelector) {
  const action = selectedAction(page, name)
  await action.waitFor({ state: 'visible', timeout: 20_000 })
  await action.click()
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
  const phases = required.map((id) => byId.get(id)?.captureState).filter(Boolean)
  if (!phases.includes('departure') || !phases.includes('travel') || !phases.includes('approach') || !phases.includes('arrival')) {
    throw new Error('Founder journey did not retain every required phase')
  }
  const blockingEvents = receipt.browserEvents.filter((event) => event.kind === 'pageerror' || event.kind === 'requestfailed' || (event.kind === 'console:error' && !/favicon/i.test(event.text)))
  if (blockingEvents.length) throw new Error(`browser emitted ${blockingEvents.length} blocking console or network events`)
}

async function desktopJourney() {
  const { context, page } = await openPage({ label: 'desktop' })
  try {
    const overviewRoute = '/life-map/?demo=1&manifestId=replay-recovery-thread&overview=1'
    const arrivalRoute = '/life-map/?demo=1&memoryId=quiet-reset&manifestId=replay-recovery-thread&node=quiet-reset'

    await goto(page, overviewRoute)
    await waitForRenderedWorld(page)
    await shot(page, 'desktop-overview', 'overview')
    const canvas = page.locator('canvas').first()
    const box = await canvas.boundingBox()
    if (!box) throw new Error('canvas has no box')
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5)
    await stable(page, 12)
    await shot(page, 'depth-travel-frame-1', 'parallax-1')
    await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.32, { steps: 18 })
    await stable(page, 14)
    await shot(page, 'depth-travel-frame-2', 'parallax-2')
    await page.mouse.move(box.x + box.width * 0.82, box.y + box.height * 0.68, { steps: 18 })
    await stable(page, 14)
    await shot(page, 'depth-travel-frame-3', 'parallax-3')

    await selectQuietReset(page)
    await waitForState(page, 'data-life-map-phase', 'departure')
    await shot(page, 'selection-start', 'departure', { memoryId: 'quiet-reset', interaction: 'pointer' })

    await goto(page, overviewRoute)
    await waitForRenderedWorld(page)
    await selectQuietReset(page)
    await waitForState(page, 'data-life-map-phase', 'travel')
    await shot(page, 'mid-travel', 'travel', { memoryId: 'quiet-reset' })

    await goto(page, overviewRoute)
    await waitForRenderedWorld(page)
    await selectQuietReset(page)
    await waitForState(page, 'data-life-map-phase', 'approach')
    await shot(page, 'approach', 'approach', { memoryId: 'quiet-reset' })

    await goto(page, arrivalRoute)
    await waitForRenderedWorld(page)
    await waitForState(page, 'data-life-map-phase', 'arrival')
    await shot(page, 'stable-arrival', 'arrival', { memoryId: 'quiet-reset' })
    await shot(page, 'selected-memory-arrival', 'selected-arrival', { memoryId: 'quiet-reset' })
    await selectedActions(page).waitFor({ state: 'visible', timeout: 10_000 })
    await shot(page, 'focus-replay-thresholds', 'thresholds', { memoryId: 'quiet-reset' })

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
    const overviewAction = selectedAction(page, 'Overview')
    await overviewAction.waitFor({ state: 'visible', timeout: 20_000 })
    await overviewAction.click()
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
    await context.close()
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
    await selectQuietReset(mobile.page, { touch: true })
    await waitForState(mobile.page, 'data-life-map-phase', 'travel')
    await shot(mobile.page, 'portrait-mobile-travel', 'mobile-travel', { memoryId: 'quiet-reset', interaction: 'touch' })
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
    const canvas = recovery.page.locator('canvas').first()
    const contextLossAvailable = await canvas.evaluate((element) => {
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
    await canvas.evaluate((element) => {
      window.__uraiFounderContextLoss?.restoreContext()
      delete window.__uraiFounderContextLoss
      element.style.visibility = ''
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
  await desktopJourney()
  await mobileAndReduced()
  await privacyAndRecovery()
  assertVisualSanity()
} catch (error) {
  failed = true
  receipt.error = String(error)
} finally {
  await browser.close()
  receipt.completedAt = new Date().toISOString()
  receipt.passed = !failed && receipt.captures.length >= 23
  await writeFile(path.join(outputDir, 'browser-events.json'), JSON.stringify(receipt.browserEvents, null, 2))
  await writeFile(path.join(outputDir, 'receipt.json'), JSON.stringify(receipt, null, 2))
  if (!receipt.passed) process.exitCode = 1
}
