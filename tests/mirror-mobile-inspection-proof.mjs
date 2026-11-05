import { chromium } from 'playwright'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { patternScrollRequest, armPatternScrollEnd, disarmPatternScrollEnd } from './lib/pattern-scroll-proof.mjs'

const exactSha = String(process.env.URAI_PROOF_SOURCE_SHA || process.env.URAI_EXACT_HEAD || '').trim()
const baseUrl = String(process.env.URAI_AUDIT_BASE_URL || 'http://127.0.0.1:4173').replace(/\/$/, '')
const outDir = process.env.URAI_MIRROR_PROOF_OUT_DIR || 'mirror-release-proof'

if (!/^[0-9a-f]{40}$/.test(exactSha)) throw new Error('Exact source SHA required')

await fs.mkdir(path.join(outDir, 'screenshots'), { recursive: true })
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-webgl'] })
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
})
const page = await context.newPage()
page.setDefaultTimeout(30000)

const consoleErrors = []
const failedRequests = []
const retainedScreenshots = []

// A visible center alone does not prove that text or an entire touch target is
// reachable. Include clipping by scroll containers and every sampled hit owner.
async function reachableGeometry(locator, label, interactive = false) {
  const geometry = await locator.evaluate((element, { interactive }) => {
    const rect = element.getBoundingClientRect()
    let clip = { left: 0, top: 0, right: innerWidth, bottom: innerHeight }
    for (let ancestor = element.parentElement; ancestor; ancestor = ancestor.parentElement) {
      const style = getComputedStyle(ancestor)
      const bounds = ancestor.getBoundingClientRect()
      if (/(auto|scroll|hidden|clip)/.test(style.overflowX)) {
        clip.left = Math.max(clip.left, bounds.left + ancestor.clientLeft)
        clip.right = Math.min(clip.right, bounds.left + ancestor.clientLeft + ancestor.clientWidth)
      }
      if (/(auto|scroll|hidden|clip)/.test(style.overflowY)) {
        clip.top = Math.max(clip.top, bounds.top + ancestor.clientTop)
        clip.bottom = Math.min(clip.bottom, bounds.top + ancestor.clientTop + ancestor.clientHeight)
      }
    }
    const contained = (bounds) => bounds.width > 0 && bounds.height > 0 &&
      bounds.left >= clip.left - 0.5 && bounds.top >= clip.top - 0.5 &&
      bounds.right <= clip.right + 0.5 && bounds.bottom <= clip.bottom + 0.5
    const owns = (x, y) => {
      const hit = document.elementFromPoint(x, y)
      return Boolean(hit && (hit === element || element.contains(hit)))
    }
    const targetHits = interactive ? [
      [rect.left + rect.width / 4, rect.top + rect.height / 4], [rect.left + rect.width * 3 / 4, rect.top + rect.height / 4],
      [rect.left + rect.width / 2, rect.top + rect.height / 2],
      [rect.left + rect.width / 4, rect.top + rect.height * 3 / 4], [rect.left + rect.width * 3 / 4, rect.top + rect.height * 3 / 4],
    ].map(([x, y]) => ({ x, y, owned: owns(x, y) })) : []
    const range = document.createRange()
    range.selectNodeContents(element)
    const textLines = [...range.getClientRects()].filter(line => line.width > 0 && line.height > 0).map(line => ({
      left: line.left, top: line.top, right: line.right, bottom: line.bottom,
      fullyWithinClip: contained(line),
      owned: [0.05, 0.5, 0.95].every(fraction => owns(line.left + line.width * fraction, line.top + line.height / 2)),
    }))
    return {
      text: element.textContent?.trim(), clip,
      rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height },
      fullyWithinClip: contained(rect),
      targetAtLeast48px: rect.width >= 48 && rect.height >= 48,
      targetHits, textLines,
    }
  }, { interactive })
  if (!geometry.fullyWithinClip || !geometry.textLines.length || geometry.textLines.some(line => !line.fullyWithinClip || !line.owned) ||
    (interactive && (!geometry.targetAtLeast48px || geometry.targetHits.some(hit => !hit.owned)))) {
    throw new Error(`${label} is clipped, undersized, or obstructed: ${JSON.stringify(geometry)}`)
  }
  return { label, ...geometry }
}

async function retainScreenshot(name) {
  const screenshot = `screenshots/${name}.png`
  await page.screenshot({ path: path.join(outDir, screenshot), fullPage: false, animations: 'disabled' })
  const bytes = await fs.readFile(path.join(outDir, screenshot))
  retainedScreenshots.push({ screenshot, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') })
  return screenshot
}

async function scrollInspectorToTop(inspector) {
  const box = await inspector.boundingBox()
  if (!box) throw new Error('inspector has no scrollable rendered bounds')
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.wheel(0, -10000)
  await page.waitForFunction(() => document.querySelector('.mirrorInspection')?.scrollTop === 0)
}

async function inspectHeader(inspector, phase) {
  const geometry = []
  for (const [selector, label, interactive] of [
    ['.close', 'Return to Mirror overview', true],
    [':scope > p:first-of-type', 'Evidence status', false],
    ['h2', 'Body rhythm title', false],
    [':scope > strong', 'Evidence explanation', false],
  ]) geometry.push(await reachableGeometry(inspector.locator(selector), `${phase}: ${label}`, interactive))
  return { phase, scrollTop: await inspector.evaluate(element => element.scrollTop), geometry,
    screenshot: await retainScreenshot(`mobile-mirror-inspector-${phase}`) }
}

async function inspectOverviewDock(phase) {
  const thresholds = page.locator('.mirrorThresholds')
  const thresholdGeometry = []
  for (const name of ['Replay threshold', 'Passport threshold', 'Previous realm']) {
    thresholdGeometry.push(await reachableGeometry(thresholds.getByRole('button', { name, exact: true }), `${phase}: ${name}`, true))
  }
  const companion = page.locator('.urai-world-companion__orb')
  await companion.waitFor({ state: 'visible' })
  const dock = await companion.evaluate(element => {
    const rect = element.getBoundingClientRect()
    const blockers = [...document.querySelectorAll('.mirrorThresholds, .mirrorPatternRail, .mirrorOrb, [data-urai-adam-launcher]')].map(other => {
      const bounds = other.getBoundingClientRect()
      return { selector: other.className || 'Founder launcher',
        overlaps: rect.left < bounds.right && rect.right > bounds.left && rect.top < bounds.bottom && rect.bottom > bounds.top }
    })
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
    return { rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height },
      insideViewport: rect.left >= 0 && rect.top >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight,
      atLeast48px: rect.width >= 48 && rect.height >= 48,
      ownsCenter: Boolean(hit && (hit === element || element.contains(hit))), blockers }
  })
  if (!dock.insideViewport || !dock.atLeast48px || !dock.ownsCenter || dock.blockers.some(blocker => blocker.overlaps)) {
    throw new Error(`${phase}: Orb travel covers or is covered by Mirror controls: ${JSON.stringify(dock)}`)
  }
  return { phase, thresholdGeometry, companionDock: dock, screenshot: await retainScreenshot(`mobile-mirror-${phase}-dock`) }
}
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text())
})
page.on('pageerror', (error) => consoleErrors.push(String(error?.message || error)))
page.on('requestfailed', (request) => {
  const failure = request.failure()?.errorText || 'request failed'
  if (!failure.includes('ERR_ABORTED')) failedRequests.push(`${request.method()} ${request.url()} ${failure}`)
})

let receipt
try {
  const response = await page.goto(`${baseUrl}/mirror/?memoryId=demo%3Aquiet-reset&demo=1`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  if (response && response.status() >= 400) throw new Error(`HTTP ${response.status()}`)

  const world = page.getByTestId('mirror-spatial-world')
  await world.waitFor({ state: 'visible', timeout: 45000 })
  await page.waitForFunction(() => document.querySelector('[data-testid="mirror-spatial-world"]')?.getAttribute('data-mirror-ready') === 'true', null, { timeout: 45000 })

  const movementPad = page.locator('.urai-mobile-movement')
  const orb = page.locator('.mirrorOrb')
  await movementPad.waitFor({ state: 'visible' })
  await orb.waitFor({ state: 'visible' })
  const initialOverviewDock = await inspectOverviewDock('initial-overview')
  const travelOrb = page.getByRole('button', { name: 'Open Orb travel controls', exact: true })
  await travelOrb.click()
  const travelMenu = page.locator('#urai-world-companion-menu')
  await travelMenu.waitFor({ state: 'visible' })
  if (await travelMenu.getAttribute('aria-hidden') !== 'false') throw new Error('Orb travel menu did not open')
  await page.getByRole('button', { name: 'Close Orb travel controls', exact: true }).click()
  await travelMenu.waitFor({ state: 'hidden' })
  if (await travelMenu.getAttribute('aria-hidden') !== 'true') throw new Error('Orb travel menu did not close')
  const closedTravelOverviewDock = await inspectOverviewDock('travel-closed-overview')

  const rail = page.locator('section[aria-label="Reflection patterns"]')
  const expectedPatterns = ['Rhythm', 'Relationships', 'Recurrence', 'Becoming']
  if (await rail.getByRole('button').count() !== expectedPatterns.length) throw new Error('Expected all four current reflection patterns')
  const reflectionPatternReachability = []
  for (const pattern of expectedPatterns) {
    const button = rail.getByRole('button', { name: new RegExp(`^${pattern}`) })
    // Wheel input scrolls the real overflow rail; no style, dimensions, selection,
    // or scroll position is rewritten by the proof.
    for (let attempt = 0; attempt < 8; attempt++) {
      const metrics = await button.evaluate(element => {
        const rect = element.getBoundingClientRect()
        const rail = element.closest('.mirrorPatternRail')
        const bounds = rail.getBoundingClientRect()
        const left = bounds.left + rail.clientLeft
        const right = left + rail.clientWidth
        return { left: rect.left, right: rect.right, viewportLeft: left, viewportRight: right,
          scrollLeft: rail.scrollLeft, scrollWidth: rail.scrollWidth, clientWidth: rail.clientWidth }
      })
      const delta = patternScrollRequest(metrics)
      if (!delta) break
      const box = await rail.boundingBox()
      if (!box) throw new Error('reflection rail has no rendered bounds')
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await rail.evaluate(armPatternScrollEnd)
      try {
        await page.mouse.wheel(delta, 0)
        await page.waitForFunction(() => document.querySelector('.mirrorPatternRail')?.[Symbol.for('urai:mirror-proof-scrollend')]?.done === true, null, { timeout: 30000 })
      } finally {
        await rail.evaluate(disarmPatternScrollEnd)
      }
    }
    reflectionPatternReachability.push({ pattern, geometry: await reachableGeometry(button, `${pattern} reflection tab`, true),
      scrollLeft: await rail.evaluate(element => element.scrollLeft), screenshot: await retainScreenshot(`mobile-mirror-reflection-tab-${pattern.toLowerCase()}`) })
  }
  await rail.getByRole('button', { name: /^Rhythm/ }).click()
  const inspector = page.locator('aside[aria-label="Body rhythm evidence"]')
  await inspector.waitFor({ state: 'visible' })
  await movementPad.waitFor({ state: 'hidden' })
  await orb.waitFor({ state: 'hidden' })
  await scrollInspectorToTop(inspector)
  const initialHeader = await inspectHeader(inspector, 'initial-top')

  const range = inspector.locator('input[type="range"]')
  const max = Number(await range.getAttribute('max'))
  if (max <= 0) throw new Error('expected at least one inspectable fragment')
  const founderLauncher = page.locator('[data-urai-adam-launcher]')
  await founderLauncher.waitFor({ state: 'visible' })
  const launcherGeometry = await founderLauncher.evaluate((element) => {
    const launcher = element.getBoundingClientRect()
    const inspector = document.querySelector('.mirrorInspection').getBoundingClientRect()
    return {
      overlapsInspector: launcher.left < inspector.right && launcher.right > inspector.left && launcher.top < inspector.bottom && launcher.bottom > inspector.top,
      insideViewport: launcher.top >= 0 && launcher.left >= 0 && launcher.right <= innerWidth && launcher.bottom <= innerHeight,
    }
  })
  if (launcherGeometry.overlapsInspector || !launcherGeometry.insideViewport) throw new Error(`Founder launcher obstructs Mirror inspection: ${JSON.stringify(launcherGeometry)}`)
  await range.scrollIntoViewIfNeeded()
  const sliderHit = await range.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    return [0.05, 0.5, 0.95].map(fraction => {
      const hit = document.elementFromPoint(rect.left + rect.width * fraction, rect.top + rect.height / 2)
      return { fraction, unobstructed: Boolean(hit && (hit === element || element.contains(hit))) }
    })
  })
  if (sliderHit.some(hit => !hit.unobstructed)) throw new Error(`reflection depth slider is obstructed: ${JSON.stringify(sliderHit)}`)
  const rangeBox = await range.boundingBox()
  if (!rangeBox) throw new Error('reflection depth slider has no rendered bounds')
  await page.touchscreen.tap(rangeBox.x + rangeBox.width - 2, rangeBox.y + rangeBox.height / 2)
  if (Number(await range.inputValue()) !== max) throw new Error('touch did not select the final reflection depth')

  const finalFragment = inspector.locator('.fragmentList button:not([disabled])').last()
  await finalFragment.scrollIntoViewIfNeeded()
  const fragmentHit = await finalFragment.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.top + rect.height / 2
    const hit = document.elementFromPoint(x, y)
    return {
      rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom },
      viewport: { width: window.innerWidth, height: window.innerHeight },
      unobstructed: Boolean(hit && (hit === element || element.contains(hit))),
    }
  })
  if (!fragmentHit.unobstructed) throw new Error(`final fragment control is obstructed: ${JSON.stringify(fragmentHit)}`)
  const finalFragmentGeometry = await reachableGeometry(finalFragment, 'Final permitted fragment', true)

  await finalFragment.click()
  const status = inspector.locator('.fragmentStatus')
  await status.waitFor({ state: 'visible' })
  await status.scrollIntoViewIfNeeded()

  const statusGeometry = await status.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    const inspectorRect = element.closest('.mirrorInspection')?.getBoundingClientRect()
    return {
      status: { top: rect.top, bottom: rect.bottom },
      inspector: inspectorRect ? { top: inspectorRect.top, bottom: inspectorRect.bottom } : null,
      visibleWithinInspector: Boolean(inspectorRect && rect.top >= inspectorRect.top && rect.bottom <= inspectorRect.bottom),
    }
  })
  if (!statusGeometry.visibleWithinInspector) throw new Error(`fragment status is clipped: ${JSON.stringify(statusGeometry)}`)
  const fragmentStatusGeometry = await reachableGeometry(status, 'Selected fragment status')
  const bottomScrollTop = await inspector.evaluate(element => element.scrollTop)
  if (bottomScrollTop <= 0) throw new Error('Expected actual inspector scrolling to the final fragment')

  const thresholds = page.locator('.mirrorThresholds')
  const passport = thresholds.getByRole('button', { name: 'Passport threshold' })
  const passportHit = await passport.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.top + rect.height / 2
    const hit = document.elementFromPoint(x, y)
    return {
      rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom },
      unobstructed: Boolean(hit && (hit === element || element.contains(hit))),
    }
  })
  if (!passportHit.unobstructed) throw new Error(`Passport threshold is obstructed during inspection: ${JSON.stringify(passportHit)}`)
  const thresholdGeometry = []
  for (const name of ['Replay threshold', 'Passport threshold', 'Overview']) {
    thresholdGeometry.push(await reachableGeometry(thresholds.getByRole('button', { name, exact: true }), name, true))
  }

  const screenshot = 'screenshots/mobile-mirror-inspector-unobstructed.png'
  await retainScreenshot('mobile-mirror-inspector-unobstructed')
  await scrollInspectorToTop(inspector)
  const returnedHeader = await inspectHeader(inspector, 'returned-top')
  await inspector.getByRole('button', { name: 'Return to Mirror overview', exact: true }).click()
  await inspector.waitFor({ state: 'hidden' })
  await movementPad.waitFor({ state: 'visible' })
  await orb.waitFor({ state: 'visible' })
  const returnedOverviewDock = await inspectOverviewDock('returned-overview')
  await retainScreenshot('mobile-mirror-overview-after-inspection')

  if (consoleErrors.length) throw new Error(`console errors: ${consoleErrors.join(' | ')}`)
  if (failedRequests.length) throw new Error(`failed requests: ${failedRequests.join(' | ')}`)

  receipt = {
    schemaVersion: 3,
    exactSha,
    status: 'passed',
    screenshot,
    movementPadVisibleInOverview: true,
    movementPadHiddenDuringInspection: true,
    orbVisibleInOverview: true,
    orbHiddenDuringInspection: true,
    passportThresholdUnobstructed: true,
    finalFragmentUnobstructed: true,
    fragmentStatusVisibleWithinInspector: true,
    founderLauncherVisibleAndClearOfInspector: true,
    reflectionDepthSliderHitTest: sliderHit,
    reflectionDepthSelectedByTouch: true,
    reflectionPatternReachability,
    initialHeader,
    bottomScrollTop,
    finalFragmentGeometry,
    fragmentStatusGeometry,
    thresholdGeometry,
    returnedHeader,
    returnedToOverviewByReachableClose: true,
    retainedScreenshots,
    initialOverviewDock,
    returnedOverviewDock,
    closedTravelOverviewDock,
    orbTravelOpenedAndClosed: true,
    consoleErrors,
    failedRequests,
  }
} catch (error) {
  const screenshot = 'screenshots/mobile-mirror-inspector-failure.png'
  await page.screenshot({ path: path.join(outDir, screenshot), fullPage: false, animations: 'disabled' }).catch(() => {})
  receipt = {
    schemaVersion: 3,
    exactSha,
    status: 'failed',
    screenshot,
    error: String(error?.message || error),
    retainedScreenshots,
    consoleErrors,
    failedRequests,
  }
  process.exitCode = 1
} finally {
  await context.close()
  await browser.close()
}

await fs.writeFile(path.join(outDir, 'mirror-mobile-inspection-receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`)
console.log(JSON.stringify(receipt, null, 2))
