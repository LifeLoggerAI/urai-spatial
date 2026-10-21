import assert from 'node:assert/strict'
import test from 'node:test'
import { deflateSync } from 'node:zlib'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { inspectVisualPng, pngCrc32 } from '../scripts/visual-png-integrity.mjs'

function chunk(name, content) {
  const data = Buffer.alloc(12 + content.length)
  data.writeUInt32BE(content.length, 0)
  data.write(name, 4, 4, 'ascii')
  content.copy(data, 8)
  data.writeUInt32BE(pngCrc32(data.subarray(4, data.length - 4)), data.length - 4)
  return data
}
function validPng() {
  const width = 390, height = 844
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8; ihdr[9] = 6
  const raw = Buffer.alloc((width * 4 + 1) * height)
  for (let row = 0; row < height; row++) {
    raw[row * (width * 4 + 1)] = 0
    for (let col = 0; col < width * 4; col++) raw[row * (width * 4 + 1) + col + 1] = (col * 29 + row * 31) & 255
  }
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
}
function fixture(fn) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'urai-png-integrity-'))
  const file = path.join(dir, 'capture.png')
  try { fn(file) } finally { rmSync(dir, {recursive:true, force:true}) }
}
test('actual encoded PNG has intact chunks, viewport dimensions and digest', () => fixture(file => {
  writeFileSync(file, validPng())
  const result = inspectVisualPng(file)
  assert.equal(result.ok, true, JSON.stringify(result))
  assert.equal(result.width, 390)
  assert.equal(result.height, 844)
  assert.match(result.sha256, /^[0-9a-f]{64}$/)
}))
test('non-image and corrupted screenshot bytes are never accepted', () => fixture(file => {
  writeFileSync(file, Buffer.alloc(4096, 137))
  assert.equal(inspectVisualPng(file).ok, false)
  const corrupt = validPng()
  corrupt[60] ^= 1
  writeFileSync(file, corrupt)
  assert.equal(inspectVisualPng(file).reason, 'PNG_CHUNK_CRC_INVALID')
}))
test('truncated or appended screenshot bytes fail closed', () => fixture(file => {
  const png = validPng()
  writeFileSync(file, png.subarray(0, png.length - 12))
  assert.equal(inspectVisualPng(file).ok, false)
  writeFileSync(file, Buffer.concat([png, Buffer.from([1])]))
  assert.equal(inspectVisualPng(file).reason, 'PNG_INVALID_END')
}))
test('missing screenshot fails closed', () => fixture(file => {
  assert.equal(inspectVisualPng(file).reason, 'PNG_UNREADABLE')
}))

test('CRC-correct corrupt compressed image must fail', () => fixture(file => {
  const png = validPng()
  const idat = png.indexOf(Buffer.from('IDAT'))
  const length = png.readUInt32BE(idat - 4)
  const before = png.subarray(0, idat - 4)
  const damaged = chunk('IDAT', Buffer.alloc(length, 37))
  writeFileSync(file, Buffer.concat([before, damaged, chunk('IEND', Buffer.alloc(0))]))
  assert.equal(inspectVisualPng(file).reason, 'PNG_IMAGE_DECOMPRESSION_FAILED')
}))
test('CRC-correct invalid filter scanline must fail', () => fixture(file => {
  const width = 390, height = 844
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8; ihdr[9] = 6
  const rows = Buffer.alloc((width * 4 + 1) * height)
  rows[8 * (width * 4 + 1)] = 5
  writeFileSync(file, Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(rows)), chunk('IEND', Buffer.alloc(0))]))
  assert.equal(inspectVisualPng(file).reason, 'PNG_IMAGE_ROW_FILTER_INVALID')
}))
test('CRC-correct valid zlib payload with missing pixel rows fails', () => fixture(file => {
  const width = 390, height = 844
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8; ihdr[9] = 6
  writeFileSync(file, Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(Buffer.alloc(12))),
    chunk('IEND', Buffer.alloc(0))]))
  assert.equal(inspectVisualPng(file).reason, 'PNG_IMAGE_ROW_LENGTH_INVALID')
}))

test('uniform opaque black PNG must not count as rendered visual evidence', () => fixture(file => {
  const width = 390, height = 844
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8; ihdr[9] = 6
  const raw = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) raw[y * (width * 4 + 1) + 1 + x * 4 + 3] = 255
  }
  writeFileSync(file, Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]))
  assert.equal(inspectVisualPng(file).reason, 'PNG_UNIFORM_PIXEL_CONTENT')
}))

test('PNG filter Sub cannot hide a uniform black scene from the pixel guard', () => fixture(file => {
  const width = 390, height = 844
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8; ihdr[9] = 6
  const stride = width * 4 + 1
  const raw = Buffer.alloc(stride * height)
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 1
    raw[y * stride + 4] = 255 // first pixel alpha, subsequent pixels filter to zero
  }
  writeFileSync(file, Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]))
  assert.equal(inspectVisualPng(file).reason, 'PNG_UNIFORM_PIXEL_CONTENT')
}))

test('one real distinct pixel prevents false uniform-image rejection', () => fixture(file => {
  const width = 390, height = 844
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8; ihdr[9] = 6
  const raw = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) raw[y * (width * 4 + 1) + 1 + x * 4 + 3] = 255
  }
  raw[499] = 1 // a genuine blue-channel pixel; byte 500 was alpha-only variation
  writeFileSync(file, Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]))
  assert.equal(inspectVisualPng(file).ok, true)
}))

// All five PNG filter algorithms must distinguish actual decoded pixel
// variation, not compare compressed scanline bytes or encoded filter deltas.
function filteredCapture(filter, channels, differ) {
  const width = 320, height = 200
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8; ihdr[9] = channels === 3 ? 2 : 6
  const pixels = Buffer.alloc(width * height * channels)
  for (let i = 0; i < width * height; i++) {
    pixels[i * channels] = 7
    pixels[i * channels + 1] = 13
    pixels[i * channels + 2] = 19
    if (channels === 4) pixels[i * channels + 3] = 255
  }
  if (differ) pixels[(width * 3 + 17) * channels + 1] = 20
  const rowBytes = width * channels
  const raw = Buffer.alloc((rowBytes + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (rowBytes + 1)] = filter
    for (let i = 0; i < rowBytes; i++) {
      const pos = y * rowBytes + i
      const left = i >= channels ? pixels[pos - channels] : 0
      const above = y > 0 ? pixels[pos - rowBytes] : 0
      const upperLeft = y > 0 && i >= channels ? pixels[pos - rowBytes - channels] : 0
      let predictor = 0
      if (filter === 1) predictor = left
      if (filter === 2) predictor = above
      if (filter === 3) predictor = Math.floor((left + above) / 2)
      if (filter === 4) {
        const p = left + above - upperLeft
        const a = Math.abs(p - left), b = Math.abs(p - above), c = Math.abs(p - upperLeft)
        predictor = a <= b && a <= c ? left : b <= c ? above : upperLeft
      }
      raw[y * (rowBytes + 1) + i + 1] = (pixels[pos] - predictor + 256) & 255
    }
  }
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
}
for (const channels of [3, 4]) for (const filter of [0, 1, 2, 3, 4]) {
  test(`PNG filter ${filter}, ${channels === 3 ? 'RGB' : 'RGBA'}: rejects flat pixels and admits varied pixels`, () => fixture(file => {
    writeFileSync(file, filteredCapture(filter, channels, false))
    assert.equal(inspectVisualPng(file).reason, 'PNG_UNIFORM_PIXEL_CONTENT')
    writeFileSync(file, filteredCapture(filter, channels, true))
    assert.equal(inspectVisualPng(file).ok, true)
  }))
}

function rgbaAlphaVariationPng(visibleColorVariation) {
  const width = 320, height = 200
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8; ihdr[9] = 6
  const stride = width * 4 + 1
  const raw = Buffer.alloc(stride * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixel = y * stride + 1 + x * 4
      raw[pixel + 3] = x % 2 === 0 ? 255 : 0
      if (visibleColorVariation && x === 15 && y === 15) {
        raw[pixel] = 255
        raw[pixel + 3] = 255
      }
    }
  }
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
}
test('alpha-only changes in black RGBA PNG cannot masquerade as visible pixels', () => fixture(file => {
  writeFileSync(file, rgbaAlphaVariationPng(false))
  assert.equal(inspectVisualPng(file).reason, 'PNG_UNIFORM_PIXEL_CONTENT')
}))
test('alpha-composited RGB variation is retained as visible content', () => fixture(file => {
  writeFileSync(file, rgbaAlphaVariationPng(true))
  assert.equal(inspectVisualPng(file).ok, true)
}))
