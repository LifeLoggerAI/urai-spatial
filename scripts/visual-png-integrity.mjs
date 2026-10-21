import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { inflateSync } from 'node:zlib'

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
const MAX_PNG_BYTES = 128 * 1024 * 1024
const MAX_DECODED_BYTES = 96 * 1024 * 1024

/** PNG CRC-32: verify each encoded chunk rather than trusting a file extension. */
export function pngCrc32(input) {
  let crc = 0xffffffff
  for (const byte of input) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

/** The PNG filter bytes are deltas, not pixels. Restore only as many rows
 * as needed to prove screenshot pixels are not identical after RGBA is
 * composited against black. Alpha-only variation of black pixels is invisible
 * and cannot qualify as a genuine rendered scene.
 * This guards a basic no-render case, not artistic quality or browser origin.
 */
function hasPixelVariation(decoded, width, height, channels) {
  const rowBytes = width * channels
  const stride = rowBytes + 1
  let previous = Buffer.alloc(rowBytes)
  let current = Buffer.alloc(rowBytes)
  let baselineRed = -1, baselineGreen = 0, baselineBlue = 0
  for (let y = 0; y < height; y++) {
    const filter = decoded[y * stride]
    const start = y * stride + 1
    for (let x = 0; x < rowBytes; x++) {
      const left = x >= channels ? current[x - channels] : 0
      const above = previous[x]
      const upperLeft = x >= channels ? previous[x - channels] : 0
      let predictor = 0
      if (filter === 1) predictor = left
      else if (filter === 2) predictor = above
      else if (filter === 3) predictor = Math.floor((left + above) / 2)
      else if (filter === 4) {
        const p = left + above - upperLeft
        const a = Math.abs(p - left), b = Math.abs(p - above), c = Math.abs(p - upperLeft)
        predictor = a <= b && a <= c ? left : b <= c ? above : upperLeft
      }
      current[x] = (decoded[start + x] + predictor) & 255
      if (x % channels === channels - 1) {
        const pixelStart = x - channels + 1
        // Compare visible RGB samples rather than raw alpha. Transparent
        // black pixels with changing opacity still produce a black screenshot.
        const alpha = channels === 4 ? current[x] / 255 : 1
        const red = Math.round(current[pixelStart] * alpha)
        const green = Math.round(current[pixelStart + 1] * alpha)
        const blue = Math.round(current[pixelStart + 2] * alpha)
        if (baselineRed === -1) {
          baselineRed = red; baselineGreen = green; baselineBlue = blue
        } else if (red !== baselineRed || green !== baselineGreen || blue !== baselineBlue) {
          return true
        }
      }
    }
    ;[previous, current] = [current, previous]
  }
  return false
}

/** Confirm a bounded Playwright RGB/RGBA PNG fully decodes to scanlines.
 * Valid image bytes do not establish browser provenance or artistic approval.
 */
export function inspectVisualPng(file) {
  const reject = (reason) => ({ ok: false, reason })
  let bytes
  try { bytes = readFileSync(file) } catch { return reject('PNG_UNREADABLE') }
  if (bytes.length < 64 || bytes.length > MAX_PNG_BYTES ||
      !bytes.subarray(0, 8).equals(PNG_SIGNATURE)) return reject('PNG_SIGNATURE_OR_SIZE_INVALID')
  let offset = 8
  let width = 0, height = 0, channels = 0
  let chunks = 0, sawIdat = false, sawIend = false, afterIdat = false
  const imageData = []
  while (offset < bytes.length) {
    if (offset + 12 > bytes.length) return reject('PNG_CHUNK_TRUNCATED')
    const length = bytes.readUInt32BE(offset)
    const type = bytes.toString('ascii', offset + 4, offset + 8)
    const dataEnd = offset + 8 + length
    if (!/^[A-Za-z]{4}$/.test(type) || dataEnd + 4 > bytes.length)
      return reject('PNG_CHUNK_BOUNDARY_INVALID')
    if (pngCrc32(bytes.subarray(offset + 4, dataEnd)) !== bytes.readUInt32BE(dataEnd))
      return reject('PNG_CHUNK_CRC_INVALID')
    if (chunks === 0) {
      if (type !== 'IHDR' || length !== 13) return reject('PNG_IHDR_MISSING')
      width = bytes.readUInt32BE(offset + 8)
      height = bytes.readUInt32BE(offset + 12)
      const bitDepth = bytes[offset + 16]
      const colorType = bytes[offset + 17]
      channels = colorType === 2 ? 3 : colorType === 6 ? 4 : 0
      if (width < 320 || height < 200 || width > 20000 || height > 60000 ||
          bitDepth !== 8 || !channels ||
          bytes[offset + 18] !== 0 || bytes[offset + 19] !== 0 || bytes[offset + 20] !== 0)
        return reject('PNG_DIMENSIONS_OR_FORMAT_INVALID')
      if ((width * channels + 1) * height > MAX_DECODED_BYTES)
        return reject('PNG_DECODE_BUDGET_EXCEEDED')
    } else if (type === 'IHDR') return reject('PNG_DUPLICATE_IHDR')
    if (type === 'IDAT') {
      if (length === 0 || afterIdat) return reject('PNG_INVALID_IDAT_ORDER')
      sawIdat = true
      imageData.push(bytes.subarray(offset + 8, dataEnd))
    } else if (sawIdat && type !== 'IEND') {
      afterIdat = true
    }
    // Unknown mandatory PNG critical chunks cannot be safely ignored.
    if (type !== 'IHDR' && type !== 'IDAT' && type !== 'IEND' &&
        type[0] === type[0].toUpperCase() && type !== 'PLTE')
      return reject('PNG_UNKNOWN_CRITICAL_CHUNK')
    offset = dataEnd + 4
    chunks++
    if (type === 'IEND') {
      if (length !== 0 || offset !== bytes.length) return reject('PNG_INVALID_END')
      sawIend = true
      break
    }
  }
  if (!sawIdat || !sawIend) return reject('PNG_IMAGE_DATA_OR_END_MISSING')

  let decoded
  try {
    decoded = inflateSync(Buffer.concat(imageData), { maxOutputLength: MAX_DECODED_BYTES })
  } catch { return reject('PNG_IMAGE_DECOMPRESSION_FAILED') }
  const stride = width * channels + 1
  if (decoded.length !== stride * height) return reject('PNG_IMAGE_ROW_LENGTH_INVALID')
  for (let row = 0; row < height; row++) {
    if (decoded[row * stride] > 4) return reject('PNG_IMAGE_ROW_FILTER_INVALID')
  }
  if (!hasPixelVariation(decoded, width, height, channels))
    return reject('PNG_UNIFORM_PIXEL_CONTENT')
  return { ok: true, width, height, bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex') }
}
