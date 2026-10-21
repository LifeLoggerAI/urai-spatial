import assert from 'node:assert/strict'
import { deflateSync } from 'node:zlib'
import test from 'node:test'
import { inspectSpatialScenePixels, assertVisibleSpatialScene } from './spatial-png-scene-proof.mjs'

// Synthetic RGB fixtures contain no private media. Historic founder screenshots
// are inspected separately and are NOT copied into the original repository.
function fixturePng(width, height, predicate = () => false, channels = 3) {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header[8] = 8
  header[9] = channels === 4 ? 6 : 2
  const scanlines = Buffer.alloc((width * channels + 1) * height)
  for (let y = 0; y < height; y++) {
    const rowOffset = (width * channels + 1) * y + 1
    for (let x = 0; x < width; x++) {
      const value = predicate(x, y) ? 245 : 7
      for (let c = 0; c < 3; c++) scanlines[rowOffset + x * channels + c] = value
      if (channels === 4) scanlines[rowOffset + x * channels + 3] = 255
    }
  }
  const chunk = (type, data) => {
    const out = Buffer.alloc(12 + data.length)
    out.writeUInt32BE(data.length, 0)
    out.write(type, 4, 4, 'ascii')
    data.copy(out, 8)
    return out
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header), chunk('IDAT', deflateSync(scanlines)), chunk('IEND', Buffer.alloc(0)),
  ])
}

test('blank 3D viewport is never a Life Map visual PASS', () => {
  assert.throws(() => assertVisibleSpatialScene(fixturePng(160, 120)), /URAI_VISUAL_SCENE_BLANK/)
})
test('header/footer controls cannot hide a blank 3D scene', () => {
  const onlyUi = fixturePng(160, 120, (x, y) => y < 24 || y > 98 || x < 15 || x > 145)
  assert.throws(() => assertVisibleSpatialScene(onlyUi), /URAI_VISUAL_SCENE_BLANK/)
})
test('visible central stellar pixels pass only a negative blank-scene screen', () => {
  const proof = assertVisibleSpatialScene(fixturePng(160, 120, (x, y) => x >= 60 && x <= 75 && y >= 45 && y <= 58))
  assert.ok(proof.brightPixels > 100)
})
test('visible RGBA PNG supports same negative blank-scene screen', () => {
  assert.equal(inspectSpatialScenePixels(fixturePng(160, 120, (x, y) => x >= 72 && x < 82 && y >= 50 && y < 60, 4)).passes, true)
})
test('malformed images cannot be visually accepted', () => {
  assert.throws(() => inspectSpatialScenePixels(Buffer.alloc(100)), /URAI_VISUAL_PROOF_INVALID_PNG_SIGNATURE/)
  const png = fixturePng(160, 120)
  png[24] = 16
  assert.throws(() => inspectSpatialScenePixels(png), /URAI_VISUAL_PROOF_UNSUPPORTED_PNG_FORMAT/)
})
