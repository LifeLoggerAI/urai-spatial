import assert from 'node:assert/strict'
import { deflateSync } from 'node:zlib'
import test from 'node:test'
import { inspectSpatialScenePixels, assertVisibleSpatialScene } from './spatial-png-scene-proof.mjs'
import { pngCrc32 } from '../scripts/visual-png-integrity.mjs'

// Synthetic RGB fixtures contain no private media. Historic founder screenshots
// are inspected separately and are NOT copied into the original repository.
function fixturePng(width, height, predicate = () => false, channels = 3, alphaForPixel = () => 255) {
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
      if (channels === 4) scanlines[rowOffset + x * channels + 3] = alphaForPixel(x, y)
    }
  }
  const chunk = (type, data) => {
    const out = Buffer.alloc(12 + data.length)
    out.writeUInt32BE(data.length, 0)
    out.write(type, 4, 4, 'ascii')
    data.copy(out, 8)
    out.writeUInt32BE(pngCrc32(out.subarray(4, out.length - 4)), out.length - 4)
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
  png.writeUInt32BE(pngCrc32(png.subarray(12, 29)), 29)
  assert.throws(() => inspectSpatialScenePixels(png), /URAI_VISUAL_PROOF_UNSUPPORTED_PNG_FORMAT/)
})


test('bad screenshot chunk CRC must not qualify as visual evidence', () => {
  const png = fixturePng(160, 120, (x, y) => x >= 60 && x < 80 && y >= 40 && y < 60)
  const damaged = Buffer.from(png)
  damaged[damaged.length - 1] ^= 1 // corrupt the IEND chunk CRC only
  assert.throws(() => inspectSpatialScenePixels(damaged), /URAI_VISUAL_PROOF_PNG_CRC_INVALID/)
})

test('appended bytes after IEND must not qualify as visual evidence', () => {
  const png = fixturePng(160, 120, (x, y) => x >= 60 && x < 80 && y >= 40 && y < 60)
  assert.throws(() => inspectSpatialScenePixels(Buffer.concat([png, Buffer.from('unexpected tail')])), /URAI_VISUAL_PROOF_INVALID_IEND/)
})

function injectedChunk(type, data = Buffer.alloc(0)) {
  const out = Buffer.alloc(12 + data.length)
  out.writeUInt32BE(data.length, 0)
  out.write(type, 4, 4, 'ascii')
  data.copy(out, 8)
  out.writeUInt32BE(pngCrc32(out.subarray(4, out.length - 4)), out.length - 4)
  return out
}

test('PNG with a valid ancillary chunk before IHDR cannot qualify as visual evidence', () => {
  const png = fixturePng(160, 120, (x,y) => x >= 60 && x < 80 && y >= 40 && y < 60)
  const invalid = Buffer.concat([png.subarray(0,8), injectedChunk('tEXt',Buffer.from('note\0preheader')), png.subarray(8)])
  assert.throws(() => inspectSpatialScenePixels(invalid), /URAI_VISUAL_PROOF_INVALID_CHUNK_ORDER/)
})

test('PNG with separated IDAT chunks cannot qualify as visual evidence', () => {
  const png = fixturePng(160, 120, (x,y) => x >= 60 && x < 80 && y >= 40 && y < 60)
  const idatPos = png.indexOf(Buffer.from('IDAT')) - 4
  const size = png.readUInt32BE(idatPos)
  const compressed = png.subarray(idatPos + 8, idatPos + 8 + size)
  const split = Math.floor(compressed.length / 2)
  const invalid = Buffer.concat([
    png.subarray(0,idatPos),
    injectedChunk('IDAT', compressed.subarray(0,split)),
    injectedChunk('tEXt', Buffer.from('note\0split')),
    injectedChunk('IDAT', compressed.subarray(split)),
    png.subarray(idatPos + size + 12),
  ])
  assert.throws(() => inspectSpatialScenePixels(invalid), /URAI_VISUAL_PROOF_INVALID_IDAT_ORDER/)
})

test('PNG with an unknown mandatory chunk cannot qualify as visual evidence', () => {
  const png = fixturePng(160, 120, (x,y) => x >= 60 && x < 80 && y >= 40 && y < 60)
  const invalid = Buffer.concat([png.subarray(0,33),injectedChunk('FAKE'),png.subarray(33)])
  assert.throws(() => inspectSpatialScenePixels(invalid), /URAI_VISUAL_PROOF_UNKNOWN_CRITICAL_CHUNK/)
})


test('fully transparent bright RGB cannot masquerade as a visible Life Map', () => {
  const invisible = fixturePng(160, 120, () => true, 4, () => 0)
  assert.throws(() => assertVisibleSpatialScene(invisible), /URAI_VISUAL_SCENE_BLANK/)
})

test('mostly transparent bright RGB below threshold cannot certify a scene', () => {
  const barelyVisible = fixturePng(160, 120, () => true, 4, () => 8)
  assert.throws(() => assertVisibleSpatialScene(barelyVisible), /URAI_VISUAL_SCENE_BLANK/)
})
