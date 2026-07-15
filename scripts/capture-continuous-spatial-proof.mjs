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
      return { runtimeMounted: runtime === 1, oldWorldHidden }
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
      return { providerHidden, canvasVisible }
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

const browser = await chromium.launch({
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
})

const summary = {
  schemaVersion: 'urai-continuous-spatial-visual-proof-1',
  capturedAt: new Date().toISOString(),
  exactHead,
  base,
  captures: [],
}

let failed = false

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 1,
      isMobile: viewport.isMobile,
      hasTouch: viewport.isMobile,
      reducedMotion: 'no-preference',
    })

    for (const route of routes) {
      const page = await context.newPage()
      const pageErrors = []
      const consoleErrors = []
      const requestFailures = []

      page.on('pageerror', (error) => pageErrors.push(String(error)))
      page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(message.text())
      })
      page.on('requestfailed', (request) => {
        requestFailures.push({ url: request.url(), error: request.failure()?.errorText || 'unknown' })
      })

      const url = new URL(route.path, base).toString()
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 })
      await page.locator(route.ready).waitFor({ state: 'visible', timeout: 45_000 })
      await page.waitForTimeout(1800)

      const verification = await route.verify(page)
      const screenshotName = `${route.id}-${viewport.id}-${exactHead.slice(0, 12)}.png`
      await page.screenshot({ path: path.join(outputDir, screenshotName), fullPage: true })

      const capture = {
        route: route.id,
        viewport: viewport.id,
        url,
        status: response?.status() ?? null,
        screenshot: screenshotName,
        verification,
        pageErrors,
        consoleErrors,
        requestFailures,
      }
      summary.captures.push(capture)

      if ((capture.status ?? 500) >= 400) failed = true
      if (pageErrors.length > 0 || consoleErrors.length > 0 || requestFailures.length > 0) failed = true
      if (Object.values(verification).some((value) => value === false)) failed = true

      await page.close()
    }

    await context.close()
  }
} finally {
  await browser.close()
}

await writeFile(path.join(outputDir, 'receipt.json'), `${JSON.stringify(summary, null, 2)}\n`)

if (failed) {
  console.error(JSON.stringify(summary, null, 2))
  process.exit(1)
}

console.log(JSON.stringify(summary, null, 2))
