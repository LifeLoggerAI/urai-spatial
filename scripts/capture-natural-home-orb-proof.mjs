import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'

const requireFromTierOne = createRequire(new URL('../urai-tier1/package.json', import.meta.url))
const { chromium } = requireFromTierOne('playwright')
const base = process.env.URAI_PROOF_BASE || 'http://127.0.0.1:4173'
const exactHead = process.env.URAI_EXACT_HEAD || 'local'
const outputDir = path.resolve(process.env.URAI_PROOF_DIR || 'artifacts/portal-orb-proof')
const orbPath = '/assets/urai/generated/models/urai-orb-avatar-v1.glb'
const portalPath = '/assets/urai/generated/models/portal-ring-master-v1.glb'
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
  runtimeContract: 'v54-authored-relic-sanctuary-home-real-glb-makehuman-orb-portal-semantic-and-visual-proof',
  orbIdentity: { path: orbPath, bytes: orbBytes.length, sha256: orbSha256, verified: true },
  portalIdentity: { path: portalPath, requiredRuntimeRequest: true },
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

async function imageEvidence(page) {
  const buffer = await page.screenshot({ fullPage: false, animations: 'disabled', caret: 'hide', timeout: 90_000 })
  const dataUrl = `data:image/png;base64,${buffer.toString('base64')}`
  const sample = await page.evaluate(async (url) => {
    const image = new Image()
    await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; image.src = url })
    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) return { luminanceRange: 0, visibleSamples: 0 }
    context.drawImage(image, 0, 0)
    const points = [[.12,.18],[.36,.18],[.64,.18],[.88,.18],[.12,.5],[.36,.5],[.64,.5],[.88,.5],[.12,.82],[.36,.82],[.64,.82],[.88,.82]]
    const values = points.map(([xr, yr]) => {
      const x = Math.min(canvas.width - 1, Math.max(0, Math.floor(canvas.width * xr)))
      const y = Math.min(canvas.height - 1, Math.max(0, Math.floor(canvas.height * yr)))
      const pixel = context.getImageData(x, y, 1, 1).data
      return Math.round(pixel[0] * .2126 + pixel[1] * .7152 + pixel[2] * .0722)
    })
    return { luminanceRange: Math.max(...values) - Math.min(...values), visibleSamples: values.filter((value) => value >= 10).length }
  }, dataUrl)
  return { buffer, ...sample }
}

for (const spec of cases) {
  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] })
  const context = await browser.newContext({ viewport: spec.viewport, isMobile: spec.isMobile, hasTouch: spec.hasTouch, reducedMotion: spec.reducedMotion })
  const page = await context.newPage()
  const pageErrors = []
  const failedRequests = []
  const portalRequests = []
  page.on('pageerror', (error) => pageErrors.push(String(error)))
  page.on('requestfailed', (request) => failedRequests.push({ url: request.url(), failure: request.failure()?.errorText || 'unknown' }))
  page.on('request', (request) => { if (request.url().includes(path.basename(portalPath))) portalRequests.push(request.url()) })
  const record = { id: spec.id, viewport: spec.viewport, pageErrors, failedRequests, portalRequests, passed: false }
  try {
    const response = await page.goto(`${base}/home/?homeAssetReview=1&homePrivateFixture=1`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    const owner = page.locator('.urai-asset-home-world[data-home-primary-owner="asset-driven"]')
    await owner.waitFor({ state: 'visible', timeout: 45_000 })
    await page.waitForFunction(() => document.querySelector('.urai-asset-home-world')?.getAttribute('data-home-assets-ready') === 'true', null, { timeout: 45_000 })
    await frames(page)
    record.status = response?.status()
    record.visibleWorld = await owner.getAttribute('data-home-visible-world')
    record.worldCharacter = await owner.getAttribute('data-home-world-character')
    record.physicalBase = await owner.getAttribute('data-home-physical-base')
    record.visualOwnership = await owner.getAttribute('data-home-visual-ownership')
    record.desktopMobileWorld = await owner.getAttribute('data-home-desktop-mobile-world')
    record.embodiedSelf = await owner.getAttribute('data-home-embodied-self')
    record.movement = await owner.getAttribute('data-home-movement')
    record.visualGrade = await owner.getAttribute('data-home-visual-grade')
    record.artRevision = await owner.getAttribute('data-home-final-art-revision')
    record.artCertification = await owner.getAttribute('data-home-art-certification')
    record.runtimeAssets = await owner.getAttribute('data-home-runtime-assets')
    record.authoredRegions = await owner.getAttribute('data-home-authored-regions')
    record.cameraMode = await owner.getAttribute('data-home-camera-mode')
    record.orbState = await owner.getAttribute('data-home-orb-state')
    record.orbClip = await owner.getAttribute('data-home-orb-clip')
    record.orbMarkers = await owner.getByTestId('urai-home-webgl-orb').count()
    record.embodimentMarkers = await owner.getByTestId('urai-home-embodied-avatar').count()
    const semanticNav = page.getByRole('navigation', { name: 'Accessible Home destinations' })
    record.semanticButtons = await semanticNav.getByRole('button').count()
    record.semanticOwner = await semanticNav.getAttribute('data-home-navigation-owner')
    record.semanticNonDominant = await semanticNav.getAttribute('data-home-navigation-non-dominant')
    record.semanticOpacity = await page.evaluate(() => {
      const element = document.querySelector('.home-semantic-navigation[data-home-navigation-owner="runtime-boundary"]')
      return element ? Number.parseFloat(getComputedStyle(element).opacity || '1') : null
    })
    const visual = await imageEvidence(page)
    record.screenshot = `${spec.id}-${exactHead.slice(0, 12)}.png`
    await writeFile(path.join(outputDir, record.screenshot), visual.buffer)
    record.screenshotBytes = visual.buffer.length
    record.screenshotSha256 = createHash('sha256').update(visual.buffer).digest('hex')
    record.luminanceRange = visual.luminanceRange
    record.visibleSamples = visual.visibleSamples
    record.passed = record.status === 200
      && record.visibleWorld === 'open-air-sacred-tech-reliquary'
      && record.worldCharacter === 'premium-cinematic-sacred-tech'
      && record.physicalBase === 'authored-stone-machine-reliquary'
      && record.visualOwnership === 'three-dimensional-geometry'
      && record.desktopMobileWorld === 'same-scene'
      && record.embodiedSelf === 'makehuman-v4'
      && record.movement === 'walk-keyboard-click-touch'
      && record.visualGrade === 'cinematic-pbr-v54-authored-relic-sanctuary'
      && record.artRevision === 'v54-authored-relic-sanctuary-candidate'
      && record.artCertification === 'v54-retained-pixel-candidate-not-certified'
      && record.runtimeAssets?.includes('home-entry-chamber-v1.glb')
      && record.runtimeAssets?.includes('home-human-makehuman-v4.glb')
      && record.runtimeAssets?.includes(path.basename(orbPath))
      && record.runtimeAssets?.includes(path.basename(portalPath))
      && record.authoredRegions?.includes('home-sanctuary-pavilion')
      && record.authoredRegions?.includes('home-life-map-physical-portal')
      && record.cameraMode !== null
      && record.orbState !== null
      && (spec.reducedMotion !== 'reduce' || record.orbClip === 'orb-state-static')
      && record.orbMarkers === 1
      && record.embodimentMarkers === 1
      && record.semanticButtons === 3
      && record.semanticOwner === 'runtime-boundary'
      && record.semanticNonDominant === 'true'
      && Number.isFinite(record.semanticOpacity) && record.semanticOpacity <= .02
      && record.portalRequests.length >= 1
      && record.screenshotBytes > 12000
      && record.luminanceRange >= 16
      && record.visibleSamples >= 5
      && pageErrors.length === 0
      && failedRequests.length === 0
  } catch (error) {
    record.error = String(error)
  }
  receipt.cases.push(record)
  if (!record.passed) receipt.errors.push(record)
  await context.close().catch(() => {})
  await browser.close().catch(() => {})
}

await writeFile(path.join(outputDir, 'receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`)
if (receipt.errors.length) process.exit(1)
