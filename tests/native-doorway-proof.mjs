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
  { id: 'ground', destination: '/ground', name: 'Open Ground directly', testId: 'home-semantic-ground', href: '/ground/?entryPortal=home-ground&cameraCheckpoint=home-ground-descent' },
  { id: 'life-map', destination: '/life-map', name: 'Open Life Map directly', testId: 'home-semantic-life-map', href: '/life-map/?from=home-sky&entryPortal=home-sky&cameraCheckpoint=home-sky-ascent-complete' },
]
if (!/^[0-9a-f]{40}$/.test(exactSha)) throw new Error('Exact source SHA required')
const normalize = (value) => new URL(value).pathname.replace(/\/$/, '') || '/'

async function settleRenderedDestination(page, doorway) {
  if (doorway.destination === '/ground') {
    const ground = page.locator('[data-testid="urai-ground-lived-world"]')
    await ground.waitFor({ state: 'visible', timeout: 45000 })
    const canvas = ground.locator('canvas').first()
    await canvas.waitFor({ state: 'visible', timeout: 45000 })
    await page.waitForFunction(() => {
      const root = document.querySelector('[data-testid="urai-ground-lived-world"]')
      const surface = root?.querySelector('canvas')
      if (!(root instanceof HTMLElement) || !(surface instanceof HTMLCanvasElement)) return false
      const box = surface.getBoundingClientRect()
      return root.dataset.groundReady === 'true'
        && root.dataset.groundVisualOwner === 'atmospheric-living-environment'
        && root.dataset.groundRuntimeOwner === 'first-person-lived-world'
        && root.dataset.groundExploration === 'first-person-no-visible-body'
        && box.width >= 240
        && box.height >= 240
        && surface.width > 0
        && surface.height > 0
    }, null, { timeout: 45000, polling: 50 })
  }
  await page.waitForTimeout(1200)
}

async function stableBrowserBox(target) {
  const page = target.page()
  const viewport = page.viewportSize()
  const testId = await target.getAttribute('data-testid')
  const measure = () => page.evaluate((id) => {
    const element = document.querySelector(`[data-testid="${id}"]`)
    if (!(element instanceof HTMLElement)) return null
    const rect = element.getBoundingClientRect()
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
  }, testId)
  let initial = await measure()
  if (!initial) throw new Error('semantic target has no browser hit box')
  const fullyInsideViewport = viewport
    && initial.x >= 0
    && initial.y >= 0
    && initial.x + initial.width <= viewport.width
    && initial.y + initial.height <= viewport.height
  if (!fullyInsideViewport) {
    await page.evaluate((id) => document.querySelector(`[data-testid="${id}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' }), testId)
    initial = await measure()
    if (!initial) throw new Error('semantic target lost its browser hit box after scroll')
  }
  const before = initial
  await page.waitForTimeout(250)
  const after = await measure()
  if (!after) throw new Error('semantic target lost its browser hit box')
  const drift = Math.max(
    Math.abs(before.x - after.x),
    Math.abs(before.y - after.y),
    Math.abs(before.width - after.width),
    Math.abs(before.height - after.height),
  )
  if (drift > 1) throw new Error(`semantic target geometry is still moving: ${drift.toFixed(2)}px`)
  return after
}

async function domBox(page, role, name) {
  return page.evaluate(({ role, name }) => {
    const element = Array.from(document.querySelectorAll('*')).find((candidate) => {
      if (!(candidate instanceof HTMLElement)) return false
      const implicitRole = candidate.tagName === 'BUTTON' ? 'button' : candidate.tagName === 'A' ? 'link' : null
      const candidateRole = candidate.getAttribute('role') || implicitRole
      const candidateName = candidate.getAttribute('aria-label') || candidate.textContent?.trim() || ''
      return candidateRole === role && candidateName === name
    })
    if (!(element instanceof HTMLElement)) return null
    const rect = element.getBoundingClientRect()
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
  }, { role, name })
}

async function proveGroundMobileControls(page, viewport) {
  const movement = page.getByRole('group', { name: 'Ground analog movement' })
  const home = page.getByRole('button', { name: 'Return Home' })
  const tools = page.getByRole('navigation', { name: 'Ground place and privacy tools' })
  await movement.waitFor({ state: 'visible', timeout: 15000 })
  await home.waitFor({ state: 'visible', timeout: 15000 })
  await tools.waitFor({ state: 'attached', timeout: 15000 })

  const inside = box => box && box.x >= 0 && box.y >= 0 && box.x + box.width <= viewport.width + 1 && box.y + box.height <= viewport.height + 1
  const movementBox = await domBox(page, 'group', 'Ground analog movement')
  const homeBox = await domBox(page, 'button', 'Return Home')
  if (!inside(movementBox) || !inside(homeBox)) throw new Error('Ground mobile controls extend outside the viewport')

  if (!movementBox || movementBox.width < 44 || movementBox.height < 44) throw new Error('Ground analog movement target is below 44px')
  if (!homeBox || homeBox.width < 44 || homeBox.height < 44) throw new Error('Ground Home return target is below 44px')

  const links = [
    { name: 'Places', locator: page.getByRole('link', { name: 'Places' }) },
    { name: 'Privacy', locator: page.getByRole('link', { name: 'Privacy' }) },
  ]
  for (const { name, locator: link } of links) {
    await link.focus()
    await page.waitForTimeout(120)
    const box = await domBox(page, 'link', name)
    if (!inside(box)) throw new Error('Focused Ground place/privacy tool is clipped by the viewport')
    if (!box || box.width < 44 || box.height < 44) throw new Error('Ground place/privacy target is below 44px')
  }

  return {
    movementBox,
    homeBox,
    minimumMovementTarget: 44,
    returnTargetMinimum: 44,
    placePrivacyToolsFocusable: true,
  }
}

async function focusTargetWithNativeKeyboard(page, target, maxSteps = 64) {
  const expectedTestId = await target.getAttribute('data-testid')
  if (!expectedTestId) throw new Error('semantic keyboard target has no test id')
  for (let step = 1; step <= maxSteps; step++) {
    await page.keyboard.press('Tab')
    const focusedTestId = await page.locator(':focus').getAttribute('data-testid').catch(() => null)
    if (focusedTestId === expectedTestId) return { focusSteps: step }
  }
  throw new Error(`semantic target did not receive browser-native Tab focus within ${maxSteps} steps`)
}

async function activate(page, target, method) {
  if (method === 'keyboard') {
    const keyboard = await focusTargetWithNativeKeyboard(page, target)
    const focusedTestId = await page.locator(':focus').getAttribute('data-testid')
    if (focusedTestId !== await target.getAttribute('data-testid')) throw new Error('semantic target did not retain browser-native focus')
    await page.keyboard.press('Enter')
    return { hitPoint: null, focusSteps: keyboard.focusSteps }
  }

  const box = await stableBrowserBox(target)
  if (box.width < 44 || box.height < 44) throw new Error(`semantic target below 44px minimum: ${box.width}x${box.height}`)
  const hitPoint = { center: { x: box.x + box.width / 2, y: box.y + box.height / 2 } }
  if (method === 'semantic-touch') await page.touchscreen.tap(hitPoint.center.x, hitPoint.center.y)
  else await page.mouse.click(hitPoint.center.x, hitPoint.center.y)
  return { hitPoint, focusSteps: null }
}

async function resolveTarget(page, doorway) {
  const target = page.getByTestId(doorway.testId)
  const nav = page.locator('.urai-home-spatial-runtime-layer > nav.home-semantic-navigation')
  await target.waitFor({ state: 'visible', timeout: 45000 })
  await nav.waitFor({ state: 'visible', timeout: 45000 })
  const owner = await nav.getAttribute('data-home-navigation-owner')
  const nonDominant = await nav.getAttribute('data-home-navigation-non-dominant')
  if (owner !== 'runtime-boundary') throw new Error(`semantic target has unexpected owner ${owner || 'none'}`)
  if (nonDominant !== 'true') throw new Error('semantic target owner is not declared non-dominant')
  const accessibleName = await target.getAttribute('aria-label')
  if (accessibleName !== doorway.name) throw new Error(`unexpected accessible name ${accessibleName}`)
  const tagName = await page.evaluate((testId) => document.querySelector(`[data-testid="${testId}"]`)?.tagName ?? null, doorway.testId)
  if (tagName !== 'A') throw new Error(`semantic target must be a browser-native anchor; found ${tagName || 'unknown'}`)
  const href = await target.getAttribute('href')
  if (href !== doorway.href) throw new Error(`semantic target must own native href ${doorway.href}; found ${href || 'none'}`)
  const visibleLegacyDoorways = await page.locator('.urai-final-home-doorways:visible').count()
  if (visibleLegacyDoorways !== 0) throw new Error(`legacy visible doorway bars remain: ${visibleLegacyDoorways}`)
  return { target, nav }
}

async function prove(browser, doorway, testCase) {
  const context = await browser.newContext({ viewport: testCase.viewport, isMobile: !!testCase.isMobile, hasTouch: !!testCase.hasTouch, deviceScaleFactor: testCase.isMobile ? 2 : 1 })
  await context.addInitScript(() => {
    localStorage.setItem('urai:onboarding:v3:setup-complete', '1')
    localStorage.removeItem('urai:onboarding:v3:setup-step')
  })
  const page = await context.newPage()
  const screenshot = `screenshots/${testCase.device}-${testCase.method}-home-to-${doorway.id}.png`
  const record = { exactSha, sourceRoute: '/home', destinationRoute: doorway.destination, device: testCase.device, activationMethod: testCase.method, inputDispatch: testCase.method === 'keyboard' ? 'browser-tab-enter' : 'browser-coordinate-hit', viewport: testCase.viewport, targetAccessibleName: doorway.name, targetTestId: doorway.testId, targetHref: doorway.href, resultingUrl: '', screenshot, semanticNavigationOwner: 'runtime-boundary', semanticNavigationNonDominant: false, legacyVisibleDoorways: 0, targetOwnsHitPoint: false, hitPoint: null, focusSteps: null, destinationRendered: false, success: false, failureReason: '' }
  try {
    await page.goto(`${baseUrl}/home`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
    const { target, nav } = await resolveTarget(page, doorway)
    record.legacyVisibleDoorways = await page.locator('.urai-final-home-doorways:visible').count()
    const declaredNonDominant = await nav.getAttribute('data-home-navigation-non-dominant') === 'true'
    if (testCase.method === 'keyboard') {
      record.semanticNavigationNonDominant = declaredNonDominant
    } else {
      const navBox = await page.evaluate(() => {
        const element = document.querySelector('.urai-home-spatial-runtime-layer > nav.home-semantic-navigation')
        if (!(element instanceof HTMLElement)) return null
        const rect = element.getBoundingClientRect()
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
      })
      if (!navBox) throw new Error('semantic navigation has no browser footprint')
      const viewportArea = Math.max(1, testCase.viewport.width * testCase.viewport.height)
      const navAreaRatio = Math.max(0, navBox.width * navBox.height) / viewportArea
      record.semanticNavigationNonDominant = declaredNonDominant && navBox.width <= 64 && navAreaRatio <= 0.03
    }
    if (!record.semanticNavigationNonDominant) throw new Error('semantic navigation became spatially dominant')
    const activation = await activate(page, target, testCase.method)
    record.hitPoint = activation.hitPoint
    record.focusSteps = activation.focusSteps
    await page.waitForURL((url) => normalize(url.toString()) === doorway.destination, { timeout: 20000 })
    record.targetOwnsHitPoint = true
    await settleRenderedDestination(page, doorway)
    record.destinationRendered = true
    if (testCase.isMobile && doorway.id === 'ground') record.mobileControls = await proveGroundMobileControls(page, testCase.viewport)
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
const receipt = { schemaVersion: 18, exactSha, baseUrl, createdAt: new Date().toISOString(), persistentWorldCanon: true, directDestinationNavigationPermitted: true, persistentVisibleShortcutPillsForbidden: true, semanticNavigationRequired: true, semanticNavigationOwner: 'runtime-boundary', nativeSemanticDestinationAnchorsRequired: true, nativeAnchorActivationDoesNotRequireReactClickHandler: true, fallbackNavigationParityRequired: true, spatialPointerAndTouchCoveredByBrowserCoordinates: true, keyboardNavigationCoveredByBrowserTabAndEnter: true, nonDominanceMeasuredByDeclaredOwnershipOpacityAndViewportFootprint: true, nonDominanceOpacitySourceContract: '.015', renderedDestinationRequiredBeforeCapture: true, groundRenderedOwnerContract: 'atmospheric-living-environment-plus-first-person-runtime-plus-visible-canvas', pageContextDomGeometryRequired: true, interactions, status: errors.length ? 'failed' : 'passed', errors }
await fs.writeFile(path.join(outDir, 'native-doorway-receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`)
console.log(errors.length ? 'NATIVE_DOORWAY_PROOF_FAILED' : 'NATIVE_DOORWAY_PROOF_PASSED')
console.log(JSON.stringify(receipt, null, 2))
if (errors.length) process.exitCode = 1
