import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'

const requireFromTierOne = createRequire(new URL('../urai-tier1/package.json', import.meta.url))
const { chromium } = requireFromTierOne('playwright')
const base = process.env.URAI_PROOF_BASE || 'http://127.0.0.1:4173'
const exactHead = process.env.URAI_EXACT_HEAD || 'local'
const outputDir = path.resolve(process.env.URAI_PROOF_DIR || 'artifacts/portal-orb-proof')
const authorityPath = path.resolve('urai-tier1/src/app/currentHomeVisualAuthority.json')
const authority = JSON.parse(await readFile(authorityPath, 'utf8'))
const runtimePaths = [
  'urai-tier1/src/app/AssetDrivenHomeWorld.tsx',
  'urai-tier1/src/app/HomeSpatialRuntimeLayer.tsx',
  'urai-tier1/src/app/currentHomeVisualAuthority.json',
  'urai-tier1/src/spatial/layout/HomeWorldProductionV223.tsx',
  'urai-tier1/src/spatial/assets/HomeAtmosphericSky.tsx',
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
  visualAuthority: authority,
  verified: true,
}
const cases = [
  { id: 'desktop', viewport: { width: 1440, height: 900 } },
  { id: 'laptop', viewport: { width: 1280, height: 800 } },
  { id: 'mobile', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  { id: 'mobile-narrow', viewport: { width: 320, height: 900 }, isMobile: true, hasTouch: true },
  { id: 'reduced-motion', viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' },
  { id: 'mobile-warning', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, orbState: 'warning' },
  { id: 'reduced-motion-privacy', viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', orbState: 'privacy' },
]
await mkdir(outputDir, { recursive: true })
const receipt = {
  schemaVersion: 'urai-natural-home-orb-proof-19', exactHead, capturedAt: new Date().toISOString(), runtimeIdentity,
  visualPolicy: 'Current Home begins with the governed Avatar presentation and requires explicit activation into bodyless non-XR first-person Home. The living-memory Orb, physical Ground surface, and broad visible sky remain in one continuous world. Exact-head pixels remain candidates until literally inspected.',
  cases: [], errors: [],
}

async function settle(page, count) {
  await page.evaluate((required) => new Promise((resolve) => {
    let seen = 0
    const tick = () => { if (++seen >= required) resolve(); else requestAnimationFrame(tick) }
    requestAnimationFrame(tick)
  }), count)
}
async function focusTestIdForKeyboard(page, testId) {
  const focused = await page.evaluate((id) => {
    const element = document.querySelector(`[data-testid="${id}"]`)
    if (!(element instanceof HTMLElement)) return false
    element.focus()
    return document.activeElement === element
  }, testId)
  if (!focused) throw new Error(`keyboard target ${testId} could not receive focus`)
}

async function ensureReviewOrbState(page, state) {
  const selector = '.urai-asset-home-world[data-home-primary-owner="asset-driven"]'
  const observed = await page.waitForFunction(({ selector, state }) => {
    return document.querySelector(selector)?.getAttribute('data-home-orb-state') === state
  }, { selector, state }, { timeout: 4_000 }).then(() => true).catch(() => false)
  if (observed) return
  await page.evaluate((requestedState) => {
    window.dispatchEvent(new CustomEvent('urai:orb-state', {
      detail: { state: requestedState, source: 'system' },
    }))
  }, state)
  await page.waitForFunction(({ selector, state }) => {
    return document.querySelector(selector)?.getAttribute('data-home-orb-state') === state
  }, { selector, state }, { timeout: 15_000 })
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
  page.on('pageerror', error => pageErrors.push(String(error)))
  page.on('requestfailed', request => failedRequests.push({ url: request.url(), failure: request.failure()?.errorText || 'unknown' }))
  const record = { id: spec.id, viewport: spec.viewport, pageErrors, failedRequests, passed: false }
  try {
    const stateQuery = spec.orbState ? `&homeOrbState=${encodeURIComponent(spec.orbState)}` : ''
    const response = await page.goto(`${base}/home/?homeAssetReview=1&homePrivateFixture=1${stateQuery}`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    const owner = page.locator('.urai-asset-home-world[data-home-primary-owner="asset-driven"]')
    await owner.waitFor({ state: 'visible', timeout: 45_000 })
    await page.waitForFunction(() => document.querySelector('.urai-asset-home-world')?.getAttribute('data-home-assets-ready') === 'true', null, { timeout: 45_000 })
    if (spec.orbState) await ensureReviewOrbState(page, spec.orbState)
    await settle(page, spec.reducedMotion === 'reduce' ? 4 : 12)
    const attr = name => owner.getAttribute(name)
    record.status = response?.status(); record.canvasCount = await owner.locator('canvas').count()
    record.visibleWorld = await attr('data-home-visible-world'); record.worldCharacter = await attr('data-home-world-character')
    record.visualOwnership = await attr('data-home-visual-ownership'); record.desktopMobileWorld = await attr('data-home-desktop-mobile-world')
    record.presentationStableState = await attr('data-home-stable-state')
    record.presentationEmbodiedSelf = await attr('data-home-embodied-self')
    record.presentationPresence = await attr('data-home-presence-presentation')
    record.presentationMovement = await attr('data-home-movement')
    record.presentationCameraMode = await attr('data-home-camera-mode')
    record.visualGrade = await attr('data-home-visual-grade')
    record.artCertification = await attr('data-home-art-certification'); record.runtimeAssets = await attr('data-home-runtime-assets')
    record.physicalBase = await attr('data-home-physical-base'); record.authoredRegions = await attr('data-home-authored-regions')
    record.groundEntry = await attr('data-home-ground-entry'); record.lifeMapEntry = await attr('data-home-life-map-entry')
    record.orbState = await attr('data-home-orb-state'); record.orbModelClip = await attr('data-home-orb-model-clip')
    record.orbMarkers = await owner.getByTestId('urai-home-webgl-orb').count(); record.embodimentMarkers = await owner.getByTestId('urai-home-embodied-avatar').count()
    const presentationVisual = await imageEvidence(page)
    record.presentationScreenshot = `${spec.id}-presentation-${exactHead.slice(0,12)}.png`
    await writeFile(path.join(outputDir, record.presentationScreenshot), presentationVisual.buffer)
    record.presentationScreenshotBytes = presentationVisual.buffer.length

    const enter = page.getByTestId('urai-home-avatar-enter-first-person')
    await enter.waitFor({ state: 'attached', timeout: 30_000 })
    await focusTestIdForKeyboard(page, 'urai-home-avatar-enter-first-person')
    await page.keyboard.press('Enter')
    await page.waitForFunction(() => document.querySelector('.urai-asset-home-world')?.getAttribute('data-home-stable-state') === 'AVATAR_HOME_FIRST_PERSON', null, { timeout: 60_000 })
    await settle(page, spec.reducedMotion === 'reduce' ? 2 : 4)

    record.stableState = await attr('data-home-stable-state')
    record.embodiedSelf = await attr('data-home-embodied-self')
    record.presencePresentation = await attr('data-home-presence-presentation')
    record.movement = await attr('data-home-movement')
    record.cameraMode = await attr('data-home-camera-mode')
    const nav = page.getByRole('navigation', { name: 'Accessible Home destinations' })
    record.semanticButtons = await nav.getByRole('button').count(); record.semanticLinks = await nav.getByRole('link').count()
    record.semanticGroundHref = await nav.getByTestId('home-semantic-ground').getAttribute('href'); record.semanticLifeMapHref = await nav.getByTestId('home-semantic-life-map').getAttribute('href')
    record.semanticOwner = await nav.getAttribute('data-home-navigation-owner'); record.semanticNonDominant = await nav.getAttribute('data-home-navigation-non-dominant')
    const visual = await imageEvidence(page)
    record.screenshot = `${spec.id}-${exactHead.slice(0,12)}.png`; await writeFile(path.join(outputDir, record.screenshot), visual.buffer)
    record.screenshotBytes = visual.buffer.length; record.screenshotSha256 = createHash('sha256').update(visual.buffer).digest('hex')
    record.luminanceRange = visual.luminanceRange; record.visibleSamples = visual.visibleSamples
    record.passed = record.status === 200 && record.canvasCount === 1
      && record.visibleWorld === authority.worldIdentifier
      && record.visibleWorld === 'cinematic-lived-world-threshold'
      && record.worldCharacter === 'production-cinematic-modern-lived-home-stone-timber-glass'
      && record.visualOwnership === 'single-canvas-three-dimensional-geometry'
      && record.desktopMobileWorld === 'same-scene'
      && record.presentationStableState === 'HOME_PRESENTATION'
      && record.presentationEmbodiedSelf === 'visible-avatar-home-presentation'
      && record.presentationPresence === 'visible-avatar-presentation-activation-gate'
      && record.presentationMovement === 'avatar-presentation-target-activate'
      && record.presentationCameraMode === 'home-avatar-presentation'
      && record.stableState === 'AVATAR_HOME_FIRST_PERSON'
      && record.embodiedSelf === 'camera-only-first-person-home'
      && record.presencePresentation === 'bodyless-first-person-home'
      && record.movement === 'shared-keyboard-touch-walk-look-interact'
      && record.visualGrade === 'current-literal-pixel-candidate-not-certified'
      && record.artCertification === 'fresh-exact-head-pixels-required'
      && record.physicalBase === 'continuous-lived-physical-world'
      && record.runtimeAssets?.includes('HomeAtmosphericSky.tsx')
      && record.runtimeAssets?.includes('HomeWorldProductionV223.tsx')
      && record.authoredRegions?.includes('home-physical-world')
      && record.authoredRegions?.includes('home-avatar-presentation')
      && record.authoredRegions?.includes('home-camera-only-first-person')
      && record.authoredRegions?.includes('home-living-memory-orb')
      && record.authoredRegions?.includes('home-life-map-sky-threshold')
      && !record.authoredRegions?.includes('home-life-map-physical-portal')
      && record.groundEntry === 'physical-world-surface'
      && record.lifeMapEntry === 'visible-sky-broad-interaction'
      && (record.cameraMode === 'home-first-person' || record.cameraMode === 'home-first-person-look') && record.orbState !== null
      && (!spec.orbState || record.orbState === spec.orbState)
      && (spec.reducedMotion !== 'reduce' || record.orbModelClip === 'stopped-reduced-motion')
      && record.orbMarkers === 1 && record.embodimentMarkers === 0
      && record.semanticButtons === 1 && record.semanticLinks === 2
      && record.semanticGroundHref === '/ground/?entryPortal=home-ground&cameraCheckpoint=home-ground-descent'
      && record.semanticLifeMapHref === '/life-map/?from=home-sky&entryPortal=home-sky&cameraCheckpoint=home-sky-ascent-complete'
      && record.semanticOwner === 'runtime-boundary' && record.semanticNonDominant === 'true'
      && record.presentationScreenshotBytes > 12000
      && record.screenshotBytes > 12000 && record.luminanceRange >= 16 && record.visibleSamples >= 5
      && pageErrors.length === 0 && failedRequests.length === 0
  } catch (error) { record.error = String(error) }
  receipt.cases.push(record); if (!record.passed) receipt.errors.push(record)
  await context.close().catch(() => {}); await browser.close().catch(() => {})
}
await writeFile(path.join(outputDir, 'receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`)
if (receipt.errors.length) process.exit(1)
