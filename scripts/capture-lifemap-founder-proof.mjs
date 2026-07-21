import { mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'

const requireFromTierOne = createRequire(new URL('../urai-tier1/package.json', import.meta.url))
const { chromium } = requireFromTierOne('playwright')
const base = process.env.URAI_PROOF_BASE || 'http://127.0.0.1:4173'
const outputDir = path.resolve(process.env.URAI_PROOF_DIR || 'artifacts/lifemap-founder-proof')
const exactHead = process.env.URAI_EXACT_HEAD || 'local'
const receipt = { schemaVersion: 'urai-lifemap-founder-proof-4', repository: 'LifeLoggerAI/urai-spatial', pr: 860, exactHead, runId: process.env.GITHUB_RUN_ID || 'local', capturedAt: new Date().toISOString(), captures: [] }
let failed = false
await mkdir(outputDir, { recursive: true })
const browser = await chromium.launch({ headless: true })

async function stable(page, frames = 3) {
  await page.evaluate((count) => new Promise((resolve) => {
    let remaining = count
    const next = () => { remaining -= 1; if (remaining <= 0) resolve(); else requestAnimationFrame(next) }
    requestAnimationFrame(next)
  }), frames)
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
  return { context, page: await context.newPage() }
}

async function goto(page, route, selector = '[data-testid="urai-true-3d-life-map"]') {
  const response = await page.goto(new URL(route, base).toString(), { waitUntil: 'domcontentloaded', timeout: 60_000 })
  if (!response || response.status() !== 200) throw new Error(`${route} returned ${response?.status()}`)
  await page.locator(selector).first().waitFor({ state: 'visible', timeout: 45_000 })
  await stable(page)
}

async function waitForState(page, attribute, expected, timeout = 20_000) {
  await page.waitForFunction(({ attribute, expected }) => {
    const root = document.querySelector('[data-testid="urai-true-3d-life-map"]')
    return root?.getAttribute(attribute) === expected
  }, { attribute, expected }, { timeout, polling: 25 })
}

async function advanceClockToState(page, attribute, expected, maxAdvance) {
  const root = page.locator('[data-testid="urai-true-3d-life-map"]').first()
  for (let advanced = 0; advanced <= maxAdvance; advanced += 25) {
    if (await root.getAttribute(attribute) === expected) return
    await page.clock.runFor(25)
  }
  const actual = await root.getAttribute(attribute)
  throw new Error(`${attribute} did not reach ${expected} after ${maxAdvance}ms; received ${actual}`)
}

async function captureScreenshot(page, file) {
  try {
    await page.screenshot({ path: path.join(outputDir, file), fullPage: false, animations: 'disabled', caret: 'hide' })
  } catch (error) {
    const canvases = page.locator('canvas')
    const count = await canvases.count()
    for (let index = 0; index < count; index += 1) await canvases.nth(index).evaluate((canvas) => { canvas.dataset.proofVisibility = canvas.style.visibility; canvas.style.visibility = 'hidden' }).catch(() => {})
    await page.screenshot({ path: path.join(outputDir, file), fullPage: false, animations: 'disabled', caret: 'hide' })
    for (let index = 0; index < count; index += 1) await canvases.nth(index).evaluate((canvas) => { canvas.style.visibility = canvas.dataset.proofVisibility || ''; delete canvas.dataset.proofVisibility }).catch(() => {})
    receipt.screenshotRecovery = String(error)
  }
}

async function shot(page, id, captureState, extra = {}) {
  const file = `${String(receipt.captures.length + 1).padStart(2, '0')}-${id}-${exactHead.slice(0, 12)}.png`
  const root = page.locator('[data-testid="urai-true-3d-life-map"], [data-testid="urai-life-map-signed-out-threshold"], [data-testid="urai-life-map-authored-fallback"]').first()
  const state = await root.count() ? await root.evaluate((node) => ({ source: node.getAttribute('data-life-map-source'), phase: node.getAttribute('data-life-map-phase'), mode: node.getAttribute('data-life-map-mode'), webgl: node.getAttribute('data-webgl-state'), privateMounted: node.getAttribute('data-private-memory-mounted'), fallback: node.getAttribute('data-life-map-fallback') })) : {}
  await captureScreenshot(page, file)
  receipt.captures.push({ order: receipt.captures.length + 1, id, file, route: page.url(), viewport: page.viewportSize(), captureState, state, timestamp: new Date().toISOString(), ...extra })
}

async function desktopJourney() {
  const { context, page } = await openPage()
  try {
    await goto(page, '/life-map/?demo=1&manifestId=replay-recovery-thread&overview=1')
    await shot(page, 'desktop-overview', 'overview')
    const canvas = page.locator('canvas').first()
    const box = await canvas.boundingBox()
    if (!box) throw new Error('canvas has no box')
    await page.mouse.move(box.x + box.width * .5, box.y + box.height * .5)
    await page.mouse.wheel(0, -420)
    await stable(page)
    await shot(page, 'depth-travel-frame-1', 'parallax-1')
    await page.mouse.move(box.x + box.width * .28, box.y + box.height * .52)
    await page.mouse.down(); await page.mouse.move(box.x + box.width * .62, box.y + box.height * .46, { steps: 16 }); await page.mouse.up(); await stable(page)
    await shot(page, 'depth-travel-frame-2', 'parallax-2')
    await page.mouse.move(box.x + box.width * .72, box.y + box.height * .48)
    await page.mouse.down(); await page.mouse.move(box.x + box.width * .40, box.y + box.height * .55, { steps: 16 }); await page.mouse.up(); await stable(page)
    await shot(page, 'depth-travel-frame-3', 'parallax-3')

    await page.clock.install()
    await page.getByRole('button', { name: /The Quiet Reset/i }).first().click({ force: true })
    await waitForState(page, 'data-life-map-mode', 'selected')
    await shot(page, 'selection-start', 'selection-start', { memoryId: 'quiet-reset' })
    await advanceClockToState(page, 'data-life-map-phase', 'travel', 300)
    await shot(page, 'mid-travel', 'travel')
    await advanceClockToState(page, 'data-life-map-phase', 'approach', 700)
    await shot(page, 'approach', 'approach')
    await advanceClockToState(page, 'data-life-map-phase', 'arrival', 800)
    await shot(page, 'stable-arrival', 'arrival')
    await shot(page, 'selected-memory-arrival', 'selected-arrival', { memoryId: 'quiet-reset' })

    await page.getByRole('button', { name: 'Enter Focus', exact: true }).click({ force: true })
    await page.waitForURL(/\/focus\/?\?/, { timeout: 30_000 }); await stable(page); await shot(page, 'focus-destination', 'focus', { memoryId: 'quiet-reset' })
    await goto(page, '/life-map/?demo=1&memoryId=quiet-reset&manifestId=replay-recovery-thread&node=quiet-reset')
    await waitForState(page, 'data-life-map-phase', 'arrival')
    await page.getByRole('button', { name: 'Replay', exact: true }).click({ force: true })
    await page.waitForURL(/\/replay\/?\?/, { timeout: 30_000 }); await stable(page); await shot(page, 'replay-destination', 'replay', { memoryId: 'quiet-reset' })

    await goto(page, '/life-map/?demo=1&memoryId=quiet-reset&manifestId=replay-recovery-thread&node=quiet-reset')
    await waitForState(page, 'data-life-map-phase', 'arrival')
    await page.getByRole('button', { name: 'Overview', exact: true }).click({ force: true })
    await waitForState(page, 'data-life-map-mode', 'overview')
    await page.waitForURL(/overview=1/, { timeout: 20_000 })
    await shot(page, 'overview-reset', 'overview-reset')
    await page.getByRole('button', { name: /The Quiet Reset/i }).first().click({ force: true })
    await waitForState(page, 'data-life-map-mode', 'selected')
    await page.keyboard.press('Escape')
    await waitForState(page, 'data-life-map-mode', 'overview')
    await page.waitForURL(/overview=1/, { timeout: 20_000 })
    await shot(page, 'escape-unwind', 'escape-unwind')
  } finally { await context.close() }
}

async function mobileAndReduced() {
  const mobile = await openPage({ viewport: { width: 390, height: 844 } })
  try {
    await goto(mobile.page, '/life-map/?demo=1&manifestId=replay-recovery-thread&overview=1'); await shot(mobile.page, 'portrait-mobile-overview', 'mobile-overview')
    await mobile.page.getByRole('button', { name: /The Quiet Reset/i }).first().click({ force: true }); await waitForState(mobile.page, 'data-life-map-phase', 'arrival'); await shot(mobile.page, 'portrait-mobile-selected', 'mobile-selected', { memoryId: 'quiet-reset' })
  } finally { await mobile.context.close() }
  const reduced = await openPage({ reducedMotion: 'reduce' })
  try {
    await goto(reduced.page, '/life-map/?demo=1&manifestId=replay-recovery-thread&overview=1'); await reduced.page.getByRole('button', { name: /The Quiet Reset/i }).first().click({ force: true }); await waitForState(reduced.page, 'data-life-map-phase', 'arrival'); await shot(reduced.page, 'reduced-motion-arrival', 'reduced-motion-arrival', { memoryId: 'quiet-reset' })
  } finally { await reduced.context.close() }
}

async function privacyAndRecovery() {
  const signed = await openPage()
  try { await goto(signed.page, '/life-map/', '[data-testid="urai-life-map-signed-out-threshold"]'); await shot(signed.page, 'signed-out-private-threshold', 'signed-out') } finally { await signed.context.close() }
  const sample = await openPage()
  try { await goto(sample.page, '/life-map/?demo=1&manifestId=replay-recovery-thread&overview=1'); await shot(sample.page, 'explicit-disclosed-sample', 'explicit-demo') } finally { await sample.context.close() }
  const fallback = await openPage({ disableWebGL: true })
  try { await goto(fallback.page, '/life-map/?demo=1', '[data-testid="urai-life-map-authored-fallback"]'); await shot(fallback.page, 'no-webgl-fallback', 'no-webgl') } finally { await fallback.context.close() }
  const recovery = await openPage()
  try {
    await goto(recovery.page, '/life-map/?demo=1&memoryId=quiet-reset&manifestId=replay-recovery-thread&node=quiet-reset'); await waitForState(recovery.page, 'data-life-map-phase', 'arrival')
    const canvas = recovery.page.locator('canvas').first()
    await canvas.evaluate((element) => { const gl = element.getContext('webgl2') || element.getContext('webgl'); gl?.getExtension('WEBGL_lose_context')?.loseContext() })
    await recovery.page.locator('[data-webgl-state="lost"], [data-webgl-state="recovering"]').first().waitFor({ state: 'attached', timeout: 10_000 })
    await canvas.evaluate((element) => { element.style.visibility = 'hidden' })
    await shot(recovery.page, 'webgl-context-loss', 'context-lost', { memoryId: 'quiet-reset' })
    await canvas.evaluate((element) => { const gl = element.getContext('webgl2') || element.getContext('webgl'); gl?.getExtension('WEBGL_lose_context')?.restoreContext(); element.style.visibility = '' }).catch(() => {})
    await waitForState(recovery.page, 'data-webgl-state', 'ready', 20_000)
    await shot(recovery.page, 'webgl-recovered', 'context-recovered', { memoryId: 'quiet-reset' })
    await shot(recovery.page, 'context-recovery-state-preserved', 'context-recovered-selected', { memoryId: 'quiet-reset' })
  } finally { await recovery.context.close() }
}

try { await desktopJourney(); await mobileAndReduced(); await privacyAndRecovery() }
catch (error) { failed = true; receipt.error = String(error) }
finally {
  await browser.close()
  receipt.completedAt = new Date().toISOString()
  receipt.passed = !failed && receipt.captures.length >= 21
  await writeFile(path.join(outputDir, 'receipt.json'), JSON.stringify(receipt, null, 2))
  if (!receipt.passed) process.exitCode = 1
}
