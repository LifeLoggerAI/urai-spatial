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
const orbClips = {
  dormant: 'Orb_Resting', idle: 'Orb_Idle', attention: 'Orb_Attention', listening: 'Orb_Listening',
  thinking: 'Orb_Thinking', speaking: 'Orb_Speaking', guiding: 'Orb_Guiding', reflecting: 'Orb_Reflecting',
  calming: 'Orb_Calming', privacy: 'Orb_Privacy', warning: 'Orb_Degraded', transition: 'Orb_Transition',
}

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
    const source = await video.path()
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
    await page.waitForFunction((selector) => document.querySelector(selector)?.getAttribute('data-home-assets-ready') === 'true', ownerSelector, { timeout: 45_000 })
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
    && result.orbClip === orbClips[expected.orbState] && result.animationOwner === 'authored-sanctuary-plus-gltf-interactions'
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
  const loading = page.getByRole('status', { name: /private world is forming/i }).first()
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

async function holdKeysUntil(page, keys, target, timeout = 18_000) {
  for (const key of keys) await page.keyboard.down(key)
  try {
    await page.waitForFunction((expected) => document.querySelector('.urai-asset-home-world')?.getAttribute('data-home-nearby') === expected, target, { timeout })
  } finally {
    for (const key of [...keys].reverse()) await page.keyboard.up(key)
  }
  await waitFrames(page, 2)
}

async function resetHome(page) {
  await page.keyboard.press('KeyR')
  await page.waitForFunction((selector) => document.querySelector(selector)?.getAttribute('data-home-nearby') === 'none', ownerSelector, { timeout: 10_000 })
  await waitFrames(page, 2)
}

async function moveToNearby(page, destination, method) {
  if (method === 'keyboard') {
    const keys = destination === 'orb' ? ['KeyW'] : destination === 'ground' ? ['KeyW', 'KeyA'] : ['KeyW', 'KeyD']
    await holdKeysUntil(page, keys, destination, 22_000)
  } else if (method === 'touch') {
    const forward = page.getByRole('button', { name: 'Move forward' })
    const side = destination === 'ground' ? page.getByRole('button', { name: 'Move left' }) : destination === 'life-map' ? page.getByRole('button', { name: 'Move right' }) : null
    await forward.dispatchEvent('pointerdown', { pointerId: 21, pointerType: 'touch', button: 0 })
    if (side) await side.dispatchEvent('pointerdown', { pointerId: 22, pointerType: 'touch', button: 0 })
    try {
      await page.waitForFunction((target) => document.querySelector('.urai-asset-home-world')?.getAttribute('data-home-nearby') === target, destination, { timeout: 22_000 })
    } finally {
      await forward.dispatchEvent('pointerup', { pointerId: 21, pointerType: 'touch', button: 0 })
      if (side) await side.dispatchEvent('pointerup', { pointerId: 22, pointerType: 'touch', button: 0 })
    }
  } else {
    const canvas = page.locator(`${ownerSelector} canvas`).first()
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Home canvas has no pointer target')
    const point = destination === 'orb' ? [0.5, 0.58] : destination === 'ground' ? [0.28, 0.62] : [0.72, 0.62]
    await canvas.click({ position: { x: Math.round(box.width * point[0]), y: Math.round(box.height * point[1]) }, force: true })
    await page.waitForFunction((target) => document.querySelector('.urai-asset-home-world')?.getAttribute('data-home-nearby') === target, destination, { timeout: 22_000 })
  }
}

async function captureInteraction(browser, spec, method, destination) {
  const id = `home-${method}-${destination}-${spec.id}`
  const { context, page } = await openContext(browser, spec)
  const diagnostics = attachDiagnostics(page, id)
  const query = expectReady ? 'homePrivateFixture=1' : candidateQuery('homePrivateFixture=1')
  await page.goto(urlFor('/home/', query), { waitUntil: 'domcontentloaded', timeout: 45_000 })
  await waitForAssetHome(page)
  await moveToNearby(page, destination, method)
  const screenshot = path.join(outputDir, `${id}-nearby-${exactHead.slice(0, 12)}.png`)
  await page.screenshot({ path: screenshot })
  const result = {
    nearby: await page.locator(ownerSelector).getAttribute('data-home-nearby'),
    contextVisible: await visibleCount(page.locator('.home-world-context')) === 1,
  }
  const diagnosticResult = diagnostics()
  const video = await closeAndRecordVideo(context, page, id)
  const record = { id, method, destination, screenshot: path.relative(outputDir, screenshot), video, result, diagnostics: diagnosticResult }
  receipt.interactions.push(record)
  if (result.nearby !== destination || !result.contextVisible || diagnosticResult.pageErrors.length || diagnosticResult.consoleErrors.length || diagnosticResult.failedRequests.length) receipt.errors.push(record)
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
  const box = await owner.boundingBox()
  if (!box) throw new Error('Home owner has no pointer area')
  await page.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.48)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * 0.68, box.y + box.height * 0.42, { steps: 8 })
  const during = await owner.getAttribute('data-home-camera-mode')
  const screenshot = path.join(outputDir, `${id}-${exactHead.slice(0, 12)}.png`)
  await page.screenshot({ path: screenshot })
  await page.mouse.up()
  await page.waitForFunction((selector) => document.querySelector(selector)?.getAttribute('data-home-camera-mode') === 'embodied', ownerSelector)
  const diagnosticResult = diagnostics()
  const video = await closeAndRecordVideo(context, page, id)
  const record = { id, screenshot: path.relative(outputDir, screenshot), video, during, diagnostics: diagnosticResult }
  receipt.interactions.push(record)
  if (during !== 'look' || diagnosticResult.pageErrors.length || diagnosticResult.consoleErrors.length || diagnosticResult.failedRequests.length) receipt.errors.push(record)
}

async function capturePortalJourney(browser, destination) {
  const spec = viewports[0]
  const id = `home-${destination}-portal-journey`
  const { context, page } = await openContext(browser, spec)
  const diagnostics = attachDiagnostics(page, id)
  const query = expectReady ? 'homePrivateFixture=1' : candidateQuery('homePrivateFixture=1')
  await page.goto(urlFor('/home/', query), { waitUntil: 'domcontentloaded', timeout: 45_000 })
  await waitForAssetHome(page)
  await moveToNearby(page, destination, 'keyboard')
  await page.keyboard.press('Enter')
  const phases = []
  for (const phase of ['opening', 'traversal', 'closing']) {
    await page.waitForFunction(([target, expected]) => document.querySelector('.urai-asset-home-world')?.getAttribute('data-home-portal-sequence') === `${target}:${expected}`, [destination, phase], { timeout: 8_000 })
    const screenshot = path.join(outputDir, `${id}-${phase}-${exactHead.slice(0, 12)}.png`)
    await page.screenshot({ path: screenshot })
    phases.push({ phase, screenshot: path.relative(outputDir, screenshot) })
  }
  const targetPath = destination === 'ground' ? '/ground' : '/life-map'
  await page.waitForURL((url) => url.pathname.replace(/\/$/, '') === targetPath, { timeout: 25_000 })
  const destinationScreenshot = path.join(outputDir, `${id}-destination-${exactHead.slice(0, 12)}.png`)
  await page.screenshot({ path: destinationScreenshot })
  await page.keyboard.press('Escape')
  await page.waitForURL((url) => ['/', '/home'].includes(url.pathname.replace(/\/$/, '') || '/'), { timeout: 25_000 })
  const returnPath = new URL(page.url()).pathname
  const returnScreenshot = path.join(outputDir, `${id}-return-${exactHead.slice(0, 12)}.png`)
  await page.screenshot({ path: returnScreenshot })
  const diagnosticResult = diagnostics()
  const video = await closeAndRecordVideo(context, page, id)
  const record = { id, destination, phases, destinationScreenshot: path.relative(outputDir, destinationScreenshot), returnScreenshot: path.relative(outputDir, returnScreenshot), returnPath, video, diagnostics: diagnosticResult }
  receipt.interactions.push(record)
  if (!['/', '/home', '/home/'].includes(returnPath) || diagnosticResult.pageErrors.length || diagnosticResult.consoleErrors.length || diagnosticResult.failedRequests.length) receipt.errors.push(record)
}

async function captureOffline(browser) {
  const spec = viewports[0]
  const id = 'home-real-offline-transition'
  const { context, page } = await openContext(browser, spec)
  const diagnostics = attachDiagnostics(page, id)
  const query = expectReady ? 'homePrivateFixture=1' : candidateQuery('homePrivateFixture=1')
  await page.goto(urlFor('/home/', query), { waitUntil: 'domcontentloaded' })
  await waitForAssetHome(page)
  await context.setOffline(true)
  await page.evaluate(() => window.dispatchEvent(new Event('offline')))
  await page.waitForFunction((selector) => document.querySelector(selector)?.getAttribute('data-home-personalization-mode') === 'offline', ownerSelector, { timeout: 10_000 })
  const screenshot = path.join(outputDir, `${id}-${exactHead.slice(0, 12)}.png`)
  await page.screenshot({ path: screenshot })
  const mode = await page.locator(ownerSelector).getAttribute('data-home-personalization-mode')
  await context.setOffline(false)
  const diagnosticResult = diagnostics()
  diagnosticResult.failedRequests = diagnosticResult.failedRequests.filter((item) => !/firestore|googleapis|firebase/i.test(item.url))
  const video = await closeAndRecordVideo(context, page, id)
  const record = { id, screenshot: path.relative(outputDir, screenshot), video, mode, diagnostics: diagnosticResult }
  receipt.captures.push(record)
  if (mode !== 'offline' || diagnosticResult.pageErrors.length || diagnosticResult.consoleErrors.length || diagnosticResult.failedRequests.length) receipt.errors.push(record)
}

async function captureFallback(browser, id, query, expectedReason) {
  const spec = viewports[0]
  const { context, page } = await openContext(browser, spec)
  const diagnostics = attachDiagnostics(page, id)
  await page.goto(urlFor('/home/', query), { waitUntil: 'domcontentloaded', timeout: 45_000 })
  const fallback = page.locator('.urai-home-asset-fallback').first()
  await fallback.waitFor({ state: 'visible', timeout: 30_000 })
  const reason = await fallback.getAttribute('data-home-fallback-reason')
  const screenshot = path.join(outputDir, `${id}-${exactHead.slice(0, 12)}.png`)
  await page.screenshot({ path: screenshot })
  const diagnosticResult = diagnostics()
  const video = await closeAndRecordVideo(context, page, id)
  const record = { id, reason, expectedReason, screenshot: path.relative(outputDir, screenshot), video, diagnostics: diagnosticResult }
  receipt.captures.push(record)
  if (reason !== expectedReason || diagnosticResult.pageErrors.length) receipt.errors.push(record)
}

async function captureNoWebGL() {
  const id = 'home-no-webgl-fallback'
  const browser = await chromium.launch({ headless: true, args: ['--disable-webgl', '--disable-gpu'] })
  try {
    const spec = viewports[0]
    const { context, page } = await openContext(browser, spec)
    const diagnostics = attachDiagnostics(page, id)
    await page.goto(urlFor('/home/'), { waitUntil: 'domcontentloaded', timeout: 45_000 })
    const fallback = page.locator('.urai-final-home-world, .urai-genesis-home__world').first()
    await fallback.waitFor({ state: 'visible', timeout: 30_000 })
    const screenshot = path.join(outputDir, `${id}-${exactHead.slice(0, 12)}.png`)
    await page.screenshot({ path: screenshot })
    const diagnosticResult = diagnostics()
    const video = await closeAndRecordVideo(context, page, id)
    const record = { id, screenshot: path.relative(outputDir, screenshot), video, fallbackVisible: true, diagnostics: diagnosticResult }
    receipt.captures.push(record)
    if (diagnosticResult.pageErrors.length) receipt.errors.push(record)
  } finally {
    await browser.close()
  }
}

async function captureNormalMode(browser) {
  for (const route of ['/', '/home/']) {
    const id = `home-normal-${route === '/' ? 'root' : 'home'}-desktop`
    const { context, page } = await openContext(browser, viewports[0])
    const diagnostics = attachDiagnostics(page, id)
    await page.goto(urlFor(route, expectReady ? '' : candidateQuery()), { waitUntil: 'domcontentloaded', timeout: 45_000 })
    let result
    await waitForAssetHome(page)
    const expectedAssetMode = expectReady ? 'ready' : 'disclosed-review-candidate'
    const verification = await verifyHome(page, {
      mode: 'unavailable',
      fixture: 'none',
      orbState: 'warning',
      assetMode: expectedAssetMode,
    })
    result = { expected: expectedAssetMode, verification }
    const screenshot = path.join(outputDir, `${id}-${exactHead.slice(0, 12)}.png`)
    await page.screenshot({ path: screenshot })
    const diagnosticResult = diagnostics()
    const video = await closeAndRecordVideo(context, page, id)
    const record = { id, route, screenshot: path.relative(outputDir, screenshot), video, result, diagnostics: diagnosticResult }
    receipt.captures.push(record)
    if (!result.verification?.passed || diagnosticResult.pageErrors.length || diagnosticResult.consoleErrors.length || diagnosticResult.failedRequests.length) receipt.errors.push(record)
  }
}

const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] })
try {
  await captureNormalMode(browser)
  await captureLoading(browser, viewports[0])

  const coreStates = [
    { id: 'home-private-safe', query: 'homePrivateFixture=1', mode: 'private-personalized', fixture: 'safe-private', orbState: 'idle' },
    { id: 'home-world-forming', query: 'homeState=world-forming', mode: 'world-forming', orbState: 'idle' },
    { id: 'home-permission-limited', query: 'homeState=permission-limited', mode: 'permission-limited', orbState: 'privacy' },
    { id: 'home-unavailable', query: 'homeState=unavailable', mode: 'unavailable', orbState: 'warning' },
    { id: 'home-offline-fixture', query: 'homeState=offline', mode: 'offline', orbState: 'warning' },
    { id: 'home-explicit-sample', query: 'homeSample=1', mode: 'explicit-sample', orbState: 'idle' },
  ]
  for (const spec of viewports) {
    for (const route of ['/', '/home/']) {
      await captureHomeState(browser, spec, { ...coreStates[0], id: `${coreStates[0].id}-${route === '/' ? 'root' : 'home'}`, route })
    }
  }
  for (const state of coreStates.slice(1)) await captureHomeState(browser, viewports[0], state)
  await captureHomeState(browser, viewports[0], { ...coreStates[0], id: 'home-private-safe-reduced-motion', context: { reducedMotion: 'reduce' } })
  await captureHomeState(browser, viewports[0], { ...coreStates[0], id: 'home-private-safe-forced-colors', context: { forcedColors: 'active' } })
  await captureOrbStates(browser)
  await captureInteraction(browser, viewports[0], 'keyboard', 'orb')
  await captureInteraction(browser, viewports[0], 'pointer', 'orb')
  await captureInteraction(browser, viewports[1], 'touch', 'orb')
  await capturePointerLook(browser)
  await capturePortalJourney(browser, 'ground')
  await capturePortalJourney(browser, 'life-map')
  await captureOffline(browser)
  await captureFallback(browser, 'home-forced-asset-failure', candidateQuery('homePrivateFixture=1&homeAssetFailure=1'), 'forced-asset-failure')
} catch (error) {
  receipt.errors.push({ fatal: String(error), stack: error?.stack || null })
} finally {
  await browser.close()
}

await captureNoWebGL().catch((error) => receipt.errors.push({ id: 'home-no-webgl-fallback', fatal: String(error), stack: error?.stack || null }))
receipt.passed = receipt.errors.length === 0
await writeFile(path.join(outputDir, 'receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`)
console.log(JSON.stringify({ passed: receipt.passed, captures: receipt.captures.length, interactions: receipt.interactions.length, errors: receipt.errors.length, receipt: path.join(outputDir, 'receipt.json') }, null, 2))
if (!receipt.passed) process.exit(1)
