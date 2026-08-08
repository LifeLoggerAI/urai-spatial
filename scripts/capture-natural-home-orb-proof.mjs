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
const providerDesktop = '/assets/urai/replay/replay-memory-film-main.webp'
const providerMobile = '/assets/urai/replay/replay-memory-film-mobile.webp'
const finalPackReceiptPath = path.resolve('operations/assets/generated-receipts/urai-final-glb-pack-v1.json')
const finalPackReceipt = JSON.parse(await readFile(finalPackReceiptPath, 'utf8'))
const orbReceipt = finalPackReceipt.assets?.find((asset) => asset.fileName === path.basename(orbPath))
if (!orbReceipt) throw new Error('final GLB receipt is missing Orb identity')
const orbBytes = await readFile(path.resolve('urai-tier1/public', orbPath.slice(1)))
const orbSha256 = createHash('sha256').update(orbBytes).digest('hex')
if (orbBytes.length !== orbReceipt.bytes || orbSha256 !== orbReceipt.sha256) throw new Error('Orb binary identity mismatch')

const cases = [
  { id: 'desktop', viewport: { width: 1440, height: 900 }, expectedProvider: providerDesktop },
  { id: 'mobile', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, expectedProvider: providerMobile },
  { id: 'reduced-motion', viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', expectedProvider: providerDesktop },
]

await mkdir(outputDir, { recursive: true })
const receipt = {
  schemaVersion: 'urai-natural-home-orb-proof-1',
  exactHead,
  capturedAt: new Date().toISOString(),
  orbIdentity: { path: orbPath, bytes: orbBytes.length, sha256: orbSha256, verified: true },
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
  page.on('request', (request) => { if (request.url().includes('portal-ring-master-v1.glb')) portalRequests.push(request.url()) })
  const record = { id: spec.id, viewport: spec.viewport, pageErrors, failedRequests, portalRequests, passed: false }
  try {
    const response = await page.goto(`${base}/home/?homeAssetReview=1&homePrivateFixture=1`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    const owner = page.locator('.urai-asset-home-world[data-home-primary-owner="asset-driven"]')
    await owner.waitFor({ state: 'visible', timeout: 45_000 })
    await page.waitForFunction(() => document.querySelector('.urai-asset-home-world')?.getAttribute('data-home-assets-ready') === 'true', null, { timeout: 45_000 })
    await frames(page)
    record.status = response?.status()
    record.realWorldFirst = await owner.getAttribute('data-home-real-world-first')
    record.visiblePortals = await owner.getAttribute('data-home-visible-portals')
    record.transitionAffordances = await owner.getAttribute('data-home-transition-affordances')
    record.providerEnvironment = await owner.getAttribute('data-home-provider-environment')
    record.generatedScenery = await owner.getAttribute('data-home-generated-scenery')
    record.physicalBase = await owner.getAttribute('data-home-physical-base')
    record.embodiedSelf = await owner.getAttribute('data-home-embodied-self')
    record.orbMarkers = await owner.getByTestId('urai-home-webgl-orb').count()
    record.embodimentMarkers = await owner.getByTestId('urai-home-embodied-avatar').count()
    const semanticNav = page.getByRole('navigation', { name: 'Accessible Home destinations' })
    record.semanticButtons = await semanticNav.getByRole('button').count()
    record.semanticOwner = await semanticNav.getAttribute('data-home-navigation-owner')
    record.semanticNonDominant = await semanticNav.getAttribute('data-home-navigation-non-dominant')
    record.semanticOpacity = await semanticNav.evaluate((element) => Number.parseFloat(getComputedStyle(element).opacity || '1'))
    record.providerBackdrop = await owner.evaluate((element) => getComputedStyle(element, '::before').backgroundImage)
    const visual = await imageEvidence(page)
    record.screenshot = `${spec.id}-${exactHead.slice(0, 12)}.png`
    await writeFile(path.join(outputDir, record.screenshot), visual.buffer)
    record.screenshotBytes = visual.buffer.length
    record.screenshotSha256 = createHash('sha256').update(visual.buffer).digest('hex')
    record.luminanceRange = visual.luminanceRange
    record.visibleSamples = visual.visibleSamples
    record.passed = record.status === 200
      && record.realWorldFirst === 'true'
      && record.visiblePortals === 'false'
      && record.transitionAffordances === 'ground-environmental-descent life-map-sky-lookout'
      && record.providerEnvironment === providerDesktop
      && record.generatedScenery === 'suppressed'
      && record.physicalBase === 'authored-terrain'
      && record.embodiedSelf === 'privacy-preserving-shadow'
      && record.orbMarkers === 1
      && record.embodimentMarkers === 1
      && record.semanticButtons === 3
      && record.semanticOwner === 'runtime-boundary'
      && record.semanticNonDominant === 'true'
      && Number.isFinite(record.semanticOpacity) && record.semanticOpacity <= .02
      && record.providerBackdrop.includes(spec.expectedProvider)
      && record.portalRequests.length === 0
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
