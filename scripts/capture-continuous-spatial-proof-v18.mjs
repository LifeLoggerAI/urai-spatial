import { mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'

const requireFromTierOne = createRequire(new URL('../urai-tier1/package.json', import.meta.url))
const { chromium } = requireFromTierOne('playwright')

const base = process.env.URAI_PROOF_BASE || 'http://127.0.0.1:4173'
const outputDir = path.resolve(process.env.URAI_PROOF_DIR || 'artifacts/continuous-spatial-proof')
const videoDir = path.join(outputDir, 'videos')
const exactHead = process.env.URAI_EXACT_HEAD || 'local'
const expectReady = process.env.URAI_HOME_EXPECT_READY === 'true'
const ownerSelector = '.urai-asset-home-world[data-home-primary-owner="asset-driven"]'
const fallbackSelector = '.urai-home-asset-fallback, .urai-final-home-world, .urai-genesis-home__world'
const orbStates = ['dormant', 'idle', 'attention', 'listening', 'thinking', 'speaking', 'guiding', 'reflecting', 'calming', 'privacy', 'warning', 'transition']
const orbSensoryClips = {
  dormant: 'orb-rest', idle: 'orb-breathe', attention: 'orb-attention', listening: 'orb-listening',
  thinking: 'orb-thinking', speaking: 'orb-speaking', guiding: 'orb-guide', reflecting: 'orb-reflect',
  calming: 'orb-calm', privacy: 'orb-privacy', warning: 'orb-warning', transition: 'orb-transition',
}
const orbModelClips = {
  dormant: 'Orb_Resting', idle: 'Orb_Idle', attention: 'Orb_Attention', listening: 'Orb_Listening',
  thinking: 'Orb_Thinking', speaking: 'Orb_Speaking', guiding: 'Orb_Guiding', reflecting: 'Orb_Reflecting',
  calming: 'Orb_Calming', privacy: 'Orb_Privacy', warning: 'Orb_Degraded', transition: 'Orb_Transition',
}

const destinationTelemetry = {
  orb: { x: 0, z: -9.1, radius: 2.35, attribute: 'data-home-distance-orb' },
  ground: { x: -4.85, z: -8.25, radius: 2.65, attribute: 'data-home-distance-ground' },
  'life-map': { x: 4.85, z: -8.25, radius: 2.65, attribute: 'data-home-distance-life-map' },
}
const movementKeys = { forward: 'w', back: 's', left: 'a', right: 'd' }
const movementButtonNames = { forward: 'Move forward', back: 'Move backward', left: 'Move left', right: 'Move right' }
const movementPointerIds = { forward: 31, back: 32, left: 33, right: 34 }

const viewports = [
  { id: 'desktop', width: 1440, height: 900, isMobile: false, hasTouch: false },
  { id: 'portrait-mobile', width: 390, height: 844, isMobile: true, hasTouch: true },
  { id: 'landscape-mobile', width: 844, height: 390, isMobile: true, hasTouch: true },
]

await mkdir(outputDir, { recursive: true })
await mkdir(videoDir, { recursive: true })

const receipt = {
  schemaVersion: 'urai-continuous-spatial-visual-proof-18',
  exactHead,
  capturedAt: new Date().toISOString(),
  base,
  expectReady,
  captures: [],
  interactions: [],
  errors: [],
}

function delay(ms) { return new Promise((resolve) => setTimeout(resolve, ms)) }
function urlFor(route, query = '') {
  const suffix = query ? `${route.includes('?') ? '&' : '?'}${query}` : ''
  return `${base}${route}${suffix}`
}
function candidateQuery(query = '') {
  return `homeAssetReview=1${query ? `&${query}` : ''}`
}
function safeName(value) { return value.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-|-$/g, '') }

async function waitFrames(page, count = 2) {
  await page.evaluate((frameCount) => new Promise((resolve) => {
    let remaining = frameCount
    const tick = () => { if (--remaining <= 0) resolve(); else requestAnimationFrame(tick) }
    requestAnimationFrame(tick)
  }), count)
}

async function visibleCount(locator) {
  return locator.evaluateAll((nodes) => nodes.filter((node) => {
    if (node.closest('.sr-only')) return false
    const style = getComputedStyle(node)
    const rect = node.getBoundingClientRect()
    return style.display !== 'none' && style.visibility !== 'hidden' && Number.parseFloat(style.opacity || '1') > 0.02
      && rect.width > 4 && rect.height > 4 && rect.bottom > 0 && rect.right > 0 && rect.top < innerHeight && rect.left < innerWidth
  }).length)
}

function attachDiagnostics(page, label) {
  const consoleErrors = []
  const pageErrors = []
  const failedRequests = []
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', (error) => pageErrors.push(String(error)))
  page.on('requestfailed', (request) => failedRequests.push({ url: request.url(), failure: request.failure()?.errorText || 'unknown' }))
  return () => ({ label, consoleErrors, pageErrors, failedRequests })
}

async function openContext(browser, spec, extras = {}) {
  const context = await browser.newContext({
    viewport: { width: spec.width, height: spec.height },
    isMobile: spec.isMobile,
    hasTouch: spec.hasTouch,
    reducedMotion: extras.reducedMotion,
    forcedColors: extras.forcedColors,
    recordVideo: { dir: videoDir, size: { width: spec.width, height: spec.height } },
  })
  const page = await context.newPage()
  return { context, page }
}

async function closeAndRecordVideo(context, page, id) {
  const video = page.video()
  await context.close()
  if (!video) return null
  try {
    const target = path.join(videoDir, `${safeName(id)}.webm`)
    await video.saveAs(target)
    return path.relative(outputDir, target)
  } catch (error) {
    receipt.errors.push({ id, videoError: String(error) })
    return null
  }
}

async function waitForAssetHome(page, { ready = true } = {}) {
  await page.locator(ownerSelector).waitFor({ state: 'visible', timeout: 45_000 })
  if (ready) {
    await page.waitForFunction((selector) => {
      const owner = document.querySelector(selector)
      if (!owner) return false
      const loadingVisible = [...document.querySelectorAll('.home-runtime-loading, .home-world-loading, .home-world-loading-canvas')]
        .some((node) => {
          const style = getComputedStyle(node)
          const rect = node.getBoundingClientRect()
          return style.display !== 'none' && style.visibility !== 'hidden' && Number.parseFloat(style.opacity || '1') > 0.02
            && rect.width > 4 && rect.height > 4
        })
      return owner.getAttribute('data-home-assets-ready') === 'true'
        && owner.getAttribute('data-home-input-ready') === 'true'
        && owner.getAttribute('data-home-interaction-ready') === 'true'
        && owner.getAttribute('data-home-ready') === 'true'
        && owner.getAttribute('data-home-input-owner') === 'window-capture-movement'
        && owner.getAttribute('data-home-telemetry-owner') === 'embodied-motion-kernel'
        && !loadingVisible
    }, ownerSelector, { timeout: 45_000 })
  }
  await waitFrames(page, 3)
}

async function verifyHome(page, expected) {
  const owner = page.locator(ownerSelector)
  const semantic = page.getByRole('navigation', { name: 'Accessible Home destinations' })
  const semanticButtons = semantic.getByRole('button')
  const canvas = owner.locator('canvas').first()
  const rect = await canvas.boundingBox()
  const result = {
    ownerCount: await owner.count(),
    canvasVisible: await canvas.isVisible().catch(() => false),
    canvasWidth: rect ? Math.round(rect.width) : 0,
    canvasHeight: rect ? Math.round(rect.height) : 0,
    assetMode: await owner.getAttribute('data-home-asset-mode'),
    personalizationMode: await owner.getAttribute('data-home-personalization-mode'),
    reviewFixture: await owner.getAttribute('data-home-review-fixture'),
    orbState: await owner.getAttribute('data-home-orb-state'),
    orbClip: await owner.getAttribute('data-home-orb-clip'),
    orbModelClip: await owner.getAttribute('data-home-orb-model-clip'),
    animationOwner: await owner.getAttribute('data-home-animation-owner'),
    assetsReady: await owner.getAttribute('data-home-assets-ready'),
    fallbackVisible: await visibleCount(page.locator(fallbackSelector)),
    semanticButtons: await semanticButtons.count(),
    semanticVisible: await visibleCount(semanticButtons),
    discreetControls: await visibleCount(page.locator('.home-discreet-controls button')),
  }
  const requiredMode = expected.assetMode || (expectReady ? 'ready' : 'disclosed-review-candidate')
  const passed = result.ownerCount === 1 && result.canvasVisible && result.canvasWidth >= 240 && result.canvasHeight >= 240
    && result.assetMode === requiredMode && result.personalizationMode === expected.mode
    && result.reviewFixture === (expected.fixture || 'none') && result.orbState === expected.orbState
    && result.orbClip === orbSensoryClips[expected.orbState] && result.orbModelClip === orbModelClips[expected.orbState]
    && result.animationOwner === 'authored-sanctuary-plus-gltf-interactions'
    && result.assetsReady === 'true' && result.fallbackVisible === 0
    && result.semanticButtons === 3 && result.semanticVisible === 0 && result.discreetControls === 2
  return { ...result, passed }
}

async function captureHomeState(browser, spec, state) {
  const id = `${state.id}-${spec.id}`
  const { context, page } = await openContext(browser, spec, state.context || {})
  const diagnostics = attachDiagnostics(page, id)
  const route = state.route || '/home/'
  const query = expectReady ? state.query : candidateQuery(state.query)
  await page.goto(urlFor(route, query), { waitUntil: 'domcontentloaded', timeout: 45_000 })
  await waitForAssetHome(page)
  const verification = await verifyHome(page, state)
  const screenshot = path.join(outputDir, `${safeName(id)}-${exactHead.slice(0, 12)}.png`)
  await page.screenshot({ path: screenshot, fullPage: false })
  const diagnosticResult = diagnostics()
  const video = await closeAndRecordVideo(context, page, id)
  const record = { id, route, query, viewport: spec, screenshot: path.relative(outputDir, screenshot), video, verification, diagnostics: diagnosticResult }
  receipt.captures.push(record)
  if (!verification.passed || diagnosticResult.pageErrors.length || diagnosticResult.consoleErrors.length || diagnosticResult.failedRequests.length) receipt.errors.push(record)
}

async function captureLoading(browser, spec) {
  const id = `home-loading-${spec.id}`
  const { context, page } = await openContext(browser, spec)
  const diagnostics = attachDiagnostics(page, id)
  await page.route('**/*.glb', async (route) => { await delay(900); await route.continue() })
  const query = expectReady ? 'homePrivateFixture=1' : candidateQuery('homePrivateFixture=1&homeLoadingHold=1')
  const navigation = page.goto(urlFor('/home/', query), { waitUntil: 'domcontentloaded', timeout: 45_000 })
  const loading = page.getByText('Your private world is forming', { exact: true }).filter({ visible: true }).first()
  await loading.waitFor({ state: 'visible', timeout: 20_000 })
  const screenshot = path.join(outputDir, `${id}-${exactHead.slice(0, 12)}.png`)
  await page.screenshot({ path: screenshot })
  await navigation
  await waitForAssetHome(page)
  const diagnosticResult = diagnostics()
  const video = await closeAndRecordVideo(context, page, id)
  const record = { id, screenshot: path.relative(outputDir, screenshot), video, loadingVisible: true, diagnostics: diagnosticResult }
  receipt.captures.push(record)
  if (diagnosticResult.pageErrors.length || diagnosticResult.consoleErrors.length || diagnosticResult.failedRequests.length) receipt.errors.push(record)
}

async function captureOrbStates(browser) {
  const spec = viewports[0]
  for (const state of orbStates) {
    await captureHomeState(browser, spec, {
      id: `home-orb-${state}`,
      route: '/home/',
      query: `homePrivateFixture=1&homeOrbState=${state}`,
      mode: 'private-personalized',
      fixture: 'safe-private',
      orbState: state,
    })
  }
}

async function describeFocus(page) {
  return page.evaluate(() => {
    const active = document.activeElement
    if (!(active instanceof HTMLElement)) return null
    return {
      tag: active.tagName.toLowerCase(),
      role: active.getAttribute('role'),
      ariaLabel: active.getAttribute('aria-label'),
      className: active.className || null,
      editable: active.isContentEditable,
    }
  })
}

async function clearEditableFocus(page) {
  return page.evaluate(() => {
    const editableRoles = new Set(['button', 'link', 'textbox', 'combobox', 'menuitem', 'option', 'radio', 'switch', 'tab'])
    const describe = (element) => element instanceof HTMLElement
      ? { tag: element.tagName.toLowerCase(), role: element.getAttribute('role'), ariaLabel: element.getAttribute('aria-label'), className: element.className || null, editable: element.isContentEditable }
      : null
    const isEditable = (element) => element instanceof HTMLElement && (
      element.isContentEditable
      || ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(element.tagName)
      || editableRoles.has(element.getAttribute('role') || '')
    )
    const active = document.activeElement
    const before = describe(active)
    const blurred = isEditable(active)
    if (blurred) active.blur()
    const after = document.activeElement
    return { before, blurred, after: describe(after), afterEditable: isEditable(after) }
  })
}

async function readMovementTelemetry(page, destination) {
  const target = destinationTelemetry[destination]
  return page.evaluate(({ selector, destination, targetAttribute }) => {
    const owner = document.querySelector(selector)
    const numeric = (name) => {
      const value = Number.parseFloat(owner?.getAttribute(name) || '')
      return Number.isFinite(value) ? value : null
    }
    const active = document.activeElement
    return {
      destination,
      selector,
      selectorCount: document.querySelectorAll(selector).length,
      primaryOwner: owner?.getAttribute('data-home-primary-owner') || null,
      telemetryOwner: owner?.getAttribute('data-home-telemetry-owner') || null,
      inputOwner: owner?.getAttribute('data-home-input-owner') || null,
      assetsReady: owner?.getAttribute('data-home-assets-ready') || null,
      inputReady: owner?.getAttribute('data-home-input-ready') || null,
      interactionReady: owner?.getAttribute('data-home-interaction-ready') || null,
      homeReady: owner?.getAttribute('data-home-ready') || null,
      playerX: numeric('data-home-player-x'),
      playerZ: numeric('data-home-player-z'),
      distanceTravelled: numeric('data-home-distance'),
      distanceToTarget: numeric(targetAttribute),
      nearby: owner?.getAttribute('data-home-nearby') || null,
      moving: owner?.getAttribute('data-home-moving') || null,
      pressedKeys: owner?.getAttribute('data-home-pressed-keys') || '',
      movementVector: owner?.getAttribute('data-home-movement-vector') || null,
      renderedFrames: numeric('data-home-rendered-frames'),
      focus: active instanceof HTMLElement ? {
        tag: active.tagName.toLowerCase(),
        role: active.getAttribute('role'),
        ariaLabel: active.getAttribute('aria-label'),
        className: active.className || null,
        editable: active.isContentEditable,
      } : null,
    }
  }, { selector: ownerSelector, destination, targetAttribute: target.attribute })
}

function desiredDirections(telemetry, destination) {
  const target = destinationTelemetry[destination]
  const directions = []
  if (telemetry.playerZ == null || telemetry.playerX == null) return directions
  const dz = target.z - telemetry.playerZ
  const dx = target.x - telemetry.playerX
  if (dz < -0.32) directions.push('forward')
  else if (dz > 0.32) directions.push('back')
  if (dx < -0.32) directions.push('left')
  else if (dx > 0.32) directions.push('right')
  return directions
}

async function setKeyboardDirections(page, active, desired) {
  for (const direction of [...active]) {
    if (desired.has(direction)) continue
    await page.keyboard.up(movementKeys[direction])
    active.delete(direction)
  }
  for (const direction of desired) {
    if (active.has(direction)) continue
    await page.keyboard.down(movementKeys[direction])
    active.add(direction)
  }
}

async function setTouchDirections(page, active, desired) {
  for (const direction of [...active]) {
    if (desired.has(direction)) continue
    const button = page.getByRole('button', { name: movementButtonNames[direction] })
    await button.dispatchEvent('pointerup', { pointerId: movementPointerIds[direction], pointerType: 'touch', button: 0 })
    active.delete(direction)
  }
  for (const direction of desired) {
    if (active.has(direction)) continue
    const button = page.getByRole('button', { name: movementButtonNames[direction] })
    await button.dispatchEvent('pointerdown', { pointerId: movementPointerIds[direction], pointerType: 'touch', button: 0 })
    active.add(direction)
  }
}

async function releaseDirections(page, method, active) {
  const desired = new Set()
  if (method === 'keyboard') await setKeyboardDirections(page, active, desired)
  else await setTouchDirections(page, active, desired)
}

async function moveToNearby(page, destination, method, timeout = 40_000) {
  const focus = method === 'keyboard' ? await clearEditableFocus(page) : { before: await describeFocus(page), blurred: false, after: await describeFocus(page), afterEditable: false }
  if (focus.afterEditable) throw new Error(`Home proof could not clear editable focus before movement: ${JSON.stringify(focus)}`)

  const start = await readMovementTelemetry(page, destination)
  const active = new Set()
  const samples = [start]
  const startedAt = Date.now()
  let bestDistance = start.distanceToTarget ?? Infinity
  let lastProgressAt = startedAt
  let nextSampleAt = startedAt + 1_000
  let reached = false

  try {
    while (Date.now() - startedAt < timeout) {
      const telemetry = await readMovementTelemetry(page, destination)
      if (telemetry.distanceToTarget != null && telemetry.distanceToTarget < bestDistance - 0.025) {
        bestDistance = telemetry.distanceToTarget
        lastProgressAt = Date.now()
      }
      if (Date.now() >= nextSampleAt && samples.length < 32) {
        samples.push(telemetry)
        nextSampleAt += 1_000
      }
      if (telemetry.nearby === destination) {
        reached = true
        break
      }
      if (Date.now() - lastProgressAt > 10_000) break
      const directions = desiredDirections(telemetry, destination)
      const desired = method === 'touch' && directions.length > 1
        ? new Set([directions.find((direction) => direction === 'left' || direction === 'right') || directions[0]])
        : new Set(directions)
      if (!desired.size) break
      if (method === 'keyboard') await setKeyboardDirections(page, active, desired)
      else await setTouchDirections(page, active, desired)
      await delay(250)
    }
  } finally {
    await releaseDirections(page, method, active)
  }

  await waitFrames(page, 3)
  const end = await readMovementTelemetry(page, destination)
  samples.push(end)
  const evidence = {
    method,
    target: { destination, ...destinationTelemetry[destination] },
    focus,
    start,
    end,
    elapsedMs: Date.now() - startedAt,
    distanceTravelled: start.playerX != null && start.playerZ != null && end.playerX != null && end.playerZ != null
      ? Math.hypot(end.playerX - start.playerX, end.playerZ - start.playerZ)
      : null,
    bestDistanceToTarget: Number.isFinite(bestDistance) ? bestDistance : null,
    reached,
    samples,
  }
  if (!reached || evidence.distanceTravelled == null || evidence.distanceTravelled < 0.25) {
    const error = new Error(`Home ${method} movement did not reach ${destination}: ${JSON.stringify(evidence)}`)
    error.evidence = evidence
    throw error
  }
  return evidence
}

async function resetHome(page) {
  await page.keyboard.press('r')
  await page.waitForFunction((selector) => {
    const owner = document.querySelector(selector)
    const distance = Number.parseFloat(owner?.getAttribute('data-home-distance') || '')
    return owner?.getAttribute('data-home-nearby') === 'none' && Number.isFinite(distance) && distance < 0.05
  }, ownerSelector, { timeout: 10_000 })
  await waitFrames(page, 2)
}

async function captureInteraction(browser, spec, method, destination) {
  const id = `home-${method}-${destination}-${spec.id}`
  const { context, page } = await openContext(browser, spec)
  const diagnostics = attachDiagnostics(page, id)
  const query = expectReady ? 'homePrivateFixture=1' : candidateQuery('homePrivateFixture=1')
  let movement = null
  let movementFailure = null
  let editableFocusProven = false
  let screenshot = null
  try {
    await page.goto(urlFor('/home/', query), { waitUntil: 'domcontentloaded', timeout: 45_000 })
    await waitForAssetHome(page)
    if (method === 'keyboard') {
      const editableControl = page.locator('.home-discreet-controls button').first()
      await editableControl.focus()
      editableFocusProven = await editableControl.evaluate((node) => node === document.activeElement)
      if (!editableFocusProven) throw new Error('Home proof could not establish editable-control focus before movement regression')
    }
    movement = await moveToNearby(page, destination, method)
  } catch (error) {
    movementFailure = { message: String(error), evidence: error?.evidence || null, stack: error?.stack || null }
  }

  screenshot = path.join(outputDir, `${id}-${movementFailure ? 'failed' : 'nearby'}-${exactHead.slice(0, 12)}.png`)
  await page.screenshot({ path: screenshot }).catch(() => {})
  const result = {
    nearby: await page.locator(ownerSelector).getAttribute('data-home-nearby').catch(() => null),
    contextVisible: await visibleCount(page.locator('.home-world-context')).catch(() => 0) === 1,
    editableFocusProven,
    focusClear: movement?.focus || movementFailure?.evidence?.focus || null,
    movement,
    movementFailure,
    finalTelemetry: await readMovementTelemetry(page, destination).catch(() => null),
  }
  const diagnosticResult = diagnostics()
  const video = await closeAndRecordVideo(context, page, id)
  const record = { id, method, destination, screenshot: path.relative(outputDir, screenshot), video, result, diagnostics: diagnosticResult }
  receipt.interactions.push(record)
  const failed = Boolean(movementFailure)
    || result.nearby !== destination || !result.contextVisible
    || !movement || movement.distanceTravelled == null || movement.distanceTravelled < 0.25
    || (method === 'keyboard' && (!result.editableFocusProven || !result.focusClear?.blurred || result.focusClear.afterEditable))
    || diagnosticResult.pageErrors.length || diagnosticResult.consoleErrors.length || diagnosticResult.failedRequests.length
  if (failed) {
    receipt.errors.push(record)
    throw new Error(`Home interaction proof failed for ${id}: ${JSON.stringify(record)}`)
  }
}

async function capturePointerLook(browser) {
  const spec = viewports[0]
  const id = 'home-pointer-look-desktop'
  const { context, page } = await openContext(browser, spec)
  const diagnostics = attachDiagnostics(page, id)
  const query = expectReady ? 'homePrivateFixture=1' : candidateQuery('homePrivateFixture=1')
  await page.goto(urlFor('/home/', query), { waitUntil: 'domcontentloaded' })
  await waitForAssetHome(page)
  const owner = page.locator(ownerSelector)
  const canvas = owner.locator('canvas').first()
  const box = await canvas.boundingBox()
  if (!box) throw new Error('Home canvas missing for pointer-look proof')
  await canvas.dispatchEvent('pointerdown', { pointerId: 31, pointerType: 'mouse', button: 0, clientX: box.x + box.width * 0.5, clientY: box.y + box.height * 0.5 })
  await canvas.dispatchEvent('pointermove', { pointerId: 31, pointerType: 'mouse', buttons: 1, clientX: box.x + box.width * 0.64, clientY: box.y + box.height * 0.42 })
  const cameraMode = await owner.getAttribute('data-home-camera-mode')
  await canvas.dispatchEvent('pointerup', { pointerId: 31, pointerType: 'mouse', button: 0 })
  const screenshot = path.join(outputDir, `${id}-${exactHead.slice(0, 12)}.png`)
  await page.screenshot({ path: screenshot })
  const diagnosticResult = diagnostics()
  const video = await closeAndRecordVideo(context, page, id)
  const record = { id, cameraMode, screenshot: path.relative(outputDir, screenshot), video, diagnostics: diagnosticResult }
  receipt.interactions.push(record)
  if (cameraMode !== 'look' || diagnosticResult.pageErrors.length || diagnosticResult.consoleErrors.length || diagnosticResult.failedRequests.length) receipt.errors.push(record)
}

async function capturePortalSequence(browser) {
  const spec = viewports[0]
  for (const destination of ['ground', 'life-map']) {
    const id = `home-portal-${destination}`
    const { context, page } = await openContext(browser, spec)
    const diagnostics = attachDiagnostics(page, id)
    const query = expectReady ? 'homePrivateFixture=1' : candidateQuery('homePrivateFixture=1')
    await page.goto(urlFor('/home/', query), { waitUntil: 'domcontentloaded' })
    await waitForAssetHome(page)
    await moveToNearby(page, destination, 'keyboard')
    await page.keyboard.press('Enter')
    await page.waitForFunction((selector) => document.querySelector(selector)?.getAttribute('data-home-portal-sequence') === 'traversal', ownerSelector, { timeout: 10_000 })
    const sequence = await page.locator(ownerSelector).getAttribute('data-home-portal-sequence')
    const screenshot = path.join(outputDir, `${id}-${exactHead.slice(0, 12)}.png`)
    await page.screenshot({ path: screenshot })
    const diagnosticResult = diagnostics()
    const video = await closeAndRecordVideo(context, page, id)
    const record = { id, destination, sequence, screenshot: path.relative(outputDir, screenshot), video, diagnostics: diagnosticResult }
    receipt.interactions.push(record)
    if (sequence !== 'traversal' || diagnosticResult.pageErrors.length || diagnosticResult.consoleErrors.length || diagnosticResult.failedRequests.length) receipt.errors.push(record)
  }
}

async function captureFallback(browser) {
  const spec = viewports[0]
  const { context, page } = await openContext(browser, spec)
  const diagnostics = attachDiagnostics(page, 'home-no-webgl-fallback')
  await page.addInitScript(() => { Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', { configurable: true, value: () => null }) })
  await page.goto(urlFor('/home/'), { waitUntil: 'domcontentloaded' })
  const fallback = page.getByRole('region', { name: 'Spatial Home fallback' })
  await fallback.waitFor({ state: 'visible', timeout: 30_000 })
  const semantic = page.getByRole('navigation', { name: 'Accessible Home destinations' })
  const screenshot = path.join(outputDir, `home-no-webgl-fallback-${exactHead.slice(0, 12)}.png`)
  await page.screenshot({ path: screenshot })
  const record = {
    id: 'home-no-webgl-fallback',
    screenshot: path.relative(outputDir, screenshot),
    fallbackVisible: await fallback.isVisible(),
    semanticButtons: await semantic.getByRole('button').count(),
    diagnostics: diagnostics(),
  }
  record.video = await closeAndRecordVideo(context, page, record.id)
  receipt.captures.push(record)
  if (!record.fallbackVisible || record.semanticButtons !== 3 || record.diagnostics.pageErrors.length || record.diagnostics.consoleErrors.length) receipt.errors.push(record)
}

const browser = await chromium.launch({ headless: true })
try {
  await captureHomeState(browser, viewports[0], { id: 'home-normal-root', route: '/', query: 'homePrivateFixture=1', mode: 'private-personalized', fixture: 'safe-private', orbState: 'idle' })
  await captureHomeState(browser, viewports[0], { id: 'home-normal-home', route: '/home/', query: 'homePrivateFixture=1', mode: 'private-personalized', fixture: 'safe-private', orbState: 'idle' })
  await captureLoading(browser, viewports[0])
  await captureOrbStates(browser)
  for (const spec of viewports) {
    for (const destination of ['orb', 'ground', 'life-map']) {
      await captureInteraction(browser, spec, spec.isMobile ? 'touch' : 'keyboard', destination)
    }
  }
  await capturePointerLook(browser)
  await capturePortalSequence(browser)
  await captureFallback(browser)
} catch (error) {
  receipt.errors.push({ fatal: String(error), stack: error?.stack || null })
} finally {
  await browser.close()
}

await writeFile(path.join(outputDir, 'receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`)
console.log(JSON.stringify(receipt, null, 2))
if (receipt.errors.length) process.exit(1)
