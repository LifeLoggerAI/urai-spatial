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
const finalPackReceiptPath = path.resolve('operations/assets/generated-receipts/urai-final-glb-pack-v1.json')
const finalPackReceipt = JSON.parse(await readFile(finalPackReceiptPath, 'utf8'))

if (finalPackReceipt.packId !== 'urai-final-glb-production-pack-v1') {
  throw new Error(`unexpected final GLB receipt packId: ${finalPackReceipt.packId}`)
}

const expected = Object.fromEntries(
  [portalPath, orbPath].map((assetPath) => {
    const fileName = path.basename(assetPath)
    const record = finalPackReceipt.assets?.find((asset) => asset.fileName === fileName)
    if (!record || typeof record.sha256 !== 'string' || !Number.isInteger(record.bytes)) {
      throw new Error(`final GLB receipt is missing a complete identity for ${fileName}`)
    }
    return [assetPath, { sha256: record.sha256, bytes: record.bytes }]
  }),
)
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
    receipt: path.relative(process.cwd(), finalPackReceiptPath),
    runtimePromotion: false,
  }
  if (!verified) throw new Error(`binary identity mismatch for ${assetPath}: bytes=${bytes.length} sha256=${digest}`)
}

const receipt = {
  schemaVersion: 'urai-portal-orb-proof-7',
  exactHead,
  capturedAt: new Date().toISOString(),
  runtimeMode: 'final-glb-pack-live-with-visual-approval-pending',
  finalPackReceipt: path.relative(process.cwd(), finalPackReceiptPath),
  stagedAssetIdentity,
  visualGate: {
    source: 'retained-canvas-png',
    sampling: 'distributed-3x3-neighborhood',
    minimumViewportCoverage: 0.82,
    minimumLuminanceRange: 12,
    minimumVisibleSamples: 3,
  },
  cases: [],
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

async function canvasVisualEvidence(page) {
  const canvas = page.locator('.urai-asset-home-world canvas').first()
  await canvas.waitFor({ state: 'visible', timeout: 45_000 })
  const bounds = await canvas.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
  })
  const viewport = page.viewportSize()
  if (!bounds || !viewport) return { available: false, reason: 'missing-canvas-bounds' }
  const clipX = Math.max(0, bounds.x)
  const clipY = Math.max(0, bounds.y)
  const visibleWidth = Math.max(0, Math.min(bounds.x + bounds.width, viewport.width) - clipX)
  const visibleHeight = Math.max(0, Math.min(bounds.y + bounds.height, viewport.height) - clipY)
  const viewportCoverage = visibleWidth * visibleHeight / Math.max(1, viewport.width * viewport.height)
  if (visibleWidth < 1 || visibleHeight < 1) return { available: false, reason: 'canvas-outside-viewport', viewportCoverage }
  const buffer = await page.screenshot({
    animations: 'disabled',
    caret: 'hide',
    timeout: 90_000,
    clip: { x: clipX, y: clipY, width: visibleWidth, height: visibleHeight },
  })
  const dataUrl = `data:image/png;base64,${buffer.toString('base64')}`
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
  return { ...sample, viewportCoverage, bounds: { width: bounds.width, height: bounds.height }, canvasPngBytes: buffer.length }
}

async function waitForVisualEvidence(page, frameBudget = 240) {
  let evidence = null
  for (let elapsed = 0; elapsed < frameBudget; elapsed += 30) {
    await settleAnimationFrames(page, 30)
    evidence = await canvasVisualEvidence(page)
    if (evidence.available === true
      && evidence.viewportCoverage >= receipt.visualGate.minimumViewportCoverage
      && evidence.luminanceRange >= receipt.visualGate.minimumLuminanceRange
      && evidence.visibleSamples >= receipt.visualGate.minimumVisibleSamples) return evidence
  }
  return evidence
}

for (const spec of cases) {
  // A fresh browser per case prevents one WebGL proof case from contaminating another
  // through GPU/context resource retention, especially reduced-motion verification.
  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] })
  const context = await browser.newContext({
    viewport: spec.viewport,
    reducedMotion: spec.reducedMotion,
    isMobile: spec.isMobile,
    hasTouch: spec.hasTouch,
  })
  const page = await context.newPage()
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(String(error)))

  const record = { id: spec.id, viewport: spec.viewport, reducedMotion: spec.reducedMotion, pageErrors, passed: false }

  try {
    const response = await page.goto(`${base}/home/?homeAssetReview=1&homePrivateFixture=1`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    const owner = page.locator('.urai-asset-home-world[data-home-primary-owner="asset-driven"]')
    await owner.waitFor({ state: 'visible', timeout: 45_000 })
    await page.waitForFunction(
      () => document.querySelector('.urai-asset-home-world')?.getAttribute('data-home-assets-ready') === 'true',
      null,
      { timeout: 45_000 },
    )

    record.status = response?.status()
    record.canvasReady = await owner.getAttribute('data-home-assets-ready')
    record.primaryOwner = await owner.getAttribute('data-home-primary-owner')
    record.visibleWorld = await owner.getAttribute('data-home-visible-world')
    record.movement = await owner.getAttribute('data-home-movement')
    record.accessibleRuntimeText = (await owner.textContent()) || ''
    record.orbOwned = record.accessibleRuntimeText.includes('Open URAI Orb companion')
    record.groundPortalOwned = record.accessibleRuntimeText.includes('Open Ground directly')
    record.lifeMapAscentOwned = record.accessibleRuntimeText.includes('Ascend to Life Map')
    record.visual = await waitForVisualEvidence(page)
    record.visualPassed = record.visual?.available === true
      && record.visual.viewportCoverage >= receipt.visualGate.minimumViewportCoverage
      && record.visual.luminanceRange >= receipt.visualGate.minimumLuminanceRange
      && record.visual.visibleSamples >= receipt.visualGate.minimumVisibleSamples

    record.screenshot = `${spec.id}-${exactHead.slice(0, 12)}.png`
    const screenshot = await page.screenshot({ path: path.join(outputDir, record.screenshot), fullPage: false, animations: 'disabled', caret: 'hide', timeout: 90_000 })
    record.screenshotBytes = screenshot.length
    record.screenshotSha256 = createHash('sha256').update(screenshot).digest('hex')

    record.passed = record.status === 200
      && record.canvasReady === 'true'
      && record.primaryOwner === 'asset-driven'
      && record.visibleWorld === 'final-physical-sanctuary-memory-rooms'
      && record.movement === 'walk-keyboard-click-touch'
      && record.orbOwned
      && record.groundPortalOwned
      && record.lifeMapAscentOwned
      && record.visualPassed
      && record.screenshotBytes > 12_000
      && pageErrors.length === 0
  } catch (error) {
    record.error = String(error)
  } finally {
    receipt.cases.push(record)
    if (!record.passed) receipt.errors.push(record)
    await context.close().catch(() => {})
    await browser.close().catch(() => {})
  }
}

await writeFile(path.join(outputDir, 'receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`)
if (receipt.errors.length) process.exit(1)
