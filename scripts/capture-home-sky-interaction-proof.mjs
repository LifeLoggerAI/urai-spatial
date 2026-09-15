import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'

const requireFromTierOne = createRequire(new URL('../urai-tier1/package.json', import.meta.url))
const { chromium } = requireFromTierOne('playwright')
const base = process.env.URAI_PROOF_BASE || 'http://127.0.0.1:4173'
const exactHead = process.env.URAI_EXACT_HEAD || 'local'
const outputDir = path.resolve(process.env.URAI_PROOF_DIR || 'artifacts/portal-orb-proof')
await mkdir(outputDir, { recursive: true })

const cases = [
  { id: 'desktop-left-sky', viewport: { width: 1440, height: 900 }, point: [.20, .18], expected: 'SKY_ASCENT' },
  { id: 'desktop-center-sky', viewport: { width: 1440, height: 900 }, point: [.50, .22], expected: 'SKY_ASCENT' },
  { id: 'desktop-right-sky', viewport: { width: 1440, height: 900 }, point: [.80, .18], expected: 'SKY_ASCENT' },
  { id: 'desktop-upper-middle-sky', viewport: { width: 1440, height: 900 }, point: [.50, .11], expected: 'SKY_ASCENT' },
  { id: 'desktop-ground-negative', viewport: { width: 1440, height: 900 }, point: [.50, .82], expected: 'NOT_SKY_ASCENT' },
  { id: 'mobile-sky', viewport: { width: 390, height: 844 }, point: [.50, .16], expected: 'SKY_ASCENT', isMobile: true, hasTouch: true },
  { id: 'mobile-ground-negative', viewport: { width: 390, height: 844 }, point: [.50, .82], expected: 'NOT_SKY_ASCENT', isMobile: true, hasTouch: true },
  { id: 'reduced-motion-sky', viewport: { width: 1440, height: 900 }, point: [.50, .18], expected: 'SKY_ASCENT', reducedMotion: 'reduce' },
]

const receipt = {
  schemaVersion: 'urai-home-sky-interaction-proof-5',
  exactHead,
  capturedAt: new Date().toISOString(),
  canonicalLaw: 'ground-to-atmosphere-to-depth-to-memory',
  canonicalShots: [],
  cases: [],
  errors: [],
}

async function waitForHomeReady(page) {
  const owner = page.locator('.urai-asset-home-world[data-home-primary-owner="asset-driven"]')
  await owner.waitFor({ state: 'visible', timeout: 45_000 })
  await page.waitForFunction(() => document.querySelector('.urai-asset-home-world')?.getAttribute('data-home-assets-ready') === 'true', null, { timeout: 45_000 })
  return owner
}

async function settleFrames(page, count = 30) {
  await page.evaluate((frames) => new Promise((resolve) => {
    let seen = 0
    const tick = () => { if (++seen >= frames) resolve(); else requestAnimationFrame(tick) }
    requestAnimationFrame(tick)
  }), count)
}

async function captureShot(page, id, options = {}) {
  const viewport = page.viewportSize()
  const canvas = page.locator('.urai-asset-home-world canvas')
  const box = await canvas.boundingBox()
  if (!viewport || !box) throw new Error(`${id}: missing viewport/canvas bounds`)
  const clip = options.clip
    ? {
        x: Math.max(0, box.x + box.width * options.clip.x),
        y: Math.max(0, box.y + box.height * options.clip.y),
        width: Math.max(1, Math.min(box.width * options.clip.width, viewport.width - (box.x + box.width * options.clip.x))),
        height: Math.max(1, Math.min(box.height * options.clip.height, viewport.height - (box.y + box.height * options.clip.y))),
      }
    : undefined
  const buffer = await page.screenshot({ animations: 'disabled', caret: 'hide', fullPage: false, clip, timeout: 90_000 })
  const filename = `${id}-${exactHead.slice(0, 12)}.png`
  await writeFile(path.join(outputDir, filename), buffer)
  const owner = page.locator('.urai-asset-home-world[data-home-primary-owner="asset-driven"]')
  const record = {
    id,
    filename,
    bytes: buffer.length,
    sha256: createHash('sha256').update(buffer).digest('hex'),
    scenePhase: await owner.getAttribute('data-home-scene-phase').catch(() => null),
    transitionProgress: await owner.getAttribute('data-home-transition-progress').catch(() => null),
    cameraMode: await owner.getAttribute('data-home-camera-mode').catch(() => null),
    url: page.url(),
    passed: buffer.length > 12_000,
  }
  receipt.canonicalShots.push(record)
  if (!record.passed) receipt.errors.push(record)
  return record
}

async function openCanonicalHome(context, query = '') {
  const page = await context.newPage()
  const pageErrors = []
  page.on('pageerror', error => pageErrors.push(String(error)))
  await page.goto(`${base}/home/?homeAssetReview=1&homePrivateFixture=1${query ? `&${query}` : ''}`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await waitForHomeReady(page)
  await settleFrames(page, 45)
  return { page, pageErrors }
}

// Canonical 12-shot retained visual pack. These are acceptance evidence, not generated concept art.
{
  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] })
  try {
    // 01, 02, 03, 08, 09, 10, 11 and 12 share one canonical desktop journey.
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const { page, pageErrors } = await openCanonicalHome(context)
    if (pageErrors.length) throw new Error(`canonical desktop page errors: ${pageErrors.join(' | ')}`)
    await captureShot(page, 'sky-shot-01-canonical-home-establishing')
    await captureShot(page, 'sky-shot-02-orb-atmosphere-hero', { clip: { x: .40, y: .42, width: .42, height: .50 } })
    await captureShot(page, 'sky-shot-03-horizon-depth', { clip: { x: .05, y: .35, width: .90, height: .38 } })

    const canvas = page.locator('.urai-asset-home-world canvas')
    const box = await canvas.boundingBox()
    if (!box) throw new Error('canonical desktop canvas missing')
    const skyX = box.x + box.width * .50
    const skyY = box.y + box.height * .18
    await page.mouse.move(skyX, skyY)
    await page.waitForTimeout(450)
    await captureShot(page, 'sky-shot-08-broad-sky-intent')

    await page.mouse.click(skyX, skyY)
    await page.waitForFunction(() => document.querySelector('.urai-asset-home-world')?.getAttribute('data-home-scene-phase') === 'SKY_ASCENT', null, { timeout: 6_000, polling: 20 })
    await page.waitForTimeout(500)
    await captureShot(page, 'sky-shot-09-ascent-lower-atmosphere')
    await page.waitForTimeout(520)
    await captureShot(page, 'sky-shot-10-atmospheric-threshold')
    await page.waitForURL(url => url.pathname.startsWith('/life-map'), { timeout: 8_000 }).catch(() => {})
    await page.waitForTimeout(450)
    await captureShot(page, 'sky-shot-11-first-life-map-reveal')
    await context.close()

    // 04 and 05 use the same runtime with a restrained pointer-look pitch change.
    const lookContext = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const { page: lookPage, pageErrors: lookErrors } = await openCanonicalHome(lookContext)
    if (lookErrors.length) throw new Error(`upward-view page errors: ${lookErrors.join(' | ')}`)
    const lookCanvas = lookPage.locator('.urai-asset-home-world canvas')
    const lookBox = await lookCanvas.boundingBox()
    if (!lookBox) throw new Error('upward-view canvas missing')
    const cx = lookBox.x + lookBox.width * .50
    const cy = lookBox.y + lookBox.height * .55
    await lookPage.mouse.move(cx, cy)
    await lookPage.mouse.down()
    await lookPage.mouse.move(cx, cy + lookBox.height * .20, { steps: 12 })
    await lookPage.mouse.up()
    await settleFrames(lookPage, 24)
    await captureShot(lookPage, 'sky-shot-04-upward-high-atmosphere')
    await captureShot(lookPage, 'sky-shot-05-cloud-volumetric-detail', { clip: { x: .12, y: .05, width: .76, height: .58 } })
    await captureShot(lookPage, 'sky-shot-12-pixel-vfx-forensic', { clip: { x: .28, y: .08, width: .44, height: .44 } })
    await lookContext.close()

    // 06 is the same world with reflective atmospheric parameters only.
    const reflectiveContext = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const { page: reflectivePage, pageErrors: reflectiveErrors } = await openCanonicalHome(reflectiveContext, 'homeWeather=reflective')
    if (reflectiveErrors.length) throw new Error(`reflective-weather page errors: ${reflectiveErrors.join(' | ')}`)
    await captureShot(reflectivePage, 'sky-shot-06-reflective-emotional-weather')
    await reflectiveContext.close()

    // 07 exercises the bounded local-time modulation during a real deep-night clock window.
    const nightContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, timezoneId: 'Europe/London' })
    const { page: nightPage, pageErrors: nightErrors } = await openCanonicalHome(nightContext)
    if (nightErrors.length) throw new Error(`deep-night page errors: ${nightErrors.join(' | ')}`)
    await captureShot(nightPage, 'sky-shot-07-deep-night-influence')
    await nightContext.close()
  } catch (error) {
    receipt.errors.push({ id: 'canonical-12-shot-pack', error: String(error), passed: false })
  } finally {
    await browser.close().catch(() => {})
  }
}

// Existing interaction matrix remains intact so visual evidence cannot weaken semantic ownership.
for (const spec of cases) {
  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] })
  const context = await browser.newContext({ viewport: spec.viewport, isMobile: spec.isMobile, hasTouch: spec.hasTouch, reducedMotion: spec.reducedMotion })
  const page = await context.newPage()
  const pageErrors = []
  page.on('pageerror', error => pageErrors.push(String(error)))
  const record = { ...spec, passed: false, pageErrors }
  try {
    await page.goto(`${base}/home/?homeAssetReview=1&homePrivateFixture=1`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    const owner = await waitForHomeReady(page)
    await page.evaluate(() => {
      const root = document.querySelector('.urai-asset-home-world')
      window.__uraiSkyPhaseTrace = root ? [root.getAttribute('data-home-scene-phase')] : []
      window.__uraiSkyTraceObserver?.disconnect?.()
      if (root) {
        window.__uraiSkyTraceObserver = new MutationObserver(() => {
          window.__uraiSkyPhaseTrace.push(root.getAttribute('data-home-scene-phase'))
        })
        window.__uraiSkyTraceObserver.observe(root, { attributes: true, attributeFilter: ['data-home-scene-phase'] })
      }
    })
    const canvas = owner.locator('canvas')
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Home canvas has no interaction bounds')
    const x = box.x + box.width * spec.point[0]
    const y = box.y + box.height * spec.point[1]
    if (spec.hasTouch) await page.touchscreen.tap(x, y)
    else await page.mouse.click(x, y)

    if (spec.expected === 'SKY_ASCENT') {
      await page.waitForFunction(() => {
        const root = document.querySelector('.urai-asset-home-world')
        const trace = window.__uraiSkyPhaseTrace || []
        return trace.includes('SKY_ASCENT')
          && root?.getAttribute('data-home-input-locked') === 'true'
          && root?.getAttribute('data-home-transition-sequence') === 'life-map:traversal'
          && root?.getAttribute('data-home-portal-sequence') === 'idle'
      }, null, { timeout: 6_000, polling: 25 })
      record.scenePhase = await owner.getAttribute('data-home-scene-phase')
      record.phaseTrace = await page.evaluate(() => window.__uraiSkyPhaseTrace || [])
      record.observedSkyAscent = record.phaseTrace.includes('SKY_ASCENT')
      record.inputLocked = await owner.getAttribute('data-home-input-locked')
      record.transitionSequence = await owner.getAttribute('data-home-transition-sequence')
      record.portalSequence = await owner.getAttribute('data-home-portal-sequence')
      record.cameraMode = await owner.getAttribute('data-home-camera-mode')
      await page.waitForTimeout(spec.reducedMotion === 'reduce' ? 80 : 180)
      await page.screenshot({ path: path.join(outputDir, `${spec.id}-${exactHead.slice(0,12)}.png`), animations: 'disabled', caret: 'hide' })
      record.passed = record.observedSkyAscent === true
        && record.inputLocked === 'true'
        && record.transitionSequence === 'life-map:traversal'
        && record.portalSequence === 'idle'
        && record.cameraMode === 'life-map'
        && pageErrors.length === 0
    } else {
      await page.waitForTimeout(300)
      record.scenePhase = await owner.getAttribute('data-home-scene-phase')
      record.phaseTrace = await page.evaluate(() => window.__uraiSkyPhaseTrace || [])
      record.inputLocked = await owner.getAttribute('data-home-input-locked')
      record.transitionSequence = await owner.getAttribute('data-home-transition-sequence')
      record.portalSequence = await owner.getAttribute('data-home-portal-sequence')
      record.passed = !record.phaseTrace.includes('SKY_ASCENT')
        && record.transitionSequence !== 'life-map:traversal'
        && record.portalSequence === 'idle'
        && pageErrors.length === 0
    }
  } catch (error) {
    record.error = String(error)
  }
  receipt.cases.push(record)
  if (!record.passed) receipt.errors.push(record)
  await context.close().catch(() => {})
  await browser.close().catch(() => {})
}

const expectedCanonicalIds = [
  'sky-shot-01-canonical-home-establishing',
  'sky-shot-02-orb-atmosphere-hero',
  'sky-shot-03-horizon-depth',
  'sky-shot-04-upward-high-atmosphere',
  'sky-shot-05-cloud-volumetric-detail',
  'sky-shot-06-reflective-emotional-weather',
  'sky-shot-07-deep-night-influence',
  'sky-shot-08-broad-sky-intent',
  'sky-shot-09-ascent-lower-atmosphere',
  'sky-shot-10-atmospheric-threshold',
  'sky-shot-11-first-life-map-reveal',
  'sky-shot-12-pixel-vfx-forensic',
]
const retainedIds = new Set(receipt.canonicalShots.map(shot => shot.id))
for (const id of expectedCanonicalIds) {
  if (!retainedIds.has(id)) receipt.errors.push({ id, error: 'canonical shot missing', passed: false })
}

await writeFile(path.join(outputDir, 'sky-interaction-receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`)
if (receipt.errors.length) process.exit(1)
