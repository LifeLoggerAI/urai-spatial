import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { captureVisibleCanvasPng } from './capture-visible-canvas-png.mjs'

const { chromium } = createRequire(new URL('../urai-tier1/package.json', import.meta.url))('playwright')
const base = process.env.URAI_PROOF_BASE || 'http://127.0.0.1:4173'
const exactHead = process.env.URAI_EXACT_HEAD || 'local-uncommitted'
const output = path.resolve(process.env.URAI_PROOF_DIR || 'artifacts/home-art-direction-proof')
const budgets = JSON.parse(await readFile('operations/performance/spatial-performance-budget.json', 'utf8'))
const receipt = { schema: 'urai.home-art-direction-observation.v1', exactHead, base, capturedAt: new Date().toISOString(), budgets,
  limitations: ['Browser emulation and software WebGL do not certify physical-device performance.', 'Triangle submissions include all render passes; these are not unique scene polygons.', 'Camera views use native input; detail and Orb labels describe intended inspection, not verified content.', 'No private fixture, visual approval, release acceptance or deployment authorization.'], cases: [], errors: [] }
receipt.sourceIdentity = await Promise.all(['urai-tier1/src/spatial/layout/HomeWorldProductionPolished.tsx', 'urai-tier1/src/spatial/layout/HomeSanctuaryGeometry.ts', 'urai-tier1/src/spatial/layout/HomeSanctuaryMaterials.tsx', 'urai-tier1/src/spatial/performance/homeRenderCostPolicy.ts', 'urai-tier1/src/spatial/performance/useAdaptiveSpatialQuality.ts', 'scripts/capture-visible-canvas-png.mjs', 'scripts/capture-home-art-direction-proof.mjs'].map(async file => {
  const bytes = await readFile(file)
  return { file, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }
}))
await mkdir(output, { recursive: true })
for (const spec of [{ id: 'reduced-motion', width: 1440, height: 900, reducedMotion: 'reduce' }, { id: 'desktop', width: 1440, height: 900 }, { id: 'mobile', width: 390, height: 844 }]) {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.URAI_CHROMIUM_EXECUTABLE || undefined, args: ['--enable-unsafe-swiftshader'] })
  const context = await browser.newContext({ viewport: { width: spec.width, height: spec.height }, isMobile: spec.id === 'mobile', hasTouch: spec.id === 'mobile', reducedMotion: spec.reducedMotion })
  const page = await context.newPage()
  const record = { ...spec, pageErrors: [], failedRequests: [], views: [] }
  page.on('pageerror', error => record.pageErrors.push(String(error)))
  page.on('requestfailed', request => record.failedRequests.push({ url: request.url(), reason: request.failure()?.errorText }))
  await page.addInitScript(() => {
    const state = window.__uraiArtDirectionObservation = { calls: 0, triangleSubmissions: 0, frames: 0, firstDrawMs: null, contexts: [] }
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function(type, ...args) {
      const gl = original.call(this, type, ...args)
      if (!gl || !['webgl', 'webgl2', 'experimental-webgl'].includes(type) || gl.__uraiObserved) return gl
      gl.__uraiObserved = true
      const rendererInfo = gl.getExtension('WEBGL_debug_renderer_info')
      state.contexts.push({ type, attributes: gl.getContextAttributes(), renderer: rendererInfo ? gl.getParameter(rendererInfo.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER) })
      for (const name of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) {
        if (typeof gl[name] !== 'function') continue
        const draw = gl[name]
        gl[name] = function(...args) {
          state.calls++
          if (state.firstDrawMs === null) state.firstDrawMs = performance.now()
          const count = name.includes('Elements') ? args[1] : args[2]
          const instances = name.includes('Instanced') ? args.at(-1) : 1
          if (args[0] === gl.TRIANGLES) state.triangleSubmissions += count / 3 * instances
          else if ([gl.TRIANGLE_STRIP, gl.TRIANGLE_FAN].includes(args[0])) state.triangleSubmissions += Math.max(0, count - 2) * instances
          return draw.apply(this, args)
        }
      }
      return gl
    }
  })
  async function settle() { await page.waitForTimeout(500) }
  async function drag(dx, dy) {
    const x = spec.width * .5, y = spec.height * .5
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(x + dx, y + dy, { steps: 12 })
    await page.mouse.up()
    await settle()
  }
  async function capture(id, input) {
    const owner = page.locator('.urai-asset-home-world[data-home-primary-owner="asset-driven"]')
    const canvas = owner.locator('canvas')
    const before = await page.evaluate(() => ({ ...window.__uraiArtDirectionObservation, at: performance.now() }))
    const samples = await page.evaluate(() => new Promise(resolve => {
      const rows = []; let last = performance.now(); let finished = false
      const complete = () => { if (!finished) { finished = true; resolve(rows) } }
      const timer = setTimeout(complete, 4000)
      const tick = now => { if (finished) return; rows.push(now - last); last = now; if (rows.length >= 30) { clearTimeout(timer); complete() } else requestAnimationFrame(tick) }
      requestAnimationFrame(tick)
    }))
    const after = await page.evaluate(() => ({ ...window.__uraiArtDirectionObservation, at: performance.now() }))
    const attempt = { id, input, captured: false,
      ownerAttributes: await owner.evaluate(node => Object.fromEntries([...node.attributes].filter(a => a.name.startsWith('data-home-')).map(a => [a.name, a.value]))),
      renderObservation: { firstDrawMs: after.firstDrawMs, elapsedMs: after.at-before.at, calls: after.calls-before.calls, triangleSubmissions: after.triangleSubmissions-before.triangleSubmissions, animationFrameIntervalsMs: samples, contexts: after.contexts },
      drawingBuffer: await canvas.evaluate(node => ({ width: node.width, height: node.height, cssWidth: node.getBoundingClientRect().width, cssHeight: node.getBoundingClientRect().height })) }
    record.views.push(attempt)
    // Keep measured observations even if the strict canvas capture fails.
    await writeFile(path.join(output, `${spec.id}-observations.json`), `${JSON.stringify(record, null, 2)}\n`)
    try {
      const { buffer, capture: evidence } = await captureVisibleCanvasPng(page, canvas)
      const file = `${spec.id}-${id}.png`
      await writeFile(path.join(output, file), buffer)
      Object.assign(attempt, { captured: true, image: { file, bytes: buffer.length, sha256: createHash('sha256').update(buffer).digest('hex') }, evidence })
    } catch (error) { attempt.captureError = String(error); throw error }
  }
  try {
    const response = await page.goto(`${base}/home/`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    record.status = response?.status()
    if (record.status !== 200) throw new Error(`Home status ${record.status}`)
    await page.locator('.urai-asset-home-world[data-home-primary-owner="asset-driven"][data-home-assets-ready="true"]').waitFor({ state: 'visible', timeout: 90000 })
    await settle()
    await capture('forward', 'natural spawn')
    const lateral = Math.min(240, spec.width * .35)
    await drag(lateral, 0); await capture('left', `native drag dx=${lateral}`)
    await drag(-lateral*2, 0); await capture('right', `native drag dx=${-lateral*2}`)
    await drag(lateral, 0)
    await drag(0, -Math.min(240, spec.height*.3))
    await drag(0, -Math.min(240, spec.height*.3))
    await capture('sky', 'two native upward drags toward supported pitch limit')
    await drag(0, Math.min(450, spec.height*.45))
    await drag(0, Math.min(450, spec.height*.45))
    await capture('detail', 'two native downward drags toward supported ground pitch limit')
    await drag(0, -260)
    // Move through the same keyboard input path used by users; never set the camera or owner attributes.
    await page.keyboard.down('w')
    let movementMs = 0
    while (movementMs < 8000) {
      await page.waitForTimeout(250); movementMs += 250
      const z = await page.locator('.urai-asset-home-world[data-home-primary-owner="asset-driven"]').getAttribute('data-home-player-z')
      if (z !== null && Number(z) < -6.8) break
    }
    await page.keyboard.up('w'); await settle()
    await capture('orb-approach', `native forward movement ${movementMs}ms toward Orb; observed position retained; no forced arrival`)
    if (record.pageErrors.length || record.failedRequests.length) throw new Error('Runtime errors or failed requests observed')
    record.observationComplete = true
  } catch (error) { record.error = String(error); receipt.errors.push({ id: spec.id, error: String(error) }) }
  receipt.cases.push(record)
  await context.close().catch(() => {})
  await browser.close().catch(() => {})
  await writeFile(path.join(output, 'receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`)
}
if (receipt.errors.length) process.exitCode = 1
