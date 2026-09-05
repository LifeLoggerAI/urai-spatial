import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'

const requireFromTierOne = createRequire(new URL('../urai-tier1/package.json', import.meta.url))
const { chromium } = requireFromTierOne('playwright')
const base = process.env.URAI_PROOF_BASE || 'http://127.0.0.1:4173'
const outputDir = path.resolve(process.env.URAI_PROOF_DIR || 'artifacts/lifemap-founder-proof')
const exactHead = process.env.URAI_EXACT_HEAD || 'local'
const receipt = {
  schemaVersion: 'urai-lifemap-founder-proof-8',
  repository: 'LifeLoggerAI/urai-spatial',
  pr: 953,
  exactHead,
  runId: process.env.GITHUB_RUN_ID || 'local',
  capturedAt: new Date().toISOString(),
  captures: [],
  browserEvents: [],
}
let failed = false
await mkdir(outputDir, { recursive: true })
const browser = await chromium.launch({ headless: true })

async function stable(page, frames = 4) {
  await page.evaluate((count) => new Promise((resolve) => {
    let remaining = count
    const next = () => { remaining -= 1; if (remaining <= 0) resolve(); else requestAnimationFrame(next) }
    requestAnimationFrame(next)
  }), frames)
}

function recordPageEvents(page, label) {
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') receipt.browserEvents.push({ label, kind: `console:${message.type()}`, text: message.text() })
  })
  page.on('pageerror', (error) => receipt.browserEvents.push({ label, kind: 'pageerror', text: String(error) }))
  page.on('requestfailed', (request) => receipt.browserEvents.push({ label, kind: 'requestfailed', text: `${request.method()} ${request.url()} ${request.failure()?.errorText || ''}` }))
}

async function openPage(options = {}) {
  const context = await browser.newContext({ viewport: options.viewport || { width: 1440, height: 900 }, deviceScaleFactor: 1, reducedMotion: options.reducedMotion || 'no-preference' })
  if (options.disableWebGL) await context.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function patched(type, ...args) {
      if (['webgl', 'webgl2', 'experimental-webgl'].includes(type)) return null
      return original.call(this, type, ...args)
    }
  })
  const page = await context.newPage()
  recordPageEvents(page, options.label || 'page')
  return { context, page }
}

async function goto(page, route, selector = '[data-testid="urai-true-3d-life-map"]') {
  const response = await page.goto(new URL(route, base).toString(), { waitUntil: 'domcontentloaded', timeout: 60_000 })
  if (!response || response.status() !== 200) throw new Error(`${route} returned ${response?.status()}`)
  await page.locator(selector).first().waitFor({ state: 'visible', timeout: 45_000 })
  await stable(page)
}

async function waitForState(page, attribute, expected, timeout = 8_000) {
  await page.waitForFunction(({ attribute, expected }) => {
    const root = document.querySelector('[data-testid="urai-true-3d-life-map"]')
    return root?.getAttribute(attribute) === expected
  }, { attribute, expected }, { timeout, polling: 25 })
}

async function waitForRenderedWorld(page, timeout = 30_000) {
  await page.waitForFunction(() => {
    const root = document.querySelector('[data-testid="urai-true-3d-life-map"]')
    if (!root) return false
    const ready = root.getAttribute('data-life-map-render-ready') === 'true'
    const anchors = Number(root.getAttribute('data-life-map-visible-anchors') || 0)
    const objects = Number(root.getAttribute('data-life-map-visible-objects') || 0)
    const calls = Number(root.getAttribute('data-life-map-render-calls') || 0)
    return ready && anchors >= 8 && objects > 20 && calls > 0
  }, null, { timeout, polling: 50 })
}

async function waitForOverviewState(page, timeout = 30_000) {
  await page.waitForFunction(() => {
    const root = document.querySelector('[data-testid="urai-true-3d-life-map"]')
    const destination = new URL(window.location.href)
    const memoryId = destination.searchParams.get('memoryId')
    const node = destination.searchParams.get('node')
    const selectedActions = document.querySelector('nav[aria-label="Selected memory actions"]')
    return root?.getAttribute('data-life-map-mode') === 'overview'
      && destination.pathname.replace(/\/$/, '') === '/life-map'
      && destination.searchParams.get('overview') === '1'
      && memoryId === expectedIdentity
      && node === expectedIdentity
      && selectedActions === null
  }, { expectedIdentity }, { timeout, polling: 25 })
}

async function canvasSignal(page) {
  const canvas = page.locator('canvas').first()
  if (!await canvas.count()) return null
  return canvas.evaluate((element) => {
    const gl = element.getContext('webgl2') || element.getContext('webgl')
    if (!gl) return null
    const width = Math.max(1, Math.min(element.width, 512))
    const height = Math.max(1, Math.min(element.height, 320))
    const pixels = new Uint8Array(width * height * 4)
    try {
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
    } catch {
      return { width, height, variance: -1, nonDarkRatio: -1 }
    }
    let count = 0
    let sum = 0
    let sumSquares = 0
    let nonDark = 0
    const stride = 16
    for (let index = 0; index < pixels.length; index += stride) {
      const luminance = (pixels[index] + pixels[index + 1] + pixels[index + 2]) / 3
      count += 1
      sum += luminance
      sumSquares += luminance * luminance
      if (luminance > 8) nonDark += 1
    }
    const mean = sum / Math.max(1, count)
    return { width, height, variance: sumSquares / Math.max(1, count) - mean * mean, nonDarkRatio: nonDark / Math.max(1, count) }
  })
}

async function captureScreenshot(page, file) {
  const buffer = await page.screenshot({ path: path.join(outputDir, file), fullPage: false, animations: 'disabled', caret: 'hide', timeout: 60_000 })
  return { hash: createHash('sha256').update(buffer).digest('hex'), bytes: buffer.length }
}

async function shot(page, id, captureState, extra = {}) {
  const file = `${String(receipt.captures.length + 1).padStart(2, '0')}-${id}-${exactHead.slice(0, 12)}.png`
  const root = page.locator('[data-testid="urai-true-3d-life-map"], [data-testid="urai-life-map-signed-out-threshold"], [data-testid="urai-life-map-authored-fallback"]').first()
  const state = await root.count() ? await root.evaluate((node) => ({
    source: node.getAttribute('data-life-map-source'),
    phase: node.getAttribute('data-life-map-phase'),
    mode: node.getAttribute('data-life-map-mode'),
    scale: node.getAttribute('data-life-map-scale'),
    renderReady: node.getAttribute('data-life-map-render-ready'),
    objects: node.getAttribute('data-life-map-visible-objects'),
    anchors: node.getAttribute('data-life-map-visible-anchors'),
    calls: node.getAttribute('data-life-map-render-calls'),
    triangles: node.getAttribute('data-life-map-render-triangles'),
    webgl: node.getAttribute('data-webgl-state'),
    privateMounted: node.getAttribute('data-private-memory-mounted'),
    fallback: node.getAttribute('data-life-map-fallback'),
  })) : {}
  const screenshot = await captureScreenshot(page, file)
  const signal = await canvasSignal(page)
  receipt.captures.push({ order: receipt.captures.length + 1, id, file, route: page.url(), viewport: page.viewportSize(), captureState, state, screenshot, signal, timestamp: new Date().toISOString(), ...extra })
}

function selectedActions(page) {
  return page.locator('nav[aria-label="Selected memory actions"]').first()
}

async function selectQuietReset(page) {
  const navigator = page.locator('[data-life-map-navigator]').first()
  await navigator.waitFor({ state: 'attached', timeout: 20_000 })
  await navigator.evaluate((details) => { details.open = true })
  const result = navigator.locator('[role="listitem"]').filter({ hasText: 'The Quiet Reset' }).first()
  await result.waitFor({ state: 'visible', timeout: 20_000 })
  await result.click()
  await navigator.evaluate((details) => { details.open = false })
  await waitForState(page, 'data-life-map-mode', 'selected')
}

async function clickRouteAction(page, name, destinationPath, destinationSelector) {
  const action = selectedActions(page).getByRole('button', { name, exact: true })
  await action.waitFor({ state: 'visible', timeout: 20_000 })
  await action.click()
  await page.waitForFunction((expectedPath) => window.location.pathname.replace(/\/$/, '') === expectedPath, destinationPath, { timeout: 30_000, polling: 50 })
  await page.locator(destinationSelector).first().waitFor({ state: 'visible', timeout: 30_000 })
  await stable(page)
}

async function waitForFocusRendered(page, timeout = 30_000) {
  await page.waitForFunction(() => {
    const root = document.querySelector('[data-testid="urai-final-focus-chamber"]')
    if (!root) return false
    const canvas = root.querySelector('.focusCanvas canvas')
    const fallback = root.querySelector('.focusFallback')
    const renderer = root.getAttribute('data-software-renderer')
    return root.getAttribute('data-chamber-state') === 'ready'
      && root.getAttribute('data-webgl-state') === 'ready'
      && renderer !== 'detecting'
      && Boolean(canvas)
      && fallback === null
  }, null, { timeout, polling: 50 })
  await stable(page, 12)
}

function assertVisualSanity() {
  const byId = new Map(receipt.captures.map((capture) => [capture.id, capture]))
  const parallaxIds = ['desktop-overview', 'depth-travel-frame-1', 'depth-travel-frame-2', 'depth-travel-frame-3']
  const hashes = new Set(parallaxIds.map((id) => byId.get(id)?.screenshot?.hash).filter(Boolean))
  if (hashes.size < 3) throw new Error(`parallax proof produced duplicate captures; unique=${hashes.size}`)
  for (const id of ['desktop-overview', 'selection-start', 'mid-travel', 'approach', 'stable-arrival']) {
    const capture = byId.get(id)
    if (!capture) throw new Error(`missing required capture ${id}`)
    if (capture.state?.renderReady !== 'true') throw new Error(`${id} did not prove a rendered production world`)
    if (Number(capture.state?.anchors || 0) < 8) throw new Error(`${id} visible anchor count below production minimum`)
    if (capture.screenshot.bytes < 120_000) throw new Error(`${id} screenshot is suspiciously empty`)
    if (capture.signal && capture.signal.variance >= 0 && capture.signal.variance < 8) throw new Error(`${id} WebGL pixel variance is below the visible-world minimum`)
  }
  const blockingEvents = receipt.browserEvents.filter((event) => event.kind === 'pageerror' || event.kind === 'requestfailed' || (event.kind === 'console:error' && !/favicon/i.test(event.text)))
  if (blockingEvents.length) throw new Error(`browser emitted ${blockingEvents.length} blocking console or network events`)
}

async function desktopJourney() {
  const { context, page } = await openPage({ label: 'desktop' })
  try {
    await goto(page, '/life-map/?demo=1&manifestId=replay-recovery-thread&overview=1')
    await waitForRenderedWorld(page)
    await shot(page, 'desktop-overview', 'overview')
    const canvas = page.locator('canvas').first()
    const box = await canvas.boundingBox()
    if (!box) throw new Error('canvas has no box')
    await page.mouse.move(box.x + box.width * .5, box.y + box.height * .5)
    await stable(page, 12)
    await shot(page, 'depth-travel-frame-1', 'parallax-1')
    await page.mouse.move(box.x + box.width * .2, box.y + box.height * .32, { steps: 18 })
    await stable(page, 14)
    await shot(page, 'depth-travel-frame-2', 'parallax-2')
    await page.mouse.move(box.x + box.width * .82, box.y + box.height * .68, { steps: 18 })
    await stable(page, 14)
    await shot(page, 'depth-travel-frame-3', 'parallax-3')

    await selectQuietReset(page)
    await waitForState(page, 'data-life-map-phase', 'departure')
    await shot(page, 'selection-start', 'departure', { memoryId: 'quiet-reset' })
    await waitForState(page, 'data-life-map-phase', 'travel')
    await shot(page, 'mid-travel', 'travel')
    await waitForState(page, 'data-life-map-phase', 'approach')
    await shot(page, 'approach', 'approach')
    await waitForState(page, 'data-life-map-phase', 'arrival')
    await shot(page, 'stable-arrival', 'arrival')
    await shot(page, 'selected-memory-arrival', 'selected-arrival', { memoryId: 'quiet-reset' })
    await selectedActions(page).waitFor({ state: 'visible', timeout: 10_000 })
    await shot(page, 'focus-replay-thresholds', 'thresholds', { memoryId: 'quiet-reset' })

    await clickRouteAction(page, 'Enter Focus', '/focus', '[data-testid="urai-final-focus-chamber"]')
    await waitForFocusRendered(page)
    await shot(page, 'focus-destination', 'focus', { memoryId: 'quiet-reset' })
    await goto(page, '/life-map/?demo=1&memoryId=quiet-reset&manifestId=replay-recovery-thread&node=quiet-reset')
    await waitForState(page, 'data-life-map-mode', 'selected')
    await waitForState(page, 'data-life-map-phase', 'arrival')
    await clickRouteAction(page, 'Replay', '/replay', 'main')
    await shot(page, 'replay-destination', 'replay', { memoryId: 'quiet-reset' })

    await goto(page, '/life-map/?demo=1&memoryId=quiet-reset&manifestId=replay-recovery-thread&node=quiet-reset')
    await waitForState(page, 'data-life-map-mode', 'selected')
    await waitForState(page, 'data-life-map-phase', 'arrival')
    const overviewAction = selectedActions(page).getByRole('button', { name: 'Overview', exact: true })
    await overviewAction.waitFor({ state: 'visible', timeout: 20_000 })
    await overviewAction.click()
    await waitForOverviewState(page, 'quiet-reset')
    await shot(page, 'overview-reset', 'overview-reset', { memoryId: 'quiet-reset' })

    await selectQuietReset(page)
    await page.keyboard.press('Escape')
    await waitForOverviewState(page, 'quiet-reset')
    await shot(page, 'escape-unwind', 'escape-unwind', { memoryId: 'quiet-reset' })
  } finally { await context.close() }
}

async function mobileAndReduced() {
  const mobile = await openPage({ viewport: { width: 390, height: 844 }, label: 'portrait' })
  try {
    await goto(mobile.page, '/life-map/?demo=1&manifestId=replay-recovery-thread&overview=1')
    await waitForRenderedWorld(mobile.page)
    await shot(mobile.page, 'portrait-mobile-overview', 'mobile-overview')
    await selectQuietReset(mobile.page)
    await waitForState(mobile.page, 'data-life-map-phase', 'travel')
    await shot(mobile.page, 'portrait-mobile-travel', 'mobile-travel', { memoryId: 'quiet-reset' })
    await waitForState(mobile.page, 'data-life-map-phase', 'arrival')
    await shot(mobile.page, 'portrait-mobile-selected', 'mobile-selected', { memoryId: 'quiet-reset' })
  } finally { await mobile.context.close() }
  const reduced = await openPage({ reducedMotion: 'reduce', label: 'reduced-motion' })
  try {
    await goto(reduced.page, '/life-map/?demo=1&manifestId=replay-recovery-thread&overview=1')
    await waitForRenderedWorld(reduced.page)
    await selectQuietReset(reduced.page)
    await waitForState(reduced.page, 'data-life-map-phase', 'arrival')
    await shot(reduced.page, 'reduced-motion-arrival', 'reduced-motion-arrival', { memoryId: 'quiet-reset' })
  } finally { await reduced.context.close() }
}

async function privacyAndRecovery() {
  const signed = await openPage({ label: 'signed-out' })
  try { await goto(signed.page, '/life-map/', '[data-testid="urai-life-map-signed-out-threshold"]'); await shot(signed.page, 'signed-out-private-threshold', 'signed-out') } finally { await signed.context.close() }
  const sample = await openPage({ label: 'disclosed-demo' })
  try { await goto(sample.page, '/life-map/?demo=1&manifestId=replay-recovery-thread&overview=1'); await waitForRenderedWorld(sample.page); await shot(sample.page, 'explicit-disclosed-sample', 'explicit-demo') } finally { await sample.context.close() }
  const fallback = await openPage({ disableWebGL: true, label: 'no-webgl' })
  try { await goto(fallback.page, '/life-map/?demo=1', '[data-testid="urai-life-map-authored-fallback"]'); await shot(fallback.page, 'no-webgl-fallback', 'no-webgl') } finally { await fallback.context.close() }
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
  } finally { await recovery.context.close() }
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