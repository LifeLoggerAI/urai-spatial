import { createHash } from 'node:crypto'
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
const receipt = {
  schemaVersion: 'urai-home-state-proof-3',
  exactHead,
  capturedAt: new Date().toISOString(),
  runtimeContract: 'live-owner-stability-accessibility-and-retained-canvas-evidence',
  visualGate: {
    source: 'retained-canvas-png',
    sampling: 'distributed-3x3-neighborhood',
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
  const canvas = page.locator('.urai-asset-home-world canvas').first()
  await canvas.waitFor({ state: 'visible', timeout: 45_000 })
  const bounds = await canvas.boundingBox()
  const viewport = page.viewportSize()
  if (!bounds || !viewport) return { available: false, reason: 'missing-canvas-bounds' }
  const clipX = Math.max(0, bounds.x)
  const clipY = Math.max(0, bounds.y)
  const visibleWidth = Math.max(0, Math.min(bounds.x + bounds.width, viewport.width) - clipX)
  const visibleHeight = Math.max(0, Math.min(bounds.y + bounds.height, viewport.height) - clipY)
  const viewportCoverage = visibleWidth * visibleHeight / Math.max(1, viewport.width * viewport.height)
  if (visibleWidth < 1 || visibleHeight < 1) return { available: false, reason: 'canvas-outside-viewport', viewportCoverage }
  const png = await page.screenshot({
    animations: 'disabled',
    caret: 'hide',
    timeout: 90_000,
    clip: { x: clipX, y: clipY, width: visibleWidth, height: visibleHeight },
  })
  const dataUrl = `data:image/png;base64,${png.toString('base64')}`
  const sample = await page.evaluate(async ({ dataUrl }) => {
    const image = new Image()
    const loaded = new Promise((resolve, reject) => {
      image.onload = resolve
      image.onerror = () => reject(new Error('retained canvas PNG could not be decoded'))
    })
    image.src = dataUrl
    await loaded
    const surface = document.createElement('canvas')
    surface.width = Math.max(1, image.naturalWidth)
    surface.height = Math.max(1, image.naturalHeight)
    const context = surface.getContext('2d', { willReadFrequently: true })
    if (!context) return { available: false, reason: 'missing-2d-sampler' }
    context.drawImage(image, 0, 0)
    const points = [
      [0.18, 0.2], [0.5, 0.2], [0.82, 0.2],
      [0.18, 0.5], [0.5, 0.5], [0.82, 0.5],
      [0.18, 0.8], [0.5, 0.8], [0.82, 0.8],
    ]
    const luminance = points.map(([xRatio, yRatio]) => {
      const x = Math.max(0, Math.min(surface.width - 3, Math.round(surface.width * xRatio) - 1))
      const y = Math.max(0, Math.min(surface.height - 3, Math.round(surface.height * yRatio) - 1))
      const pixels = context.getImageData(x, y, Math.min(3, surface.width), Math.min(3, surface.height)).data
      let total = 0
      let count = 0
      for (let index = 0; index < pixels.length; index += 4) {
        total += pixels[index] * 0.2126 + pixels[index + 1] * 0.7152 + pixels[index + 2] * 0.0722
        count += 1
      }
      return Math.round(total / Math.max(1, count))
    })
    return {
      available: true,
      pngWidth: surface.width,
      pngHeight: surface.height,
      luminance,
      luminanceRange: Math.max(...luminance) - Math.min(...luminance),
      visibleSamples: luminance.filter((value) => value >= 8).length,
    }
  }, { dataUrl })
  return { ...sample, viewportCoverage, bounds: { width: bounds.width, height: bounds.height }, canvasPngBytes: png.length }
}

async function waitForVisualEvidence(page, frameBudget = 240) {
  let evidence = null
  for (let elapsed = 0; elapsed < frameBudget; elapsed += 30) {
    await settleAnimationFrames(page, 30)
    evidence = await readVisualEvidence(page)
    if (evidence.available === true
      && evidence.viewportCoverage >= receipt.visualGate.minimumViewportCoverage
      && evidence.luminanceRange >= receipt.visualGate.minimumLuminanceRange
      && evidence.visibleSamples >= receipt.visualGate.minimumVisibleSamples) return evidence
  }
  return evidence
}

async function capture(state, options = {}) {
  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] })
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
    await settleAnimationFrames(page, options.forcedColors === 'active' ? 24 : 60)

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
    record.visual = visualRequired ? await waitForVisualEvidence(page) : { available: false, reason: 'forced-colors-accessibility-path' }
    record.visualPassed = !visualRequired || (
      record.visual?.available === true
      && record.visual.viewportCoverage >= receipt.visualGate.minimumViewportCoverage
      && record.visual.luminanceRange >= receipt.visualGate.minimumLuminanceRange
      && record.visual.visibleSamples >= receipt.visualGate.minimumVisibleSamples
    )

    record.screenshot = `${state.id}-${exactHead.slice(0, 12)}.png`
    const screenshot = await page.screenshot({ path: path.join(outputDir, record.screenshot), fullPage: false, animations: 'disabled', caret: 'hide', timeout: 90_000 })
    record.screenshotBytes = screenshot.length
    record.screenshotSha256 = createHash('sha256').update(screenshot).digest('hex')

    record.passed = record.status === 200
      && record.canvasReady === 'true'
      && record.primaryOwner === 'asset-driven'
      && record.visibleWorld === 'authored-coherent-three-dimensional-sanctuary'
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
    await context.close().catch(() => {})
    await browser.close().catch(() => {})
  }
}

for (const state of states) await capture(state)
await capture({ id: 'reduced-motion', query: 'homePrivateFixture=1' }, { reducedMotion: 'reduce' })
await capture({ id: 'forced-colors', query: 'homePrivateFixture=1' }, { forcedColors: 'active' })

const transitionBrowser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] })
const transitionContext = await transitionBrowser.newContext({ viewport: { width: 1440, height: 900 } })
const transitionPage = await transitionContext.newPage()
const transitionErrors = []
transitionPage.on('pageerror', (error) => transitionErrors.push(String(error)))
const transition = { id: 'home-real-offline-transition', pageErrors: transitionErrors, passed: false }
try {
  const response = await transitionPage.goto(`${base}/home/?homeAssetReview=1`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  const owner = transitionPage.locator(ownerSelector)
  await owner.waitFor({ state: 'visible', timeout: 45_000 })
  await transitionPage.waitForFunction(
    (selector) => document.querySelector(selector)?.getAttribute('data-home-assets-ready') === 'true',
    ownerSelector,
    { timeout: 45_000 },
  )
  await transitionContext.setOffline(true)
  await transitionPage.evaluate(() => window.dispatchEvent(new Event('offline')))
  await settleAnimationFrames(transitionPage, 30)
  transition.status = response?.status()
  transition.canvasReady = await owner.getAttribute('data-home-assets-ready')
  transition.primaryOwner = await owner.getAttribute('data-home-primary-owner')
  transition.visibleWorld = await owner.getAttribute('data-home-visible-world')
  transition.pointerLock = await transitionPage.evaluate(() => document.pointerLockElement === null)
  transition.passed = transition.status === 200
    && transition.canvasReady === 'true'
    && transition.primaryOwner === 'asset-driven'
    && transition.visibleWorld === 'authored-coherent-three-dimensional-sanctuary'
    && transition.pointerLock
    && transitionErrors.length === 0
} catch (error) {
  transition.error = String(error)
} finally {
  await transitionContext.setOffline(false).catch(() => {})
  await transitionContext.close().catch(() => {})
  await transitionBrowser.close().catch(() => {})
  receipt.captures.push(transition)
  if (!transition.passed) receipt.errors.push(transition)
}

await writeFile(path.join(outputDir, 'receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`)
if (receipt.errors.length) process.exit(1)