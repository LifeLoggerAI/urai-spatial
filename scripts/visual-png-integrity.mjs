import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
const MAX_PNG_BYTES = 128 * 1024 * 1024

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

/** Confirm a screenshot is a bounded, structurally valid PNG with intact chunks.
 * This is evidence-byte integrity, NOT proof of real rendering or art approval.
 */
export function inspectVisualPng(file) {
  const reject = (reason) => ({ ok: false, reason })
  let bytes
  try { bytes = readFileSync(file) } catch { return reject('PNG_UNREADABLE') }
  if (bytes.length < 64 || bytes.length > MAX_PNG_BYTES ||
      !bytes.subarray(0, 8).equals(PNG_SIGNATURE)) return reject('PNG_SIGNATURE_OR_SIZE_INVALID')
  let offset = 8
  let width = 0, height = 0, chunks = 0, sawIdat = false, sawIend = false
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
      if (width < 320 || height < 200 || width > 20000 || height > 60000 ||
          bytes[offset + 18] !== 0 || bytes[offset + 19] !== 0 || bytes[offset + 20] > 1)
        return reject('PNG_DIMENSIONS_OR_FORMAT_INVALID')
    } else if (type === 'IHDR') return reject('PNG_DUPLICATE_IHDR')
    if (type === 'IDAT') {
      if (length === 0) return reject('PNG_EMPTY_IDAT')
      sawIdat = true
    }
    offset = dataEnd + 4
    chunks++
    if (type === 'IEND') {
      if (length !== 0 || offset !== bytes.length) return reject('PNG_INVALID_END')
      sawIend = true
      break
    }
  }
  if (!sawIdat || !sawIend) return reject('PNG_IMAGE_DATA_OR_END_MISSING')
  return { ok: true, width, height, bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex') }
}
