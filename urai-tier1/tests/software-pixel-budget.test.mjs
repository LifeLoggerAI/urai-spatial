import assert from 'node:assert/strict'
import test from 'node:test'
import { softwarePixelRatio } from '../src/spatial/performance/softwarePixelBudget.ts'

test('software raster budget remains bounded across desktop, portrait and resize', () => {
  for (const [w, h] of [[1440, 900], [390, 844], [844, 390], [3840, 2160]]) {
    const ratio = softwarePixelRatio(w, h)
    assert.ok(ratio > 0 && ratio <= 1)
    assert.ok(w * h * ratio ** 2 <= 320_000.001)
  }
  assert.equal(softwarePixelRatio(320, 480), 1, 'small viewports are not unnecessarily downsampled')
  assert.ok(softwarePixelRatio(1440, 900) < softwarePixelRatio(390, 844))
})
test('unmeasurable viewports retain a valid ratio', () => {
  for (const [w,h] of [[0,900], [1440,0], [-1,900], [NaN,900], [Infinity,900]]) assert.equal(softwarePixelRatio(w,h),1)
})
