import { mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'

const requireFromTierOne = createRequire(new URL('../urai-tier1/package.json', import.meta.url))
const { chromium } = requireFromTierOne('playwright')

const base = process.env.URAI_PROOF_BASE || 'http://127.0.0.1:4173'
const outputDir = path.resolve(process.env.URAI_PROOF_DIR || 'artifacts/continuous-spatial-proof')
const exactHead = process.env.URAI_EXACT_HEAD || 'local'

const viewports = [
  { id: 'desktop', width: 1440, height: 900, isMobile: false },
  { id: 'mobile', width: 390, height: 844, isMobile: true },
]

async function waitForFirstSpatialFrame(page) {
  await page.waitForFunction(
    () => performance.getEntriesByName('urai:first-spatial-frame').length > 0,
    null,
    { timeout: 45_000 },
  )
}

async function canvasEvidence(page, selector) {
  return page.locator(selector).evaluate((canvas) => {
    const rect = canvas.getBoundingClientRect()
    return {
      canvasSized: rect.width >= 240 && rect.height >= 240 && canvas.width > 0 && canvas.height > 0,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      cssWidth: Math.round(rect.width),
      cssHeight: Math.round(rect.height),
    }
  })
}

function hasPaintedBackground(style) {
  return style.backgroundColor !== 'rgba(0, 0, 0, 0)'
    || (style.backgroundImage && style.backgroundImage !== 'none')
}

const routes = [
  {
    id: 'home',
    path: '/home/',
    ready: '[data-home-spatial-renderer="webgl"][data-webgl-ready="true"] canvas',
    waitForScene: async (page) => {
      await page.waitForFunction(
        () => {
          const canvas = document.querySelector('[data-home-spatial-renderer="webgl"] canvas')
          if (!canvas) return false
          const rect = canvas.getBoundingClientRect()
          const labels = document.querySelectorAll('.urai-home-spatial-canvas-shell .urai-home-spatial-portal-label')
          return rect.width >= 240 && rect.height >= 240 && labels.length >= 6
        },
        null,
        { timeout: 45_000 },
      )
    },
    verify: async (page) => {
      const runtime = await page.locator('[data-urai-home-runtime="one-continuous-webgl-world"]').count()
      const oldWorld = page.locator('.urai-genesis-home__world')
      const oldWorldHidden = (await oldWorld.count()) === 0 || await oldWorld.evaluate((node) => getComputedStyle(node).display === 'none')
      const sceneLabels = page.locator('.urai-home-spatial-canvas-shell .urai-home-spatial-portal-label')
      const sceneLabelCount = await sceneLabels.count()
      const sceneLabelsRendered = sceneLabelCount >= 6 && await sceneLabels.evaluateAll((nodes) => nodes.every((node) => {
        const style = getComputedStyle(node)
        const rect = node.getBoundingClientRect()
        return style.visibility !== 'hidden'
          && style.display !== 'none'
          && rect.width > 20
          && rect.height > 14
      }))
      const portalShortcuts = page.locator('.urai-home-spatial-runtime-portals a')
      const portalShortcutCount = await portalShortcuts.count()
      const portalShortcutsVisible = portalShortcutCount === 5 && await portalShortcuts.evaluateAll((nodes) => nodes.every((node) => {
        const style = getComputedStyle(node)
        const rect = node.getBoundingClientRect()
        return style.visibility !== 'hidden'
          && style.display !== 'none'
          && rect.width >= 48
          && rect.height >= 28
      }))
      const portalShortcutsStyled = portalShortcutCount === 5 && await portalShortcuts.first().evaluate((node) => {
        const style = getComputedStyle(node)
        return style.display === 'inline-flex'
          && Number.parseFloat(style.borderTopWidth || '0') >= 1
          && Number.parseFloat(style.paddingLeft || '0') >= 10
          && hasPaintedBackground(style)
      })
      const canvas = await canvasEvidence(page, '[data-home-spatial-renderer="webgl"] canvas')
      return {
        runtimeMounted: runtime === 1,
        oldWorldHidden,
        sceneLabelsRendered,
        portalShortcutsVisible,
        portalShortcutsStyled,
        canvasSized: canvas.canvasSized,
        sceneLabelCount,
        ...canvas,
      }
    },
  },
  {
    id: 'ground',
    path: '/ground/',
    ready: '.ground-spatial-root canvas',
    verify: async (page) => {
      const provider = page.locator('.ground-provider-art')
      const providerHidden = (await provider.count()) === 0 || await provider.evaluate((node) => getComputedStyle(node).display === 'none')
      const canvasVisible = await page.locator('.ground-spatial-root canvas').isVisible()
      const rail = page.locator('.ground-rail')
      const railLinks = rail.locator('a')
      const navigationPillsStyled = await railLinks.count() === 5 && await railLinks.first().evaluate((node) => {
        const style = getComputedStyle(node)
        return style.display === 'inline-flex'
          && style.whiteSpace === 'nowrap'
          && Number.parseFloat(style.borderTopWidth || '0') >= 1
          && Number.parseFloat(style.paddingLeft || '0') >= 8
          && hasPaintedBackground(style)
      })
      const navigationRailContained = await rail.evaluate((node) => {
        const rect = node.getBoundingClientRect()
        return rect.left >= -1
          && rect.right <= window.innerWidth + 1
          && rect.bottom <= window.innerHeight + 1
      })
      const canvas = await canvasEvidence(page, '.ground-spatial-root canvas')
      return { providerHidden, canvasVisible, navigationPillsStyled, navigationRailContained, canvasSized: canvas.canvasSized, ...canvas }
    },
  },
  {
    id: 'life-map',
    path: '/life-map/',
    ready: '[data-testid="urai-true-3d-life-map"] canvas',
    waitForScene: waitForFirstSpatialFrame,
    verify: async (page) => {
      const canvasVisible = await page.locator('[data-testid="urai-true-3d-life-map"] canvas').isVisible()
      const overlayOpacities = await page.locator('[data-testid="urai-r3f-canonical-lifemap"] > div[aria-hidden="true"]').evaluateAll((nodes) => nodes.map((node) => Number.parseFloat(getComputedStyle(node).opacity || '1')))
      const firstSpatialFrameMarked = await page.evaluate(() => performance.getEntriesByName('urai:first-spatial-frame').length > 0)
      const spatialVisible = await page.locator('[data-testid="urai-true-3d-life-map"]').getAttribute('data-spatial-visible')
      const canvas = await canvasEvidence(page, '[data-testid="urai-true-3d-life-map"] canvas')
      return {
        canvasVisible,
        overlayOpacities,
        providerVeilSuppressed: overlayOpacities.length === 0 || overlayOpacities.every((opacity) => opacity <= 0.02),
        firstSpatialFrameMarked,
        spatialDocumentVisible: spatialVisible === 'true',
        canvasSized: canvas.canvasSized,
        ...canvas,
      }
    },
  },
  {
    id: 'life-map-selected',
    path: '/life-map/?memoryId=recovery-bloom&manifestId=replay-recovery-thread&node=recovery-bloom',
    ready: '[data-testid="urai-true-3d-life-map"] canvas',
    waitForScene: waitForFirstSpatialFrame,
    verify: async (page) => {
      const firstSpatialFrameMarked = await page.evaluate(() => performance.getEntriesByName('urai:first-spatial-frame').length > 0)
      const selectedControls = page.locator('button', { hasText: 'Enter Focus' })
      const selectedMemoryControlsVisible = await selectedControls.count() === 1 && await selectedControls.isVisible()
      const replayControl = page.locator('button', { hasText: 'Replay' })
      const replayControlVisible = await replayControl.count() >= 1 && await replayControl.first().isVisible()
      const selectedMemoryTitleVisible = await page.getByText('Recovery Bloom', { exact: true }).count() >= 1
      const canvas = await canvasEvidence(page, '[data-testid="urai-true-3d-life-map"] canvas')
      return {
        firstSpatialFrameMarked,
        selectedMemoryControlsVisible,
        replayControlVisible,
        selectedMemoryTitleVisible,
        canvasSized: canvas.canvasSized,
        ...canvas,
      }
    },
  },
]

await mkdir(outputDir, { recursive: true })

const receipt = {
  schemaVersion: 'urai-continuous-spatial-visual-proof-6',
  capturedAt: new Date().toISOString(),
  exactHead,
  base,
  captures: [],
}

let failed = false
let browser

function verificationPassed(verification) {
  return Object.entries(verification).every(([key, value]) => {
    if (key === 'overlayOpacities') return true
    if (key.endsWith('Width') || key.endsWith('Height') || key.endsWith('Count')) return typeof value === 'number' && value > 0
    return value === true
  })
}

async function takeScreenshot(page, targetPath) {
  await page.screenshot({
    path: targetPath,
    fullPage: false,
    animations: 'disabled',
    caret: 'hide',
    timeout: 60_000,
  })
}

async function probeWebGL(page) {
  return page.evaluate(() => {
    const attempts = []
    for (const kind of ['webgl2', 'webgl']) {
      const canvas = document.createElement('canvas')
      canvas.width = 8
      canvas.height = 8
      try {
        const context = canvas.getContext(kind, {
          failIfMajorPerformanceCaveat: false,
          powerPreference: 'high-performance',
        })
        if (context) {
          const debug = context.getExtension('WEBGL_debug_renderer_info')
          const renderer = debug ? context.getParameter(debug.UNMASKED_RENDERER_WEBGL) : null
          context.getExtension('WEBGL_lose_context')?.loseContext()
          return { available: true, kind, renderer, attempts }
        }
        attempts.push({ kind, outcome: 'null' })
      } catch (error) {
        attempts.push({ kind, outcome: String(error) })
      }
    }
    return { available: false, kind: null, renderer: null, attempts }
  })
}

async function captureRoute(context, route, viewportId) {
  const page = await context.newPage()
  const pageErrors = []
  const consoleErrors = []
  const requestFailures = []
  const url = new URL(route.path, base).toString()
  const screenshotName = `${route.id}-${viewportId}-${exactHead.slice(0, 12)}.png`
  const capture = {
    route: route.id,
    viewport: viewportId,
    url,
    status: null,
    screenshot: screenshotName,
    browserWebGL: null,
    verification: {},
    pageErrors,
    consoleErrors,
    requestFailures,
  }

  page.on('pageerror', (error) => pageErrors.push(String(error)))
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('requestfailed', (request) => {
    requestFailures.push({ url: request.url(), error: request.failure()?.errorText || 'unknown' })
  })

  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    capture.status = response?.status() ?? null
    capture.browserWebGL = await probeWebGL(page)
    await page.locator(route.ready).waitFor({ state: 'visible', timeout: 45_000 })
    if (route.waitForScene) await route.waitForScene(page)
    await page.waitForTimeout(1800)
    capture.verification = await route.verify(page)
    await takeScreenshot(page, path.join(outputDir, screenshotName))
    capture.passed = capture.status === 200
      && capture.browserWebGL?.available === true
      && verificationPassed(capture.verification)
      && pageErrors.length === 0
      && consoleErrors.length === 0
      && requestFailures.length === 0
  } catch (error) {
    capture.error = String(error)
    capture.passed = false
    try {
      await takeScreenshot(page, path.join(outputDir, `failed-${screenshotName}`))
      capture.screenshot = `failed-${screenshotName}`
    } catch (screenshotError) {
      capture.screenshotError = String(screenshotError)
    }
  } finally {
    if (!capture.passed) failed = true
    receipt.captures.push(capture)
    await page.close()
  }
}

async function captureNoWebGLFallback() {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  })

  await context.addInitScript(() => {
    const originalGetContext = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function patchedGetContext(type, ...args) {
      if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') return null
      return originalGetContext.call(this, type, ...args)
    }
  })

  const fallbackRoute = {
    id: 'home-no-webgl-fallback',
    path: '/home/',
    ready: '.urai-home-spatial-world-final',
    verify: async (page) => {
      const runtimeAbsent = await page.locator('.urai-home-spatial-runtime-layer').count() === 0
      const oldWorld = page.locator('.urai-genesis-home__world')
      const fallbackOwnerVisible = await oldWorld.count() > 0
        && await oldWorld.evaluate((node) => getComputedStyle(node).display !== 'none')
      const fallbackAction = page.locator('.urai-genesis-home__threshold-gate--ground')
      const fallbackActionVisible = await fallbackAction.count() > 0 && await fallbackAction.isVisible()
      const fallbackActionHref = await fallbackAction.getAttribute('href')
      const fallbackInteractive = fallbackActionVisible
        && fallbackActionHref?.startsWith('/ground') === true
        && await fallbackAction.evaluate((node) => getComputedStyle(node).pointerEvents !== 'none')
      return { runtimeAbsent, fallbackOwnerVisible, fallbackActionVisible, fallbackInteractive }
    },
  }

  const page = await context.newPage()
  const pageErrors = []
  const consoleErrors = []
  const requestFailures = []
  const url = new URL(fallbackRoute.path, base).toString()
  const screenshotName = `${fallbackRoute.id}-desktop-no-webgl-${exactHead.slice(0, 12)}.png`
  const capture = {
    route: fallbackRoute.id,
    viewport: 'desktop-no-webgl',
    url,
    status: null,
    screenshot: screenshotName,
    browserWebGL: { available: false, forcedFallback: true },
    verification: {},
    pageErrors,
    consoleErrors,
    requestFailures,
  }

  page.on('pageerror', (error) => pageErrors.push(String(error)))
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('requestfailed', (request) => {
    requestFailures.push({ url: request.url(), error: request.failure()?.errorText || 'unknown' })
  })

  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    capture.status = response?.status() ?? null
    await page.locator(fallbackRoute.ready).waitFor({ state: 'visible', timeout: 45_000 })
    await page.waitForTimeout(1200)
    capture.verification = await fallbackRoute.verify(page)
    await takeScreenshot(page, path.join(outputDir, screenshotName))
    capture.passed = capture.status === 200
      && verificationPassed(capture.verification)
      && pageErrors.length === 0
      && consoleErrors.length === 0
      && requestFailures.length === 0
  } catch (error) {
    capture.error = String(error)
    capture.passed = false
  } finally {
    if (!capture.passed) failed = true
    receipt.captures.push(capture)
    await page.close()
    await context.close()
  }
}

try {
  browser = await chromium.launch({
    headless: true,
    args: [
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
    ],
  })

  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 1,
      isMobile: viewport.isMobile,
      hasTouch: viewport.isMobile,
      reducedMotion: 'no-preference',
    })

    try {
      for (const route of routes) await captureRoute(context, route, viewport.id)
    } finally {
      await context.close()
    }
  }

  await captureNoWebGLFallback()
} catch (error) {
  failed = true
  receipt.fatalError = String(error)
} finally {
  if (browser) await browser.close()
  receipt.passed = !failed
  await writeFile(path.join(outputDir, 'receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`)
  console.log(JSON.stringify(receipt, null, 2))
}

if (failed) process.exit(1)
