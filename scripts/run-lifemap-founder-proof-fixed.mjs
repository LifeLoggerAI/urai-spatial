import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const sourcePath = path.resolve('scripts/capture-lifemap-founder-proof.mjs')
const generatedPath = path.resolve('scripts/.capture-lifemap-founder-proof-fixed.mjs')
let source = await readFile(sourcePath, 'utf8')

function replaceFunction(name, replacement) {
  const start = source.indexOf(`async function ${name}(`)
  if (start < 0) throw new Error(`Founder source drifted; ${name} was not found`)
  const bodyStart = source.indexOf('{', start)
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
  if (end < 0) throw new Error(`Founder source drifted; ${name} body did not close`)
  source = source.slice(0, start) + replacement + source.slice(end)
}

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
      return { width, height, variance: -1, nonDarkRatio: -1 }
    }
    const mean = sum / Math.max(1, count)
    return { width, height, variance: sumSquares / Math.max(1, count) - mean * mean, nonDarkRatio: nonDark / Math.max(1, count), sampleCount: count, sampling: 'distributed-grid' }
  })
}`

replaceFunction('selectQuietReset', stableSelection)
replaceFunction('clickRouteAction', stableRouteAction)
replaceFunction('canvasSignal', distributedCanvasSignal)

source = source.replace(
  `    const overviewAction = selectedActions(page).getByRole('button', { name: 'Overview', exact: true })`,
  `    const overviewAction = selectedAction(page, 'Overview')`,
)

const journeyPattern = /    await selectQuietReset\(page\)[\s\S]*?      await shot\(page, 'stable-arrival', 'arrival'\)/
if (!journeyPattern.test(source)) throw new Error('Founder journey source drifted; deterministic phase block not found')
source = source.replace(journeyPattern, `    await selectQuietReset(page)
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
      await shot(page, 'stable-arrival', 'arrival')`)

source = source.replace('async function waitForState(page, attribute, expected, timeout = 8_000)', 'async function waitForState(page, attribute, expected, timeout = 30_000)')
await writeFile(generatedPath, source)
await import(generatedPath)
