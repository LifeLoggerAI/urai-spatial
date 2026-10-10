import { chromium } from 'playwright'
import { createHash } from 'node:crypto'
import { waitForLifeMapDestination } from './native-doorway-destination-readiness.mjs'
import fs from 'node:fs/promises'
import path from 'node:path'

const baseUrl = (process.env.URAI_AUDIT_BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '')
const exactSha = String(process.env.URAI_PROOF_SOURCE_SHA || process.env.URAI_EXACT_HEAD || '').trim()
const outDir = process.env.URAI_NATIVE_DOORWAY_OUT_DIR || 'native-doorway-proof'
const domEvaluationTimeout = 90_000
const cases = [
  { device: 'desktop', method: 'semantic-pointer', viewport: { width: 1440, height: 1100 } },
  { device: 'desktop', method: 'keyboard', viewport: { width: 1440, height: 1100 } },
  { device: 'mobile', method: 'semantic-touch', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
]
const doorways = [
  { id: 'ground', destination: '/ground', name: 'Open Ground directly', testId: 'home-semantic-ground' },
  { id: 'life-map', destination: '/life-map', name: 'Open Life Map directly', testId: 'home-semantic-life-map' },
]
if (!/^[0-9a-f]{40}$/.test(exactSha)) throw new Error('Exact source SHA required')
const normalize = (value) => new URL(value).pathname.replace(/\/$/, '') || '/'

async function activate(page, target, method) {
  if (method === 'keyboard') {
    await target.focus({ timeout: domEvaluationTimeout })
    if (!await target.evaluate((node) => node === document.activeElement, undefined, { timeout: domEvaluationTimeout })) throw new Error('semantic target did not receive focus')
    await target.press('Enter', { timeout: domEvaluationTimeout })
    return { targetOwnsHitPoint: true, hitPoint: null }
  }

  await target.evaluate((node) => node.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' }), undefined, { timeout: domEvaluationTimeout })
  await target.evaluate(async (node) => {
    const frame = () => Promise.race([
      new Promise((resolve) => requestAnimationFrame(resolve)),
      new Promise((resolve) => setTimeout(resolve, 250)),
    ])
    const before = node.getBoundingClientRect()
    await frame()
    await frame()
    const after = node.getBoundingClientRect()
    const drift = Math.max(Math.abs(before.x - after.x), Math.abs(before.y - after.y), Math.abs(before.width - after.width), Math.abs(before.height - after.height))
    if (drift > 1) throw new Error(`semantic target geometry is still moving: ${drift.toFixed(2)}px`)
  }, undefined, { timeout: domEvaluationTimeout })
  const box = await target.boundingBox({ timeout: domEvaluationTimeout })
  if (!box) throw new Error('semantic target has no browser hit box')
  if (box.width < 44 || box.height < 44) throw new Error(`semantic target below 44px minimum: ${box.width}x${box.height}`)
  const hitPoint = { center: { x: box.x + box.width / 2, y: box.y + box.height / 2 } }
  const targetOwnsHitPoint = await target.evaluate((node, point) => {
    const hit = document.elementFromPoint(point.x, point.y)
    return hit === node || Boolean(hit && node.contains(hit))
  }, hitPoint.center, { timeout: domEvaluationTimeout })
  if (!targetOwnsHitPoint) throw new Error('semantic target does not own its browser-coordinate hit point')

  if (method === 'semantic-touch') await page.touchscreen.tap(hitPoint.center.x, hitPoint.center.y)
  else {
    await page.mouse.move(hitPoint.center.x, hitPoint.center.y)
    await page.waitForTimeout(16)
    await page.mouse.click(hitPoint.center.x, hitPoint.center.y)
  }
  return { targetOwnsHitPoint, hitPoint }
}

async function resolveTarget(page, doorway) {
  const target = page.getByTestId(doorway.testId)
  await target.waitFor({ state: 'visible', timeout: domEvaluationTimeout })
  await page.waitForFunction(({ testId, destination }) => {
    const node = document.querySelector(`[data-testid="${testId}"]`)
    if (!node) return false
    const reactOwned = Object.keys(node).some((key) => key.startsWith('__reactProps') && typeof node[key]?.onClick === 'function')
    const nativeAnchorOwned = node instanceof HTMLAnchorElement
      && (new URL(node.href).pathname.replace(/\/$/, '') || '/') === destination
    return reactOwned || nativeAnchorOwned
  }, { testId: doorway.testId, destination: doorway.destination }, { timeout: domEvaluationTimeout })
  const ownership = await target.evaluate((node) => {
    const nav = node.closest('nav.home-semantic-navigation')
    return {
      owner: nav?.getAttribute('data-home-navigation-owner') || '',
      nonDominant: nav?.getAttribute('data-home-navigation-non-dominant') || '',
    }
  }, undefined, { timeout: domEvaluationTimeout })
  if (ownership.owner !== 'runtime-boundary') throw new Error(`semantic target has unexpected owner ${ownership.owner || 'none'}`)
  if (ownership.nonDominant !== 'true') throw new Error('semantic target owner is not declared non-dominant')
  const accessibleName = await target.getAttribute('aria-label', { timeout: domEvaluationTimeout })
  if (accessibleName !== doorway.name) throw new Error(`unexpected accessible name ${accessibleName}`)
  const visibleLegacyDoorways = await page.locator('.urai-final-home-doorways:visible').count()
  if (visibleLegacyDoorways !== 0) throw new Error(`legacy visible doorway bars remain: ${visibleLegacyDoorways}`)
  return target
}

async function waitForSettledHomePresentation(page) {
  const handle = await page.waitForFunction(() => {
    const loadedWorld = document.querySelector('.urai-home-spatial-runtime-layer[data-webgl-ready="true"][data-home-assets-ready="true"]')
    const accessibleFallback = document.querySelector('[data-testid="urai-home-accessible-fallback"][data-webgl-ready="false"]')
    if (loadedWorld) return 'loaded-world'
    if (accessibleFallback) return 'accessible-fallback'
    return false
  }, null, { timeout: domEvaluationTimeout, polling: 50 })
  const state = await handle.jsonValue()
  await handle.dispose()
  return state
}

async function inspectSemanticNavigation(target) {
  return target.evaluate((node) => {
    const nav = node.closest('nav.home-semantic-navigation')
    if (!nav) return null
    const style = getComputedStyle(nav)
    const rect = nav.getBoundingClientRect()
    const viewportArea = Math.max(1, window.innerWidth * window.innerHeight)
    const navAreaRatio = Math.max(0, rect.width * rect.height) / viewportArea
    const declaredNonDominant = nav.getAttribute('data-home-navigation-non-dominant') === 'true'
    const visuallyQuiet = Number.parseFloat(style.opacity || '1') <= 0.05
    const spatiallyBounded = rect.width <= 64 && navAreaRatio <= 0.03
    return {
      declaredNonDominant,
      visuallyQuiet,
      spatiallyBounded,
      nonDominant: declaredNonDominant && visuallyQuiet && spatiallyBounded,
      focusRevealed: nav.matches(':focus-within'),
      opacity: Number.parseFloat(style.opacity || '1'),
      width: rect.width,
      areaRatio: navAreaRatio,
    }
  }, undefined, { timeout: domEvaluationTimeout })
}

async function restoreQuietLoadedWorldNavigation(page, target, presentation) {
  if (!presentation.focusRevealed) return presentation
  await target.evaluate((node) => {
    const nav = node.closest('nav.home-semantic-navigation')
    const focused = nav?.querySelector(':focus')
    if (focused instanceof HTMLElement) focused.blur()
  }, undefined, { timeout: domEvaluationTimeout })
  await page.waitForFunction((testId) => {
    const nav = document.querySelector(`[data-testid="${testId}"]`)?.closest('nav.home-semantic-navigation')
    return Boolean(nav && !nav.matches(':focus-within'))
  }, await target.getAttribute('data-testid', { timeout: domEvaluationTimeout }), { timeout: domEvaluationTimeout, polling: 50 })
  return inspectSemanticNavigation(target)
}

async function prove(browser, doorway, testCase) {
  const context = await browser.newContext({ viewport: testCase.viewport, isMobile: !!testCase.isMobile, hasTouch: !!testCase.hasTouch, deviceScaleFactor: testCase.isMobile ? 2 : 1 })
  const page = await context.newPage()
  const screenshot = `screenshots/${testCase.device}-${testCase.method}-home-to-${doorway.id}.png`
  const record = { exactSha, sourceRoute: '/home', destinationRoute: doorway.destination, device: testCase.device, activationMethod: testCase.method, inputDispatch: testCase.method === 'keyboard' ? 'focused-enter' : 'browser-coordinate-hit', viewport: testCase.viewport, targetAccessibleName: doorway.name, targetTestId: doorway.testId, resultingUrl: '', screenshot, homePresentationState: '', semanticNavigationOwner: 'runtime-boundary', semanticNavigationNonDominant: null, semanticNavigationFocusRevealedBeforeActivation: false, legacyVisibleDoorways: 0, targetOwnsHitPoint: false, hitPoint: null, navigationSucceeded: false, destinationReadiness: null, image: null, success: false, failureReason: '' }
  try {
    await page.goto(`${baseUrl}/home`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
    record.homePresentationState = await waitForSettledHomePresentation(page)
    const target = await resolveTarget(page, doorway)
    record.legacyVisibleDoorways = await page.locator('.urai-final-home-doorways:visible').count()
    let presentation = await inspectSemanticNavigation(target)
    if (!presentation) throw new Error('semantic navigation owner disappeared before activation')
    record.semanticNavigationFocusRevealedBeforeActivation = presentation.focusRevealed
    if (record.homePresentationState === 'loaded-world') {
      presentation = await restoreQuietLoadedWorldNavigation(page, target, presentation)
      if (!presentation) throw new Error('semantic navigation owner disappeared before quiet loaded-world measurement')
      record.semanticNavigationNonDominant = presentation.nonDominant
      if (!presentation.nonDominant) throw new Error(`quiet loaded-world semantic navigation became visually dominant: opacity=${presentation.opacity}, width=${presentation.width}, areaRatio=${presentation.areaRatio}`)
    }
    const activation = await activate(page, target, testCase.method)
    record.targetOwnsHitPoint = activation.targetOwnsHitPoint
    record.hitPoint = activation.hitPoint
    await page.waitForURL((url) => normalize(url.toString()) === doorway.destination, { timeout: 20000 })
    record.resultingUrl = page.url()
    record.navigationSucceeded = normalize(record.resultingUrl) === doorway.destination
    if (!record.navigationSucceeded) throw new Error('destination route did not match the native doorway')
    if (doorway.destination === '/life-map') record.destinationReadiness = await waitForLifeMapDestination(page)
    record.success = record.navigationSucceeded
  } catch (error) {
    record.resultingUrl = page.url()
    record.failureReason = String(error?.message || error)
  } finally {
    try {
      const bytes = await page.screenshot({ path: path.join(outDir, screenshot), animations: 'disabled', timeout: 90_000 })
      if (bytes.length < 24 || bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error('retained screenshot is not a nonempty PNG')
      record.image = { path: screenshot, sourceSha: exactSha, capturedAt: new Date().toISOString(), bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }
    } catch (error) {
      record.success = false
      const detail = `retained screenshot failed: ${String(error?.message || error)}`
      record.failureReason = record.failureReason ? `${record.failureReason}; ${detail}` : detail
    }
    await context.close()
  }
  return record
}

await fs.mkdir(path.join(outDir, 'screenshots'), { recursive: true })
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] })
const interactions = []
try {
  for (const doorway of doorways) for (const testCase of cases) interactions.push(await prove(browser, doorway, testCase))
} finally {
  await browser.close()
}
const errors = interactions.filter((item) => !item.success).map((item) => `${item.device}:${item.activationMethod}:${item.destinationRoute}: ${item.failureReason}`)
const receipt = { schemaVersion: 12, lifeMapDestinationReadinessRequired: true, screenshotCustodyRequired: true, groundDestinationRenderReadinessVerified: false, exactSha, baseUrl, createdAt: new Date().toISOString(), persistentWorldCanon: true, directDestinationNavigationPermitted: true, persistentVisibleShortcutPillsForbidden: true, semanticNavigationRequired: true, semanticNavigationOwner: 'runtime-boundary', fallbackNavigationParityRequired: true, spatialPointerAndTouchCoveredByBrowserCoordinates: true, loadedWorldNonDominanceRequiredBeforeFocus: true, nonDominanceMeasuredByDeclaredOwnershipOpacityAndViewportFootprint: true, interactions, status: errors.length ? 'failed' : 'passed', errors }
await fs.writeFile(path.join(outDir, 'native-doorway-receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`)
console.log(errors.length ? 'NATIVE_DOORWAY_PROOF_FAILED' : 'NATIVE_DOORWAY_PROOF_PASSED')
console.log(JSON.stringify(receipt, null, 2))
if (errors.length) process.exitCode = 1
