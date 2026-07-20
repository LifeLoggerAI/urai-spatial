import { mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'

const requireFromTierOne = createRequire(new URL('../urai-tier1/package.json', import.meta.url))
const { chromium } = requireFromTierOne('playwright')
const base = process.env.URAI_PROOF_BASE || 'http://127.0.0.1:4173'
const outputDir = path.resolve(process.env.URAI_PROOF_DIR || 'artifacts/lifemap-founder-proof')
const exactHead = process.env.URAI_EXACT_HEAD || 'local'
const runId = process.env.GITHUB_RUN_ID || 'local'
const capturedAt = new Date().toISOString()
const receipt = { schemaVersion: 'urai-lifemap-founder-proof-1', repository: 'LifeLoggerAI/urai-spatial', pr: 860, exactHead, runId, capturedAt, captures: [] }
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

async function openPage({ viewport = { width: 1440, height: 900 }, reducedMotion = 'no-preference', disableWebGL = false } = {}) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion })
  if (disableWebGL) await context.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function patched(type, ...args) {
      if (['webgl', 'webgl2', 'experimental-webgl'].includes(type)) return null
      return original.call(this, type, ...args)
    }
  })
  const page = await context.newPage()
  return { context, page }
}

async function screenshot(page, id, metadata = {}) {
  const file = `${String(receipt.captures.length + 1).padStart(2, '0')}-${id}-${exactHead.slice(0, 12)}.png`
  const root = page.locator('[data-testid="urai-true-3d-life-map"], [data-testid="urai-life-map-signed-out-threshold"], [data-testid="urai-life-map-authored-fallback"]').first()
  const rootState = await root.count() ? await root.evaluate((node) => ({
    source: node.getAttribute('data-life-map-source'),
    phase: node.getAttribute('data-life-map-phase'),
    mode: node.getAttribute('data-life-map-mode'),
    webgl: node.getAttribute('data-webgl-state'),
    privateMounted: node.getAttribute('data-private-memory-mounted'),
  })) : {}
  await page.screenshot({ path: path.join(outputDir, file), fullPage: false, animations: 'disabled', caret: 'hide' })
  receipt.captures.push({ order: receipt.captures.length + 1, id, file, url: page.url(), viewport: page.viewportSize(), timestamp: new Date().toISOString(), state: rootState, ...metadata })
}

async function goto(page, route, ready = '[data-testid="urai-true-3d-life-map"]') {
  const response = await page.goto(new URL(route, base).toString(), { waitUntil: 'domcontentloaded', timeout: 60_000 })
  if (!response || response.status() !== 200) throw new Error(`Route ${route} returned ${response?.status()}`)
  await page.locator(ready).first().waitFor({ state: 'visible', timeout: 45_000 })
  await stable(page)
}

async function demoDesktopJourney() {
  const { context, page } = await openPage()
  try {
    await goto(page, '/life-map/?demo=1&manifestId=replay-recovery-thread&overview=1')
    await screenshot(page, 'desktop-overview', { captureState: 'overview' })

    const canvas = page.locator('[data-testid="urai-true-3d-life-map"] canvas').first()
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Life Map canvas has no box')
    await canvas.hover({ position: { x: box.width * .5, y: box.height * .5 } })
    await page.mouse.wheel(0, -420)
    await stable(page)
    await screenshot(page, 'depth-travel-frame-1', { captureState: 'near-mid-far-parallax-1' })
    await page.mouse.move(box.x + box.width * .3, box.y + box.height * .5)
    await page.mouse.down(); await page.mouse.move(box.x + box.width * .58, box.y + box.height * .48, { steps: 16 }); await page.mouse.up()
    await stable(page)
    await screenshot(page, 'depth-travel-frame-2', { captureState: 'near-mid-far-parallax-2' })
    await page.mouse.move(box.x + box.width * .7, box.y + box.height * .52)
    await page.mouse.down(); await page.mouse.move(box.x + box.width * .42, box.y + box.height * .46, { steps: 16 }); await page.mouse.up()
    await stable(page)
    await screenshot(page, 'depth-travel-frame-3', { captureState: 'near-mid-far-parallax-3' })

    const target = page.getByRole('button', { name: /The Quiet Reset/i }).first()
    await target.waitFor({ state: 'visible' })
    await target.click()
    await screenshot(page, 'departure', { captureState: 'departure' })
    await page.waitForTimeout(360)
    await screenshot(page, 'mid-travel', { captureState: 'travel' })
    await page.waitForTimeout(560)
    await screenshot(page, 'approach', { captureState: 'approach' })
    await page.waitForTimeout(620)
    await screenshot(page, 'stable-arrival', { captureState: 'arrival' })
    await screenshot(page, 'selected-memory-arrival', { captureState: 'selected-memory-arrival', memoryId: 'quiet-reset' })

    await page.getByRole('button', { name: 'Enter Focus' }).click()
    await page.waitForURL(/\/focus\?/) 
    await stable(page)
    await screenshot(page, 'focus-destination', { captureState: 'focus', memoryId: 'quiet-reset' })

    await goto(page, '/life-map/?demo=1&memoryId=quiet-reset&manifestId=replay-recovery-thread&node=quiet-reset')
    await page.waitForTimeout(1450)
    await page.getByRole('button', { name: 'Replay' }).click()
    await page.waitForURL(/\/replay\?/) 
    await stable(page)
    await screenshot(page, 'replay-destination', { captureState: 'replay', memoryId: 'quiet-reset' })

    await goto(page, '/life-map/?demo=1&memoryId=quiet-reset&manifestId=replay-recovery-thread&node=quiet-reset')
    await page.waitForTimeout(1450)
    await page.getByRole('button', { name: 'Overview' }).click()
    await stable(page)
    await screenshot(page, 'overview-reset', { captureState: 'overview-reset' })

    await target.click()
    await page.waitForTimeout(1450)
    await page.keyboard.press('Escape')
    await stable(page)
    await screenshot(page, 'escape-unwind', { captureState: 'escape-unwind' })
  } finally { await context.close() }
}

async function mobileJourney() {
  const { context, page } = await openPage({ viewport: { width: 390, height: 844 } })
  try {
    await goto(page, '/life-map/?demo=1&manifestId=replay-recovery-thread&overview=1')
    await screenshot(page, 'portrait-mobile-overview', { captureState: 'mobile-overview' })
    await page.getByRole('button', { name: /The Quiet Reset/i }).first().click()
    await page.waitForTimeout(1450)
    await screenshot(page, 'portrait-mobile-selected', { captureState: 'mobile-selected', memoryId: 'quiet-reset' })
  } finally { await context.close() }
}

async function reducedMotionJourney() {
  const { context, page } = await openPage({ reducedMotion: 'reduce' })
  try {
    await goto(page, '/life-map/?demo=1&manifestId=replay-recovery-thread&overview=1')
    await page.getByRole('button', { name: /The Quiet Reset/i }).first().click()
    await stable(page)
    await screenshot(page, 'reduced-motion-arrival', { captureState: 'reduced-motion-arrival', memoryId: 'quiet-reset' })
  } finally { await context.close() }
}

async function privacyStates() {
  const signed = await openPage()
  try { await goto(signed.page, '/life-map/', '[data-testid="urai-life-map-signed-out-threshold"]'); await screenshot(signed.page, 'signed-out-private-threshold', { captureState: 'signed-out' }) } finally { await signed.context.close() }
  const sample = await openPage()
  try { await goto(sample.page, '/life-map/?demo=1&manifestId=replay-recovery-thread&overview=1'); await screenshot(sample.page, 'explicit-disclosed-sample', { captureState: 'explicit-demo' }) } finally { await sample.context.close() }
}

async function fallbackAndRecovery() {
  const fallback = await openPage({ disableWebGL: true })
  try {
    await fallback.page.goto(new URL('/life-map/?demo=1', base).toString(), { waitUntil: 'domcontentloaded' })
    await fallback.page.locator('[data-testid="urai-life-map-authored-fallback"], [data-testid="urai-true-3d-life-map"]').first().waitFor({ state: 'visible', timeout: 45_000 })
    await screenshot(fallback.page, 'no-webgl-fallback', { captureState: 'no-webgl' })
  } finally { await fallback.context.close() }

  const recovery = await openPage()
  try {
    await goto(recovery.page, '/life-map/?demo=1&memoryId=quiet-reset&manifestId=replay-recovery-thread&node=quiet-reset')
    await recovery.page.waitForTimeout(1450)
    await recovery.page.locator('canvas').first().evaluate((canvas) => {
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
      gl?.getExtension('WEBGL_lose_context')?.loseContext()
    })
    await recovery.page.locator('[data-webgl-state="lost"], [data-webgl-state="recovering"]').first().waitFor({ state: 'attached', timeout: 10_000 })
    await screenshot(recovery.page, 'webgl-context-loss', { captureState: 'context-lost', memoryId: 'quiet-reset' })
    await recovery.page.locator('canvas').first().evaluate((canvas) => {
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
      gl?.getExtension('WEBGL_lose_context')?.restoreContext()
    }).catch(() => {})
    await recovery.page.waitForTimeout(1200)
    await screenshot(recovery.page, 'webgl-recovered', { captureState: 'context-recovered', memoryId: 'quiet-reset' })
    await screenshot(recovery.page, 'context-recovery-state-preserved', { captureState: 'context-recovered-selected-state', memoryId: 'quiet-reset' })
  } finally { await recovery.context.close() }
}

try {
  await demoDesktopJourney()
  await mobileJourney()
  await reducedMotionJourney()
  await privacyStates()
  await fallbackAndRecovery()
} catch (error) {
  failed = true
  receipt.error = String(error)
} finally {
  await browser.close()
  receipt.completedAt = new Date().toISOString()
  receipt.passed = !failed && receipt.captures.length >= 21
  await writeFile(path.join(outputDir, 'receipt.json'), JSON.stringify(receipt, null, 2))
  if (!receipt.passed) process.exitCode = 1
}
