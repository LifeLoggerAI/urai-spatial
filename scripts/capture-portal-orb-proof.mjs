import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'

const requireFromTierOne = createRequire(new URL('../urai-tier1/package.json', import.meta.url))
const { chromium } = requireFromTierOne('playwright')
const base = process.env.URAI_PROOF_BASE || 'http://127.0.0.1:4173'
const exactHead = process.env.URAI_EXACT_HEAD || 'local'
const outputDir = path.resolve(process.env.URAI_PROOF_DIR || 'artifacts/portal-orb-proof')
const portalPath = '/assets/urai/generated/models/portal-ring-master-v1.glb'
const orbPath = '/assets/urai/generated/models/urai-orb-avatar-v1.glb'
const expected = {
  [portalPath]: { sha256: '6e29acaaab0eb048ddd2e4690bf5949ef58865061574ca961bdec6b6312d80f5', bytes: 73164 },
  [orbPath]: { sha256: '34f48f2bc042458c041d738d2b68d390eab05a61f91b37a8cd30defd0753d18c', bytes: 83984 },
}
const cases = [
  { id: 'desktop', viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' },
  { id: 'mobile', viewport: { width: 390, height: 844 }, reducedMotion: 'no-preference', isMobile: true, hasTouch: true },
  { id: 'reduced-motion', viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' },
]

await mkdir(outputDir, { recursive: true })
const stagedAssetIdentity = {}
for (const [assetPath, proof] of Object.entries(expected)) {
  const bytes = await readFile(path.resolve('urai-tier1/public', assetPath.slice(1)))
  const digest = createHash('sha256').update(bytes).digest('hex')
  const verified = bytes.length === proof.bytes && digest === proof.sha256
  stagedAssetIdentity[assetPath] = {
    bytes: bytes.length,
    sha256: digest,
    verified,
    runtimePromotion: false,
  }
  if (!verified) {
    throw new Error(`binary identity mismatch for ${assetPath}: bytes=${bytes.length} sha256=${digest}`)
  }
}

const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] })
const receipt = {
  schemaVersion: 'urai-portal-orb-proof-3',
  exactHead,
  capturedAt: new Date().toISOString(),
  runtimeMode: 'procedural-live-with-staged-unpromoted-glb-assets',
  stagedAssetIdentity,
  visualGate: {
    minimumViewportCoverage: 0.82,
    minimumLuminanceRange: 12,
    minimumVisibleSamples: 3,
  },
  cases: [],
  errors: [],
}

for (const spec of cases) {
  const context = await browser.newContext({
    viewport: spec.viewport,
    reducedMotion: spec.reducedMotion,
    isMobile: spec.isMobile,
    hasTouch: spec.hasTouch,
  })
  const page = await context.newPage()
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(String(error)))

  const record = {
    id: spec.id,
    viewport: spec.viewport,
    reducedMotion: spec.reducedMotion,
    pageErrors,
    passed: false,
  }

  try {
    const response = await page.goto(`${base}/home/?homeAssetReview=1&homePrivateFixture=1`, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    })
    const owner = page.locator('.urai-asset-home-world[data-home-primary-owner="asset-driven"]')
    await owner.waitFor({ state: 'visible', timeout: 45_000 })
    await page.waitForFunction(
      () => document.querySelector('.urai-asset-home-world')?.getAttribute('data-home-assets-ready') === 'true',
      null,
      { timeout: 45_000 },
    )
    await page.waitForTimeout(1800)

    record.status = response?.status()
    record.canvasReady = await owner.getAttribute('data-home-assets-ready')
    record.primaryOwner = await owner.getAttribute('data-home-primary-owner')
    record.visibleWorld = await owner.getAttribute('data-home-visible-world')
    record.movement = await owner.getAttribute('data-home-movement')
    record.accessibleRuntimeText = (await owner.textContent()) || ''
    record.orbOwned = record.accessibleRuntimeText.includes('Open URAI Orb companion')
    record.groundPortalOwned = record.accessibleRuntimeText.includes('Open Ground directly')
    record.lifeMapPortalOwned = record.accessibleRuntimeText.includes('Open Life Map directly')
    record.visual = await page.evaluate(() => {
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
    record.visualPassed = record.visual.available === true
      && record.visual.viewportCoverage >= receipt.visualGate.minimumViewportCoverage
      && record.visual.luminanceRange >= receipt.visualGate.minimumLuminanceRange
      && record.visual.visibleSamples >= receipt.visualGate.minimumVisibleSamples

    record.screenshot = `${spec.id}-${exactHead.slice(0, 12)}.png`
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
      && record.orbOwned
      && record.groundPortalOwned
      && record.lifeMapPortalOwned
      && record.visualPassed
      && record.screenshotBytes > 12_000
      && pageErrors.length === 0
  } catch (error) {
    record.error = String(error)
  } finally {
    receipt.cases.push(record)
    if (!record.passed) receipt.errors.push(record)
    await context.close()
  }
}

await browser.close()
await writeFile(path.join(outputDir, 'receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`)
if (receipt.errors.length) process.exit(1)
