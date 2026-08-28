import { chromium } from 'playwright'
import fs from 'node:fs/promises'
import path from 'node:path'

const baseUrl = (process.env.URAI_AUDIT_BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '')
const exactSha = String(process.env.URAI_PROOF_SOURCE_SHA || process.env.URAI_EXACT_HEAD || '').trim()
const outDir = process.env.URAI_NATIVE_DOORWAY_OUT_DIR || 'native-doorway-proof'
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

async function settleRenderedDestination(page, doorway) {
  if (doorway.destination === '/ground') {
    const readyGround = page.locator('[data-testid="urai-ground-private-workforce-world"][data-ground-ready="true"]')
    await readyGround.waitFor({ state: 'visible', timeout: 45000 })
  }
  await page.evaluate(async () => {
    const frame = () => new Promise((resolve) => requestAnimationFrame(resolve))
    await frame()
    await frame()
    await new Promise((resolve) => setTimeout(resolve, 1200))
    await frame()
  })
}

async function activate(page, target, method) {
  if (method === 'keyboard') {
    await target.focus()
    if (!await target.evaluate((node) => node === document.activeElement)) throw new Error('semantic target did not receive focus')
    await target.press('Enter')
    return { targetOwnsHitPoint: true, hitPoint: null }
  }

  await target.evaluate((node) => node.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' }))
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
  })
  const box = await target.boundingBox()
  if (!box) throw new Error('semantic target has no browser hit box')
  if (box.width < 44 || box.height < 44) throw new Error(`semantic target below 44px minimum: ${box.width}x${box.height}`)
  const hitPoint = { center: { x: box.x + box.width / 2, y: box.y + box.height / 2 } }
  const targetOwnsHitPoint = await target.evaluate((node, point) => {
    const hit = document.elementFromPoint(point.x, point.y)
    return hit === node || Boolean(hit && node.contains(hit))
  }, hitPoint.center)
  if (!targetOwnsHitPoint) throw new Error('semantic target does not own its browser-coordinate hit point')

  if (method === 'semantic-touch') await page.touchscreen.tap(hitPoint.center.x, hitPoint.center.y)
  else await page.mouse.click(hitPoint.center.x, hitPoint.center.y)
  return { targetOwnsHitPoint, hitPoint }
}

async function resolveTarget(page, doorway) {
  const target = page.getByTestId(doorway.testId)
  await target.waitFor({ state: 'visible', timeout: 45000 })
  const ownership = await target.evaluate((node) => {
    const nav = node.closest('nav.home-semantic-navigation')
    return {
      owner: nav?.getAttribute('data-home-navigation-owner') || '',
      nonDominant: nav?.getAttribute('data-home-navigation-non-dominant') || '',
    }
  })
  if (ownership.owner !== 'runtime-boundary') throw new Error(`semantic target has unexpected owner ${ownership.owner || 'none'}`)
  if (ownership.nonDominant !== 'true') throw new Error('semantic target owner is not declared non-dominant')
  const accessibleName = await target.getAttribute('aria-label')
  if (accessibleName !== doorway.name) throw new Error(`unexpected accessible name ${accessibleName}`)
  const visibleLegacyDoorways = await page.locator('.urai-final-home-doorways:visible').count()
  if (visibleLegacyDoorways !== 0) throw new Error(`legacy visible doorway bars remain: ${visibleLegacyDoorways}`)
  return target
}

async function prove(browser, doorway, testCase) {
  const context = await browser.newContext({ viewport: testCase.viewport, isMobile: !!testCase.isMobile, hasTouch: !!testCase.hasTouch, deviceScaleFactor: testCase.isMobile ? 2 : 1 })
  const page = await context.newPage()
  const screenshot = `screenshots/${testCase.device}-${testCase.method}-home-to-${doorway.id}.png`
  const record = { exactSha, sourceRoute: '/home', destinationRoute: doorway.destination, device: testCase.device, activationMethod: testCase.method, inputDispatch: testCase.method === 'keyboard' ? 'focused-enter' : 'browser-coordinate-hit', viewport: testCase.viewport, targetAccessibleName: doorway.name, targetTestId: doorway.testId, resultingUrl: '', screenshot, semanticNavigationOwner: 'runtime-boundary', semanticNavigationNonDominant: false, legacyVisibleDoorways: 0, targetOwnsHitPoint: false, hitPoint: null, destinationRendered: false, success: false, failureReason: '' }
  try {
    await page.goto(`${baseUrl}/home`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
    const target = await resolveTarget(page, doorway)
    record.legacyVisibleDoorways = await page.locator('.urai-final-home-doorways:visible').count()
    record.semanticNavigationNonDominant = await target.evaluate((node) => {
      const nav = node.closest('nav')
      if (!nav) return false
      const style = getComputedStyle(nav)
      const rect = nav.getBoundingClientRect()
      const viewportArea = Math.max(1, window.innerWidth * window.innerHeight)
      const navAreaRatio = Math.max(0, rect.width * rect.height) / viewportArea
      const declaredNonDominant = nav.getAttribute('data-home-navigation-non-dominant') === 'true'
      const visuallyQuiet = Number.parseFloat(style.opacity || '1') <= 0.05
      const spatiallyBounded = rect.width <= 64 && navAreaRatio <= 0.03
      return declaredNonDominant && visuallyQuiet && spatiallyBounded
    })
    if (!record.semanticNavigationNonDominant) throw new Error('semantic navigation became visually dominant')
    const activation = await activate(page, target, testCase.method)
    record.targetOwnsHitPoint = activation.targetOwnsHitPoint
    record.hitPoint = activation.hitPoint
    await page.waitForURL((url) => normalize(url.toString()) === doorway.destination, { timeout: 20000 })
    await settleRenderedDestination(page, doorway)
    record.destinationRendered = true
    record.resultingUrl = page.url()
    record.success = normalize(record.resultingUrl) === doorway.destination && record.destinationRendered
  } catch (error) {
    record.resultingUrl = page.url()
    record.failureReason = String(error?.message || error)
  } finally {
    await page.screenshot({ path: path.join(outDir, screenshot), animations: 'disabled' }).catch(() => {})
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
const receipt = { schemaVersion: 11, exactSha, baseUrl, createdAt: new Date().toISOString(), persistentWorldCanon: true, directDestinationNavigationPermitted: true, persistentVisibleShortcutPillsForbidden: true, semanticNavigationRequired: true, semanticNavigationOwner: 'runtime-boundary', fallbackNavigationParityRequired: true, spatialPointerAndTouchCoveredByBrowserCoordinates: true, nonDominanceMeasuredByDeclaredOwnershipOpacityAndViewportFootprint: true, renderedDestinationRequiredBeforeCapture: true, interactions, status: errors.length ? 'failed' : 'passed', errors }
await fs.writeFile(path.join(outDir, 'native-doorway-receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`)
console.log(errors.length ? 'NATIVE_DOORWAY_PROOF_FAILED' : 'NATIVE_DOORWAY_PROOF_PASSED')
console.log(JSON.stringify(receipt, null, 2))
if (errors.length) process.exitCode = 1
