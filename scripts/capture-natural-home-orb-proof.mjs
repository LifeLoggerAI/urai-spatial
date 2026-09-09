import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'

const requireFromTierOne = createRequire(new URL('../urai-tier1/package.json', import.meta.url))
const { chromium } = requireFromTierOne('playwright')
const base = process.env.URAI_PROOF_BASE || 'http://127.0.0.1:4173'
const exactHead = process.env.URAI_EXACT_HEAD || 'local'
const outputDir = path.resolve(process.env.URAI_PROOF_DIR || 'artifacts/portal-orb-proof')
const runtimeSourcePath = path.resolve('urai-tier1/src/spatial/layout/HomeWorldProductionV223Geometry.tsx')
const runtimeSource = await readFile(runtimeSourcePath, 'utf8')
const requiredSourceMarkers = [
  'home-v224-sculpted-sanctuary-floor',
  'home-v224-rooted-memory-rib',
  "home-v224-${x.side < 0 ? 'port' : 'starboard'}-weathered-strata-${x.i + 1}",
  'home-v197-ground-continuous-sheltering-memory-wall',
  'home-v200-life-map-integrated-weathered-memory-ledger-1',
  'home-v201-single-connected-folded-living-memory-mantle',
  'meshPhysicalMaterial',
]
for (const marker of requiredSourceMarkers) if (!runtimeSource.includes(marker)) throw new Error(`V224 runtime source missing ${marker}`)
if (runtimeSource.includes('useGLTF(')) throw new Error('V224 direct runtime must not mount predecessor GLBs')
const runtimeIdentity = {
  path: 'urai-tier1/src/spatial/layout/HomeWorldProductionV223Geometry.tsx',
  bytes: Buffer.byteLength(runtimeSource),
  sha256: createHash('sha256').update(runtimeSource).digest('hex'),
  exactHead,
  verified: true,
}

const cases = [
  { id: 'desktop', viewport: { width: 1440, height: 900 } },
  { id: 'mobile', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  { id: 'reduced-motion', viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' },
]
await mkdir(outputDir, { recursive: true })
const receipt = {
  schemaVersion: 'urai-natural-home-orb-proof-11',
  exactHead,
  capturedAt: new Date().toISOString(),
  runtimeContract: 'v224-direct-runtime-sculpted-sanctuary-open-ground-sculptural-life-map-asymmetric-living-memory-orb-retained-pixel-proof',
  runtimeIdentity,
  visualPolicy: 'V224 Home must visibly retain one continuous inhabited navigable place with dimensional foreground/midground/background depth, coherent geology and atmosphere, open meaningful Ground and Life Map places, one intimate asymmetric living-memory Orb, good mobile framing, and no procedural-heightfield identity, dark monolith destinations, floating slabs, generic rocks, ring/platform portal, crystalline/fountain/three-ball/shard Orb, placeholder environment, or disconnected asset showcase. Literal rendered inspection remains required.',
  cases: [], errors: [],
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
    canvas.width = image.naturalWidth; canvas.height = image.naturalHeight
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
  const pageErrors = []; const failedRequests = []
  page.on('pageerror', (error) => pageErrors.push(String(error)))
  page.on('requestfailed', (request) => failedRequests.push({ url: request.url(), failure: request.failure()?.errorText || 'unknown' }))
  const record = { id: spec.id, viewport: spec.viewport, pageErrors, failedRequests, passed: false }
  try {
    const response = await page.goto(`${base}/home/?homeAssetReview=1&homePrivateFixture=1`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    const owner = page.locator('.urai-asset-home-world[data-home-primary-owner="asset-driven"]')
    await owner.waitFor({ state: 'visible', timeout: 45_000 })
    await page.waitForFunction(() => document.querySelector('.urai-asset-home-world')?.getAttribute('data-home-assets-ready') === 'true', null, { timeout: 45_000 })
    await frames(page, spec.reducedMotion === 'reduce' ? 4 : 12)
    const attr = (name) => owner.getAttribute(name)
    record.status = response?.status(); record.canvasCount = await owner.locator('canvas').count()
    record.visibleWorld = await attr('data-home-visible-world'); record.worldCharacter = await attr('data-home-world-character')
    record.physicalBase = await attr('data-home-physical-base'); record.visualOwnership = await attr('data-home-visual-ownership')
    record.desktopMobileWorld = await attr('data-home-desktop-mobile-world'); record.embodiedSelf = await attr('data-home-embodied-self')
    record.movement = await attr('data-home-movement'); record.visualGrade = await attr('data-home-visual-grade')
    record.artRevision = await attr('data-home-final-art-revision'); record.artCertification = await attr('data-home-art-certification')
    record.runtimeAssets = await attr('data-home-runtime-assets'); record.governedIdentityAssets = await attr('data-home-governed-identity-assets')
    record.visibleProductionAssets = await attr('data-home-visible-production-assets'); record.authoredRegions = await attr('data-home-authored-regions')
    record.cameraMode = await attr('data-home-camera-mode'); record.orbState = await attr('data-home-orb-state'); record.orbModelClip = await attr('data-home-orb-model-clip')
    record.v224Certification = await attr('data-home-v224-certification'); record.v223Certification = await attr('data-home-v223-certification')
    record.orbMarkers = await owner.getByTestId('urai-home-webgl-orb').count(); record.embodimentMarkers = await owner.getByTestId('urai-home-embodied-avatar').count()
    const semanticNav = page.getByRole('navigation', { name: 'Accessible Home destinations' })
    record.semanticButtons = await semanticNav.getByRole('button').count(); record.semanticLinks = await semanticNav.getByRole('link').count()
    record.semanticGroundHref = await semanticNav.getByTestId('home-semantic-ground').getAttribute('href')
    record.semanticLifeMapHref = await semanticNav.getByTestId('home-semantic-life-map').getAttribute('href')
    record.semanticOwner = await semanticNav.getAttribute('data-home-navigation-owner'); record.semanticNonDominant = await semanticNav.getAttribute('data-home-navigation-non-dominant')
    record.semanticOpacity = await page.evaluate(() => { const el = document.querySelector('.home-semantic-navigation[data-home-navigation-owner="runtime-boundary"]'); return el ? Number.parseFloat(getComputedStyle(el).opacity || '1') : null })
    const visual = await imageEvidence(page)
    record.screenshot = `${spec.id}-${exactHead.slice(0, 12)}.png`; await writeFile(path.join(outputDir, record.screenshot), visual.buffer)
    record.screenshotBytes = visual.buffer.length; record.screenshotSha256 = createHash('sha256').update(visual.buffer).digest('hex')
    record.luminanceRange = visual.luminanceRange; record.visibleSamples = visual.visibleSamples
    record.passed = record.status === 200
      && record.canvasCount === 1
      && record.worldCharacter === 'production-cinematic-sacred-tech'
      && record.physicalBase === 'sculpted-sanctuary-floor-overhanging-strata-rooted-memory-ribs-integrated-destinations'
      && record.visualOwnership === 'single-canvas-three-dimensional-geometry'
      && record.desktopMobileWorld === 'same-scene'
      && record.embodiedSelf === 'privacy-preserving-first-person'
      && record.movement === 'walk-keyboard-click-touch'
      && record.visualGrade === 'v224-literal-pixel-candidate-not-certified'
      && record.artRevision === 'v224-retained-pixels-pending'
      && record.artCertification === 'fresh-exact-head-pixels-required'
      && record.v224Certification === 'fresh-exact-head-pixels-required'
      && record.v223Certification === 'superseded-rejected-pixels'
      && record.runtimeAssets?.includes('HomeWorldProductionV223Geometry.tsx')
      && !record.runtimeAssets?.includes('home-continuous-landscape-v191.glb')
      && record.governedIdentityAssets === 'v224-direct-runtime-topology historical-v191-glbs-unmounted'
      && record.visibleProductionAssets?.includes('v224-sculpted-sanctuary-floor')
      && record.visibleProductionAssets?.includes('v224-open-ground-shelter')
      && record.visibleProductionAssets?.includes('v224-sculptural-life-map-ledger')
      && record.visibleProductionAssets?.includes('v224-asymmetric-living-memory-presence')
      && record.authoredRegions?.includes('home-sanctuary-pavilion')
      && record.authoredRegions?.includes('home-life-map-physical-portal')
      && record.cameraMode !== null && record.orbState !== null
      && (spec.reducedMotion !== 'reduce' || record.orbModelClip === 'stopped-reduced-motion')
      && record.orbMarkers === 1 && record.embodimentMarkers === 1
      && record.semanticButtons === 1 && record.semanticLinks === 2
      && record.semanticGroundHref === '/ground/?entryPortal=home-ground&cameraCheckpoint=home-ground-descent'
      && record.semanticLifeMapHref === '/life-map/?from=home-sky&entryPortal=home-sky&cameraCheckpoint=home-sky-ascent-complete'
      && record.semanticOwner === 'runtime-boundary' && record.semanticNonDominant === 'true'
      && Number.isFinite(record.semanticOpacity) && record.semanticOpacity <= .02
      && record.screenshotBytes > 12000 && record.luminanceRange >= 16 && record.visibleSamples >= 5
      && pageErrors.length === 0 && failedRequests.length === 0
  } catch (error) { record.error = String(error) }
  receipt.cases.push(record); if (!record.passed) receipt.errors.push(record)
  await context.close().catch(() => {}); await browser.close().catch(() => {})
}
await writeFile(path.join(outputDir, 'receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`)
if (receipt.errors.length) process.exit(1)
