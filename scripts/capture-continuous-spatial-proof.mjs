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

async function waitForStableAnimationFrames(page) {
  await page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve))
  }))
}

async function waitForAnyVisible(page, selector) {
  await page.waitForFunction((candidateSelector) => {
    return [...document.querySelectorAll(candidateSelector)].some((node) => {
      const style = getComputedStyle(node)
      const rect = node.getBoundingClientRect()
      return style.display !== 'none'
        && style.visibility !== 'hidden'
        && Number.parseFloat(style.opacity || '1') > 0.02
        && rect.width > 4
        && rect.height > 4
        && rect.bottom > 0
        && rect.right > 0
        && rect.top < window.innerHeight
        && rect.left < window.innerWidth
    })
  }, selector, { timeout: 45_000 })
}

async function canvasEvidence(page, selector) {
  return page.locator(selector).first().evaluate((canvas) => {
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

async function visibleElementCount(locator) {
  return locator.evaluateAll((nodes) => nodes.filter((node) => {
    const style = getComputedStyle(node)
    const rect = node.getBoundingClientRect()
    return style.display !== 'none'
      && style.visibility !== 'hidden'
      && Number.parseFloat(style.opacity || '1') > 0.02
      && rect.width > 4
      && rect.height > 4
      && rect.bottom > 0
      && rect.right > 0
      && rect.top < window.innerHeight
      && rect.left < window.innerWidth
  }).length)
}

async function chooseVisibleLifeMapStar(page) {
  const canvas = page.locator('[data-testid="urai-true-3d-life-map"] canvas').first()
  const box = await canvas.boundingBox()
  if (!box) return false

  const positions = [
    [0.5, 0.47], [0.6, 0.46], [0.4, 0.46], [0.68, 0.38], [0.32, 0.38],
    [0.52, 0.34], [0.45, 0.58], [0.62, 0.58], [0.28, 0.55], [0.75, 0.55],
  ]

  for (const [xRatio, yRatio] of positions) {
    await canvas.click({
      position: { x: Math.round(box.width * xRatio), y: Math.round(box.height * yRatio) },
      force: true,
    })
    await waitForStableAnimationFrames(page)
    if (await page.getByRole('button', { name: 'Enter Focus' }).first().isVisible().catch(() => false)) return true
  }

  return false
}

// Historical marker names retained for contract traceability only:
// sceneLabelsRendered portalShortcutsVisible portalShortcutsStyled

const routes = [
  {
    id: 'home',
    path: '/home/',
    ready: '[data-home-spatial-renderer="webgl"][data-webgl-ready="true"] canvas',
    waitForScene: waitForStableAnimationFrames,
    verify: async (page) => {
      const runtime = await page.locator('[data-urai-home-runtime="one-continuous-webgl-world"]').count()
      const oldWorldHidden = await visibleElementCount(page.locator('.urai-genesis-home__world')) === 0
      const legacyControls = page.locator([
        '.urai-home-spatial-world-final .urai-genesis-home__threshold-gate',
        '.urai-home-spatial-world-final .urai-genesis-home__orb',
        '.urai-home-spatial-world-final .urai-genesis-home__memory-orbit',
        '.urai-home-spatial-world-final .urai-genesis-home__bottom-dock',
      ].join(','))
      const legacyControlsVisible = await visibleElementCount(legacyControls)

      const sceneLabels = page.locator('.urai-home-spatial-threshold')
      const sceneLabelCount = await sceneLabels.count()
      const visibleSceneLabelCount = await visibleElementCount(sceneLabels)
      const thresholdLabelsVisible = sceneLabelCount === 2 && visibleSceneLabelCount === 2
      const authoredSceneMounted = await page.locator('[data-home-spatial-geometry="authored-sanctuary-avatar-orb-sky-ground"]').count() === 1

      const portalShortcuts = page.locator('.urai-home-spatial-runtime-portals a')
      const portalShortcutCount = await portalShortcuts.count()
      const visiblePortalShortcutCount = await visibleElementCount(portalShortcuts)
      const permanentFeatureShortcutsAbsent = portalShortcutCount === 0 && visiblePortalShortcutCount === 0

      const gateway = page.getByRole('button', { name: 'Open the ground and descend into Hidden Infrastructure' })
      const canonicalGroundGatewayVisible = await gateway.count() === 1 && await gateway.isVisible()
      const canonicalGroundGatewayInteractive = canonicalGroundGatewayVisible && await gateway.evaluate((node) => {
        const style = getComputedStyle(node)
        return !node.disabled && style.pointerEvents !== 'none'
      })
      const skyGateway = page.getByRole('button', { name: 'Open the Life Map and ascend into Memory Sky' })
      const canonicalSkyGatewayVisible = await skyGateway.count() === 1 && await skyGateway.isVisible()
      const canonicalSkyGatewayInteractive = canonicalSkyGatewayVisible && await skyGateway.evaluate((node) => {
        const style = getComputedStyle(node)
        return !node.disabled && style.pointerEvents !== 'none'
      })

      const firstHomeFrameMarked = await page.evaluate(() => performance.getEntriesByName('urai:first-home-spatial-frame').length > 0)
      const canvas = await canvasEvidence(page, '[data-home-spatial-renderer="webgl"] canvas')
      return {
        runtimeMounted: runtime === 1,
        oldWorldHidden,
        legacyControlsSuppressed: legacyControlsVisible === 0,
        firstHomeFrameMarked,
        authoredSceneMounted,
        thresholdLabelsVisible,
        permanentFeatureShortcutsAbsent,
        canonicalGroundGatewayVisible,
        canonicalGroundGatewayInteractive,
        canonicalSkyGatewayVisible,
        canonicalSkyGatewayInteractive,
        canvasSized: canvas.canvasSized,
        sceneLabelCount,
        visibleSceneLabelCount,
        portalShortcutCount,
        visiblePortalShortcutCount,
        ...canvas,
      }
    },
  },
  {
    id: 'ground',
    path: '/ground/',
    ready: '.ground-spatial-root canvas',
    waitForScene: waitForStableAnimationFrames,
    verify: async (page) => {
      const providerHidden = await visibleElementCount(page.locator('.ground-provider-art')) === 0
      const canvasVisible = await page.locator('.ground-spatial-root canvas').first().isVisible()
      const rail = page.locator('.ground-rail').first()
      const railLinks = rail.locator('a')
      const navigationPillsStyled = await railLinks.count() === 5 && await railLinks.first().evaluate((node) => {
        const style = getComputedStyle(node)
        const hasPaintedBackground = style.backgroundColor !== 'rgba(0, 0, 0, 0)'
          || (style.backgroundImage && style.backgroundImage !== 'none')
        return ['flex', 'inline-flex'].includes(style.display)
          && style.whiteSpace === 'nowrap'
          && Number.parseFloat(style.borderTopWidth || '0') >= 1
          && Number.parseFloat(style.paddingLeft || '0') >= 8
          && hasPaintedBackground
      })
      const navigationRailContained = await rail.evaluate((node) => {
        const rect = node.getBoundingClientRect()
        return rect.left >= -1
          && rect.right <= window.innerWidth + 1
          && rect.bottom <= window.innerHeight + 1
      })
      const activeGroundLink = rail.locator('a[aria-current="page"]')
      const activeGroundLinkVisible = await activeGroundLink.count() === 1 && await activeGroundLink.isVisible()
      const canvas = await canvasEvidence(page, '.ground-spatial-root canvas')
      return { providerHidden, canvasVisible, navigationPillsStyled, navigationRailContained, activeGroundLinkVisible, canvasSized: canvas.canvasSized, ...canvas }
    },
  },
  {
    id: 'life-map',
    path: '/life-map/',
    ready: '[data-testid="urai-true-3d-life-map"] canvas',
    waitForScene: waitForFirstSpatialFrame,
    verify: async (page) => {
      const canvasVisible = await page.locator('[data-testid="urai-true-3d-life-map"] canvas').first().isVisible()
      const overlayOpacities = await page.locator('[data-testid="urai-r3f-canonical-lifemap"] > div[aria-hidden="true"]').evaluateAll((nodes) => nodes.map((node) => Number.parseFloat(getComputedStyle(node).opacity || '1')))
      const firstSpatialFrameMarked = await page.evaluate(() => performance.getEntriesByName('urai:first-spatial-frame').length > 0)
      const spatialVisible = await page.locator('[data-testid="urai-true-3d-life-map"]').first().getAttribute('data-spatial-visible')
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
    path: '/life-map/?memoryId=quiet-reset&manifestId=replay-recovery-thread&node=quiet-reset',
    ready: '[data-testid="urai-true-3d-life-map"] canvas',
    waitForScene: async (page) => {
      await waitForFirstSpatialFrame(page)
      await waitForStableAnimationFrames(page)
      await chooseVisibleLifeMapStar(page)
    },
    verify: async (page) => {
      const firstSpatialFrameMarked = await page.evaluate(() => performance.getEntriesByName('urai:first-spatial-frame').length > 0)
      const selectedControls = page.getByRole('button', { name: 'Enter Focus' })
      const selectedMemoryControlsVisible = await selectedControls.count() >= 1 && await selectedControls.first().isVisible()
      const replayControl = page.getByRole('button', { name: 'Replay' })
      const replayControlVisible = await replayControl.count() >= 1 && await replayControl.first().isVisible()
      const canvas = await canvasEvidence(page, '[data-testid="urai-true-3d-life-map"] canvas')
      return {
        firstSpatialFrameMarked,
        selectedMemoryControlsVisible,
        replayControlVisible,
        canvasSized: canvas.canvasSized,
        ...canvas,
      }
    },
  },
]

await mkdir(outputDir, { recursive: true })

const receipt = {
  schemaVersion: 'urai-continuous-spatial-visual-proof-7',
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
    if (key.endsWith('Width') || key.endsWith('Height')) return typeof value === 'number' && value > 0
    if (key.endsWith('Count')) return typeof value === 'number' && value >= 0
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
          let renderer = null
          try {
            const debug = context.getExtension('WEBGL_debug_renderer_info')
            renderer = debug ? context.getParameter(debug.UNMASKED_RENDERER_WEBGL) : null
          } catch (debugError) {
            attempts.push({ kind, debugError: String(debugError) })
          }
          try {
            context.getExtension('WEBGL_lose_context')?.loseContext()
          } catch (loseContextError) {
            attempts.push({ kind, loseContextError: String(loseContextError) })
          }
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
    await page.locator(route.ready).first().waitFor({ state: 'visible', timeout: 45_000 })
    if (route.waitForScene) await route.waitForScene(page)
    await waitForStableAnimationFrames(page)
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
      const fallbackOwnerVisible = await visibleElementCount(page.locator('.urai-genesis-home__world')) > 0
      const fallbackActions = page.locator('.urai-genesis-home__threshold-gate--ground')
      const actionEvidence = await fallbackActions.evaluateAll((nodes) => nodes.map((node) => {
        const style = getComputedStyle(node)
        const rect = node.getBoundingClientRect()
        const visible = style.display !== 'none'
          && style.visibility !== 'hidden'
          && Number.parseFloat(style.opacity || '1') > 0.02
          && rect.width > 4
          && rect.height > 4
          && rect.bottom > 0
          && rect.right > 0
          && rect.top < window.innerHeight
          && rect.left < window.innerWidth
        return {
          visible,
          href: node.getAttribute('href'),
          interactive: style.pointerEvents !== 'none',
        }
      }))
      const fallbackActionVisible = actionEvidence.some((action) => action.visible)
      const fallbackInteractive = actionEvidence.some((action) => action.visible
        && action.href?.startsWith('/ground') === true
        && action.interactive)
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
    await waitForAnyVisible(page, fallbackRoute.ready)
    await waitForStableAnimationFrames(page)
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
