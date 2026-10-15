#!/usr/bin/env node
// Dev-only, exact-source UrAi Home/World001 V3 browser evidence. Not a release approval.
import { spawn, spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const requireTier1 = createRequire(path.join(root, 'urai-tier1/package.json'))
const { chromium } = requireTier1('playwright')
const verifyScript = path.join(root, 'scripts/world001-v3-preview-asset.mjs')
const outputDir = path.resolve(process.env.URAI_V3_PROOF_DIR || path.join(root, 'artifacts/world001-v3-dev-browser'))
const head = process.env.URAI_EXACT_HEAD || 'local-unattested'
const port = Number(process.env.URAI_V3_PORT || 3014)
const origin = 'http://127.0.0.1:' + port
const modelPath = '/assets/urai/world001-preview/URAI_WORLD001_FOUNDER_HOME_ARCHITECTURE_v3.glb'
const expectedHash = '84727ed6d335b51f736194a3850d5390a3d4ab8876f07acc8bb08593c5c33717'
const expectedBytes = 2742444
const receipt = { schemaVersion: 'urai-world001-v3-dev-browser-proof-2', head, classification: 'MODELED_INTERPRETIVE_NONPRODUCTION', origin, modelPath, browser: null, scenarios: [], failures: [], executed: false }
let server, browser
function guard(action) {
  const result = spawnSync(process.execPath, [verifyScript, action], { cwd: root, env: { ...process.env, NODE_ENV: 'development', URAI_V3_DEV_BROWSER_PROOF: 'true' }, encoding: 'utf8' })
  if (result.status !== 0) throw new Error('World001 guard ' + action + ' failed: ' + result.stderr)
}
async function waitReady() {
  const deadline = Date.now() + 150000
  while (Date.now() < deadline) {
    if (server?.exitCode !== null) throw new Error('Next development server exited before ready')
    try { const response = await fetch(origin + '/home/', { signal: AbortSignal.timeout(4000) }); if (response.ok) return } catch {}
    await new Promise(resolve => setTimeout(resolve, 1500))
  }
  throw new Error('Canonical UrAi Home development server did not become ready')
}
async function screenshot(page, name) {
  const file = path.join(outputDir, name + '.png')
  await page.screenshot({ path: file })
  const bytes = await readFile(file)
  return { path: path.basename(file), sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length }
}
// Browser-protocol touch is not physical-device certification. Unlike
// dispatchEvent, this checks the real 48px target and sends a hit-tested
// Chromium touch through the browser's input pipeline.
async function beginMobileTouchHold(page, label) {
  const button = page.getByRole('button', { name: label })
  await button.waitFor({ state: 'visible', timeout: 15000 })
  if (!await button.isEnabled()) throw new Error(label + ' mobile movement disabled')
  const bounds = await button.boundingBox()
  if (!bounds || bounds.width < 48 || bounds.height < 48) {
    throw new Error(label + ' mobile movement hit target below 48px')
  }
  const x = bounds.x + bounds.width / 2
  const y = bounds.y + bounds.height / 2
  const hit = await page.evaluate(({ x, y }) =>
    document.elementFromPoint(x, y)?.closest('button')?.getAttribute('aria-label') ?? null, { x, y })
  if (hit !== label) throw new Error(label + ' mobile movement center is obstructed by ' + String(hit))
  const session = await page.context().newCDPSession(page)
  try {
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
  } catch (error) {
    await session.detach().catch(() => {})
    throw error
  }
  let released = false
  return async () => {
    if (released) return
    released = true
    try {
      await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    } finally {
      await session.detach().catch(() => {})
    }
  }
}

async function testProfile(profile) {
  const context = await browser.newContext({
    viewport: profile.viewport, deviceScaleFactor: 1,
    ...(profile.mobile ? { isMobile: true, hasTouch: true } : {}),
    reducedMotion: profile.reducedMotion ? 'reduce' : 'no-preference'
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  const response = await page.goto(origin + '/home/?homeAssetReview=1&homePrivateFixture=1&world001ModeledV3=1', { waitUntil: 'domcontentloaded', timeout: 90000 })
  if (!response?.ok()) throw new Error(profile.id + ' Home route did not return HTTP 2xx')
  const owner = page.locator('.urai-asset-home-world[data-home-primary-owner="asset-driven"]')
  await owner.waitFor({ state: 'visible', timeout: 60000 })
  await page.waitForFunction(() => {
    const root = document.querySelector('.urai-asset-home-world[data-home-primary-owner="asset-driven"]')
    return root?.getAttribute('data-home-world001-preview') === 'MODELED_INTERPRETIVE_NONPRODUCTION'
      && root?.getAttribute('data-home-assets-ready') === 'true'
  }, null, { timeout: 90000 })
  const loaded = await page.evaluate(async url => {
    const response = await fetch(url)
    const bytes = new Uint8Array(await response.arrayBuffer())
    const hash = await crypto.subtle.digest('SHA-256', bytes)
    return { status: response.status, bytes: bytes.length, sha256: Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('') }
  }, modelPath)
  if (loaded.status !== 200 || loaded.bytes !== expectedBytes || loaded.sha256 !== expectedHash) throw new Error(profile.id + ' V3 GLB runtime bytes disagree with source')
  const before = await owner.evaluate(element => ({
    x: Number(element.dataset.homePlayerX), z: Number(element.dataset.homePlayerZ),
    ready: element.dataset.homeAssetsReady, mode: element.dataset.homeWorld001Preview,
    navigation: element.dataset.homeV3Navigation,
    renderedMeshes: Number(element.dataset.homeV3MeshCount),
    loadedMaterials: Number(element.dataset.homeV3MaterialCount),
    cameraHeight: Number(element.dataset.homeCameraHeight)
  }))
  if (before.navigation !== 'bounded-central-terrace-research-not-certified-navmesh') throw new Error('Expected explicit unapproved navmesh classification')
  if (!(before.renderedMeshes > 0) || !(before.loadedMaterials > 0)) throw new Error(profile.id + ' V3 visible mesh/material telemetry absent')
  if (!(before.cameraHeight > 1.4 && before.cameraHeight < 2.3)) throw new Error(profile.id + ' invalid first-person camera height')
  // Browser RAF intervals are sampled, never called GPU FPS or device timing.
  const frameTiming = await page.evaluate(() => new Promise(resolve => {
    const intervals = []
    let previous = 0, finished = false
    const timer = setTimeout(() => finish(true), 6000)
    function finish(timedOut) {
      if (finished) return
      finished = true
      clearTimeout(timer)
      const sorted = [...intervals].sort((a, b) => a - b)
      const percentile = q => sorted.length ? Number(sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * q))].toFixed(2)) : null
      resolve({ samples: intervals.length, p50Ms: percentile(.5), p95Ms: percentile(.95), timedOut, classification: 'browser-raf-intervals-not-gpu-frame-time' })
    }
    function tick(now) {
      if (finished) return
      if (previous) intervals.push(now - previous)
      previous = now
      if (intervals.length >= 48) finish(false)
      else requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }))
  const initial = await screenshot(page, profile.id + '-arrival')
  if (!profile.mobile) {
    await page.keyboard.down('KeyW')
    await page.waitForTimeout(700)
    await page.keyboard.up('KeyW')
  } else {
    const releaseMobile = await beginMobileTouchHold(page, 'Move forward')
    try { await page.waitForTimeout(700) } finally { await releaseMobile() }
  }
  await page.waitForTimeout(350)
  const after = await owner.evaluate(element => ({ x: Number(element.dataset.homePlayerX), z: Number(element.dataset.homePlayerZ), nearby: element.dataset.homeNearby, orb: element.dataset.homeOrbState }))
  if (!Number.isFinite(after.x) || !Number.isFinite(after.z) || Math.hypot(after.x - before.x, after.z - before.z) < .05) throw new Error(profile.id + ' first-person locomotion not observed')
  const moved = await screenshot(page, profile.id + '-after-movement')
  // Verify exact Home travel destinations before the Orb opens. Next.js may
  // canonicalize a route to either /ground or /ground/, so compare parsed
  // pathnames and the required transition identity rather than string prefixes.
  const affordances = await page.evaluate(() => ({
    ground: document.querySelector('[data-testid="home-semantic-ground"]')?.getAttribute('href') ?? null,
    lifeMap: document.querySelector('[data-testid="home-semantic-life-map"]')?.getAttribute('href') ?? null,
    location: window.location.pathname,
    navigationOwners: document.querySelectorAll('[data-home-navigation-owner="runtime-boundary"]').length,
  }))
  function matchesJourneyHref(href, pathname, expectedParams) {
    if (typeof href !== 'string') return false
    try {
      const url = new URL(href, origin)
      const actualPath = url.pathname.endsWith('/') ? url.pathname.slice(0, -1) : url.pathname
      return url.origin === origin && actualPath === pathname
        && url.searchParams.size === Object.keys(expectedParams).length
        && Object.entries(expectedParams).every(([key, value]) => url.searchParams.get(key) === value)
    } catch {
      return false
    }
  }
  if (affordances.navigationOwners !== 1
    || !matchesJourneyHref(affordances.ground, '/ground', { entryPortal: 'home-ground', cameraCheckpoint: 'home-ground-descent' })
    || !matchesJourneyHref(affordances.lifeMap, '/life-map', { from: 'home-sky', entryPortal: 'home-sky', cameraCheckpoint: 'home-sky-ascent-complete' })) {
    throw new Error(profile.id + ' invalid accessible Home travel destination before Orb activation: ' + JSON.stringify(affordances))
  }
  // Exercise real input and World001 Orb proximity, not merely the Orb DOM label.
  await page.evaluate(() => {
    window.__uraiV3OrbOpenProofCount = 0
    window.addEventListener('urai:world-orb-open', () => { window.__uraiV3OrbOpenProofCount += 1 })
  })
  // Record physical movement, not the lagging React nearby label alone.
  // Slow demand-rendered software WebGL can cross the narrow V3 Orb zone
  // while held input waits for a React DOM commit. Release real input at the
  // measured source coordinate, then require the semantic nearby state too.
  await page.evaluate(() => {
    window.__uraiV3ApproachTrace = []
    const started = performance.now()
    window.__uraiV3ApproachTimer = window.setInterval(() => {
      const root = document.querySelector('.urai-asset-home-world[data-home-primary-owner="asset-driven"]')
      if (!root) return
      const x = Number(root.dataset.homePlayerX), z = Number(root.dataset.homePlayerZ)
      window.__uraiV3ApproachTrace.push({
        elapsedMs: Math.round(performance.now() - started), x, z,
        sourceDistance: Number(root.dataset.homeDistanceOrb),
        recomputedDistance: Math.hypot(x - .1, z + 1.9),
        nearby: root.dataset.homeNearby
      })
      if (window.__uraiV3ApproachTrace.length > 140) window.__uraiV3ApproachTrace.shift()
    }, 400)
  })
  const releaseMobileApproach = profile.mobile ? await beginMobileTouchHold(page, 'Move forward') : null
  if (!profile.mobile) await page.keyboard.down('KeyW')
  let proximityError = null
  try {
    await page.waitForFunction(() => {
      const root = document.querySelector('.urai-asset-home-world[data-home-primary-owner="asset-driven"]')
      if (!root) return false
      const x = Number(root.dataset.homePlayerX), z = Number(root.dataset.homePlayerZ)
      const fromSource = Number(root.dataset.homeDistanceOrb)
      // Stop actual movement *inside* the normal radius with a settling
      // margin; never teleport, enlarge the radius or accept a DOM label alone.
      return Number.isFinite(x) && Number.isFinite(z) &&
        Number.isFinite(fromSource) && fromSource < 2.2 &&
        Math.hypot(x - .1, z + 1.9) < 2.2
    }, null, { timeout: profile.reducedMotion ? 45000 : 12000, polling: 100 })
  } catch (error) {
    proximityError = error
  } finally {
    if (!profile.mobile) await page.keyboard.up('KeyW')
    else await releaseMobileApproach?.()
    await page.evaluate(() => window.clearInterval(window.__uraiV3ApproachTimer))
  }
  if (!proximityError) {
    try {
      await page.waitForFunction(() => {
        const root = document.querySelector('.urai-asset-home-world[data-home-primary-owner="asset-driven"]')
        if (!root) return false
        const x = Number(root.dataset.homePlayerX), z = Number(root.dataset.homePlayerZ)
        return root.dataset.homeNearby === 'orb' && Number.isFinite(x) &&
          Number.isFinite(z) && Number(root.dataset.homeDistanceOrb) < 2.4 &&
          Math.hypot(x - .1, z + 1.9) < 2.4
      }, null, { timeout: profile.reducedMotion ? 10000 : 5000, polling: 100 })
    } catch (error) { proximityError = error }
  }
  const approachTrace = await page.evaluate(() => window.__uraiV3ApproachTrace || [])
  if (proximityError) {
    const state = await owner.evaluate(element => ({
      x: element.dataset.homePlayerX, z: element.dataset.homePlayerZ,
      nearby: element.dataset.homeNearby, distance: element.dataset.homeDistanceOrb
    }))
    const diagnostic = { profile: profile.id, state, approachTrace, error: String(proximityError).slice(0, 800) }
    receipt.proximityDiagnostics = [...(receipt.proximityDiagnostics || []), diagnostic]
    await screenshot(page, profile.id + '-orb-approach-failed').catch(() => {})
    throw new Error(profile.id + ' source-anchored physical/semantic Orb approach failed: ' + JSON.stringify(diagnostic).slice(0, 3500))
  }
  const arrivalAtOrb = await owner.evaluate(element => ({
    x: Number(element.dataset.homePlayerX), z: Number(element.dataset.homePlayerZ),
    nearby: element.dataset.homeNearby, orbState: element.dataset.homeOrbState,
    distanceToSourceOrb: Number(element.dataset.homeDistanceOrb)
  }))
  if (arrivalAtOrb.nearby !== 'orb' || !Number.isFinite(arrivalAtOrb.x) || !Number.isFinite(arrivalAtOrb.z)
    || !(arrivalAtOrb.distanceToSourceOrb < 2.4)
    || Math.hypot(arrivalAtOrb.x - .1, arrivalAtOrb.z + 1.9) >= 2.4)
    throw new Error(profile.id + ' failed V3 source-anchored Orb proximity')
  const atOrb = await screenshot(page, profile.id + '-at-orb')
  if (profile.mobile) {
    const accessibleOrb = page.getByTestId('home-semantic-orb')
    await accessibleOrb.waitFor({ state: 'attached', timeout: 10000 })
    if (!await accessibleOrb.isEnabled()) throw new Error('Mobile accessible Orb control is not authorized/ready')
    const orbTarget = await accessibleOrb.boundingBox()
    if (!orbTarget || orbTarget.width < 48 || orbTarget.height < 48) throw new Error('Mobile accessible Orb target below 48px')
    await accessibleOrb.tap({ timeout: 15000 })
  } else {
    await page.keyboard.press('Enter')
  }
  await page.waitForFunction(() => window.__uraiV3OrbOpenProofCount > 0, null, { timeout: 12000 })
  const orbOpenEvents = await page.evaluate(() => window.__uraiV3OrbOpenProofCount)
  if (orbOpenEvents !== 1) throw new Error(profile.id + ' unexpected duplicate Orb activation: ' + orbOpenEvents)
  const activated = await screenshot(page, profile.id + '-orb-activated')
  const orbState = await owner.getAttribute('data-home-orb-state').catch(() => null)
  if (errors.length) throw new Error(profile.id + ' browser exceptions: ' + errors.join(' | '))
  receipt.scenarios.push({ profile: profile.id, before, after, arrivalAtOrb, orbOpenEvents, orbState, affordances, asset: loaded, frameTiming, touchEvidence: profile.mobile ? 'hit-tested-Chromium-touch-and-unforced-Orb-tap' : 'keyboard', screenshots: [initial, moved, atOrb, activated], observed: 'first-person movement, V3 Orb proximity and real Orb open event; full-journey and physical navmesh remain unapproved' })
  await context.close()
}
try {
  await mkdir(outputDir, { recursive: true })
  guard('verify-source')
  guard('assert-excluded')
  guard('stage')
  server = spawn('pnpm', ['--dir', 'urai-tier1', 'exec', 'next', 'dev', '--hostname', '127.0.0.1', '--port', String(port)], {
    cwd: root, env: { ...process.env, NODE_ENV: 'development', URAI_V3_DEV_BROWSER_PROOF: 'true' }, stdio: 'ignore', detached: true
  })
  await waitReady()
  browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader', '--disable-gpu-sandbox', '--disable-dev-shm-usage'] })
  receipt.browser = { engine: 'chromium', version: browser.version(), environment: 'development WebGL software renderer; not device GPU certification' }
  for (const profile of [
    { id: 'desktop', viewport: { width: 1440, height: 900 } },
    { id: 'mobile', viewport: { width: 390, height: 844 }, mobile: true },
    { id: 'reduced-motion', viewport: { width: 1280, height: 800 }, reducedMotion: true }
  ]) await testProfile(profile)
  receipt.executed = true
} catch (error) {
  receipt.failures.push(String(error?.stack || error))
  process.exitCode = 1
} finally {
  await browser?.close().catch(() => {})
  if (server) {
    try { process.kill(-server.pid, 'SIGTERM') } catch { server.kill('SIGTERM') }
    await new Promise(resolve => { if (server.exitCode !== null) return resolve(); server.once('exit', resolve); setTimeout(resolve, 7000).unref() })
  }
  try { guard('clean'); guard('assert-build-excluded') } catch (error) { receipt.failures.push(String(error)); process.exitCode = 1 }
  await mkdir(outputDir, { recursive: true })
  await writeFile(path.join(outputDir, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n')
  console.log(JSON.stringify({ head, scenarios: receipt.scenarios.length, failures: receipt.failures.length, receipt: path.join(outputDir, 'receipt.json') }))
}
