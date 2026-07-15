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

const routes = [
  {
    id: 'home',
    path: '/home/',
    ready: '[data-home-spatial-renderer="webgl"][data-webgl-ready="true"] canvas',
    verify: async (page) => {
      const runtime = await page.locator('[data-urai-home-runtime="one-continuous-webgl-world"]').count()
      const oldWorld = page.locator('.urai-genesis-home__world')
      const oldWorldHidden = (await oldWorld.count()) === 0 || await oldWorld.evaluate((node) => getComputedStyle(node).display === 'none')
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
          && style.backgroundColor !== 'rgba(0, 0, 0, 0)'
      })
      return { runtimeMounted: runtime === 1, oldWorldHidden, portalShortcutsVisible, portalShortcutsStyled }
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
          && style.backgroundColor !== 'rgba(0, 0, 0, 0)'
      })
      const navigationRailContained = await rail.evaluate((node) => {
        const rect = node.getBoundingClientRect()
        return rect.left >= -1
          && rect.right <= window.innerWidth + 1
          && rect.bottom <= window.innerHeight + 1
      })
      return { providerHidden, canvasVisible, navigationPillsStyled, navigationRailContained }
    },
  },
  {
    id: 'life-map',
    path: '/life-map/',
    ready: '[data-testid="urai-true-3d-life-map"] canvas',
    verify: async (page) => {
      const canvasVisible = await page.locator('[data-testid="urai-true-3d-life-map"] canvas').isVisible()
      const overlayOpacities = await page.locator('[data-testid="urai-r3f-canonical-lifemap"] > div[aria-hidden="true"]').evaluateAll((nodes) => nodes.map((node) => Number.parseFloat(getComputedStyle(node).opacity || '1')))
      return { canvasVisible, overlayOpacities, providerVeilSuppressed: overlayOpacities.length === 0 || overlayOpacities.every((opacity) => opacity <= 0.02) }
    },
  },
]

await mkdir(outputDir, { recursive: true })

const receipt = {
  schemaVersion: 'urai-continuous-spatial-visual-proof-5',
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
    await page.waitForTimeout(1800)
    capture.verification = await route.verify(page)
    await takeScreenshot(page, path.join(outputDir, screenshotName))
    capture.passed = capture.status === 200
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

  try {
    await captureRoute(context, fallbackRoute, 'desktop-no-webgl')
  } finally {
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
