import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'

const requireFromTierOne = createRequire(new URL('../urai-tier1/package.json', import.meta.url))
const { chromium } = requireFromTierOne('playwright')
const base = process.env.URAI_PROOF_BASE || 'http://127.0.0.1:4173'
const outputDir = path.resolve(process.env.URAI_CANVAS_PROOF_DIR || 'artifacts/lifemap-founder-proof/canvas-proof')
const exactHead = process.env.URAI_EXACT_HEAD || 'local'
const receipt = { schemaVersion: 'urai-lifemap-webgl-canvas-proof-1', exactHead, captures: [], browserEvents: [], capturedAt: new Date().toISOString() }
let failed = false

await mkdir(outputDir, { recursive: true })
const browser = await chromium.launch({ headless: true })

function recordEvents(page, label) {
  page.on('pageerror', (error) => receipt.browserEvents.push({ label, kind: 'pageerror', text: String(error) }))
  page.on('requestfailed', (request) => receipt.browserEvents.push({ label, kind: 'requestfailed', text: `${request.method()} ${request.url()} ${request.failure()?.errorText || ''}` }))
  page.on('console', (message) => { if (message.type() === 'error') receipt.browserEvents.push({ label, kind: 'console:error', text: message.text() }) })
}

async function signalFromCanvasPng(page, buffer) {
  const dataUrl = `data:image/png;base64,${buffer.toString('base64')}`
  return page.evaluate(async ({ dataUrl }) => {
    const image = new Image()
    const loaded = new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject })
    image.src = dataUrl
    await loaded
    const surface = document.createElement('canvas')
    surface.width = image.naturalWidth
    surface.height = image.naturalHeight
    const context = surface.getContext('2d', { willReadFrequently: true })
    if (!context) return null
    context.drawImage(image, 0, 0)
    const columns = 24
    const rows = 16
    const block = 3
    let count = 0
    let sum = 0
    let sumSquares = 0
    let nonDark = 0
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const x = Math.max(0, Math.min(surface.width - block, Math.round(((column + 0.5) / columns) * surface.width) - 1))
        const y = Math.max(0, Math.min(surface.height - block, Math.round(((row + 0.5) / rows) * surface.height) - 1))
        const pixels = context.getImageData(x, y, block, block).data
        for (let index = 0; index < pixels.length; index += 4) {
          const luminance = (pixels[index] + pixels[index + 1] + pixels[index + 2]) / 3
          count += 1
          sum += luminance
          sumSquares += luminance * luminance
          if (luminance > 8) nonDark += 1
        }
      }
    }
    const mean = sum / Math.max(1, count)
    return {
      width: surface.width,
      height: surface.height,
      variance: sumSquares / Math.max(1, count) - mean * mean,
      nonDarkRatio: nonDark / Math.max(1, count),
      sampleCount: count,
      sampling: 'distributed-grid-24x16-3x3',
      source: 'retained-webgl-canvas-png',
    }
  }, { dataUrl })
}

async function capture(spec) {
  const context = await browser.newContext({ viewport: spec.viewport, deviceScaleFactor: 2, reducedMotion: spec.reducedMotion || 'no-preference', hasTouch: Boolean(spec.touch), isMobile: Boolean(spec.touch) })
  const page = await context.newPage()
  recordEvents(page, spec.id)
  try {
    const response = await page.goto(new URL(spec.route, base).toString(), { waitUntil: 'domcontentloaded', timeout: 60_000 })
    if (!response || response.status() !== 200) throw new Error(`${spec.id} returned ${response?.status()}`)
    const root = page.getByTestId('urai-true-3d-life-map')
    await root.waitFor({ state: 'visible', timeout: 45_000 })
    await page.waitForFunction(({ phase }) => {
      const element = document.querySelector('[data-testid="urai-true-3d-life-map"]')
      return element?.getAttribute('data-life-map-render-ready') === 'true' && (!phase || element.getAttribute('data-life-map-phase') === phase)
    }, { phase: spec.phase }, { timeout: 45_000, polling: 50 })
    const canvas = root.locator('canvas').first()
    await canvas.waitFor({ state: 'visible', timeout: 20_000 })
    const file = `${spec.id}-${exactHead.slice(0, 12)}.png`
    const buffer = await canvas.screenshot({ path: path.join(outputDir, file), animations: 'disabled', caret: 'hide', scale: 'device', timeout: 60_000 })
    const signal = await signalFromCanvasPng(page, buffer)
    if (!signal || signal.sampleCount !== 3456) throw new Error(`${spec.id} missing exact canvas sampling`)
    if (signal.source !== 'retained-webgl-canvas-png') throw new Error(`${spec.id} did not sample the WebGL canvas PNG`)
    if (signal.variance < 8) throw new Error(`${spec.id} WebGL canvas variance below minimum: ${signal.variance}`)
    if (signal.nonDarkRatio <= 0.02) throw new Error(`${spec.id} WebGL canvas non-dark coverage below minimum: ${signal.nonDarkRatio}`)
    receipt.captures.push({ id: spec.id, route: page.url(), viewport: spec.viewport, phase: spec.phase, file, bytes: buffer.length, sha256: createHash('sha256').update(buffer).digest('hex'), signal })
  } finally {
    await context.close()
  }
}

const selected = '/life-map/?demo=1&memoryId=quiet-reset&manifestId=replay-recovery-thread&node=quiet-reset'
const overview = '/life-map/?demo=1&manifestId=replay-recovery-thread&overview=1'
try {
  await capture({ id: 'desktop-overview-canvas', route: overview, phase: 'overview', viewport: { width: 1440, height: 900 } })
  await capture({ id: 'desktop-selected-canvas', route: selected, phase: 'arrival', viewport: { width: 1440, height: 900 } })
  await capture({ id: 'portrait-selected-canvas', route: selected, phase: 'arrival', viewport: { width: 390, height: 844 }, touch: true })
  await capture({ id: 'reduced-selected-canvas', route: selected, phase: 'arrival', viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
  const blocking = receipt.browserEvents.filter((event) => event.kind === 'pageerror' || event.kind === 'requestfailed' || (event.kind === 'console:error' && !/favicon/i.test(event.text)))
  if (blocking.length) throw new Error(`canvas proof emitted ${blocking.length} blocking browser events`)
} catch (error) {
  failed = true
  receipt.error = String(error)
} finally {
  await browser.close()
  receipt.completedAt = new Date().toISOString()
  receipt.passed = !failed && receipt.captures.length === 4
  await writeFile(path.join(outputDir, 'receipt.json'), JSON.stringify(receipt, null, 2))
  if (!receipt.passed) process.exitCode = 1
}
