import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import { proveHomeSkyAscent } from './home-sky-ascent-proof.mjs'

const requireFromTierOne = createRequire(new URL('../urai-tier1/package.json', import.meta.url))
const { chromium } = requireFromTierOne('playwright')
const base = process.env.URAI_PROOF_BASE || 'http://127.0.0.1:4173'
const outputDir = path.resolve(process.env.URAI_PROOF_DIR || 'artifacts/canonical-journey-proof')
const exactHead = String(process.env.URAI_EXACT_HEAD || '').trim()
if (!/^[0-9a-f]{40}$/.test(exactHead)) throw new Error('URAI_EXACT_HEAD must be an exact lowercase 40-character SHA')
await fs.mkdir(outputDir, { recursive: true })

const normalize = (url) => new URL(url, base).pathname.replace(/\/+$/, '') || '/'
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function waitPath(page, expected, timeout = 60_000) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    if (normalize(page.url()) === expected) return
    await sleep(100)
  }
  throw new Error(`timeout waiting for ${expected}; current=${page.url()}`)
}

async function waitAttr(locator, name, expected, timeout = 60_000) {
  const start = Date.now()
  let lastValue = null
  let lastReadError = null
  while (Date.now() - start < timeout) {
    const remaining = timeout - (Date.now() - start)
    if (remaining <= 0) break
    if (await locator.count()) {
      try {
        lastValue = await locator.getAttribute(name, { timeout: Math.min(10_000, remaining) })
        lastReadError = null
        if (lastValue === expected) return
      } catch (error) {
        lastReadError = String(error)
      }
    }
    await sleep(Math.min(100, remaining))
  }
  throw new Error(`timeout waiting for ${name}=${expected}; lastValue=${JSON.stringify(lastValue)}; lastReadError=${lastReadError}`)
}

async function capture(page, journey, id) {
  const filename = `${journey.id}-${id}.png`
  await page.screenshot({ path: path.join(outputDir, filename), fullPage: false, animations: 'disabled', caret: 'hide', timeout: 90_000 })
  journey.steps.push({ id, url: page.url(), filename })
}

async function waitStableLifeMapCamera(root, journey, id) {
  const start = Date.now()
  let previous = null, stable = 0, last = null
  while (Date.now() - start < 60_000) {
    last = await root.evaluate((node) => [
      'lifeMapCameraX', 'lifeMapCameraY', 'lifeMapCameraZ',
      'lifeMapTargetX', 'lifeMapTargetY', 'lifeMapTargetZ', 'lifeMapFov',
    ].map((key) => node.dataset[key] === undefined ? NaN : Number(node.dataset[key])))
    const valid = last.every(Number.isFinite)
    stable = valid && previous && last.every((value, index) => Math.abs(value - previous[index]) < 0.01) ? stable + 1 : 0
    if (stable >= 3) {
      journey.cameraCheckpoints ||= []
      journey.cameraCheckpoints.push({ id, values: last, observedAt: new Date().toISOString() })
      return
    }
    previous = valid ? last : null
    await sleep(100)
  }
  throw new Error(`Life Map camera did not settle for ${id}: ${JSON.stringify(last)}`)
}

function diagnostics(page) {
  const pageErrors = [], failedRequests = []
  page.on('pageerror', (error) => pageErrors.push(String(error)))
  page.on('requestfailed', (request) => {
    try {
      const url = new URL(request.url())
      if (url.origin === new URL(base).origin) failedRequests.push({ url: request.url(), failure: request.failure()?.errorText || 'unknown' })
    } catch {
      failedRequests.push({ url: request.url(), failure: request.failure()?.errorText || 'unknown' })
    }
  })
  return () => ({ pageErrors, failedRequests })
}

const expectedAborts = new Set([
  '/assets/urai/final/tier2/focus/focus-memory-chamber-desktop.svg',
  '/assets/urai/final/tier2/replay/replay-cinematic-stage-desktop.svg',
  '/assets/urai/final/tier2/life-map/lifemap-galaxy-field-desktop.svg',
  '/assets/urai/generated/models/replay-memory-environment-v1.glb',
  '/assets/urai/home-production/cc0/polyhaven-v48/rock_face_01/asset.gltf',
  '/assets/urai/home-production/cc0/polyhaven-v48/rock_face_02/asset.gltf',
  '/assets/urai/final/manifests/v2-asset-factory-spatial-handoff.json',
  '/assets/urai/final/manifests/v3-asset-factory-spatial-handoff.json',
])
function blockingRequests(requests) {
  return requests.filter((request) => {
    let url = null
    try { url = new URL(request.url) } catch {}
    const frameworkAbort = request.failure === 'net::ERR_ABORTED' && url && (
      url.pathname.startsWith('/_next/static/') || (url.pathname.endsWith('/index.txt') && url.searchParams.has('_rsc'))
    )
    const sourceVisualAbort = request.failure === 'net::ERR_ABORTED' && url && url.origin === new URL(base).origin && expectedAborts.has(url.pathname)
    return !(frameworkAbort || sourceVisualAbort)
  })
}

async function activate(page, locator, mode) {
  assert.equal(await locator.count(), 1, 'activation must identify exactly one canonical control')
  await locator.waitFor({ state: 'visible', timeout: 45_000 })
  if (mode === 'touch') {
    const box = await locator.boundingBox()
    if (!box || box.width < 48 || box.height < 48) throw new Error(`touch target must be at least 48px; got ${box?.width}x${box?.height}`)
    return page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2)
  }
  if (mode === 'keyboard') {
    const focusable = await locator.evaluate((node) => {
      if (!(node instanceof HTMLElement)) return false
      const tag = node.tagName.toLowerCase()
      const native = tag === 'button' || tag === 'a' || tag === 'input' || tag === 'select' || tag === 'textarea'
      return native || node.tabIndex >= 0
    })
    assert.equal(focusable, true, 'keyboard activation target must be focusable')
    await locator.focus()
    return locator.press('Enter')
  }
  return locator.click()
}

async function openHome(page, journey) {
  const response = await page.goto(`${base}/home/?demo=1`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  assert.ok(response?.ok(), 'Home did not return 2xx')
  const home = ownedHome(page)
  await home.waitFor({ state: 'visible', timeout: 90_000 })
  await waitAttr(home, 'data-home-assets-ready', 'true', 90_000)
  await capture(page, journey, 'home')
  return home
}

async function proveRealHomeAscent(page, journey, home, mode) {
  await capture(page, journey, 'home-first-person')
  journey.ascentEvidence = await proveHomeSkyAscent(page, home, {
    mode, captureAscent:() => capture(page, journey, 'home-ascent'),
  })
  journey.ascentProven = journey.ascentEvidence.ascentProven
}

async function directAccessibleHomeHandoff(page, journey, mode) {
  const nav = page.getByTestId('urai-persistent-world-shell').locator('.home-semantic-navigation[data-home-navigation-owner="runtime-boundary"]')
  await nav.waitFor({ state: 'visible', timeout: 45_000 })
  await activate(page, nav.getByTestId('home-semantic-life-map'), mode)
  await waitPath(page, '/life-map', 60_000)
  journey.ascentProven = null
}

async function lifeMapOverview(page, journey) {
  const root = page.getByTestId('urai-true-3d-life-map')
  await root.waitFor({ state: 'visible', timeout: 90_000 })
  await waitAttr(root, 'data-life-map-source', 'explicit-demo', 60_000)
  await waitAttr(root, 'data-life-map-phase', 'overview', 60_000)
  await waitAttr(root, 'data-life-map-render-ready', 'true', 60_000)
  assert.equal(new URL(page.url()).searchParams.get('demo'), '1')
  await waitStableLifeMapCamera(root, journey, 'life-map-overview')
  await capture(page, journey, 'life-map-overview')
  return root
}

async function selectQuietReset(page, journey, mode, root) {
  await activate(page, page.locator('.life-map-search-trigger').first(), mode)
  const navigator = page.getByRole('region', { name: 'Search and filter Life Map', exact: true })
  await navigator.waitFor({ state: 'visible', timeout: 45_000 })
  const button = navigator.locator('button[data-life-map-semantic-result]').filter({ hasText: 'The Quiet Reset' }).first()
  await activate(page, button, mode)
  await waitAttr(root, 'data-life-map-phase', 'arrival', 60_000)
  await waitAttr(root, 'data-life-map-render-ready', 'true', 60_000)
  const url = new URL(page.url())
  const identity = { memoryId: url.searchParams.get('memoryId'), node: url.searchParams.get('node'), manifestId: url.searchParams.get('manifestId') }
  assert.equal(identity.memoryId, 'quiet-reset')
  assert.equal(identity.node, identity.memoryId)
  assert.equal(identity.manifestId, 'replay-recovery-thread')
  assert.equal(url.searchParams.get('demo'), '1')
  journey.selectedIdentity = { starId: identity.node, selectedMemoryId: `demo:${identity.memoryId}`, manifestId: identity.manifestId, disclosedDemo: true }
  await waitStableLifeMapCamera(root, journey, 'memory-star')
  await capture(page, journey, 'memory-star')
  return identity
}

async function assertRealmIdentity(locator, identity) {
  await waitAttr(locator, 'data-memory-id', `demo:${identity.memoryId}`)
  await waitAttr(locator, 'data-star-id', identity.node)
  await waitAttr(locator, 'data-manifest-id', identity.manifestId)
}

function ownedRealm(page, testId) {
  return page.getByTestId('urai-persistent-world-shell').getByTestId(testId)
}

function ownedHome(page) {
  return page.getByTestId('urai-persistent-world-shell').locator('.urai-asset-home-world[data-home-primary-owner="asset-driven"]')
}

async function waitFocusFrame(focus) {
  await waitAttr(focus, 'data-webgl-state', 'ready', 60_000)
  const canvas = focus.locator('canvas')
  await canvas.waitFor({ state: 'visible', timeout: 60_000 })
  await waitAttr(canvas, 'data-focus-first-frame', 'true', 60_000)
}

async function enterFocus(page, journey, mode, identity) {
  const nav = page.getByRole('navigation', { name: 'Selected memory actions' })
  await activate(page, nav.getByRole('button', { name: /Enter Focus$/ }), mode)
  await waitPath(page, '/focus', 60_000)
  const focus = ownedRealm(page, 'urai-final-focus-chamber')
  await focus.waitFor({ state: 'visible', timeout: 90_000 })
  await assertRealmIdentity(focus, identity)
  await waitFocusFrame(focus)
  assert.equal(new URL(page.url()).searchParams.get('demo'), '1')
  await capture(page, journey, 'focus')
}

async function enterReplay(page, journey, mode, identity) {
  const controls = ownedRealm(page, 'urai-final-focus-chamber').getByRole('navigation', { name: 'Focus memory controls', exact: true })
  await activate(page, controls.getByRole('button', { name: 'Open Replay for The Quiet Reset', exact: true }), mode)
  await waitPath(page, '/replay', 60_000)
  const replay = ownedRealm(page, 'cinematic-replay-client')
  await replay.waitFor({ state: 'visible', timeout: 90_000 })
  await assertRealmIdentity(replay, identity)
  await waitAttr(replay, 'data-replay-media-ready', 'true', 60_000)
  await waitAttr(replay, 'data-webgl-state', 'ready', 60_000)
  const canvas = replay.locator('canvas')
  await canvas.waitFor({ state: 'visible', timeout: 60_000 })
  await waitAttr(canvas, 'data-replay-first-frame', 'true', 60_000)
  await activate(page, replay.getByRole('button', { name: 'Continue memory', exact: true }), mode)
  await waitAttr(replay, 'data-playing', 'true', 20_000)
  await capture(page, journey, 'replay')
  await activate(page, replay.getByRole('button', { name: 'Pause memory', exact: true }), mode)
  await waitAttr(replay, 'data-playing', 'false', 20_000)
}

async function unwindReplayToFocus(page, journey, mode, identity) {
  if (mode === 'touch') await activate(page, ownedRealm(page, 'cinematic-replay-client').getByRole('button', { name: '← Focus', exact: true }), mode)
  else await page.keyboard.press('Escape')
  await waitPath(page, '/focus', 60_000)
  const focus = ownedRealm(page, 'urai-final-focus-chamber')
  await focus.waitFor({ state: 'visible', timeout: 90_000 })
  await assertRealmIdentity(focus, identity)
  await waitFocusFrame(focus)
  await capture(page, journey, 'return-focus')
}

async function unwindFocusToLifeMap(page, journey, mode, identity) {
  if (mode === 'touch') {
    const controls = ownedRealm(page, 'urai-final-focus-chamber').getByRole('navigation', { name: 'Focus memory controls', exact: true })
    await activate(page, controls.getByRole('button', { name: '← Life Map', exact: true }), mode)
  } else await page.keyboard.press('Escape')
  await waitPath(page, '/life-map', 60_000)
  const root = page.getByTestId('urai-true-3d-life-map')
  await root.waitFor({ state: 'visible', timeout: 90_000 })
  await waitAttr(root, 'data-life-map-phase', 'arrival', 60_000)
  await waitAttr(root, 'data-life-map-render-ready', 'true', 60_000)
  const url = new URL(page.url())
  assert.equal(url.searchParams.get('memoryId'), `demo:${identity.memoryId}`, 'Life Map return must retain the exact disclosed memory namespace')
  assert.equal(url.searchParams.get('node'), identity.node)
  assert.equal(url.searchParams.get('manifestId'), identity.manifestId)
  assert.equal(url.searchParams.get('demo'), '1')
  await waitStableLifeMapCamera(root, journey, 'return-life-map-selected')
  await capture(page, journey, 'return-life-map-selected')
  return root
}

async function lifeMapToHome(page, journey, mode, root) {
  if (mode === 'touch') {
    const actions = page.getByRole('navigation', { name: 'Selected memory actions' })
    await activate(page, actions.getByRole('button', { name: 'Return to Life Map overview', exact: true }), mode)
  } else await page.keyboard.press('Escape')
  await waitAttr(root, 'data-life-map-phase', 'overview', 30_000)
  await waitAttr(root, 'data-life-map-render-ready', 'true', 60_000)
  await waitStableLifeMapCamera(root, journey, 'return-life-map-overview')
  await capture(page, journey, 'return-life-map-overview')
  if (mode === 'touch') await activate(page, root.getByRole('button', { name: 'Return Home', exact: true }), mode)
  else await page.keyboard.press('Escape')
  await waitPath(page, '/home', 60_000)
  assert.equal(new URL(page.url()).searchParams.get('demo'), '1', 'final Home return lost disclosed demo context')
  const home = ownedHome(page)
  await home.waitFor({ state: 'visible', timeout: 90_000 })
  await waitAttr(home, 'data-home-assets-ready', 'true', 90_000)
  await waitAttr(home, 'data-home-scene-phase', 'HOME', 20_000)
  await waitAttr(home, 'data-home-input-locked', 'false', 20_000)
  await waitAttr(home, 'data-home-camera-mode', 'embodied-first-person', 20_000)
  const settledHome = []
  const settleStarted = Date.now()
  do {
    const sample = await home.evaluate((node) => ({
      phase: node.getAttribute('data-home-scene-phase'),
      locked: node.getAttribute('data-home-input-locked'),
      camera: node.getAttribute('data-home-camera-mode'),
      height: Number(node.getAttribute('data-home-camera-height')),
      pathname: window.location.pathname,
    }))
    assert.equal(sample.pathname.replace(/\/+$/, ''), '/home', 'return must remain Home')
    assert.equal(sample.phase, 'HOME', 'return must not resume ascent')
    assert.equal(sample.locked, 'false', 'returned Home must accept input')
    assert.equal(sample.camera, 'embodied-first-person', 'returned Home must be first person')
    assert.ok(Number.isFinite(sample.height) && sample.height > 0 && sample.height < 3, 'returned camera must remain at walking height')
    settledHome.push({ elapsedMs: Date.now() - settleStarted, ...sample })
    await sleep(250)
  } while (Date.now() - settleStarted < 5_000)
  journey.settledHome = settledHome
  await capture(page, journey, 'return-home')
}

const variants = [
  { id: 'desktop-pointer-keyboard-ascent', mode: 'pointer', realAscent: true, context: { viewport: { width: 1440, height: 900 } } },
  { id: 'mobile-touch', mode: 'touch', realAscent: true, context: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } },
  { id: 'desktop-reduced-keyboard', mode: 'keyboard', realAscent: false, context: { viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' } },
]

const receipt = { schemaVersion: 'urai-canonical-journey-proof-1', exactHead, capturedAt: new Date().toISOString(), status: 'running', journeys: [], errors: [] }
const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] })
try {
  for (const variant of variants) {
    const journey = { id: variant.id, mode: variant.mode, realAscent: variant.realAscent, ascentProven: null, identityStable: false, passed: false, steps: [] }
    receipt.journeys.push(journey)
    const context = await browser.newContext(variant.context)
    await context.addInitScript(() => {
      localStorage.setItem('urai:onboarding:v2:complete', '1')
      localStorage.setItem('urai:onboarding:v3:setup-complete', '1')
      localStorage.removeItem('urai:onboarding:v3:setup-step')
    })
    const page = await context.newPage()
    const readDiagnostics = diagnostics(page)
    try {
      const home = await openHome(page, journey)
      if (variant.realAscent) await proveRealHomeAscent(page, journey, home, variant.mode)
      else await directAccessibleHomeHandoff(page, journey, variant.mode)
      const map = await lifeMapOverview(page, journey)
      const identity = await selectQuietReset(page, journey, variant.mode, map)
      await enterFocus(page, journey, variant.mode, identity)
      await enterReplay(page, journey, variant.mode, identity)
      await unwindReplayToFocus(page, journey, variant.mode, identity)
      const returnedMap = await unwindFocusToLifeMap(page, journey, variant.mode, identity)
      await lifeMapToHome(page, journey, variant.mode, returnedMap)
      journey.identityStable = true
      journey.passed = true
    } catch (error) {
      journey.error = error instanceof Error ? error.stack || error.message : String(error)
      if (error?.proof) journey.ascentFailure = error.proof
      receipt.errors.push({ journey: variant.id, error: journey.error })
    } finally {
      journey.diagnostics = readDiagnostics()
      const blocking = blockingRequests(journey.diagnostics.failedRequests)
      if (journey.diagnostics.pageErrors.length || blocking.length) {
        journey.passed = false
        receipt.errors.push({ journey: variant.id, error: 'runtime diagnostics failed', pageErrors: journey.diagnostics.pageErrors, blockingFailedRequests: blocking })
      }
      await context.close()
    }
  }
} finally {
  await browser.close()
}

receipt.status = receipt.journeys.every((journey) => journey.passed && journey.identityStable) && receipt.journeys.some((journey) => journey.ascentProven === true) && receipt.errors.length === 0 ? 'passed' : 'failed'
await fs.writeFile(path.join(outputDir, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n')
console.log(JSON.stringify(receipt, null, 2))
if (receipt.status !== 'passed') process.exitCode = 1
