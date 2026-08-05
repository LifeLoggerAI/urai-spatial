import { mkdir, stat, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'

const requireFromTierOne = createRequire(new URL('../urai-tier1/package.json', import.meta.url))
const { chromium } = requireFromTierOne('playwright')

const base = process.env.URAI_PROOF_BASE || 'http://127.0.0.1:4173'
const exactHead = process.env.URAI_EXACT_HEAD || 'local'
const outputDir = path.resolve(process.env.URAI_PROOF_DIR || 'artifacts/shadow-council-runtime-proof')
const realms = ['shadow', 'council']
const viewports = [
  { id: 'desktop', width: 1440, height: 900, isMobile: false, hasTouch: false },
  { id: 'mobile', width: 390, height: 844, isMobile: true, hasTouch: true },
]

await mkdir(outputDir, { recursive: true })

const receipt = {
  schemaVersion: 'urai-shadow-council-runtime-proof-3',
  exactHead,
  base,
  capturedAt: new Date().toISOString(),
  captureTransport: 'chrome-devtools-protocol-page-captureScreenshot',
  captures: [],
  errors: [],
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function settleViewport(page) {
  await page.evaluate(async () => {
    await document.fonts.ready
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  })
}

async function captureViewportThroughCdp(context, page, targetPath) {
  const session = await context.newCDPSession(page)
  try {
    await session.send('Page.bringToFront')
    const result = await session.send('Page.captureScreenshot', {
      format: 'png',
      fromSurface: true,
      captureBeyondViewport: false,
      optimizeForSpeed: true,
    })
    if (!result?.data) throw new Error('CDP screenshot returned no image data')
    await writeFile(targetPath, Buffer.from(result.data, 'base64'))
    const evidence = await stat(targetPath)
    if (evidence.size < 1024) throw new Error(`CDP screenshot is unexpectedly small: ${evidence.size} bytes`)
    return evidence.size
  } finally {
    await session.detach().catch(() => {})
  }
}

async function captureRealm(browser, realm, viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    isMobile: viewport.isMobile,
    hasTouch: viewport.hasTouch,
    reducedMotion: 'reduce',
  })
  const page = await context.newPage()
  page.setDefaultTimeout(60_000)
  const consoleErrors = []
  const pageErrors = []
  const failedRequests = []
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', (error) => pageErrors.push(String(error)))
  page.on('requestfailed', (request) => failedRequests.push({
    url: request.url(),
    error: request.failure()?.errorText || 'unknown',
  }))

  const url = `${base}/${realm}/`
  const selector = `[data-testid="urai-${realm}-spatial-realm"]`
  const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  const shell = page.locator(selector)
  await shell.waitFor({ state: 'visible', timeout: 45_000 })
  await page.waitForFunction((target) => document.querySelector(target)?.getAttribute('data-realm-ready') === 'true', selector, { timeout: 45_000 })
  await page.locator(`${selector} canvas`).waitFor({ state: 'visible', timeout: 45_000 })

  const start = await shell.evaluate((node) => ({
    x: Number(node.getAttribute('data-realm-camera-x')),
    z: Number(node.getAttribute('data-realm-camera-z')),
  }))

  await page.keyboard.down('w')
  await delay(900)
  await page.keyboard.up('w')
  await settleViewport(page)

  const final = await shell.evaluate((node) => ({
    x: Number(node.getAttribute('data-realm-camera-x')),
    z: Number(node.getAttribute('data-realm-camera-z')),
    ready: node.getAttribute('data-realm-ready'),
    owner: node.getAttribute('data-spatial-owner'),
    exploration: node.getAttribute('data-spatial-exploration'),
  }))

  const canvas = page.locator(`${selector} canvas`).first()
  const canvasBox = await canvas.boundingBox()
  const portals = page.getByRole('navigation', { name: new RegExp(`${realm === 'shadow' ? 'Shadow Realm' : 'Council Chamber'} destinations`, 'i') }).getByRole('button')
  const portalCount = await portals.count()
  const headingVisible = await page.getByRole('heading', { name: realm === 'shadow' ? 'Shadow Realm' : 'Council Chamber' }).isVisible()
  const movementDistance = Math.hypot(final.x - start.x, final.z - start.z)
  const screenshot = `${realm}-${viewport.id}-${exactHead.slice(0, 12)}.png`
  await settleViewport(page)
  const screenshotBytes = await captureViewportThroughCdp(context, page, path.join(outputDir, screenshot))

  const capture = {
    realm,
    viewport: viewport.id,
    url,
    httpStatus: response?.status() ?? null,
    screenshot,
    screenshotBytes,
    startCamera: start,
    finalCamera: { x: final.x, z: final.z },
    movementDistance,
    ready: final.ready,
    owner: final.owner,
    exploration: final.exploration,
    portalCount,
    headingVisible,
    canvas: canvasBox ? { width: Math.round(canvasBox.width), height: Math.round(canvasBox.height) } : null,
    consoleErrors,
    pageErrors,
    failedRequests,
  }

  const passed = capture.httpStatus === 200
    && capture.ready === 'true'
    && capture.owner === 'canonical-route-owned-r3f'
    && capture.exploration === 'walkable'
    && capture.portalCount === 3
    && capture.headingVisible
    && capture.canvas?.width >= 240
    && capture.canvas?.height >= 240
    && capture.movementDistance >= 0.25
    && capture.screenshotBytes >= 1024
    && consoleErrors.length === 0
    && pageErrors.length === 0
    && failedRequests.length === 0

  receipt.captures.push({ ...capture, passed })
  if (!passed) receipt.errors.push({ realm, viewport: viewport.id, capture })
  await context.close()
}

let browser
try {
  browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] })
  for (const realm of realms) {
    for (const viewport of viewports) await captureRealm(browser, realm, viewport)
  }
} finally {
  await browser?.close()
}

await writeFile(path.join(outputDir, 'receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`)
if (receipt.captures.length !== 4 || receipt.errors.length) process.exitCode = 1
