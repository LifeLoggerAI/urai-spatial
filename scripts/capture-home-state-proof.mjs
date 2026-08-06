import { mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'

const requireFromTierOne = createRequire(new URL('../urai-tier1/package.json', import.meta.url))
const { chromium } = requireFromTierOne('playwright')
const base = process.env.URAI_PROOF_BASE || 'http://127.0.0.1:4173'
const exactHead = process.env.URAI_EXACT_HEAD || 'local'
const outputDir = path.resolve(process.env.URAI_PROOF_DIR || 'artifacts/home-state-proof')
const ownerSelector = '.urai-asset-home-world[data-home-primary-owner="asset-driven"]'
const states = [
  { id: 'permission-limited', query: 'homeState=permission-limited' },
  { id: 'unavailable', query: 'homeState=unavailable' },
  { id: 'offline', query: 'homeState=offline' },
]

await mkdir(outputDir, { recursive: true })
const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] })
const receipt = {
  schemaVersion: 'urai-home-state-proof-2',
  exactHead,
  capturedAt: new Date().toISOString(),
  runtimeContract: 'live-owner-stability-accessibility-and-frame-evidence',
  visualGate: {
    minimumViewportCoverage: 0.82,
    minimumLuminanceRange: 12,
    minimumVisibleSamples: 3,
  },
  captures: [],
  errors: [],
}

async function settleAnimationFrames(page, frameCount) {
  await page.evaluate((frames) => new Promise((resolve) => {
    let completed = 0
    const advance = () => {
      completed += 1
      if (completed >= frames) resolve()
      else window.requestAnimationFrame(advance)
    }
    window.requestAnimationFrame(advance)
  }), frameCount)
}

async function readVisualEvidence(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('.urai-asset-home-world canvas')
    if (!(canvas instanceof HTMLCanvasElement)) return { available: false, reason: 'missing-canvas' }
    const bounds = canvas.getBoundingClientRect()
    const viewportArea = Math.max(1, window.innerWidth * window.innerHeight)
    const visibleWidth = Math.max(0, Math.min(bounds.right, window.innerWidth) - Math.max(bounds.left, 0))
    const visibleHeight = Math.max(0, Math.min(bounds.bottom, window.innerHeight) - Math.max(bounds.top, 0))
    const viewportCoverage = visibleWidth * visibleHeight / viewportArea
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
    if (!gl) return { available: false, reason: 'missing-webgl-context', viewportCoverage, bounds: { width: bounds.width, height: bounds.height } }
    const width = gl.drawingBufferWidth
    const height = gl.drawingBufferHeight
    const points = [
      [0.18, 0.2], [0.5, 0.2], [0.82, 0.2],
      [0.18, 0.5], [0.5, 0.5], [0.82, 0.5],
      [0.18, 0.8], [0.5, 0.8], [0.82, 0.8],
    ]
    const pixel = new Uint8Array(4)
    const luminance = []
    for (const [xRatio, yRatio] of points) {
      gl.readPixels(
        Math.min(width - 1, Math.max(0, Math.floor(width * xRatio))),
        Math.min(height - 1, Math.max(0, Math.floor(height * yRatio))),
        1,
        1,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        pixel,
      )
      luminance.push(Math.round(pixel[0] * 0.2126 + pixel[1] * 0.7152 + pixel[2] * 0.0722))
    }
    const minimum = Math.min(...luminance)
    const maximum = Math.max(...luminance)
    return {
      available: true,
      viewportCoverage,
      bounds: { width: bounds.width, height: bounds.height },
      drawingBuffer: { width, height },
      luminance,
      luminanceRange: maximum - minimum,
      visibleSamples: luminance.filter((value) => value >= 8).length,
    }
  })
}

async function capture(state, options = {}) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: options.reducedMotion,
    forcedColors: options.forcedColors,
  })
  const page = await context.newPage()
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(String(error)))
  const query = `homeAssetReview=1&${state.query}`
  const record = { id: state.id, query, pageErrors, passed: false }
  try {
    const response = await page.goto(`${base}/home/?${query}`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    const owner = page.locator(ownerSelector)
    await owner.waitFor({ state: 'visible', timeout: 45_000 })
    await page.waitForFunction(
      (selector) => document.querySelector(selector)?.getAttribute('data-home-assets-ready') === 'true',
      ownerSelector,
      { timeout: 45_000 },
    )
    await settleAnimationFrames(page, options.forcedColors === 'active' ? 24 : 90)

    record.status = response?.status()
    record.canvasReady = await owner.getAttribute('data-home-assets-ready')
    record.primaryOwner = await owner.getAttribute('data-home-primary-owner')
    record.visibleWorld = await owner.getAttribute('data-home-visible-world')
    record.movement = await owner.getAttribute('data-home-movement')
    record.pointerLock = await page.evaluate(() => document.pointerLockElement === null)
    record.accessibleRuntimeText = (await owner.textContent()) || ''
    record.semanticControls = await page.locator('.home-semantic-navigation button').evaluateAll((buttons) => buttons.map((button) => ({
      label: button.getAttribute('aria-label'),
      text: button.textContent,
    })))
    record.accessibilityPassed = record.semanticControls.length >= 3
      && record.semanticControls.some((control) => control.label === 'Open URAI Orb companion')
      && record.semanticControls.some((control) => control.label === 'Open Ground directly')
      && record.semanticControls.some((control) => control.label === 'Open Life Map directly' || control.label === 'Ascend to Life Map')

    const visualRequired = options.forcedColors !== 'active'
    record.visualRequired = visualRequired
    record.visual = visualRequired ? await readVisualEvidence(page) : { available: false, reason: 'forced-colors-accessibility-path' }
    record.visualPassed = !visualRequired || (
      record.visual.available === true
      && record.visual.viewportCoverage >= receipt.visualGate.minimumViewportCoverage
      && record.visual.luminanceRange >= receipt.visualGate.minimumLuminanceRange
      && record.visual.visibleSamples >= receipt.visualGate.minimumVisibleSamples
    )

    record.screenshot = `${state.id}-${exactHead.slice(0, 12)}.png`
    const screenshot = await page.screenshot({
      path: path.join(outputDir, record.screenshot),
      fullPage: false,
      timeout: 90_000,
    })
    record.screenshotBytes = screenshot.length

    record.passed = record.status === 200
      && record.canvasReady === 'true'
      && record.primaryOwner === 'asset-driven'
      && record.visibleWorld === 'final-physical-sanctuary-memory-rooms'
      && record.movement === 'walk-keyboard-click-touch'
      && record.pointerLock
      && record.accessibilityPassed
      && record.visualPassed
      && record.screenshotBytes > 12_000
      && pageErrors.length === 0
  } catch (error) {
    record.error = String(error)
  } finally {
    receipt.captures.push(record)
    if (!record.passed) receipt.errors.push(record)
    await context.close()
  }
}

for (const state of states) await capture(state)
await capture({ id: 'reduced-motion', query: 'homePrivateFixture=1' }, { reducedMotion: 'reduce' })
await capture({ id: 'forced-colors', query: 'homePrivateFixture=1' }, { forcedColors: 'active' })

const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await context.newPage()
const pageErrors = []
page.on('pageerror', (error) => pageErrors.push(String(error)))
const transition = { id: 'home-real-offline-transition', pageErrors, passed: false }
try {
  const response = await page.goto(`${base}/home/?homeAssetReview=1`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  const owner = page.locator(ownerSelector)
  await owner.waitFor({ state: 'visible', timeout: 45_000 })
  await page.waitForFunction(
    (selector) => document.querySelector(selector)?.getAttribute('data-home-assets-ready') === 'true',
    ownerSelector,
    { timeout: 45_000 },
  )
  await context.setOffline(true)
  await page.evaluate(() => window.dispatchEvent(new Event('offline')))
  await settleAnimationFrames(page, 30)
  transition.status = response?.status()
  transition.canvasReady = await owner.getAttribute('data-home-assets-ready')
  transition.primaryOwner = await owner.getAttribute('data-home-primary-owner')
  transition.visibleWorld = await owner.getAttribute('data-home-visible-world')
  transition.pointerLock = await page.evaluate(() => document.pointerLockElement === null)
  transition.passed = transition.status === 200
    && transition.canvasReady === 'true'
    && transition.primaryOwner === 'asset-driven'
    && transition.visibleWorld === 'final-physical-sanctuary-memory-rooms'
    && transition.pointerLock
    && pageErrors.length === 0
} catch (error) {
  transition.error = String(error)
} finally {
  await context.setOffline(false).catch(() => {})
  await context.close()
  receipt.captures.push(transition)
  if (!transition.passed) receipt.errors.push(transition)
}

await browser.close()
await writeFile(path.join(outputDir, 'receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`)
if (receipt.errors.length) process.exit(1)
