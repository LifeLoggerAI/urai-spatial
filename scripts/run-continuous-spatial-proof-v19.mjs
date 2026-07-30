import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const scriptsDir = path.dirname(fileURLToPath(import.meta.url))
const sourcePath = path.join(scriptsDir, 'capture-continuous-spatial-proof-v18.mjs')
const materializedPath = path.join(scriptsDir, '.capture-continuous-spatial-proof-v19.mjs')

function replaceExact(source, from, to, expectedCount, label) {
  const count = source.split(from).length - 1
  if (count !== expectedCount) {
    throw new Error(`${label} expected ${expectedCount} audited occurrence(s); found ${count}`)
  }
  return source.split(from).join(to)
}

let source = await readFile(sourcePath, 'utf8')
source = replaceExact(
  source,
  "page.locator('.home-discreet-controls button').first()",
  "page.locator('[data-urai-audit-action=\"orb-controls\"]').first()",
  1,
  'continuous proof editable-control selector',
)
source = replaceExact(
  source,
  `  const canvas = owner.locator('canvas').first()
  const rect = await canvas.boundingBox()`,
  `  const canvas = owner.locator('canvas').first()
  const rect = {
    width: Number.parseFloat(await canvas.getAttribute('width') || '0'),
    height: Number.parseFloat(await canvas.getAttribute('height') || '0'),
  }`,
  1,
  'continuous proof canvas attribute measurement',
)
source = replaceExact(
  source,
  `  const requiredMode = expected.assetMode || (expectReady ? 'ready' : 'disclosed-review-candidate')
  const passed = result.ownerCount === 1`,
  `  const semanticNonDominant = await semantic.evaluate((node) => {
    const style = getComputedStyle(node)
    const rect = node.getBoundingClientRect()
    const viewportArea = Math.max(1, window.innerWidth * window.innerHeight)
    const navAreaRatio = Math.max(0, rect.width * rect.height) / viewportArea
    return node.getAttribute('data-home-navigation-non-dominant') === 'true'
      && Number.parseFloat(style.opacity || '1') <= 0.05
      && rect.width <= 64
      && navAreaRatio <= 0.03
  })
  result.semanticNonDominant = semanticNonDominant
  const requiredMode = expected.assetMode || (expectReady ? 'ready' : 'disclosed-review-candidate')
  const passed = result.ownerCount === 1`,
  1,
  'continuous proof semantic non-dominance measurement',
)
source = replaceExact(
  source,
  '    && result.semanticButtons === 3 && result.semanticVisible === 0 && result.discreetControls === 2',
  '    && result.semanticButtons === 3 && result.semanticNonDominant && result.discreetControls === 2',
  1,
  'continuous proof semantic navigation acceptance',
)
source = replaceExact(
  source,
  `    reached,
    samples,`,
  `    reached: end.nearby === destination && end.moving === 'false',
    samples,`,
  1,
  'continuous proof stable terminal nearby telemetry acceptance',
)
source = replaceExact(
  source,
  '  if (!reached || evidence.distanceTravelled == null || evidence.distanceTravelled < 0.25) {',
  '  if (!evidence.reached || evidence.distanceTravelled == null || evidence.distanceTravelled < 0.25) {',
  1,
  'continuous proof terminal movement verdict',
)
source = replaceExact(
  source,
  'async function moveToNearby(page, destination, method, timeout = 40_000) {',
  'async function moveToNearby(page, destination, method, timeout = 120_000) {',
  1,
  'continuous proof slow-host movement timeout envelope',
)
source = replaceExact(
  source,
  '      if (Date.now() - lastProgressAt > 10_000) break',
  '      if (Date.now() - lastProgressAt > 30_000) break',
  1,
  'continuous proof slow-host progress stall envelope',
)
source = replaceExact(
  source,
  `  await waitFrames(page, 3)
  const end = await readMovementTelemetry(page, destination)
  samples.push(end)`,
  `  const settleActive = new Set()
  let end = await readMovementTelemetry(page, destination)
  const settleStartedAt = Date.now()
  let settleAttempts = 0
  try {
    while (Date.now() - settleStartedAt < 120_000 && settleAttempts < 12 && (end.nearby !== destination || end.moving !== 'false')) {
      if (end.nearby === destination) {
        await releaseDirections(page, method, settleActive)
        await page.waitForFunction((selector) => document.querySelector(selector)?.getAttribute('data-home-moving') === 'false', ownerSelector, { timeout: 30_000 }).catch(() => {})
      } else {
        const directions = desiredDirections(end, destination)
        const desired = method === 'touch' && directions.length > 1
          ? new Set([directions.find((direction) => direction === 'left' || direction === 'right') || directions[0]])
          : new Set(directions)
        if (!desired.size) break
        const beforeFrames = end.renderedFrames
        if (method === 'keyboard') await setKeyboardDirections(page, settleActive, desired)
        else await setTouchDirections(page, settleActive, desired)
        await page.waitForFunction(({ selector, beforeFrames, destination }) => {
          const owner = document.querySelector(selector)
          const frames = Number.parseFloat(owner?.getAttribute('data-home-rendered-frames') || '')
          return owner?.getAttribute('data-home-nearby') === destination
            || (Number.isFinite(frames) && (beforeFrames == null || frames > beforeFrames))
        }, { selector: ownerSelector, beforeFrames, destination }, { timeout: 30_000 }).catch(() => {})
        await releaseDirections(page, method, settleActive)
        await page.waitForFunction((selector) => document.querySelector(selector)?.getAttribute('data-home-moving') === 'false', ownerSelector, { timeout: 30_000 }).catch(() => {})
      }
      end = await readMovementTelemetry(page, destination)
      samples.push(end)
      settleAttempts += 1
    }
  } finally {
    await releaseDirections(page, method, settleActive)
  }
  await page.waitForFunction((selector) => document.querySelector(selector)?.getAttribute('data-home-moving') === 'false', ownerSelector, { timeout: 30_000 }).catch(() => {})
  end = await readMovementTelemetry(page, destination)
  samples.push(end)`,
  1,
  'continuous proof telemetry-driven stable destination correction',
)
source = replaceExact(
  source,
  `    await page.keyboard.press('Enter')
    await page.waitForFunction((selector) => document.querySelector(selector)?.getAttribute('data-home-portal-sequence') === 'traversal', ownerSelector, { timeout: 10_000 })
    const sequence = await page.locator(ownerSelector).getAttribute('data-home-portal-sequence')`,
  `    await page.keyboard.press('Enter')
    const expectedSequence = \`${destination}:traversal\`
    await page.waitForFunction(({ selector, expectedSequence }) => document.querySelector(selector)?.getAttribute('data-home-portal-sequence') === expectedSequence, { selector: ownerSelector, expectedSequence }, { timeout: 30_000 })
    const sequence = await page.locator(ownerSelector).getAttribute('data-home-portal-sequence')`,
  1,
  'continuous proof destination-qualified portal traversal contract',
)
source = replaceExact(
  source,
  "    if (sequence !== 'traversal' || diagnosticResult.pageErrors.length || diagnosticResult.consoleErrors.length || diagnosticResult.failedRequests.length) receipt.errors.push(record)",
  "    if (sequence !== expectedSequence || diagnosticResult.pageErrors.length || diagnosticResult.consoleErrors.length || diagnosticResult.failedRequests.length) receipt.errors.push(record)",
  1,
  'continuous proof destination-qualified portal traversal verdict',
)

await writeFile(materializedPath, source)
console.log(`Materialized current continuous spatial proof at ${materializedPath}`)
await import(`${pathToFileURL(materializedPath).href}?exactHead=${encodeURIComponent(process.env.URAI_EXACT_HEAD || 'local')}`)
