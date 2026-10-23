import { inflateSync } from 'node:zlib'
import { pngCrc32 } from '../scripts/visual-png-integrity.mjs'

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

function reconstructedScanlines(bytes) {
  if (!Buffer.isBuffer(bytes) || !bytes.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error('URAI_VISUAL_PROOF_INVALID_PNG_SIGNATURE')
  }
  let offset = 8
  let width = 0
  let height = 0
  let channels = 0
  const compressed = []
  let ended = false
  let idatSectionEnded = false
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset)
    const type = bytes.toString('ascii', offset + 4, offset + 8)
    const start = offset + 8
    const next = start + length + 4
    if (next > bytes.length) throw new Error('URAI_VISUAL_PROOF_TRUNCATED_PNG')
    if (!/^[A-Za-z]{4}$/.test(type)) throw new Error('URAI_VISUAL_PROOF_INVALID_PNG_CHUNK_TYPE')
    if (pngCrc32(bytes.subarray(offset + 4, start + length)) !== bytes.readUInt32BE(start + length)) {
      throw new Error('URAI_VISUAL_PROOF_PNG_CRC_INVALID')
    }
    // A valid chunk checksum alone does not make a valid PNG structure.
    // IHDR is mandatory first; IDAT chunks form one contiguous data section.
    if (offset === 8 && type !== 'IHDR') throw new Error('URAI_VISUAL_PROOF_INVALID_CHUNK_ORDER')
    if (type !== 'IDAT' && compressed.length) idatSectionEnded = true
    if (type === 'IDAT' && idatSectionEnded) throw new Error('URAI_VISUAL_PROOF_INVALID_IDAT_ORDER')
    if (type === 'PLTE' && (compressed.length || !width)) throw new Error('URAI_VISUAL_PROOF_INVALID_CHUNK_ORDER')
    if (!['IHDR', 'IDAT', 'IEND', 'PLTE'].includes(type) && type[0] === type[0].toUpperCase()) {
      throw new Error('URAI_VISUAL_PROOF_UNKNOWN_CRITICAL_CHUNK')
    }
    if (type === 'IHDR') {
      if (length !== 13 || width || height || offset !== 8) throw new Error('URAI_VISUAL_PROOF_INVALID_IHDR')
      width = bytes.readUInt32BE(start)
      height = bytes.readUInt32BE(start + 4)
      const depth = bytes[start + 8]
      const color = bytes[start + 9]
      if (!width || !height || width > 4096 || height > 4096 || width * height > 14_000_000 || depth !== 8 || ![2, 6].includes(color)
        || bytes[start + 10] || bytes[start + 11] || bytes[start + 12]) {
        throw new Error('URAI_VISUAL_PROOF_UNSUPPORTED_PNG_FORMAT')
      }
      channels = color === 6 ? 4 : 3
    } else if (type === 'IDAT') compressed.push(bytes.subarray(start, start + length))
    else if (type === 'IEND') {
      if (length !== 0 || next !== bytes.length) throw new Error('URAI_VISUAL_PROOF_INVALID_IEND')
      ended = true; break
    }
    offset = next
  }
  if (!ended || !compressed.length || !width || !height) throw new Error('URAI_VISUAL_PROOF_MISSING_IMAGE_DATA')
  const stride = width * channels
  const inflated = inflateSync(Buffer.concat(compressed), { maxOutputLength: (stride + 1) * height })
  if (inflated.length !== (stride + 1) * height) throw new Error('URAI_VISUAL_PROOF_INVALID_SCANLINE_BYTES')
  const rows = []
  let previous = Buffer.alloc(stride)
  let index = 0
  for (let y = 0; y < height; y++) {
    const filter = inflated[index++]
    if (filter > 4) throw new Error('URAI_VISUAL_PROOF_UNSUPPORTED_PNG_FILTER')
    const row = Buffer.allocUnsafe(stride)
    for (let i = 0; i < stride; i++) {
      const raw = inflated[index++]
      const a = i >= channels ? row[i - channels] : 0
      const b = previous[i]
      const c = i >= channels ? previous[i - channels] : 0
      let predictor = 0
      if (filter === 1) predictor = a
      else if (filter === 2) predictor = b
      else if (filter === 3) predictor = Math.floor((a + b) / 2)
      else if (filter === 4) {
        const p = a + b - c
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c)
        predictor = pa <= pb && pa <= pc ? a : pb <= pc ? b : c
      }
      row[i] = (raw + predictor) & 255
    }
    rows.push(row)
    previous = row
  }
  return { width, height, channels, rows }
}

/** Negative blank-scene detector, never independent artistic acceptance.
 * Central crop excludes route controls and tests captured pixels, not hashes. */
export function inspectSpatialScenePixels(png, { threshold = 48, minimumBrightFraction = 0.0015 } = {}) {
  const { width, height, channels, rows } = reconstructedScanlines(png)
  const left = Math.floor(width * 0.20), right = Math.ceil(width * 0.80)
  const top = Math.floor(height * 0.28), bottom = Math.ceil(height * 0.72)
  let bright = 0, sampled = 0
  for (let y = top; y < bottom; y++) {
    const row = rows[y]
    for (let x = left; x < right; x++) {
      const i = x * channels
      // RGB in a transparent PNG pixel is not rendered light. Compare only
      // alpha-composited brightness over a black canvas (the conservative
      // visibility baseline for screenshots of the spatial environment).
      const alpha = channels === 4 ? row[i + 3] / 255 : 1
      if (Math.max(row[i], row[i + 1], row[i + 2]) * alpha >= threshold) bright++
      sampled++
    }
  }
  const brightFraction = bright / sampled
  return { width, height, brightPixels: bright, sampledPixels: sampled, brightFraction, passes: brightFraction >= minimumBrightFraction }
}

export function assertVisibleSpatialScene(png, options) {
  const proof = inspectSpatialScenePixels(png, options)
  if (!proof.passes) {
    throw new Error(`URAI_VISUAL_SCENE_BLANK: ${proof.brightPixels}/${proof.sampledPixels} center pixels (fraction=${proof.brightFraction.toFixed(6)}) exceed visibility threshold; rendered pixels require review`)
  }
  return proof
}
