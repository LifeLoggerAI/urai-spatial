import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import { CANVAS_EVIDENCE_SAMPLE_POINTS, captureVisibleCanvasPng } from './capture-visible-canvas-png.mjs'
import { inspectHomeOrbCanvasSamples, inspectVisibleHomeNavigation } from './home-orb-canvas-sampling.mjs'
import { attachHomeOrbFailureProbe, captureHomeOrbFailure } from './home-orb-failure-diagnostics.mjs'

const requireFromTierOne = createRequire(new URL('../urai-tier1/package.json', import.meta.url))
const { chromium } = requireFromTierOne('playwright')
const base = process.env.URAI_PROOF_BASE || 'http://127.0.0.1:4173'
const exactHead = process.env.URAI_EXACT_HEAD || 'local'
const outputDir = path.resolve(process.env.URAI_PROOF_DIR || 'artifacts/portal-orb-proof')
const orbPath = '/assets/urai/generated/models/urai-orb-avatar-v1.glb'
const portalPath = '/assets/urai/generated/models/portal-ring-master-v1.glb'
const semanticNavigationEvaluationTimeout = 90_000
const paintedHomeEvaluationTimeout = 90_000
const finalPackReceiptPath = path.resolve('operations/assets/generated-receipts/urai-final-glb-pack-v1.json')
const finalPackReceipt = JSON.parse(await readFile(finalPackReceiptPath, 'utf8'))
const orbReceipt = finalPackReceipt.assets?.find((asset) => asset.fileName === path.basename(orbPath))
if (!orbReceipt) throw new Error('final GLB receipt is missing Orb identity')
const orbBytes = await readFile(path.resolve('urai-tier1/public', orbPath.slice(1)))
const orbSha256 = createHash('sha256').update(orbBytes).digest('hex')
if (orbBytes.length !== orbReceipt.bytes || orbSha256 !== orbReceipt.sha256) throw new Error('Orb binary identity mismatch')

const cases = [
  { id: 'desktop', viewport: { width: 1440, height: 900 } },
  { id: 'mobile', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  { id: 'reduced-motion', viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' },
]

await mkdir(outputDir, { recursive: true })
const receipt = {
  schemaVersion: 'urai-sacred-home-orb-proof-4',
  exactHead,
  capturedAt: new Date().toISOString(),
  runtimeContract: 'natural-home-real-glb-orb-environmental-threshold-semantic-and-visual-proof',
  orbIdentity: { path: orbPath, bytes: orbBytes.length, sha256: orbSha256, verified: true },
  portalIdentity: { path: portalPath, requiredRuntimeRequest: false, homeVisiblePortal: false },
  cases: [],
  errors: [],
}

async function frames(page, count = 8) {
  await page.evaluate((required) => new Promise((resolve) => {
    let seen = 0
    const tick = () => { seen += 1; seen >= required ? resolve() : requestAnimationFrame(tick) }
    requestAnimationFrame(tick)
  }), count)
}

async function imageEvidence(page, canvas, samplePoints) {
  const { buffer, capture } = await captureVisibleCanvasPng(page, canvas, 90_000, samplePoints)
  const dataUrl = `data:image/png;base64,${buffer.toString('base64')}`
  const sample = await page.evaluate(async ({ url, points }) => {
    const image = new Image()
    await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; image.src = url })
    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) return { luminanceRange: 0, visibleSamples: 0 }
    context.drawImage(image, 0, 0)
    const values = points.map(([xr, yr]) => {
      const x = Math.min(canvas.width - 1, Math.max(0, Math.floor(canvas.width * xr)))
      const y = Math.min(canvas.height - 1, Math.max(0, Math.floor(canvas.height * yr)))
      const pixel = context.getImageData(x, y, 1, 1).data
      return Math.round(pixel[0] * .2126 + pixel[1] * .7152 + pixel[2] * .0722)
    })
    return { luminanceRange: Math.max(...values) - Math.min(...values), visibleSamples: values.filter((value) => value >= 10).length }
  }, { url: dataUrl, points: samplePoints })
  return { buffer, capture, ...sample }
}

for (const spec of cases) {
  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] })
  const context = await browser.newContext({ viewport: spec.viewport, isMobile: spec.isMobile, hasTouch: spec.hasTouch, reducedMotion: spec.reducedMotion })
  const page = await context.newPage()
  const diagnosticProbe = await attachHomeOrbFailureProbe(page)
  const pageErrors = []
  const failedRequests = []
  const portalRequests = []
  page.on('pageerror', (error) => pageErrors.push(String(error)))
  page.on('requestfailed', (request) => failedRequests.push({ url: request.url(), failure: request.failure()?.errorText || 'unknown' }))
  page.on('request', (request) => { if (request.url().includes(path.basename(portalPath))) portalRequests.push(request.url()) })
  const record = { id: spec.id, viewport: spec.viewport, pageErrors, failedRequests, portalRequests, passed: false }
  let stage = 'navigation'
  try {
    const response = await page.goto(`${base}/home/?homeAssetReview=1&homePrivateFixture=1`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    const owner = page.locator('.urai-asset-home-world[data-home-primary-owner="asset-driven"]')
    stage = 'visible-home-owner'
    await owner.waitFor({ state: 'visible', timeout: 45_000 })
    stage = 'home-assets-ready'
    await page.waitForFunction(() => document.querySelector('.urai-asset-home-world')?.getAttribute('data-home-assets-ready') === 'true', null, { timeout: 45_000 })
    stage = 'painted-home-proof'
    await frames(page)
    record.status = response?.status()
    record.visibleWorld = await owner.getAttribute('data-home-visible-world')
    record.worldCharacter = await owner.getAttribute('data-home-world-character')
    record.physicalBase = await owner.getAttribute('data-home-physical-base')
    record.visualOwnership = await owner.getAttribute('data-home-visual-ownership')
    record.desktopMobileWorld = await owner.getAttribute('data-home-desktop-mobile-world')
    record.embodiedSelf = await owner.getAttribute('data-home-embodied-self')
    record.movement = await owner.getAttribute('data-home-movement')
    record.runtimeAssets = await owner.getAttribute('data-home-runtime-assets')
    record.authoredRegions = await owner.getAttribute('data-home-authored-regions')
    record.cameraMode = await owner.getAttribute('data-home-camera-mode')
    record.orbState = await owner.getAttribute('data-home-orb-state')
    record.orbClip = await owner.getAttribute('data-home-orb-clip')
    record.orbReducedMotion = await owner.getAttribute('data-home-orb-reduced-motion')
    record.visiblePortals = await owner.getAttribute('data-home-visible-portals')
    record.orbMarkers = await owner.getByTestId('urai-home-webgl-orb').count()
    record.embodimentMarkers = await owner.getByTestId('urai-home-embodied-avatar').count()
    const semanticNav = page.getByRole('navigation', { name: 'Accessible Home destinations' })
    record.semanticButtons = await semanticNav.getByRole('button').count()
    record.semanticLinks = await semanticNav.getByRole('link').count()
    record.semanticVisibleActions = await semanticNav.locator('button,a[href]').evaluateAll((elements) => elements.filter((element) => {
      const style = getComputedStyle(element)
      const rect = element.getBoundingClientRect()
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0
    }).length)
    record.semanticOwner = await semanticNav.getAttribute('data-home-navigation-owner')
    record.semanticNonDominant = await semanticNav.getAttribute('data-home-navigation-non-dominant')
    record.semanticVisual = await semanticNav.evaluate(inspectVisibleHomeNavigation, undefined, { timeout: semanticNavigationEvaluationTimeout })
    record.semanticOpacity = await page.evaluate(() => {
      const element = document.querySelector('.home-semantic-navigation[data-home-navigation-owner="runtime-boundary"]')
      return element ? Number.parseFloat(getComputedStyle(element).opacity || '1') : null
    })
    const worldCanvas = owner.locator('canvas')
    if (await worldCanvas.count() !== 1) throw new Error('Home/Orb visual proof requires exactly one world canvas')
    record.canvasSamplingBefore = await worldCanvas.evaluate(inspectHomeOrbCanvasSamples, CANVAS_EVIDENCE_SAMPLE_POINTS, { timeout: paintedHomeEvaluationTimeout })
    if (!record.canvasSamplingBefore.accepted) throw new Error(`Home world sampling rejected an occlusion: ${JSON.stringify(record.canvasSamplingBefore)}`)
    const visual = await imageEvidence(page, worldCanvas, record.canvasSamplingBefore.samplePoints)
    record.canvasSamplingAfter = await worldCanvas.evaluate(inspectHomeOrbCanvasSamples, CANVAS_EVIDENCE_SAMPLE_POINTS, { timeout: paintedHomeEvaluationTimeout })
    if (!record.canvasSamplingAfter.accepted || JSON.stringify(record.canvasSamplingAfter) !== JSON.stringify(record.canvasSamplingBefore)) {
      throw new Error('Home world sampling or its exact Ground HUD exception changed during capture')
    }
    record.canvasCapture = visual.capture
    record.screenshot = `${spec.id}-${exactHead.slice(0, 12)}.png`
    await writeFile(path.join(outputDir, record.screenshot), visual.buffer)
    record.screenshotBytes = visual.buffer.length
    record.screenshotSha256 = createHash('sha256').update(visual.buffer).digest('hex')
    record.luminanceRange = visual.luminanceRange
    record.visibleSamples = visual.visibleSamples
    record.passed = record.status === 200
      && record.visibleWorld === 'authored-coherent-three-dimensional-sanctuary'
      && record.worldCharacter === 'believable-natural-inhabitable-environment'
      && record.physicalBase === 'authored-coherent-world'
      && record.visualOwnership === 'three-dimensional-geometry'
      && record.desktopMobileWorld === 'same-scene'
      && record.embodiedSelf === 'privacy-preserving-shadow'
      && record.movement === 'walk-keyboard-click-touch'
      && record.runtimeAssets?.includes('home-entry-chamber-v1.glb')
      && record.runtimeAssets?.includes('polyhaven-fern-02-geometry-v1.glb')
      && record.runtimeAssets?.includes('living-orb')
      && record.runtimeAssets?.includes('reflecting-water')
      && record.authoredRegions?.includes('home-sanctuary-geometry')
      && record.authoredRegions?.includes('home-canonical-sanctuary-structure')
      && record.authoredRegions?.includes('home-reflecting-water')
      && record.cameraMode !== null
      && record.orbState !== null
      && (spec.reducedMotion !== 'reduce' || record.orbReducedMotion === 'true')
      && record.orbMarkers === 1
      && record.embodimentMarkers === 1
      && record.semanticButtons === 1
      && record.semanticLinks === 2
      && record.semanticVisibleActions === 3
      && record.semanticOwner === 'runtime-boundary'
      && record.semanticNonDominant === 'true'
      && Number.isFinite(record.semanticOpacity) && record.semanticOpacity > 0 && record.semanticOpacity <= .02
      && record.semanticVisual?.passed === true
      && record.visiblePortals === 'false'
      && record.portalRequests.length === 0
      && record.canvasCapture?.source === 'visible-canvas-viewport-clip'
      && record.canvasCapture?.boundsUnchanged === true
      && record.canvasCapture?.canvasTopmostAtSamplePoints === true
      && record.canvasCapture?.canvasTopmostAfterCapture === true
      && record.screenshotBytes > 12000
      && record.luminanceRange >= 16
      && record.visibleSamples >= 5
      && pageErrors.length === 0
      && failedRequests.length === 0
  } catch (error) {
    record.error = String(error)
    record.failureStage = stage
    try {
      record.failureDiagnostics = await captureHomeOrbFailure(page, {
        outputDir, prefix: `${spec.id}-${exactHead.slice(0, 12)}`, stage, probe: diagnosticProbe,
      })
    } catch { record.failureDiagnosticsUnavailable = true }
  }
  diagnosticProbe.stop()
  receipt.cases.push(record)
  if (!record.passed) receipt.errors.push(record)
  await context.close().catch(() => {})
  await browser.close().catch(() => {})
}

await writeFile(path.join(outputDir, 'receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`)
if (receipt.errors.length) process.exit(1)
