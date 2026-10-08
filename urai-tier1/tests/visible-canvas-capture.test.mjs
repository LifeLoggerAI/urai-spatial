import assert from 'node:assert/strict'
import test from 'node:test'
import { CANVAS_EVIDENCE_SAMPLE_POINTS, captureVisibleCanvasPng } from '../../scripts/capture-visible-canvas-png.mjs'

const visibleBounds = { x: 12, y: 18, width: 800, height: 600 }
function fixture(bounds = visibleBounds, after = bounds) {
  let reads = 0
  const calls = []
  const pixels = Buffer.from('unmodified-browser-png')
  const canvas = {
    waitFor: async (options) => calls.push(['visible', options]),
    boundingBox: async () => (++reads === 1 ? bounds : after),
    evaluate: async (_read, points) => { calls.push(['occlusion', points]); return true },
    screenshot: () => { throw new Error('Locator screenshot must not wait for frame stability') },
  }
  const page = {
    viewportSize: () => ({ width: 1024, height: 768 }),
    screenshot: async (options) => { calls.push(['screenshot', options]); return pixels },
  }
  return { page, canvas, calls, pixels }
}

test('capture returns untouched pixels and exact canvas crop with a bounded screenshot request', async () => {
  const f = fixture()
  const result = await captureVisibleCanvasPng(f.page, f.canvas, 5000)
  assert.equal(result.buffer, f.pixels)
  assert.equal(result.capture.source, 'visible-canvas-viewport-clip')
  assert.deepEqual(result.capture.clip, visibleBounds)
  assert.equal(result.capture.boundsUnchanged, true)
  assert.equal(result.capture.canvasTopmostAtSamplePoints, true)
  assert.deepEqual(f.calls.find(([name]) => name === 'occlusion')[1], CANVAS_EVIDENCE_SAMPLE_POINTS)
  assert.equal(result.capture.viewportCoverage, 800 * 600 / (1024 * 768))
  const screenshots = f.calls.filter(([name]) => name === 'screenshot')
  assert.equal(screenshots.length, 1)
  assert.deepEqual(screenshots[0][1].clip, visibleBounds)
  assert.equal(screenshots[0][1].fullPage, false)
  assert.equal(screenshots[0][1].type, 'png')
  assert.ok(screenshots[0][1].timeout > 0 && screenshots[0][1].timeout <= 5000)
})

test('missing, invalid, and partially clipped canvas bounds fail before any screenshot', async () => {
  for (const bounds of [null, { ...visibleBounds, width: 0 }, { ...visibleBounds, x: NaN }, { ...visibleBounds, x: -1 }, { ...visibleBounds, width: 1200 }]) {
    const f = fixture(bounds)
    await assert.rejects(captureVisibleCanvasPng(f.page, f.canvas))
    assert.equal(f.calls.some(([name]) => name === 'screenshot'), false)
  }
})

test('a canvas that moves during capture fails instead of returning unbound pixels', async () => {
  const f = fixture(visibleBounds, { ...visibleBounds, x: visibleBounds.x + 1 })
  await assert.rejects(captureVisibleCanvasPng(f.page, f.canvas), /bounds changed/)
})

test('an overlay at a sampled pixel rejects the capture before screenshot', async () => {
  const f = fixture()
  f.canvas.evaluate = async () => false
  await assert.rejects(captureVisibleCanvasPng(f.page, f.canvas), /covered/)
  assert.equal(f.calls.some(([name]) => name === 'screenshot'), false)
})


test('nonfinite, zero and unbounded capture budgets fail before any screenshot', async () => {
  for (const budget of [0, -1, Infinity, NaN, 90001]) {
    const f = fixture()
    await assert.rejects(captureVisibleCanvasPng(f.page, f.canvas, budget), /finite deadline/)
    assert.equal(f.calls.some(([name]) => name === 'screenshot'), false)
  }
})

test('overlay appearing during capture rejects otherwise stable retained pixels', async () => {
  const f = fixture()
  let reads = 0
  f.canvas.evaluate = async () => ++reads === 1
  await assert.rejects(captureVisibleCanvasPng(f.page, f.canvas), /became covered/)
  assert.equal(f.calls.filter(([name]) => name === 'screenshot').length, 1)
})

test('Home/Orb proof binds its visual samples and receipt to guarded canvas pixels', async () => {
  const { readFile } = await import('node:fs/promises')
  const source = await readFile(new URL('../../scripts/capture-natural-home-orb-proof.mjs', import.meta.url), 'utf8')
  assert.match(source, /import \{ captureVisibleCanvasPng \} from '\.\/capture-visible-canvas-png\.mjs'/)
  assert.match(source, /captureVisibleCanvasPng\(page, canvas\)/)
  assert.match(source, /record\.canvasCapture = visual\.capture/)
  assert.match(source, /record\.canvasCapture\?\.canvasTopmostAfterCapture === true/)
  assert.match(source, /if \(await worldCanvas\.count\(\) !== 1\)/)
})
