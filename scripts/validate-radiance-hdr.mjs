#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const manifest = JSON.parse(
  fs.readFileSync(path.join(root, 'operations/assets/launch-critical-assets.json'), 'utf8'),
)

const hdrAssets = manifest.assets.filter((asset) => asset.kind === 'hdr')

const results = hdrAssets.map((asset) => {
  const filePath = path.join(root, asset.fixedPath)
  if (!fs.existsSync(filePath)) throw new Error(`${asset.id}: missing HDR file ${asset.fixedPath}`)
  const payload = fs.readFileSync(filePath)
  const decoded = decodeRadianceHdr(payload)

  if (asset.targetResolution) {
    const [expectedWidth, expectedHeight] = asset.targetResolution
    if (decoded.width !== expectedWidth || decoded.height !== expectedHeight) {
      throw new Error(
        `${asset.id}: decoded ${decoded.width}x${decoded.height}, expected ${expectedWidth}x${expectedHeight}`,
      )
    }
  }

  if (asset.maxBytes && payload.length > asset.maxBytes) {
    throw new Error(`${asset.id}: ${payload.length} bytes exceeds ${asset.maxBytes}`)
  }

  return {
    id: asset.id,
    path: asset.fixedPath,
    bytes: payload.length,
    width: decoded.width,
    height: decoded.height,
    scanlines: decoded.scanlines,
    decodedChannelBytes: decoded.decodedChannelBytes,
  }
})

console.log(JSON.stringify({ ok: true, hdrCount: results.length, results }, null, 2))

function decodeRadianceHdr(payload) {
  const headerEnd = payload.indexOf(Buffer.from('\n\n'))
  if (headerEnd < 0) throw new Error('Radiance header terminator is missing')

  const header = payload.subarray(0, headerEnd).toString('ascii')
  if (!header.startsWith('#?RADIANCE')) throw new Error('Invalid Radiance signature')
  if (!header.includes('FORMAT=32-bit_rle_rgbe')) {
    throw new Error('Radiance FORMAT must be 32-bit_rle_rgbe')
  }

  const resolutionStart = headerEnd + 2
  const resolutionEnd = payload.indexOf(0x0a, resolutionStart)
  if (resolutionEnd < 0) throw new Error('Radiance resolution line is missing')
  const resolutionLine = payload.subarray(resolutionStart, resolutionEnd).toString('ascii').trim()
  const match = resolutionLine.match(/^-Y\s+(\d+)\s+\+X\s+(\d+)$/)
  if (!match) throw new Error(`Unsupported Radiance resolution/orientation: ${resolutionLine}`)

  const height = Number(match[1])
  const width = Number(match[2])
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 8 || width > 0x7fff || height < 1) {
    throw new Error(`Invalid Radiance dimensions ${width}x${height}`)
  }

  let offset = resolutionEnd + 1
  let decodedChannelBytes = 0

  for (let scanline = 0; scanline < height; scanline += 1) {
    requireBytes(payload, offset, 4, `scanline ${scanline} header`)
    if (payload[offset] !== 2 || payload[offset + 1] !== 2) {
      throw new Error(`scanline ${scanline}: missing modern Radiance RLE marker`)
    }
    const encodedWidth = (payload[offset + 2] << 8) | payload[offset + 3]
    if (encodedWidth !== width) {
      throw new Error(`scanline ${scanline}: encoded width ${encodedWidth} does not match ${width}`)
    }
    offset += 4

    for (let channel = 0; channel < 4; channel += 1) {
      let written = 0
      while (written < width) {
        requireBytes(payload, offset, 1, `scanline ${scanline} channel ${channel} packet`)
        const count = payload[offset]
        offset += 1
        if (count === 0) throw new Error(`scanline ${scanline} channel ${channel}: zero-length packet`)

        if (count > 128) {
          const runLength = count - 128
          requireBytes(payload, offset, 1, `scanline ${scanline} channel ${channel} run value`)
          offset += 1
          written += runLength
        } else {
          const literalLength = count
          requireBytes(payload, offset, literalLength, `scanline ${scanline} channel ${channel} literal`)
          offset += literalLength
          written += literalLength
        }

        if (written > width) {
          throw new Error(`scanline ${scanline} channel ${channel}: decoded past scanline width`)
        }
      }
      decodedChannelBytes += written
    }
  }

  if (offset !== payload.length) {
    throw new Error(`Radiance payload has ${payload.length - offset} trailing byte(s)`)
  }

  return { width, height, scanlines: height, decodedChannelBytes }
}

function requireBytes(payload, offset, length, label) {
  if (offset + length > payload.length) throw new Error(`${label}: truncated payload`)
}
