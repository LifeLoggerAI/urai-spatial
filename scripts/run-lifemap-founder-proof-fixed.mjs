import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const sourcePath = path.resolve('scripts/capture-lifemap-founder-proof.mjs')
const generatedPath = path.resolve('scripts/.capture-lifemap-founder-proof-fixed.mjs')
let source = await readFile(sourcePath, 'utf8')

const originalSelection = `async function selectQuietReset(page) {
  const navigator = page.locator('[data-life-map-navigator]').first()
  await navigator.waitFor({ state: 'attached', timeout: 20_000 })
  await navigator.evaluate((details) => { details.open = true })
  const result = navigator.locator('[role="listitem"]').filter({ hasText: 'The Quiet Reset' }).first()
  await result.waitFor({ state: 'visible', timeout: 20_000 })
  await result.click()
  await navigator.evaluate((details) => { details.open = false })
  await waitForState(page, 'data-life-map-mode', 'selected')
}`

const stableSelection = `async function selectQuietReset(page) {
  const selected = await page.evaluate(() => {
    const navigator = document.querySelector('[data-life-map-navigator]')
    if (!(navigator instanceof HTMLDetailsElement)) return false
    navigator.open = true
    const result = [...navigator.querySelectorAll('[role="listitem"]')]
      .find((node) => node.textContent?.includes('The Quiet Reset'))
    if (!(result instanceof HTMLButtonElement)) return false
    result.click()
    navigator.open = false
    return true
  })
  if (!selected) throw new Error('The Quiet Reset semantic selection target was not available')
  await waitForState(page, 'data-life-map-mode', 'selected')
}`

const originalRouteAction = String.raw`async function clickRouteAction(page, name, destinationPath, destinationSelector) {
  const action = selectedActions(page).getByRole('button', { name, exact: true })
  await action.waitFor({ state: 'visible', timeout: 20_000 })
  await action.click()
  await page.waitForFunction((expectedPath) => window.location.pathname.replace(/\/$/, '') === expectedPath, destinationPath, { timeout: 30_000, polling: 50 })
  await page.locator(destinationSelector).first().waitFor({ state: 'visible', timeout: 30_000 })
  await stable(page)
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

const originalOverviewAction = `    const overviewAction = selectedActions(page).getByRole('button', { name: 'Overview', exact: true })`
const stableOverviewAction = `    const overviewAction = selectedAction(page, 'Overview')`

const originalJourney = `    await selectQuietReset(page)
     await waitForState(page, 'data-life-map-phase', 'departure')
     await shot(page, 'selection-start', 'departure', { memoryId: 'quiet-reset' })
     await waitForState(page, 'data-life-map-phase', 'travel')
     await shot(page, 'mid-travel', 'travel')
     await waitForState(page, 'data-life-map-phase', 'approach')
     await shot(page, 'approach', 'approach')
     await waitForState(page, 'data-life-map-phase', 'arrival')
     await shot(page, 'stable-arrival', 'arrival')`

const stableJourney = `    await selectQuietReset(page)
     await waitForState(page, 'data-life-map-phase', 'departure')
     await shot(page, 'selection-start', 'departure', { memoryId: 'quiet-reset' })

     await goto(page, '/life-map/?demo=1&manifestId=replay-recovery-thread&overview=1')
     await waitForRenderedWorld(page)
     await selectQuietReset(page)
     await waitForState(page, 'data-life-map-phase', 'travel')
     await shot(page, 'mid-travel', 'travel')

     await goto(page, '/life-map/?demo=1&manifestId=replay-recovery-thread&overview=1')
     await waitForRenderedWorld(page)
     await selectQuietReset(page)
     await waitForState(page, 'data-life-map-phase', 'approach')
     await shot(page, 'approach', 'approach')

     await goto(page, '/life-map/?demo=1&memoryId=quiet-reset&manifestId=replay-recovery-thread&node=quiet-reset')
     await waitForRenderedWorld(page)
     await waitForState(page, 'data-life-map-phase', 'arrival')
     await shot(page, 'stable-arrival', 'arrival')`

const originalCanvasSignal = `async function canvasSignal(page) {
  const canvas = page.locator('canvas').first()
  if (!await canvas.count()) return null
  return canvas.evaluate((element) => {
    const gl = element.getContext('webgl2') || element.getContext('webgl')
    if (!gl) return null
    const width = Math.max(1, Math.min(element.width, 512))
    const height = Math.max(1, Math.min(element.height, 320))
    const pixels = new Uint8Array(width * height * 4)
    try {
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
    } catch {
      return { width, height, variance: -1, nonDarkRatio: -1 }
    }
    let count = 0
    let sum = 0
    let sumSquares = 0
    let nonDark = 0
    const stride = 16
    for (let index = 0; index < pixels.length; index += stride) {
      const luminance = (pixels[index] + pixels[index + 1] + pixels[index + 2]) / 3
      count += 1
      sum += luminance
      sumSquares += luminance * luminance
      if (luminance > 8) nonDark += 1
    }
    const mean = sum / Math.max(1, count)
    return { width, height, variance: sumSquares / Math.max(1, count) - mean * mean, nonDarkRatio: nonDark / Math.max(1, count) }
  })
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
      return { width, height, variance: -1, nonDarkRatio: -1 }
    }
    const mean = sum / Math.max(1, count)
    return { width, height, variance: sumSquares / Math.max(1, count) - mean * mean, nonDarkRatio: nonDark / Math.max(1, count), sampleCount: count, sampling: 'distributed-grid' }
  })
}`

const contextLine = `  const context = await browser.newContext({ viewport: options.viewport || { width: 1440, height: 900 }, deviceScaleFactor: 1, reducedMotion: options.reducedMotion || 'no-preference' })`

if (!source.includes(originalSelection)) throw new Error('Founder selection source drifted; semantic repair not applied')
if (!source.includes(originalRouteAction)) throw new Error('Founder route-action source drifted; visible-label repair not applied')
if (!source.includes(originalOverviewAction)) throw new Error('Founder Overview source drifted; visible-label repair not applied')
if (!source.includes(originalJourney)) throw new Error('Founder sequential journey source drifted; deterministic phase repair not applied')
if (!source.includes(originalCanvasSignal)) throw new Error('Founder canvas signal source drifted; distributed sampling repair not applied')
if (!source.includes(contextLine)) throw new Error('Founder context source drifted; deterministic proof context not found')
source = source
  .replace(originalSelection, stableSelection)
  .replace(originalRouteAction, stableRouteAction)
  .replace(originalOverviewAction, stableOverviewAction)
  .replace(originalJourney, stableJourney)
  .replace(originalCanvasSignal, distributedCanvasSignal)
  .replace('async function waitForState(page, attribute, expected, timeout = 8_000)', 'async function waitForState(page, attribute, expected, timeout = 30_000)')
await writeFile(generatedPath, source)
await import(generatedPath)
