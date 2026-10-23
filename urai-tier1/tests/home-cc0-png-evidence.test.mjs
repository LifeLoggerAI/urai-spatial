import assert from 'node:assert/strict'
import test from 'node:test'
import { deflateSync } from 'node:zlib'
import { inspectHomeScreenshotPng } from '../../scripts/home-cc0-png-evidence.mjs'
function chunk(type, payload) {
  const header = Buffer.alloc(8)
  header.writeUInt32BE(payload.length, 0)
  header.write(type, 4, 4, 'ascii')
  // Fixture CRC is unused by the decoder. A screenshot is only one item
  // in broader scene / asset / camera evidence, never final approval.
  return Buffer.concat([header, payload, Buffer.alloc(4)])
}
function fixture(width, height, flat = false, filterMode = 0) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8; ihdr[9] = 2
  const scanlines = []
  for (let y = 0; y < height; y++) {
    const line = Buffer.alloc(1 + width * 3)
    line[0] = filterMode
    for (let x = 0; x < width; x++) {
      const i = 1 + x * 3
      line[i] = flat ? 31 : (x * 11 + y * 5) % 256
      line[i+1] = flat ? 31 : (x * 3 + y * 13) % 256
      line[i+2] = flat ? 31 : (x * 7 + y * 17) % 256
    }
    scanlines.push(line)
  }
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(Buffer.concat(scanlines))), chunk('IEND', Buffer.alloc(0))])
}
test('actual sized PNG raster with visible variation is eligible for further evidence checks', () => {
  const result = inspectHomeScreenshotPng(fixture(96,80),96,80)
  assert.equal(result.passed,true,JSON.stringify(result))
  assert.ok(result.quantizedColors>=24)
})
test('flat, unvarying screenshot cannot prove Home pixels', () => {
  const result=inspectHomeScreenshotPng(fixture(96,80,true),96,80)
  assert.equal(result.passed,false)
  assert.equal(result.reason,'FLAT_OR_EMPTY_RENDER_FRAME')
})
test('wrong viewport, corrupt bytes, incomplete PNG, and invalid filters fail closed', () => {
  assert.equal(inspectHomeScreenshotPng(fixture(96,80),1024,720).reason,'WRONG_SCREENSHOT_VIEWPORT')
  assert.equal(inspectHomeScreenshotPng(Buffer.alloc(5000,1),96,80).reason,'NOT_PNG_BYTES')
  const png=fixture(96,80)
  assert.equal(inspectHomeScreenshotPng(png.subarray(0,png.length-12),96,80).passed,false)
  assert.equal(inspectHomeScreenshotPng(fixture(96,80,false,7),96,80).reason,'INVALID_PNG_ROW_FILTER')
})
test('nonsensical dimensions fail before PNG decompression', () => {
  assert.equal(inspectHomeScreenshotPng(fixture(96,80),0,80).reason,'INVALID_EXPECTED_VIEWPORT')
})
