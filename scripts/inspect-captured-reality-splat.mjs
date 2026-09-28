#!/usr/bin/env node
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// The installed Drei Splat loader consumes 32-byte little-endian records:
// xyz float32, scale xyz float32, RGBA uint8, quaternion wxyz uint8.
// This is a technical preflight, never source/visual/privacy acceptance.
export function inspectSplat(file, { maxBytes, maxPoints }) {
  for (const [name, value] of Object.entries({ maxBytes, maxPoints })) {
    if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${name} must be a positive safe integer`)
  }
  const fd = fs.openSync(file, 'r')
  try {
    const before = fs.fstatSync(fd)
    if (!before.isFile()) throw new Error('Splat input must be a regular file')
    if (before.size === 0 || before.size % 32 !== 0) throw new Error('Splat must contain complete nonempty 32-byte records')
    if (before.size > maxBytes || before.size / 32 > maxPoints) throw new Error('Splat exceeds the explicit device byte/point budget')
    const hash = crypto.createHash('sha256')
    const buffer = Buffer.alloc(32 * 32768)
    const minimum = [Infinity, Infinity, Infinity]
    const maximum = [-Infinity, -Infinity, -Infinity]
    let visiblePoints = 0
    let cursor = 0
    while (cursor < before.size) {
      const wanted = Math.min(buffer.length, before.size - cursor)
      let read = 0
      while (read < wanted) {
        const count = fs.readSync(fd, buffer, read, wanted - read, cursor + read)
        if (!count) throw new Error('Splat changed or was truncated during inspection')
        read += count
      }
      hash.update(buffer.subarray(0, wanted))
      for (let offset = 0; offset < wanted; offset += 32) {
        const index = (cursor + offset) / 32
        for (let axis = 0; axis < 3; axis++) {
          const position = buffer.readFloatLE(offset + axis * 4)
          const scale = buffer.readFloatLE(offset + 12 + axis * 4)
          if (!Number.isFinite(position)) throw new Error(`Point ${index}: non-finite position`)
          if (!Number.isFinite(scale) || scale <= 0 || !Number.isFinite(Math.fround(scale * scale)) || Math.fround(scale * scale) === 0) throw new Error(`Point ${index}: invalid scale`)
          minimum[axis] = Math.min(minimum[axis], position)
          maximum[axis] = Math.max(maximum[axis], position)
        }
        let normSquared = 0
        for (let axis = 0; axis < 4; axis++) normSquared += ((buffer[offset + 28 + axis] - 128) / 128) ** 2
        // Quantization of a unit quaternion to uint8 introduces small error.
        if (normSquared < .9 ** 2 || normSquared > 1.1 ** 2) throw new Error(`Point ${index}: invalid quantized unit quaternion`)
        if (buffer[offset + 27] > 0) visiblePoints++
      }
      cursor += wanted
    }
    if (!visiblePoints) throw new Error('Splat contains no nontransparent points')
    const after = fs.fstatSync(fd)
    if (after.size !== before.size || after.mtimeMs !== before.mtimeMs || after.ctimeMs !== before.ctimeMs) throw new Error('Splat changed during inspection')
    return {
      schemaVersion: 'urai-captured-reality-splat-integrity-1',
      classification: 'TECHNICAL_BINARY_VALIDATION_ONLY',
      byteSize: cursor,
      pointCount: cursor / 32,
      visiblePoints,
      sha256: hash.digest('hex'),
      centerBounds: { minimum, maximum },
      budgets: { maxBytes, maxPoints },
      sourceAuthenticityVerified: false,
      visualAcceptanceEstablished: false,
      devicePerformanceCertified: false,
      launchReady: false,
    }
  } finally {
    fs.closeSync(fd)
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [file, maxBytes, maxPoints, receipt] = process.argv.slice(2)
    if (!file || !maxBytes || !maxPoints || !receipt || process.argv.length !== 6) {
      throw new Error('usage: inspect-captured-reality-splat.mjs <file.splat> <max-bytes> <max-points> <new-receipt.json>')
    }
    if (path.resolve(file) === path.resolve(receipt)) throw new Error('Receipt must not replace the source')
    const result = inspectSplat(file, { maxBytes: Number(maxBytes), maxPoints: Number(maxPoints) })
    fs.writeFileSync(receipt, JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o600 })
    console.log(JSON.stringify({ ok: true, classification: result.classification, pointCount: result.pointCount }))
  } catch (error) {
    console.error(JSON.stringify({ ok: false, error: error.message }))
    process.exitCode = 1
  }
}
