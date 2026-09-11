import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'

const requireFromTierOne = createRequire(new URL('../urai-tier1/package.json', import.meta.url))
const { chromium } = requireFromTierOne('playwright')
const base = process.env.URAI_PROOF_BASE || 'http://127.0.0.1:4173'
const exactHead = process.env.URAI_EXACT_HEAD || 'local'
const outputDir = path.resolve(process.env.URAI_PROOF_DIR || 'artifacts/portal-orb-proof')
const geometryPath = path.resolve('urai-tier1/src/spatial/layout/HomeWorldProductionV223Geometry.tsx')
const polishPath = path.resolve('urai-tier1/src/spatial/layout/HomeWorldProductionV225PolishV2.tsx')
const geometry = await readFile(geometryPath, 'utf8')
const polish = await readFile(polishPath, 'utf8')

for (const marker of [
  'home-v225-sculpted-sanctuary-floor',
  'home-v225-rooted-memory-rib',
  'home-v225-ground-sheltered-memory-basin',
  'home-v225-life-map-braided-lineage-vault',
  'home-v225-single-connected-folded-living-memory-mantle',
  'home-v225-embedded-memory-veins',
]) if (!geometry.includes(marker)) throw new Error(`V225 geometry source missing ${marker}`)
for (const marker of [
  'home-v225-v2-production-memory-sanctuary',
  'home-v225-v2-continuous-sculpted-memory-valley',
  'home-v225-v2-cathedral-memory-ribs',
  'home-v225-v2-ground-memory-hearth',
  'home-v225-v2-life-map-lineage-observatory',
  'home-v225-v2-intimate-veined-living-memory-orb',
  'home-v225-v2-orb-embedded-memory-veins',
]) if (!polish.includes(marker)) throw new Error(`V225 V2 polish source missing ${marker}`)
if (`${geometry}\n${polish}`.includes('useGLTF(')) throw new Error('V226 direct runtime composition must not mount predecessor GLBs')

// Historical marker checks above are not the identity of the rendered scene.
// Include the active camera, art, and material owners in every retained receipt.
const runtimePaths = [
  'urai-tier1/src/spatial/layout/HomeWorldProductionV223Geometry.tsx',
  'urai-tier1/src/spatial/layout/HomeWorldProductionV225PolishV2.tsx',
  'urai-tier1/src/spatial/layout/HomeWorldProductionV223.tsx',
  'urai-tier1/src/spatial/layout/HomeWorldProductionV225PolishV3.tsx',
  'urai-tier1/src/spatial/assets/livingMemoryMaterial.ts',
  'urai-tier1/src/spatial/assets/naturalSurfaceMaps.ts',
  'urai-tier1/src/spatial/assets/useSanctuarySoilTexture.ts',
]
const runtimeFiles = await Promise.all(runtimePaths.map(async (file) => {
  const source = await readFile(path.resolve(file), 'utf8')
  return { path: file, source, bytes: Buffer.byteLength(source), sha256: createHash('sha256').update(source).digest('hex') }
}))
const runtimeSource = runtimeFiles.map(file => `${file.path}\n${file.source}`).join('\n')
const runtimeIdentity = {
  paths: runtimePaths,
  files: runtimeFiles.map(({ path, bytes, sha256 }) => ({ path, bytes, sha256 })),
  bytes: Buffer.byteLength(runtimeSource),
  sha256: createHash('sha256').update(runtimeSource).digest('hex'),
  exactHead,
  verified: true,
}
const cases = [
  { id: 'desktop', viewport: { width: 1440, height: 900 } },
  { id: 'laptop', viewport: { width: 1280, height: 800 } },
  { id: 'mobile', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  { id: 'mobile-narrow', viewport: { width: 320, height: 900 }, isMobile: true, hasTouch: true },
  { id: 'reduced-motion', viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' },
]
await mkdir(outputDir, { recursive: true })
const receipt = {
  schemaVersion: 'urai-natural-home-orb-proof-15', exactHead, capturedAt: new Date().toISOString(), runtimeIdentity,
  visualPolicy: 'V226 Home requires one continuous inhabited navigable memory sanctuary, readable Ground and Life Map destinations, one rooted living-memory presence, strong desktop/mobile/reduced-motion composition, no unresolved loading, and literal retained-pixel inspection.',
  cases: [], errors: [],
}

async function settle(page, count) {
  await page.evaluate((required) => new Promise((resolve) => {
    let seen = 0
    const tick = () => { if (++seen >= required) resolve(); else requestAnimationFrame(tick) }
    requestAnimationFrame(tick)
  }), count)
}
async function imageEvidence(page) {
  const buffer = await page.screenshot({ fullPage: false, animations: 'disabled', caret: 'hide', timeout: 90_000 })
  const dataUrl = `data:image/png;base64,${buffer.toString('base64')}`
  const sample = await page.evaluate(async (url) => {
    const image = new Image()
    await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; image.src = url })
    const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight
    const context = canvas.getContext('2d', { willReadFrequently: true }); if (!context) return { luminanceRange: 0, visibleSamples: 0 }
    context.drawImage(image, 0, 0)
    const points = [[.12,.18],[.36,.18],[.64,.18],[.88,.18],[.12,.5],[.36,.5],[.64,.5],[.88,.5],[.12,.82],[.36,.82],[.64,.82],[.88,.82]]
    const values = points.map(([xr, yr]) => {
      const p = context.getImageData(Math.floor(canvas.width*xr), Math.floor(canvas.height*yr), 1, 1).data
      return Math.round(p[0]*.2126+p[1]*.7152+p[2]*.0722)
    })
    return { luminanceRange: Math.max(...values)-Math.min(...values), visibleSamples: values.filter((v) => v >= 10).length }
  }, dataUrl)
  return { buffer, ...sample }
}

for (const spec of cases) {
  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] })
  const context = await browser.newContext({ viewport: spec.viewport, isMobile: spec.isMobile, hasTouch: spec.hasTouch, reducedMotion: spec.reducedMotion })
  const page = await context.newPage(); const pageErrors = []; const failedRequests = []
  page.on('pageerror', (error) => pageErrors.push(String(error)))
  page.on('requestfailed', (request) => failedRequests.push({ url: request.url(), failure: request.failure()?.errorText || 'unknown' }))
  const record = { id: spec.id, viewport: spec.viewport, pageErrors, failedRequests, passed: false }
  try {
    const response = await page.goto(`${base}/home/?homeAssetReview=1&homePrivateFixture=1`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    const owner = page.locator('.urai-asset-home-world[data-home-primary-owner="asset-driven"]')
    await owner.waitFor({ state: 'visible', timeout: 45_000 })
    await page.waitForFunction(() => document.querySelector('.urai-asset-home-world')?.getAttribute('data-home-assets-ready') === 'true', null, { timeout: 45_000 })
    await settle(page, spec.reducedMotion === 'reduce' ? 4 : 12)
    const attr = (name) => owner.getAttribute(name)
    record.status = response?.status(); record.canvasCount = await owner.locator('canvas').count()
    record.worldCharacter = await attr('data-home-world-character'); record.visualOwnership = await attr('data-home-visual-ownership')
    record.desktopMobileWorld = await attr('data-home-desktop-mobile-world'); record.movement = await attr('data-home-movement')
    record.visualGrade = await attr('data-home-visual-grade'); record.artRevision = await attr('data-home-final-art-revision')
    record.artCertification = await attr('data-home-art-certification'); record.v226Certification = await attr('data-home-v226-certification'); record.v225Certification = await attr('data-home-v225-certification')
    record.v224Certification = await attr('data-home-v224-certification'); record.v223Certification = await attr('data-home-v223-certification')
    record.runtimeAssets = await attr('data-home-runtime-assets'); record.governedIdentityAssets = await attr('data-home-governed-identity-assets')
    record.visibleProductionAssets = await attr('data-home-visible-production-assets'); record.authoredRegions = await attr('data-home-authored-regions')
    record.cameraMode = await attr('data-home-camera-mode'); record.orbState = await attr('data-home-orb-state'); record.orbModelClip = await attr('data-home-orb-model-clip')
    record.orbMarkers = await owner.getByTestId('urai-home-webgl-orb').count(); record.embodimentMarkers = await owner.getByTestId('urai-home-embodied-avatar').count()
    const nav = page.getByRole('navigation', { name: 'Accessible Home destinations' })
    record.semanticButtons = await nav.getByRole('button').count(); record.semanticLinks = await nav.getByRole('link').count()
    record.semanticGroundHref = await nav.getByTestId('home-semantic-ground').getAttribute('href'); record.semanticLifeMapHref = await nav.getByTestId('home-semantic-life-map').getAttribute('href')
    record.semanticOwner = await nav.getAttribute('data-home-navigation-owner'); record.semanticNonDominant = await nav.getAttribute('data-home-navigation-non-dominant')
    record.semanticOpacity = await nav.evaluate((node) => Number.parseFloat(getComputedStyle(node).opacity || '1'))
    const visual = await imageEvidence(page)
    record.screenshot = `${spec.id}-${exactHead.slice(0,12)}.png`; await writeFile(path.join(outputDir, record.screenshot), visual.buffer)
    record.screenshotBytes = visual.buffer.length; record.screenshotSha256 = createHash('sha256').update(visual.buffer).digest('hex')
    record.luminanceRange = visual.luminanceRange; record.visibleSamples = visual.visibleSamples
    record.passed = record.status === 200 && record.canvasCount === 1
      && record.worldCharacter === 'production-cinematic-sacred-tech'
      && record.visualOwnership === 'single-canvas-three-dimensional-geometry'
      && record.desktopMobileWorld === 'same-scene' && record.movement === 'walk-keyboard-click-touch'
      && record.visualGrade === 'v226-literal-pixel-candidate-not-certified'
      && record.artRevision === 'v226-retained-pixels-pending'
      && record.artCertification === 'fresh-exact-head-pixels-required' && record.v226Certification === 'fresh-exact-head-pixels-required' && record.v225Certification === 'superseded-rejected-pixels'
      && record.v224Certification === 'superseded-rejected-pixels' && record.v223Certification === 'superseded-rejected-pixels'
      && record.runtimeAssets?.includes('HomeWorldProductionV223Geometry.tsx') && record.runtimeAssets?.includes('HomeWorldProductionV225PolishV2.tsx')
      && record.governedIdentityAssets === 'v226-direct-runtime-topology historical-v191-glbs-unmounted'
      && record.visibleProductionAssets?.includes('v226-weathered-memory-banks')
      && record.visibleProductionAssets?.includes('v226-ground-inhabited-hearth')
      && record.visibleProductionAssets?.includes('v226-life-map-lineage-observatory')
      && record.visibleProductionAssets?.includes('v226-rooted-single-living-memory-presence')
      && record.authoredRegions?.includes('home-sanctuary-pavilion') && record.authoredRegions?.includes('home-life-map-physical-portal')
      && record.cameraMode !== null && record.orbState !== null
      && (spec.reducedMotion !== 'reduce' || record.orbModelClip === 'stopped-reduced-motion')
      && record.orbMarkers === 1 && record.embodimentMarkers === 1
      && record.semanticButtons === 1 && record.semanticLinks === 2
      && record.semanticGroundHref === '/ground/?entryPortal=home-ground&cameraCheckpoint=home-ground-descent'
      && record.semanticLifeMapHref === '/life-map/?from=home-sky&entryPortal=home-sky&cameraCheckpoint=home-sky-ascent-complete'
      && record.semanticOwner === 'runtime-boundary' && record.semanticNonDominant === 'true' && Number.isFinite(record.semanticOpacity) && record.semanticOpacity <= .02
      && record.screenshotBytes > 12000 && record.luminanceRange >= 16 && record.visibleSamples >= 5
      && pageErrors.length === 0 && failedRequests.length === 0
  } catch (error) { record.error = String(error) }
  receipt.cases.push(record); if (!record.passed) receipt.errors.push(record)
  await context.close().catch(() => {}); await browser.close().catch(() => {})
}
await writeFile(path.join(outputDir, 'receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`)
if (receipt.errors.length) process.exit(1)
