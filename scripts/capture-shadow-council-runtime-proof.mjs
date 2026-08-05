import { mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'

const requireFromTierOne = createRequire(new URL('../urai-tier1/package.json', import.meta.url))
const { chromium } = requireFromTierOne('playwright')

const base = process.env.URAI_PROOF_BASE || 'http://127.0.0.1:4173'
const outputDir = path.resolve(process.env.URAI_PROOF_DIR || 'artifacts/shadow-council-runtime-proof')
const exactHead = process.env.URAI_EXACT_HEAD || 'local'

const routes = [
  { id: 'shadow', path: '/shadow/', title: 'Shadow Realm' },
  { id: 'council', path: '/council/', title: 'Council Chamber' },
]

const viewports = [
  { id: 'desktop', width: 1440, height: 900, isMobile: false, hasTouch: false },
  { id: 'mobile', width: 390, height: 844, isMobile: true, hasTouch: true },
]

await mkdir(outputDir, { recursive: true })

const receipt = {
  schemaVersion: 'urai-shadow-council-runtime-proof-1',
  exactHead,
  capturedAt: new Date().toISOString(),
  base,
  captures: [],
  errors: [],
}

function attachDiagnostics(page, label) {
  const consoleErrors = []
  const pageErrors = []
  const failedRequests = []
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', (error) => pageErrors.push(String(error)))
  page.on('requestfailed', (request) => failedRequests.push({ url: request.url(), failure: request.failure()?.errorText || 'unknown' }))
  return () => ({ label, consoleErrors, pageErrors, failedRequests })
}

async function visibleCount(locator) {
  return locator.evaluateAll((nodes) => nodes.filter((node) => {
    const style = getComputedStyle(node)
    const rect = node.getBoundingClientRect()
    return style.display !== 'none'
      && style.visibility !== 'hidden'
      && Number.parseFloat(style.opacity || '1') > 0.02
      && rect.width > 4
      && rect.height > 4
  }).length)
}

async function captureRuntime(browser, route, viewport, mode = 'standard') {
  const reducedMotion = mode === 'reduced-motion' ? 'reduce' : 'no-preference'
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    isMobile: viewport.isMobile,
    hasTouch: viewport.hasTouch,
    reducedMotion,
  })
  const page = await context.newPage()
  const id = `${route.id}-${viewport.id}-${mode}`
  const diagnostics = attachDiagnostics(page, id)
  const screenshot = `${id}-${exactHead.slice(0, 12)}.png`
  const record = { id, route: route.id, viewport: viewport.id, mode, url: new URL(route.path, base).toString(), screenshot, status: null, verification: {}, diagnostics: null, passed: false }

  try {
    const response = await page.goto(record.url, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    record.status = response?.status() ?? null
    const runtimeSelector = `[data-testid="urai-${route.id}-spatial-realm"]`
    const runtime = page.getByTestId(`urai-${route.id}-spatial-realm`)
    await runtime.waitFor({ state: 'visible', timeout: 45_000 })
    await page.waitForFunction((selector) => document.querySelector(selector)?.getAttribute('data-realm-ready') === 'true', runtimeSelector, { timeout: 45_000 })
    const canvas = runtime.locator('canvas').first()
    await page.waitForFunction((selector) => {
      const canvasNode = document.querySelector(selector)?.querySelector('canvas')
      if (!canvasNode) return false
      const rect = canvasNode.getBoundingClientRect()
      return rect.width >= 240 && rect.height >= 240
    }, runtimeSelector, { timeout: 20_000, polling: 'raf' })
    const box = await canvas.boundingBox()
    const destinations = page.getByRole('navigation', { name: `${route.title} destinations` }).getByRole('button')
    const boundary = page.getByTestId(`urai-${route.id}-runtime-boundary`)
    record.verification = {
      webglState: await boundary.getAttribute('data-webgl-state'),
      reducedMotionAttribute: await boundary.getAttribute('data-reduced-motion'),
      reducedMotionMedia: await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches),
      spatialOwner: await runtime.getAttribute('data-spatial-owner'),
      exploration: await runtime.getAttribute('data-spatial-exploration'),
      realmReady: await runtime.getAttribute('data-realm-ready'),
      titleVisible: await page.getByRole('heading', { name: route.title }).isVisible(),
      canvasVisible: await canvas.isVisible(),
      canvasWidth: box ? Math.round(box.width) : 0,
      canvasHeight: box ? Math.round(box.height) : 0,
      destinationCount: await destinations.count(),
      visibleDestinationCount: await visibleCount(destinations),
    }
    await page.screenshot({ path: path.join(outputDir, screenshot), fullPage: false, animations: 'disabled', caret: 'hide' })
    record.diagnostics = diagnostics()
    const expectedReduced = mode === 'reduced-motion'
    record.passed = record.status === 200
      && record.verification.webglState === 'available'
      && record.verification.reducedMotionAttribute === String(expectedReduced)
      && record.verification.reducedMotionMedia === expectedReduced
      && record.verification.spatialOwner === 'canonical-route-owned-r3f'
      && record.verification.exploration === 'walkable'
      && record.verification.realmReady === 'true'
      && record.verification.titleVisible === true
      && record.verification.canvasVisible === true
      && record.verification.canvasWidth >= 240
      && record.verification.canvasHeight >= 240
      && record.verification.destinationCount === 3
      && record.verification.visibleDestinationCount === 3
      && record.diagnostics.consoleErrors.length === 0
      && record.diagnostics.pageErrors.length === 0
      && record.diagnostics.failedRequests.length === 0
  } catch (error) {
    record.error = String(error)
    record.diagnostics = diagnostics()
    try {
      record.screenshot = `failed-${screenshot}`
      await page.screenshot({ path: path.join(outputDir, record.screenshot), fullPage: false, animations: 'disabled', caret: 'hide' })
    } catch (screenshotError) {
      record.screenshotError = String(screenshotError)
    }
  } finally {
    if (!record.passed) receipt.errors.push(record)
    receipt.captures.push(record)
    await context.close()
  }
}

async function captureNoWebGLFallback(browser, route) {
  const viewport = viewports[0]
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    reducedMotion: 'reduce',
  })
  await context.addInitScript(() => {
    const originalGetContext = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function patchedGetContext(type, ...args) {
      if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') return null
      return originalGetContext.call(this, type, ...args)
    }
  })

  const page = await context.newPage()
  const id = `${route.id}-desktop-no-webgl`
  const diagnostics = attachDiagnostics(page, id)
  const screenshot = `${id}-${exactHead.slice(0, 12)}.png`
  const record = { id, route: route.id, viewport: 'desktop', mode: 'no-webgl', url: new URL(route.path, base).toString(), screenshot, status: null, verification: {}, diagnostics: null, passed: false }

  try {
    const response = await page.goto(record.url, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    record.status = response?.status() ?? null
    const fallback = page.getByTestId(`urai-${route.id}-spatial-fallback`)
    await fallback.waitFor({ state: 'visible', timeout: 45_000 })
    const boundary = page.getByTestId(`urai-${route.id}-runtime-boundary`)
    const destinations = page.getByRole('navigation', { name: `${route.title} fallback destinations` }).getByRole('button')
    record.verification = {
      webglState: await boundary.getAttribute('data-webgl-state'),
      reducedMotionAttribute: await boundary.getAttribute('data-reduced-motion'),
      reducedMotionMedia: await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches),
      spatialOwner: await fallback.getAttribute('data-spatial-owner'),
      titleVisible: await page.getByRole('heading', { name: route.title }).isVisible(),
      canvasCount: await fallback.locator('canvas').count(),
      destinationCount: await destinations.count(),
      visibleDestinationCount: await visibleCount(destinations),
      statusMessageVisible: await fallback.getByRole('status').isVisible(),
    }
    await page.screenshot({ path: path.join(outputDir, screenshot), fullPage: false, animations: 'disabled', caret: 'hide' })
    record.diagnostics = diagnostics()
    record.passed = record.status === 200
      && record.verification.webglState === 'unavailable'
      && record.verification.reducedMotionAttribute === 'true'
      && record.verification.reducedMotionMedia === true
      && record.verification.spatialOwner === 'semantic-no-webgl-fallback'
      && record.verification.titleVisible === true
      && record.verification.canvasCount === 0
      && record.verification.destinationCount === 3
      && record.verification.visibleDestinationCount === 3
      && record.verification.statusMessageVisible === true
      && record.diagnostics.consoleErrors.length === 0
      && record.diagnostics.pageErrors.length === 0
      && record.diagnostics.failedRequests.length === 0
  } catch (error) {
    record.error = String(error)
    record.diagnostics = diagnostics()
    try {
      record.screenshot = `failed-${screenshot}`
      await page.screenshot({ path: path.join(outputDir, record.screenshot), fullPage: false, animations: 'disabled', caret: 'hide' })
    } catch (screenshotError) {
      record.screenshotError = String(screenshotError)
    }
  } finally {
    if (!record.passed) receipt.errors.push(record)
    receipt.captures.push(record)
    await context.close()
  }
}

let browser
try {
  browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
  })
  for (const route of routes) {
    for (const viewport of viewports) await captureRuntime(browser, route, viewport)
    await captureRuntime(browser, route, viewports[0], 'reduced-motion')
    await captureNoWebGLFallback(browser, route)
  }
} catch (error) {
  receipt.errors.push({ fatal: String(error), stack: error?.stack || null })
} finally {
  if (browser) await browser.close()
  receipt.passed = receipt.errors.length === 0 && receipt.captures.length === 8 && receipt.captures.every((capture) => capture.passed)
  await writeFile(path.join(outputDir, 'receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`)
  console.log(JSON.stringify(receipt, null, 2))
}

if (!receipt.passed) process.exit(1)
