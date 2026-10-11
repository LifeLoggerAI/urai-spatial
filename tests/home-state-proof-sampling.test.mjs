import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { captureVisibleCanvasPng } from '../scripts/capture-visible-canvas-png.mjs'

const script = fs.readFileSync(new URL('../scripts/capture-home-state-proof.mjs', import.meta.url), 'utf8')

test('Home visual proof bounds expensive PNG captures without lowering visual thresholds', () => {
  assert.match(script, /const sampleInterval = Math\.max\(1, Math\.ceil\(frameBudget \/ 2\)\)/)
  assert.match(script, /frameBudget = 240/)
  assert.match(script, /minimumViewportCoverage: 0\.82/)
  assert.match(script, /minimumLuminanceRange: 12/)
  assert.match(script, /minimumVisibleSamples: 3/)
  assert.match(script, /luminanceRange >= receipt\.visualGate\.minimumLuminanceRange/)
  assert.match(script, /visibleSamples >= receipt\.visualGate\.minimumVisibleSamples/)
})


test('intentional blocked-loader errors are separated from real Home page failures', () => {
  assert.match(script, /record\.unexpectedPageErrors = pageErrors\.filter/)
  assert.match(script, /error\.includes\(fixture\.asset\)/)
  assert.match(script, /Could not load\|503\|Service Unavailable/)
  assert.match(script, /record\.unexpectedPageErrors\.length === 0/)
  assert.match(script, /record\.unexpectedConsoleErrors\.length === 0/)
})

test('Home proof uses the direct page DOM path without canvas locator protocol calls', async () => {
  const calls = []
  const locator = {
    waitFor: async () => { throw new Error('locator wait must not run') },
    boundingBox: async () => { throw new Error('locator bounds must not run') },
    evaluate: async () => { throw new Error('locator evaluate must not run') },
  }
  const bounds = { x: 0, y: 0, width: 1440, height: 900 }
  const probes = [
    { count: 1, visible: true, bounds, unoccluded: true },
    { count: 1, visible: true, bounds, unoccluded: true },
  ]
  const page = {
    viewportSize: () => ({ width: 1440, height: 900 }),
    evaluate: async (_read, input) => {
      calls.push(input)
      assert.equal(input.selector, '.urai-asset-home-world canvas')
      return probes.shift()
    },
    screenshot: async options => {
      assert.deepEqual(options.clip, bounds)
      return Buffer.from('exact-retained-browser-composite')
    },
  }
  const points = [[.18,.2],[.5,.5],[.82,.8]]
  const result = await captureVisibleCanvasPng(page, locator, 5_000, points, '.urai-asset-home-world canvas')
  assert.equal(result.capture.canvasTopmostAfterCapture, true)
  assert.equal(result.capture.boundsUnchanged, true)
  assert.deepEqual(result.capture.samplePoints, points)
  assert.equal(calls.length, 2)
})

test('Home proof avoids the two observed locator-evaluate failure paths', () => {
  assert.doesNotMatch(script, /message\.evaluate\(/)
  assert.match(script, /page\.evaluate\(\(\) => \{\s+const element = document\.querySelector\('#urai-orb-message'\)/)
  assert.match(script, /captureVisibleCanvasPng\(page, canvas, 90_000, HOME_CANVAS_SAMPLE_POINTS, '\.urai-asset-home-world canvas'\)/)
})

