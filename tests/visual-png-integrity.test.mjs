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
