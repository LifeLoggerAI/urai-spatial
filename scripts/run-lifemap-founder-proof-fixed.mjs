import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const sourcePath = path.resolve('scripts/capture-lifemap-founder-proof.mjs')
const generatedPath = path.resolve('scripts/.capture-lifemap-founder-proof-fixed.mjs')
let source = await readFile(sourcePath, 'utf8')

function replaceFunction(name, replacement) {
  const asyncStart = source.indexOf(`async function ${name}(`)
  const syncStart = source.indexOf(`function ${name}(`)
  const candidates = [asyncStart, syncStart].filter((value) => value >= 0)
  const start = candidates.length ? Math.min(...candidates) : -1
  if (start < 0) throw new Error(`Founder harness owner drifted; ${name} was not found`)
  const bodyStart = source.indexOf('{', start)
  if (bodyStart < 0) throw new Error(`Founder harness owner drifted; ${name} body did not open`)
  let depth = 0
  let end = -1
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1
    if (source[index] === '}') {
      depth -= 1
      if (depth === 0) {
        end = index + 1
        break
      }
    }
  }
  if (end < 0) throw new Error(`Founder harness owner drifted; ${name} body did not close`)
  source = source.slice(0, start) + replacement + source.slice(end)
}

const stableOpenPage = `async function openPage(options = {}) {
  const context = await browser.newContext({
    viewport: options.viewport || { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    reducedMotion: options.reducedMotion || 'no-preference',
    hasTouch: Boolean(options.hasTouch),
    isMobile: Boolean(options.isMobile),
  })
  if (options.disableWebGL) await context.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function patched(type, ...args) {
      if (['webgl', 'webgl2', 'experimental-webgl'].includes(type)) return null
      return original.call(this, type, ...args)
    }
  })
  const page = await context.newPage()
  recordPageEvents(page, options.label || 'page')
  return { context, page }
}`

const stableSelection = `async function selectQuietReset(page, options = {}) {
  const navigator = page.locator('[data-life-map-navigator]').first()
  await navigator.waitFor({ state: 'attached', timeout: 20_000 })
  await navigator.evaluate((details) => { details.open = true })
  const result = navigator.locator('[role="listitem"]').filter({ hasText: 'The Quiet Reset' }).first()
  await result.waitFor({ state: 'visible', timeout: 20_000 })
  if (options.keyboard) {
    await result.focus()
    await page.keyboard.press('Enter')
  } else if (options.touch) {
    await result.tap()
  } else {
    await result.click()
  }
  await navigator.evaluate((details) => { details.open = false })
  await waitForState(page, 'data-life-map-mode', 'selected')
}`

const stableRouteAction = String.raw`function selectedAction(page, label) {
  return selectedActions(page)
    .locator('button')
    .filter({ has: page.getByText(label, { exact: true }) })
    .first()
}

async function clickRouteAction(page, name, destinationPath, destinationSelector) {
  const action = selectedAction(page, name)
  await action.waitFor({ state: 'visible', timeout: 20_000 })
  await action.click()
  await page.waitForFunction((expectedPath) => window.location.pathname.replace(/\/$/, '') === expectedPath, destinationPath, { timeout: 30_000, polling: 50 })
  await page.locator(destinationSelector).first().waitFor({ state: 'visible', timeout: 30_000 })
  await stable(page)
}`

const distributedCanvasSignal = `async function canvasSignal(page) {
  const canvas = page.locator('canvas').first()
  if (!await canvas.count()) return null
  return canvas.evaluate((element) => {
    const gl = element.getContext('webgl2') || element.getContext('webgl')
    if (!gl) return null
    const width = Math.max(1, gl.drawingBufferWidth || element.width)
    const height = Math.max(1, gl.drawingBufferHeight || element.height)
    const columns = 24
    const rows = 16
    const block = 3
    const pixels = new Uint8Array(block * block * 4)
    let count = 0
    let sum = 0
    let sumSquares = 0
    let nonDark = 0
    try {
      for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < columns; column += 1) {
          const x = Math.max(0, Math.min(width - block, Math.round(((column + 0.5) / columns) * width) - 1))
          const y = Math.max(0, Math.min(height - block, Math.round(((row + 0.5) / rows) * height) - 1))
          gl.readPixels(x, y, block, block, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
          for (let index = 0; index < pixels.length; index += 4) {
            const luminance = (pixels[index] + pixels[index + 1] + pixels[index + 2]) / 3
            count += 1
            sum += luminance
            sumSquares += luminance * luminance
            if (luminance > 8) nonDark += 1
          }
        }
      }
    } catch {
      return { width, height, variance: -1, nonDarkRatio: -1, sampleCount: 0, sampling: 'distributed-grid-24x16-3x3' }
    }
    const mean = sum / Math.max(1, count)
    return {
      width,
      height,
      variance: sumSquares / Math.max(1, count) - mean * mean,
      nonDarkRatio: nonDark / Math.max(1, count),
      sampleCount: count,
      sampling: 'distributed-grid-24x16-3x3',
    }
  })
}`

const deterministicDesktopJourney = `async function desktopJourney() {
  const { context, page } = await openPage({ label: 'desktop' })
  try {
    const overviewRoute = '/life-map/?demo=1&manifestId=replay-recovery-thread&overview=1'
    const arrivalRoute = '/life-map/?demo=1&memoryId=quiet-reset&manifestId=replay-recovery-thread&node=quiet-reset'

    await goto(page, overviewRoute)
    await waitForRenderedWorld(page)
    await shot(page, 'desktop-overview', 'overview')
    const canvas = page.locator('canvas').first()
    const box = await canvas.boundingBox()
    if (!box) throw new Error('canvas has no box')
    await page.mouse.move(box.x + box.width * .5, box.y + box.height * .5)
    await stable(page, 12)
    await shot(page, 'depth-travel-frame-1', 'parallax-1')
    await page.mouse.move(box.x + box.width * .2, box.y + box.height * .32, { steps: 18 })
    await stable(page, 14)
    await shot(page, 'depth-travel-frame-2', 'parallax-2')
    await page.mouse.move(box.x + box.width * .82, box.y + box.height * .68, { steps: 18 })
    await stable(page, 14)
    await shot(page, 'depth-travel-frame-3', 'parallax-3')

    await selectQuietReset(page)
    await waitForState(page, 'data-life-map-phase', 'departure')
    await shot(page, 'selection-start', 'departure', { memoryId: 'quiet-reset', interaction: 'pointer' })

    await goto(page, overviewRoute)
    await waitForRenderedWorld(page)
    await selectQuietReset(page)
    await waitForState(page, 'data-life-map-phase', 'travel')
    await shot(page, 'mid-travel', 'travel', { memoryId: 'quiet-reset' })

    await goto(page, overviewRoute)
    await waitForRenderedWorld(page)
    await selectQuietReset(page)
    await waitForState(page, 'data-life-map-phase', 'approach')
    await shot(page, 'approach', 'approach', { memoryId: 'quiet-reset' })

    await goto(page, arrivalRoute)
    await waitForRenderedWorld(page)
    await waitForState(page, 'data-life-map-phase', 'arrival')
    await shot(page, 'stable-arrival', 'arrival', { memoryId: 'quiet-reset' })
    await shot(page, 'selected-memory-arrival', 'selected-arrival', { memoryId: 'quiet-reset' })
    await selectedActions(page).waitFor({ state: 'visible', timeout: 10_000 })
    await shot(page, 'focus-replay-thresholds', 'thresholds', { memoryId: 'quiet-reset' })

    await clickRouteAction(page, 'Enter Focus', '/focus', '[data-testid="urai-final-focus-chamber"]')
    await shot(page, 'focus-destination', 'focus', { memoryId: 'quiet-reset' })

    await goto(page, arrivalRoute)
    await waitForRenderedWorld(page)
    await waitForState(page, 'data-life-map-phase', 'arrival')
    await clickRouteAction(page, 'Replay', '/replay', 'main')
    await shot(page, 'replay-destination', 'replay', { memoryId: 'quiet-reset' })

    await goto(page, arrivalRoute)
    await waitForRenderedWorld(page)
    await waitForState(page, 'data-life-map-phase', 'arrival')
    const overviewAction = selectedAction(page, 'Overview')
    await overviewAction.waitFor({ state: 'visible', timeout: 20_000 })
    await overviewAction.click()
    await waitForOverviewState(page)
    await shot(page, 'overview-reset', 'overview-reset')

    await goto(page, overviewRoute)
    await waitForRenderedWorld(page)
    await selectQuietReset(page, { keyboard: true })
    await shot(page, 'keyboard-selection', 'keyboard-selection', { memoryId: 'quiet-reset', interaction: 'keyboard' })
    await page.keyboard.press('Escape')
    await waitForOverviewState(page)
    await shot(page, 'escape-unwind', 'escape-unwind')
  } finally { await context.close() }
}`

const deterministicMobileAndReduced = `async function mobileAndReduced() {
  const overviewRoute = '/life-map/?demo=1&manifestId=replay-recovery-thread&overview=1'
  const arrivalRoute = '/life-map/?demo=1&memoryId=quiet-reset&manifestId=replay-recovery-thread&node=quiet-reset'
  const mobile = await openPage({ viewport: { width: 390, height: 844 }, label: 'portrait', hasTouch: true, isMobile: true })
  try {
    await goto(mobile.page, overviewRoute)
    await waitForRenderedWorld(mobile.page)
    await shot(mobile.page, 'portrait-mobile-overview', 'mobile-overview')
    await selectQuietReset(mobile.page, { touch: true })
    await waitForState(mobile.page, 'data-life-map-phase', 'travel')
    await shot(mobile.page, 'portrait-mobile-travel', 'mobile-travel', { memoryId: 'quiet-reset', interaction: 'touch' })
    await goto(mobile.page, arrivalRoute)
    await waitForRenderedWorld(mobile.page)
    await waitForState(mobile.page, 'data-life-map-phase', 'arrival')
    await shot(mobile.page, 'portrait-mobile-selected', 'mobile-selected', { memoryId: 'quiet-reset', interaction: 'touch' })
  } finally { await mobile.context.close() }

  const tall = await openPage({ viewport: { width: 430, height: 932 }, label: 'portrait-tall', hasTouch: true, isMobile: true })
  try {
    await goto(tall.page, overviewRoute)
    await waitForRenderedWorld(tall.page)
    await shot(tall.page, 'portrait-tall-overview', 'mobile-tall-overview')
    await goto(tall.page, arrivalRoute)
    await waitForRenderedWorld(tall.page)
    await waitForState(tall.page, 'data-life-map-phase', 'arrival')
    await shot(tall.page, 'portrait-tall-selected', 'mobile-tall-selected', { memoryId: 'quiet-reset' })
  } finally { await tall.context.close() }

  const reduced = await openPage({ reducedMotion: 'reduce', label: 'reduced-motion' })
  try {
    await goto(reduced.page, arrivalRoute)
    await waitForRenderedWorld(reduced.page)
    await waitForState(reduced.page, 'data-life-map-phase', 'arrival')
    await shot(reduced.page, 'reduced-motion-arrival', 'reduced-motion-arrival', { memoryId: 'quiet-reset' })
  } finally { await reduced.context.close() }
}`

const stableVisualSanity = `function assertVisualSanity() {
  const byId = new Map(receipt.captures.map((capture) => [capture.id, capture]))
  const parallaxIds = ['desktop-overview', 'depth-travel-frame-1', 'depth-travel-frame-2', 'depth-travel-frame-3']
  const hashes = new Set(parallaxIds.map((id) => byId.get(id)?.screenshot?.hash).filter(Boolean))
  if (hashes.size < 3) throw new Error(\`parallax proof produced duplicate captures; unique=\${hashes.size}\`)
  const required = [
    'desktop-overview', 'selection-start', 'mid-travel', 'approach', 'stable-arrival',
    'keyboard-selection', 'portrait-mobile-overview', 'portrait-mobile-travel',
    'portrait-mobile-selected', 'portrait-tall-overview', 'portrait-tall-selected',
    'reduced-motion-arrival',
  ]
  for (const id of required) {
    const capture = byId.get(id)
    if (!capture) throw new Error(\`missing required capture \${id}\`)
    if (capture.state?.renderReady !== 'true') throw new Error(\`\${id} did not prove a rendered production world\`)
    if (Number(capture.state?.anchors || 0) < 8) throw new Error(\`\${id} visible anchor count below production minimum\`)
    if (capture.screenshot.bytes < 120_000) throw new Error(\`\${id} screenshot is suspiciously empty\`)
    if (!capture.signal) throw new Error(\`\${id} did not provide a WebGL signal\`)
    if (capture.signal.sampleCount !== 3456) throw new Error(\`\${id} WebGL sample count drifted\`)
    if (capture.signal.sampling !== 'distributed-grid-24x16-3x3') throw new Error(\`\${id} WebGL sampling method drifted\`)
    if (capture.signal.variance >= 0 && capture.signal.variance < 8) throw new Error(\`\${id} WebGL pixel variance is below the visible-world minimum\`)
    if (capture.signal.nonDarkRatio >= 0 && capture.signal.nonDarkRatio <= 0) throw new Error(\`\${id} WebGL non-dark coverage is empty\`)
  }
  const phases = required.map((id) => byId.get(id)?.captureState).filter(Boolean)
  if (!phases.includes('departure') || !phases.includes('travel') || !phases.includes('approach') || !phases.includes('arrival')) {
    throw new Error('Founder journey did not retain every required phase')
  }
  const blockingEvents = receipt.browserEvents.filter((event) => event.kind === 'pageerror' || event.kind === 'requestfailed' || (event.kind === 'console:error' && !/favicon/i.test(event.text)))
  if (blockingEvents.length) throw new Error(\`browser emitted \${blockingEvents.length} blocking console or network events\`)
}`

replaceFunction('openPage', stableOpenPage)
replaceFunction('selectQuietReset', stableSelection)
replaceFunction('clickRouteAction', stableRouteAction)
replaceFunction('canvasSignal', distributedCanvasSignal)
replaceFunction('desktopJourney', deterministicDesktopJourney)
replaceFunction('mobileAndReduced', deterministicMobileAndReduced)
replaceFunction('assertVisualSanity', stableVisualSanity)

await writeFile(generatedPath, source)
await import(generatedPath)
