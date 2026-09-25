import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'

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
  while (Date.now() - start < timeout) {
    if ((await locator.count()) && await locator.getAttribute(name) === expected) return
    await sleep(100)
  }
  throw new Error(`timeout waiting for ${name}=${expected}`)
}

async function capture(page, journey, id) {
  const filename = `${journey.id}-${id}.png`
  const candidates = page.locator(
    '.urai-asset-home-world[data-home-primary-owner="asset-driven"], [data-testid="urai-true-3d-life-map"], [data-testid="urai-final-focus-chamber"], [data-testid="cinematic-replay-client"]',
  )
  let target = null
  for (let index = 0; index < await candidates.count(); index += 1) {
    const candidate = candidates.nth(index)
    if (await candidate.isVisible()) { target = candidate; break }
  }
  if (target) {
    await target.screenshot({ path: path.join(outputDir, filename), animations: 'disabled', caret: 'hide', timeout: 90_000 })
  } else {
    await page.screenshot({ path: path.join(outputDir, filename), fullPage: false, animations: 'disabled', caret: 'hide', timeout: 90_000 })
  }
  journey.steps.push({ id, url: page.url(), filename })
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
  await locator.waitFor({ state: 'visible', timeout: 45_000 })
  if (mode === 'touch') {
    const box = await locator.boundingBox()
    if (!box || box.width <= 0 || box.height <= 0) throw new Error('touch target has no usable geometry')
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
  const home = page.locator('.urai-asset-home-world[data-home-primary-owner="asset-driven"]').first()
  await home.waitFor({ state: 'visible', timeout: 90_000 })
  await waitAttr(home, 'data-home-assets-ready', 'true', 90_000)
  await capture(page, journey, 'home')
  return home
}

async function proveRealHomeAscent(page, journey, home, mode) {
  // Current non-XR Home authority is direct bodyless first person. Prove the
  // superseded Avatar presentation/activation gate is absent before sky ascent.
  await waitAttr(home, 'data-home-stable-state', 'AVATAR_HOME_FIRST_PERSON', 45_000)
  await waitAttr(home, 'data-home-input-ready', 'true', 45_000)
  assert.equal(await page.getByTestId('urai-home-avatar-enter-first-person').count(), 0, 'superseded Avatar activation gate must not exist in ordinary Home')
  assert.equal(await home.getAttribute('data-home-avatar-activation-gate'), 'none-direct-first-person-home')
  assert.equal(await home.getAttribute('data-home-non-xr-body-policy'), 'camera-only-no-hands-body-rig')
  await capture(page, journey, 'home-first-person')

  const canvas = home.locator('canvas').first()
  await canvas.waitFor({ state: 'visible', timeout: 45_000 })
  const box = await canvas.boundingBox()
  assert.ok(box && box.width > 200 && box.height > 200, 'Home canvas must expose the governed broad-sky interaction surface')

  // The sky interaction itself owns the validity law (upward ray direction).
  // Try several upper-sky points rather than encoding retired world geometry.
  const points = [[.50, .12], [.36, .15], [.64, .15], [.50, .22]]
  let activated = false
  for (const [x, y] of points) {
    const absolute = { x: box.x + box.width * x, y: box.y + box.height * y }
    if (mode === 'touch') await page.touchscreen.tap(absolute.x, absolute.y)
    else await page.mouse.click(absolute.x, absolute.y)
    try {
      await waitAttr(home, 'data-home-scene-phase', 'SKY_ASCENT', 2_500)
      activated = true
      break
    } catch {}
  }
  assert.equal(activated, true, 'real broad visible-sky interaction did not enter SKY_ASCENT')
  const sequence = await home.getAttribute('data-home-transition-sequence')
  assert.ok(sequence === 'SKY_ASCENT' || sequence === 'LIFE_MAP_TRANSITION' || sequence?.includes('life-map'), 'Home did not own the Life Map ascent sequence')
  journey.ascentProven = true
  await capture(page, journey, 'home-ascent')
  await waitPath(page, '/life-map', 60_000)
}

async function directAccessibleHomeHandoff(page, journey, mode) {
  const nav = page.locator('.home-semantic-navigation[data-home-navigation-owner="runtime-boundary"]').first()
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
  await capture(page, journey, 'life-map-overview')
  return root
}

async function selectQuietReset(page, journey, mode, root) {
  await activate(page, page.locator('.life-map-search-trigger').first(), mode)
  const navigator = page.locator('section.life-map-navigator[aria-label="Search and filter Life Map"]').first()
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
  await capture(page, journey, 'memory-star')
  return identity
}

async function assertRealmIdentity(locator, identity) {
  await waitAttr(locator, 'data-memory-id', `demo:${identity.memoryId}`)
  await waitAttr(locator, 'data-star-id', identity.node)
  await waitAttr(locator, 'data-manifest-id', identity.manifestId)
}

async function enterFocus(page, journey, mode, identity) {
  const nav = page.getByRole('navigation', { name: 'Selected memory actions' })
  await activate(page, nav.getByRole('button', { name: /Enter Focus$/ }), mode)
  await waitPath(page, '/focus', 60_000)
  const focus = page.getByTestId('urai-final-focus-chamber')
  await focus.waitFor({ state: 'visible', timeout: 90_000 })
  await assertRealmIdentity(focus, identity)
  await waitAttr(focus, 'data-focus-render-ready', 'true', 60_000)
  assert.equal(new URL(page.url()).searchParams.get('demo'), '1')
  await capture(page, journey, 'focus')
}

async function enterReplay(page, journey, mode, identity) {
  const controls = page.getByRole('navigation', { name: 'Focus controls' })
  await activate(page, controls.getByRole('button', { name: /Enter Replay for/ }), mode)
  await waitPath(page, '/replay', 60_000)
  const replay = page.getByTestId('cinematic-replay-client')
  await replay.waitFor({ state: 'visible', timeout: 90_000 })
  await assertRealmIdentity(replay, identity)
  await activate(page, page.getByRole('button', { name: 'Begin memory', exact: true }), mode)
  await waitAttr(replay, 'data-playing', 'true', 20_000)
  await waitAttr(replay, 'data-replay-render-ready', 'true', 60_000)
  await capture(page, journey, 'replay')
  await activate(page, page.getByRole('button', { name: 'Hold memory', exact: true }), mode)
  await waitAttr(replay, 'data-playing', 'false', 20_000)
}

async function unwindReplayToFocus(page, journey, mode, identity) {
  if (mode === 'touch') await activate(page, page.getByRole('button', { name: 'Focus', exact: true }), mode)
  else await page.keyboard.press('Escape')
  await waitPath(page, '/focus', 60_000)
  const focus = page.getByTestId('urai-final-focus-chamber')
  await focus.waitFor({ state: 'visible', timeout: 90_000 })
  await assertRealmIdentity(focus, identity)
  await waitAttr(focus, 'data-focus-render-ready', 'true', 60_000)
  await capture(page, journey, 'return-focus')
}

async function unwindFocusToLifeMap(page, journey, mode, identity) {
  if (mode === 'touch') {
    const controls = page.getByRole('navigation', { name: 'Focus controls' })
    await activate(page, controls.getByRole('button', { name: '← Life Map', exact: true }), mode)
  } else await page.keyboard.press('Escape')
  await waitPath(page, '/life-map', 60_000)
  const root = page.getByTestId('urai-true-3d-life-map')
  await root.waitFor({ state: 'visible', timeout: 90_000 })
  await waitAttr(root, 'data-life-map-phase', 'arrival', 60_000)
  await waitAttr(root, 'data-life-map-render-ready', 'true', 60_000)
  const url = new URL(page.url())
  assert.equal(url.searchParams.get('memoryId'), identity.memoryId)
  assert.equal(url.searchParams.get('node'), identity.node)
  assert.equal(url.searchParams.get('manifestId'), identity.manifestId)
  assert.equal(url.searchParams.get('demo'), '1')
  await capture(page, journey, 'return-life-map-selected')
  return root
}

async function lifeMapToHome(page, journey, mode, root) {
  if (mode === 'touch') {
    const actions = page.getByRole('navigation', { name: 'Selected memory actions' })
    await activate(page, actions.getByRole('button', { name: /Overview/ }), mode)
  } else await page.keyboard.press('Escape')
  await waitAttr(root, 'data-life-map-phase', 'overview', 30_000)
  await waitAttr(root, 'data-life-map-render-ready', 'true', 60_000)
  await capture(page, journey, 'return-life-map-overview')
  if (mode === 'touch') await activate(page, page.locator('[data-life-map-overview-home-return="true"]').first(), mode)
  else await page.keyboard.press('Escape')
  await waitPath(page, '/home', 60_000)
  assert.equal(new URL(page.url()).searchParams.get('demo'), '1', 'final Home return lost disclosed demo context')
  const home = page.locator('.urai-asset-home-world[data-home-primary-owner="asset-driven"]').first()
  await home.waitFor({ state: 'visible', timeout: 90_000 })
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
