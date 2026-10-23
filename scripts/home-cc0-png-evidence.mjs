// Verify a real Chromium PNG raster, not only an HTTP 200 or byte count.
// Pure Node 22; no network, shader mock, provider, or extra dependency.
import { inflateSync } from 'node:zlib'

const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
const MAX_PIXELS = 4096 * 4096
const MAX_COMPRESSED = 32 * 1024 * 1024

function fail(reason, dimensions = {}) {
  return { passed: false, reason, ...dimensions }
}
function paeth(a, b, c) {
  const p = a + b - c
  const da = Math.abs(p - a), db = Math.abs(p - b), dc = Math.abs(p - c)
  return da <= db && da <= dc ? a : db <= dc ? b : c
}

export function inspectHomeScreenshotPng(bytes, expectedWidth, expectedHeight) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 90 || !bytes.subarray(0, 8).equals(SIGNATURE)) {
    return fail('NOT_PNG_BYTES')
  }
  if (!Number.isSafeInteger(expectedWidth) || !Number.isSafeInteger(expectedHeight) || expectedWidth < 1 || expectedHeight < 1) {
    return fail('INVALID_EXPECTED_VIEWPORT')
  }
  try {
    let offset = 8, width = 0, height = 0, stride = 0, bpp = 0, seenHeader = false, seenEnd = false
    let compressedLength = 0
    const idat = []
    while (offset + 12 <= bytes.length) {
      const length = bytes.readUInt32BE(offset)
      const end = offset + 12 + length
      if (end > bytes.length) return fail('TRUNCATED_PNG_CHUNK')
      const type = bytes.toString('ascii', offset + 4, offset + 8)
      const payload = bytes.subarray(offset + 8, offset + 8 + length)
      if (!seenHeader && type !== 'IHDR') return fail('MISSING_INITIAL_IHDR')
      if (type === 'IHDR') {
        if (seenHeader || length !== 13) return fail('INVALID_IHDR')
        seenHeader = true
        width = payload.readUInt32BE(0)
        height = payload.readUInt32BE(4)
        const depth = payload[8], colorType = payload[9], compression = payload[10], filter = payload[11], interlace = payload[12]
        if (width !== expectedWidth || height !== expectedHeight) return fail('WRONG_SCREENSHOT_VIEWPORT', { width, height })
        if (!width || !height || width * height > MAX_PIXELS) return fail('OVERSIZE_SCREENSHOT')
        if (depth !== 8 || ![2, 6].includes(colorType) || compression !== 0 || filter !== 0 || interlace !== 0) {
          return fail('UNSUPPORTED_PNG_RASTER')
        }
        bpp = colorType === 6 ? 4 : 3
        stride = width * bpp
      } else if (type === 'IDAT') {
        compressedLength += length
        if (compressedLength > MAX_COMPRESSED) return fail('COMPRESSED_PNG_TOO_LARGE')
        idat.push(payload)
      } else if (type === 'IEND') {
        if (length !== 0) return fail('INVALID_IEND')
        seenEnd = true
        if (end !== bytes.length) return fail('TRAILING_PNG_BYTES')
        break
      }
      offset = end
    }
    if (!seenHeader || !seenEnd || idat.length < 1) return fail('INCOMPLETE_PNG_STRUCTURE')
    const needed = (stride + 1) * height
    const pixels = inflateSync(Buffer.concat(idat, compressedLength), { maxOutputLength: needed + 1 })
    if (pixels.length !== needed) return fail('INCOMPLETE_PNG_RASTER')
    const previous = Buffer.alloc(stride), current = Buffer.alloc(stride)
    const samples = new Set()
    let minimumLuma = 255, maximumLuma = 0, sampledPixels = 0
    const rowStep = Math.max(1, Math.floor(height / 28))
    const colStep = Math.max(1, Math.floor(width / 48))
    for (let y = 0; y < height; y++) {
      const start = y * (stride + 1)
      const filter = pixels[start]
      if (filter > 4) return fail('INVALID_PNG_ROW_FILTER')
      for (let i = 0; i < stride; i++) {
        const a = i >= bpp ? current[i - bpp] : 0
        const b = previous[i]
        const c = i >= bpp ? previous[i - bpp] : 0
        const raw = pixels[start + 1 + i]
        const residual = filter === 0 ? 0 : filter === 1 ? a : filter === 2 ? b : filter === 3 ? Math.floor((a + b) / 2) : paeth(a, b, c)
        current[i] = (raw + residual) & 255
      }
      if (y % rowStep === 0) {
        for (let x = 0; x < width; x += colStep) {
          const i = x * bpp
          const r = current[i], g = current[i + 1], b = current[i + 2]
          samples.add(((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3))
          const luma = Math.round((54 * r + 183 * g + 19 * b) / 256)
          minimumLuma = Math.min(minimumLuma, luma)
          maximumLuma = Math.max(maximumLuma, luma)
          sampledPixels++
        }
      }
      previous.set(current)
    }
    const evidence = { width, height, sampledPixels, quantizedColors: samples.size, luminanceRange: maximumLuma - minimumLuma }
    if (samples.size < 24 || evidence.luminanceRange < 10) return fail('FLAT_OR_EMPTY_RENDER_FRAME', evidence)
    return { passed: true, reason: 'PNG_RASTER_WITH_VISIBLE_VARIATION', ...evidence }
  } catch (error) {
    return fail('PNG_DECODE_ERROR:' + (error?.code || error?.message || 'UNKNOWN'))
  }
}
