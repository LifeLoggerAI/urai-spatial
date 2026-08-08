#!/usr/bin/env node
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()
const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, 'operations/assets/launch-critical-assets.json'), 'utf8'))
const receiptRoot = path.join(repoRoot, manifest.receiptRoot)

for (const asset of manifest.assets) {
  const absolutePath = path.join(repoRoot, asset.fixedPath)
  if (!fs.existsSync(absolutePath)) throw new Error(`Missing generated asset: ${asset.fixedPath}`)

  // Passport is produced and governed by its dedicated ownership-vault lane.
  // Candidate-forge normalization must not rewrite that retained binary or its receipt.
  if (asset.id === 'passport-status-room-v1') continue

  if (asset.kind === 'model') {
    const repaired = repairGlb(fs.readFileSync(absolutePath))
    fs.writeFileSync(absolutePath, repaired.payload)
    rewriteReceipt(asset, absolutePath, {
      triangleCount: repaired.triangleCount,
      boundsMeters: repaired.boundsMeters,
      repairedEulerRotations: repaired.repairedEulerRotations,
    })
  } else if (asset.kind === 'hdr') {
    const [width, height] = asset.targetResolution ?? [2048, 1024]
    const payload = makeRadianceHdrRle(width, height)
    fs.writeFileSync(absolutePath, payload)
    rewriteReceipt(asset, absolutePath, { resolution: [width, height] })
  } else {
    rewriteReceipt(asset, absolutePath, measureNonModel(asset, fs.readFileSync(absolutePath)))
  }
}

const receipts = manifest.assets.map((asset) => JSON.parse(fs.readFileSync(path.join(receiptRoot, `${asset.id}.json`), 'utf8')))
const summary = {
  manifestId: manifest.manifestId,
  generatedAt: new Date().toISOString(),
  candidateOnly: true,
  normalized: true,
  assetCount: receipts.length,
  totalBytes: receipts.reduce((sum, item) => sum + item.bytes, 0),
  assets: receipts.map(({ id, fixedPath, bytes, sha256, measured }) => ({ id, fixedPath, bytes, sha256, measured })),
}
fs.writeFileSync(path.join(receiptRoot, 'forge-summary.json'), `${JSON.stringify(summary, null, 2)}\n`)
console.log(JSON.stringify({ ok: true, normalizedAssets: receipts.length, totalBytes: summary.totalBytes }, null, 2))

function rewriteReceipt(asset, absolutePath, measured) {
  const payload = fs.readFileSync(absolutePath)
  const receiptPath = path.join(receiptRoot, `${asset.id}.json`)
  const previous = fs.existsSync(receiptPath) ? JSON.parse(fs.readFileSync(receiptPath, 'utf8')) : {}
  const receipt = {
    ...previous,
    schemaVersion: 1,
    id: asset.id,
    fixedPath: asset.fixedPath,
    targetRoutes: asset.targetRoutes,
    bytes: payload.length,
    sha256: crypto.createHash('sha256').update(payload).digest('hex'),
    measured,
    requiredCompression: asset.requiredCompression,
    fallback: asset.fallback,
    source: asset.source,
    license: asset.license,
    generatedBy: 'scripts/forge-launch-critical-assets.mjs + scripts/normalize-launch-critical-assets.mjs',
    generatedAt: new Date().toISOString(),
    releaseState: 'candidate-not-production-ready',
    absolutePath: path.relative(repoRoot, absolutePath),
  }
  fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`)
}

function repairGlb(payload) {
  if (payload.readUInt32LE(0) !== 0x46546c67) throw new Error('Invalid GLB magic')
  if (payload.readUInt32LE(4) !== 2) throw new Error('Unsupported GLB version')
  const jsonLength = payload.readUInt32LE(12)
  const jsonType = payload.readUInt32LE(16)
  if (jsonType !== 0x4e4f534a) throw new Error('GLB JSON chunk missing')
  const json = JSON.parse(payload.subarray(20, 20 + jsonLength).toString('utf8').trim())
  const binHeaderOffset = 20 + jsonLength
  const binLength = payload.readUInt32LE(binHeaderOffset)
  const binType = payload.readUInt32LE(binHeaderOffset + 4)
  if (binType !== 0x004e4942) throw new Error('GLB BIN chunk missing')
  const bin = payload.subarray(binHeaderOffset + 8, binHeaderOffset + 8 + binLength)

  let repairedEulerRotations = 0
  for (const node of json.nodes ?? []) {
    if (!Array.isArray(node.rotation)) continue
    if (node.rotation.length === 3) {
      const quaternion = eulerXyzToQuaternion(node.rotation)
      if (quaternion.every((value, index) => Math.abs(value - [0, 0, 0, 1][index]) < 1e-12)) delete node.rotation
      else node.rotation = quaternion
      repairedEulerRotations += 1
    } else if (node.rotation.length !== 4) {
      throw new Error(`Invalid node rotation length ${node.rotation.length}`)
    }
  }

  const triangleCount = (json.meshes ?? []).reduce((sum, mesh) => sum + (mesh.primitives ?? []).reduce((meshSum, primitive) => {
    const accessor = json.accessors?.[primitive.indices]
    return meshSum + (accessor ? Math.floor(accessor.count / 3) : 0)
  }, 0), 0)
  const boundsMeters = aggregateAccessorBounds(json)
  const jsonBuffer = pad4(Buffer.from(JSON.stringify(json), 'utf8'), 0x20)
  const binBuffer = pad4(Buffer.from(bin), 0)
  const totalLength = 12 + 8 + jsonBuffer.length + 8 + binBuffer.length
  const header = Buffer.alloc(12)
  header.writeUInt32LE(0x46546c67, 0)
  header.writeUInt32LE(2, 4)
  header.writeUInt32LE(totalLength, 8)
  const jsonHeader = Buffer.alloc(8)
  jsonHeader.writeUInt32LE(jsonBuffer.length, 0)
  jsonHeader.writeUInt32LE(0x4e4f534a, 4)
  const binHeader = Buffer.alloc(8)
  binHeader.writeUInt32LE(binBuffer.length, 0)
  binHeader.writeUInt32LE(0x004e4942, 4)
  return {
    payload: Buffer.concat([header, jsonHeader, jsonBuffer, binHeader, binBuffer]),
    triangleCount,
    boundsMeters,
    repairedEulerRotations,
  }
}

function aggregateAccessorBounds(json) {
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  let found = false
  for (const mesh of json.meshes ?? []) {
    for (const primitive of mesh.primitives ?? []) {
      const accessorIndex = primitive.attributes?.POSITION
      if (!Number.isInteger(accessorIndex)) continue
      const accessor = json.accessors?.[accessorIndex]
      if (!Array.isArray(accessor?.min) || !Array.isArray(accessor?.max)) continue
      found = true
      for (let axis = 0; axis < 3; axis += 1) {
        min[axis] = Math.min(min[axis], accessor.min[axis])
        max[axis] = Math.max(max[axis], accessor.max[axis])
      }
    }
  }
  if (!found) return null
  return {
    min: min.map(roundMetric),
    max: max.map(roundMetric),
    size: max.map((value, axis) => roundMetric(value - min[axis])),
  }
}

function eulerXyzToQuaternion([x, y, z]) {
  const c1 = Math.cos(x / 2), c2 = Math.cos(y / 2), c3 = Math.cos(z / 2)
  const s1 = Math.sin(x / 2), s2 = Math.sin(y / 2), s3 = Math.sin(z / 2)
  const quaternion = [
    s1 * c2 * c3 + c1 * s2 * s3,
    c1 * s2 * c3 - s1 * c2 * s3,
    c1 * c2 * s3 + s1 * s2 * c3,
    c1 * c2 * c3 - s1 * s2 * s3,
  ]
  const length = Math.hypot(...quaternion) || 1
  return quaternion.map((value) => value / length)
}

function makeRadianceHdrRle(width, height) {
  if (width < 8 || width > 0x7fff) throw new Error(`Unsupported Radiance RLE width: ${width}`)
  const header = Buffer.from(`#?RADIANCE\nFORMAT=32-bit_rle_rgbe\nEXPOSURE=1.0000000000000\n\n-Y ${height} +X ${width}\n`, 'ascii')
  const parts = [header]
  for (let y = 0; y < height; y += 1) {
    const channels = [Buffer.alloc(width), Buffer.alloc(width), Buffer.alloc(width), Buffer.alloc(width)]
    for (let x = 0; x < width; x += 1) {
      const horizon = 1 - Math.abs((y / (height - 1)) - 0.52)
      const vertical = Math.exp(-Math.pow((y / height - 0.52) / 0.22, 2))
      const band = Math.max(0, Math.sin((x / width) * Math.PI * 4) * 0.5 + 0.5) * horizon
      const swirl = Math.max(0, Math.sin((x / width) * Math.PI * 8 + (y / height) * Math.PI * 3) * 0.5 + 0.5) * vertical
      const star = ((x * 73 + y * 151) % 997) < 2 ? 190 : ((x * 29 + y * 47) % 3881) === 0 ? 110 : 0
      channels[0][x] = Math.min(255, 5 + Math.floor(22 * band) + Math.floor(18 * swirl) + star)
      channels[1][x] = Math.min(255, 8 + Math.floor(38 * band) + Math.floor(12 * swirl) + star)
      channels[2][x] = Math.min(255, 24 + Math.floor(88 * band) + Math.floor(36 * swirl) + star)
      channels[3][x] = 129
    }
    parts.push(Buffer.from([2, 2, width >> 8, width & 255]))
    for (const channel of channels) parts.push(encodeRadianceChannel(channel))
  }
  return Buffer.concat(parts)
}

function encodeRadianceChannel(values) {
  const parts = []
  let index = 0
  while (index < values.length) {
    let runLength = 1
    while (index + runLength < values.length && runLength < 127 && values[index + runLength] === values[index]) runLength += 1
    if (runLength >= 4) {
      parts.push(Buffer.from([128 + runLength, values[index]]))
      index += runLength
      continue
    }
    const literalStart = index
    index += runLength
    while (index < values.length && index - literalStart < 128) {
      runLength = 1
      while (index + runLength < values.length && runLength < 127 && values[index + runLength] === values[index]) runLength += 1
      if (runLength >= 4) break
      index += runLength
    }
    const literalLength = index - literalStart
    parts.push(Buffer.from([literalLength]), values.subarray(literalStart, index))
  }
  return Buffer.concat(parts)
}

function measureNonModel(asset, payload) {
  if (asset.kind === 'audio') return { durationSeconds: asset.durationSeconds, sampleRate: 22050, channels: 1 }
  if (asset.targetResolution) return { resolution: asset.targetResolution }
  return { bytes: payload.length }
}

function pad4(buffer, padByte) {
  const pad = (4 - (buffer.length % 4)) % 4
  return pad ? Buffer.concat([buffer, Buffer.alloc(pad, padByte)]) : buffer
}
function roundMetric(value) { return Number(Number(value).toFixed(5)) }
