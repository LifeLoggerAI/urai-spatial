import { mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'

const requireFromTierOne = createRequire(new URL('../urai-tier1/package.json', import.meta.url))
const { chromium } = requireFromTierOne('playwright')

const base = process.env.URAI_PROOF_BASE || 'http://127.0.0.1:4173'
const outputDir = path.resolve(process.env.URAI_PROOF_DIR || 'artifacts/continuous-spatial-proof')
const exactHead = process.env.URAI_EXACT_HEAD || 'local'
const group = process.env.URAI_PROOF_GROUP || 'visual'
const ownerSelector = '.urai-asset-home-world[data-home-primary-owner="asset-driven"]'
const orbStates = ['dormant','idle','attention','listening','thinking','speaking','guiding','reflecting','calming','privacy','warning','transition']

await mkdir(outputDir, { recursive: true })

const receipt = {
  schemaVersion: 'urai-continuous-spatial-visual-proof-22-cinematic-home',
  exactHead,
  group,
  capturedAt: new Date().toISOString(),
  productAuthority: {
    home: 'cinematic-first-person-no-avatar-grounded-companion',
    ground: 'physical-world-surface-to-first-person-lived-world',
    lifeMap: 'broad-visible-sky-ascent',
  },
  captures: [],
  interactions: [],
  errors: [],
}

const spec = {
  desktop: { width: 1440, height: 900, isMobile: false, hasTouch: false },
  portrait: { width: 390, height: 844, isMobile: true, hasTouch: true },
  landscape: { width: 844, height: 390, isMobile: true, hasTouch: true },
}

function safeName(value) { return value.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-|-$/g, '') }
function url(query = '') { return `${base}/home/${query ? `?${query}` : ''}` }

async function waitFrames(page, count = 8) {
  await page.evaluate((frames) => new Promise((resolve) => {
    let done = 0
    const tick = () => { done += 1; if (done >= frames) resolve(); else requestAnimationFrame(tick) }
    requestAnimationFrame(tick)
  }), count)
}

async function waitHome(page) {
  const owner = page.locator(ownerSelector)
  await owner.waitFor({ state: 'visible', timeout: 45_000 })
  await page.waitForFunction((selector) => {
    const node = document.querySelector(selector)
    return node?.getAttribute('data-home-assets-ready') === 'true'
      && node?.getAttribute('data-home-ready') === 'true'
      && node?.getAttribute('data-home-input-ready') === 'true'
      && node?.getAttribute('data-home-interaction-ready') === 'true'
  }, ownerSelector, { timeout: 45_000 })
  await waitFrames(page, 12)
  return owner
}

async function homeSnapshot(owner, page) {
  const canvas = owner.locator('canvas').first()
  const box = await canvas.boundingBox()
  const movementPad = page.locator('.urai-asset-home-world .urai-mobile-movement').first()
  return {
    visibleWorld: await owner.getAttribute('data-home-visible-world'),
    stableState: await owner.getAttribute('data-home-stable-state'),
    embodiedSelf: await owner.getAttribute('data-home-embodied-self'),
    presencePresentation: await owner.getAttribute('data-home-presence-presentation'),
    movement: await owner.getAttribute('data-home-movement'),
    groundEntry: await owner.getAttribute('data-home-ground-entry'),
    lifeMapEntry: await owner.getAttribute('data-home-life-map-entry'),
    phase: await owner.getAttribute('data-home-scene-phase'),
    cameraMode: await owner.getAttribute('data-home-camera-mode'),
    orbState: await owner.getAttribute('data-home-orb-state'),
    portalSequence: await owner.getAttribute('data-home-portal-sequence'),
    canvas: box ? { width: Math.round(box.width), height: Math.round(box.height) } : null,
    homeMovementPadCount: await page.locator('.urai-asset-home-world .urai-mobile-movement').count(),
    homeMovementPadVisible: await movementPad.isVisible().catch(() => false),
  }
}

function presentationSnapshotPasses(value) {
  return value.visibleWorld === 'cinematic-lived-world-threshold'
    && value.stableState === 'HOME_PRESENTATION'
    && value.embodiedSelf === 'visible-avatar-home-presentation'
    && value.presencePresentation === 'visible-avatar-presentation-activation-gate'
    && value.movement === 'avatar-presentation-target-activate'
    && value.cameraMode === 'home-avatar-presentation'
    && value.groundEntry === 'physical-world-surface'
    && value.lifeMapEntry === 'visible-sky-broad-interaction'
    && value.portalSequence === 'idle'
    && value.canvas?.width >= 240
    && value.canvas?.height >= 240
    && value.homeMovementPadCount === 0
}

function snapshotPasses(value, viewport) {
  const expectPad = viewport?.isMobile === true || (viewport?.width ?? 9999) <= 900
  return value.visibleWorld === 'cinematic-lived-world-threshold'
    && value.stableState === 'AVATAR_HOME_FIRST_PERSON'
    && value.embodiedSelf === 'camera-only-first-person-home'
    && value.presencePresentation === 'bodyless-first-person-home'
    && value.movement === 'shared-keyboard-touch-walk-look-interact'
    && (value.cameraMode === 'home-first-person' || value.cameraMode === 'home-first-person-look')
    && value.groundEntry === 'physical-world-surface'
    && value.lifeMapEntry === 'visible-sky-broad-interaction'
    && value.portalSequence === 'idle'
    && value.canvas?.width >= 240
    && value.canvas?.height >= 240
    && value.homeMovementPadCount === 1
    && value.homeMovementPadVisible === expectPad
}

async function enterFirstPersonHome(page, owner) {
  const presentation = await homeSnapshot(owner, page)
  if (!presentationSnapshotPasses(presentation)) throw new Error(`Home presentation baseline mismatch: ${JSON.stringify(presentation)}`)
  const enter = page.getByTestId('urai-home-avatar-enter-first-person')
  await enter.waitFor({ state: 'attached', timeout: 30_000 })
  await enter.focus()
  await page.keyboard.press('Enter')
  await page.waitForFunction((selector) => document.querySelector(selector)?.getAttribute('data-home-stable-state') === 'AVATAR_HOME_FIRST_PERSON', ownerSelector, { timeout: 60_000 })
  await waitFrames(page, 4)
  return presentation
}

async function screenshot(page, id) {
  const name = `${safeName(id)}-${exactHead.slice(0, 12)}.png`
  const bytes = await page.screenshot({ path: path.join(outputDir, name), fullPage: false, animations: 'disabled', caret: 'hide', timeout: 90_000 })
  return { file: name, bytes: bytes.length }
}

async function openPage(browser, viewport, options = {}) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    isMobile: viewport.isMobile,
    hasTouch: viewport.hasTouch,
    reducedMotion: options.reducedMotion,
  })
  const page = await context.newPage()
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(String(error)))
  return { context, page, pageErrors }
}

async function visualCapture(browser, id, viewport, query) {
  const { context, page, pageErrors } = await openPage(browser, viewport)
  const record = { id, viewport, query, passed: false, pageErrors }
  try {
    const response = await page.goto(url(query), { waitUntil: 'domcontentloaded', timeout: 60_000 })
    const owner = await waitHome(page)
    record.status = response?.status()
    record.presentationSnapshot = await homeSnapshot(owner, page)
    if (!presentationSnapshotPasses(record.presentationSnapshot)) throw new Error(`Home presentation baseline mismatch: ${JSON.stringify(record.presentationSnapshot)}`)
    record.presentationImage = await screenshot(page, `${id}-presentation`)
    await enterFirstPersonHome(page, owner)
    record.snapshot = await homeSnapshot(owner, page)
    record.image = await screenshot(page, id)
    record.passed = record.status === 200
      && presentationSnapshotPasses(record.presentationSnapshot)
      && snapshotPasses(record.snapshot, viewport)
      && record.presentationImage.bytes > 12_000
      && record.image.bytes > 12_000
      && pageErrors.length === 0
  } catch (error) {
    record.error = String(error)
  } finally {
    receipt.captures.push(record)
    if (!record.passed) receipt.errors.push(record)
    await context.close().catch(() => {})
  }
}

async function clickCanvasRatio(page, owner, viewport, ratios, expectedPhase, touch = false) {
  const canvas = owner.locator('canvas').first()
  const box = await canvas.boundingBox()
  if (!box) throw new Error('Home canvas has no clickable bounds')
  let lastPhase = null
  for (const [xr, yr] of ratios) {
    const x = box.x + box.width * xr
    const y = box.y + box.height * yr
    if (touch) await page.touchscreen.tap(x, y)
    else await page.mouse.click(x, y)
    try {
      await page.waitForFunction(({ selector, phase }) => document.querySelector(selector)?.getAttribute('data-home-scene-phase') === phase,
        { selector: ownerSelector, phase: expectedPhase }, { timeout: 2_500 })
      lastPhase = expectedPhase
      return { x: Math.round(x), y: Math.round(y), viewport, phase: lastPhase }
    } catch {
      lastPhase = await owner.getAttribute('data-home-scene-phase')
      // A transition can become observable exactly at the wait boundary. Treat
      // the authoritative live phase readback as success instead of reporting
      // the contradictory "Expected X; observed X" false negative.
      if (lastPhase === expectedPhase) {
        return { x: Math.round(x), y: Math.round(y), viewport, phase: lastPhase }
      }
      if (lastPhase !== 'HOME_IDLE') break
    }
  }
  throw new Error(`Expected ${expectedPhase}; observed ${lastPhase}`)
}

async function interaction(browser, { id, viewport, kind, reducedMotion = 'no-preference', touch = false }) {
  const { context, page, pageErrors } = await openPage(browser, viewport, { reducedMotion })
  const record = { id, viewport, kind, reducedMotion, pageErrors, passed: false }
  try {
    await page.goto(url('homeAssetReview=1&homePrivateFixture=1'), { waitUntil: 'domcontentloaded', timeout: 60_000 })
    const owner = await waitHome(page)
    record.presentationSnapshot = await enterFirstPersonHome(page, owner)
    const before = await homeSnapshot(owner, page)
    if (!snapshotPasses(before, viewport)) throw new Error(`Home first-person baseline mismatch: ${JSON.stringify(before)}`)
    record.firstPersonBaseline = before

    if (kind === 'ground') {
      record.pointer = await clickCanvasRatio(page, owner, viewport, [[.50,.79],[.35,.80],[.65,.80]], 'GROUND_DESCENT', touch)
      record.inputLocked = await owner.getAttribute('data-home-input-locked')
      record.transition = await owner.getAttribute('data-home-transition-sequence')
      record.passed = record.pointer.phase === 'GROUND_DESCENT' && record.inputLocked === 'true' && record.transition === 'ground:traversal'
    } else if (kind === 'sky') {
      record.pointer = await clickCanvasRatio(page, owner, viewport, [[.50,.14],[.27,.18],[.73,.18]], 'SKY_ASCENT', touch)
      record.inputLocked = await owner.getAttribute('data-home-input-locked')
      record.transition = await owner.getAttribute('data-home-transition-sequence')
      record.passed = record.pointer.phase === 'SKY_ASCENT' && record.inputLocked === 'true' && record.transition === 'life-map:traversal'
    } else if (kind === 'orb') {
      const button = page.getByRole('button', { name: 'Open URAI Orb companion' }).first()
      await button.click({ noWaitAfter: true })
      await page.waitForFunction((selector) => document.querySelector(selector)?.getAttribute('data-home-orb-state') === 'attention', ownerSelector, { timeout: 5_000 })
      record.orbState = await owner.getAttribute('data-home-orb-state')
      record.phase = await owner.getAttribute('data-home-scene-phase')
      record.passed = record.orbState === 'attention' && record.phase === 'HOME_IDLE'
    } else if (kind === 'ground-cancel') {
      record.pointer = await clickCanvasRatio(page, owner, viewport, [[.50,.79],[.35,.80],[.65,.80]], 'GROUND_DESCENT', touch)
      await page.keyboard.press('Escape')
      await page.waitForFunction((selector) => document.querySelector(selector)?.getAttribute('data-home-scene-phase') === 'HOME_IDLE', ownerSelector, { timeout: 5_000 })
      record.phase = await owner.getAttribute('data-home-scene-phase')
      record.passed = record.phase === 'HOME_IDLE'
    }
    record.image = await screenshot(page, id)
    record.passed = Boolean(record.passed) && record.image.bytes > 8_000 && pageErrors.length === 0
  } catch (error) {
    record.error = String(error)
  } finally {
    receipt.interactions.push(record)
    if (!record.passed) receipt.errors.push(record)
    await context.close().catch(() => {})
  }
}

async function fallbackProof() {
  const browser = await chromium.launch({ headless: true, args: ['--disable-webgl', '--disable-gpu'] })
  const { context, page, pageErrors } = await openPage(browser, spec.desktop)
  try {
    await page.goto(url('homeAssetReview=1'), { waitUntil: 'domcontentloaded', timeout: 60_000 })
    const fallback = page.locator('[data-testid="urai-home-accessible-fallback"]')
    await fallback.waitFor({ state: 'visible', timeout: 20_000 })
    const capture = {
      id: 'home-no-webgl-fallback',
      viewport: spec.desktop,
      webglState: await fallback.getAttribute('data-webgl-state'),
      semanticControls: await page.locator('.home-semantic-navigation [data-testid^="home-semantic-"]').count(),
      pageErrors,
      passed: false,
    }
    capture.image = await screenshot(page, capture.id)
    capture.passed = capture.semanticControls >= 3 && capture.image.bytes > 8_000 && pageErrors.length === 0
    receipt.captures.push(capture)
    if (!capture.passed) receipt.errors.push(capture)

    for (const [id, testId, expected] of [
      ['fallback-ground', 'home-semantic-ground', '/ground'],
      ['fallback-life-map', 'home-semantic-life-map', '/life-map'],
    ]) {
      const link = page.locator(`[data-testid="${testId}"]`).first()
      const href = await link.getAttribute('href')
      const record = { id, href, expected, passed: Boolean(href?.includes(expected)) }
      receipt.interactions.push(record)
      if (!record.passed) receipt.errors.push(record)
    }
  } catch (error) {
    const record = { id: 'fallback-proof', error: String(error), passed: false }
    receipt.errors.push(record)
  } finally {
    await context.close().catch(() => {})
    await browser.close().catch(() => {})
  }
}

if (group === 'portal-fallback') {
  await fallbackProof()
} else {
  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] })
  try {
    if (group === 'visual') {
      await visualCapture(browser, 'home-normal-root', spec.desktop, 'homeAssetReview=1')
      await visualCapture(browser, 'home-portrait-mobile', spec.portrait, 'homeAssetReview=1')
      await visualCapture(browser, 'home-landscape-mobile', spec.landscape, 'homeAssetReview=1')
      for (const state of orbStates) {
        await visualCapture(browser, `home-orb-${state}`, spec.desktop, `homeAssetReview=1&homePrivateFixture=1&homeOrbState=${state}`)
      }
    } else if (group === 'desktop') {
      await interaction(browser, { id: 'desktop-ground-pointer', viewport: spec.desktop, kind: 'ground' })
      await interaction(browser, { id: 'desktop-sky-pointer', viewport: spec.desktop, kind: 'sky' })
      await interaction(browser, { id: 'desktop-orb-semantic', viewport: spec.desktop, kind: 'orb' })
      await interaction(browser, { id: 'desktop-ground-cancel', viewport: spec.desktop, kind: 'ground-cancel' })
    } else if (group === 'mobile') {
      await interaction(browser, { id: 'portrait-ground-touch', viewport: spec.portrait, kind: 'ground', touch: true })
      await interaction(browser, { id: 'portrait-sky-touch', viewport: spec.portrait, kind: 'sky', touch: true })
      await interaction(browser, { id: 'portrait-orb-semantic', viewport: spec.portrait, kind: 'orb', touch: true })
      await interaction(browser, { id: 'landscape-ground-touch', viewport: spec.landscape, kind: 'ground', touch: true })
      await interaction(browser, { id: 'landscape-sky-touch', viewport: spec.landscape, kind: 'sky', touch: true })
      await interaction(browser, { id: 'landscape-orb-semantic', viewport: spec.landscape, kind: 'orb', touch: true })
    } else {
      receipt.errors.push({ id: 'unknown-proof-group', group, passed: false })
    }
  } finally {
    await browser.close().catch(() => {})
  }
}

await writeFile(path.join(outputDir, 'receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`)
console.log(JSON.stringify({ exactHead, group, captures: receipt.captures.length, interactions: receipt.interactions.length, errors: receipt.errors.length }, null, 2))
if (receipt.errors.length) process.exitCode = 1
