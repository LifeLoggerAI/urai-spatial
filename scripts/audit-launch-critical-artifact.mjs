#!/usr/bin/env node
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const manifestPath = path.join(root, 'operations/assets/launch-critical-assets.json')
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
const errors = []
const warnings = []
const results = []
const ids = new Set()
const fixedPaths = new Set()

for (const asset of manifest.assets) {
  if (ids.has(asset.id)) errors.push(`${asset.id}: duplicate asset id`)
  ids.add(asset.id)
  if (fixedPaths.has(asset.fixedPath)) errors.push(`${asset.id}: duplicate fixedPath ${asset.fixedPath}`)
  fixedPaths.add(asset.fixedPath)

  if (!asset.fixedPath.startsWith(`${manifest.generatedRoot}/`)) {
    errors.push(`${asset.id}: fixedPath escapes generatedRoot`)
  }

  const assetPath = path.join(root, asset.fixedPath)
  const receiptPath = path.join(root, manifest.receiptRoot, `${asset.id}.json`)
  if (!fs.existsSync(assetPath) || !fs.existsSync(receiptPath)) continue

  const bytes = fs.readFileSync(assetPath)
  const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'))
  const sha256 = crypto.createHash('sha256').update(bytes).digest('hex')
  const productionReady = asset.releaseState === 'production-ready'

  for (const [field, expected] of [
    ['id', asset.id],
    ['fixedPath', asset.fixedPath],
    ['requiredCompression', asset.requiredCompression],
    ['fallback', asset.fallback],
    ['source', asset.source],
    ['license', asset.license],
  ]) {
    if (receipt[field] !== expected) errors.push(`${asset.id}: receipt ${field} does not match manifest`)
  }
  if (JSON.stringify(receipt.targetRoutes) !== JSON.stringify(asset.targetRoutes)) {
    errors.push(`${asset.id}: receipt targetRoutes do not match manifest`)
  }
  if (receipt.bytes !== bytes.length) errors.push(`${asset.id}: receipt byte count does not match file`)
  if (receipt.sha256 !== sha256) errors.push(`${asset.id}: receipt SHA-256 does not match file`)

  let measured = {}
  try {
    measured = inspectAsset(asset, bytes)
  } catch (error) {
    errors.push(`${asset.id}: ${error.message}`)
    continue
  }

  if (asset.kind === 'model') {
    if (receipt.measured?.triangleCount !== measured.triangleCount) {
      errors.push(`${asset.id}: receipt triangle count ${receipt.measured?.triangleCount} does not match actual ${measured.triangleCount}`)
    }
    if (measured.triangleCount > asset.maxTriangles) {
      errors.push(`${asset.id}: actual ${measured.triangleCount} triangles exceeds ${asset.maxTriangles}`)
    }
    const overflow = measured.boundsMeters.map((value, index) => value - asset.targetBoundsMeters[index])
    if (overflow.some((value) => value > 0.01)) {
      const message = `${asset.id}: actual bounds ${fmt(measured.boundsMeters)} exceed target ${fmt(asset.targetBoundsMeters)}`
      if (productionReady) errors.push(message)
      else warnings.push(message)
    }
    const compressed = measured.extensionsUsed.includes('KHR_draco_mesh_compression') || measured.extensionsUsed.includes('EXT_meshopt_compression')
    if (asset.requiredCompression === 'draco-or-meshopt' && !compressed) {
      const message = `${asset.id}: GLB has no Draco or Meshopt extension`
      if (productionReady) errors.push(message)
      else warnings.push(message)
    }
  }

  if (asset.targetResolution && measured.resolution) {
    if (JSON.stringify(receipt.measured?.resolution) !== JSON.stringify(measured.resolution)) {
      errors.push(`${asset.id}: receipt resolution does not match actual ${fmt(measured.resolution)}`)
    }
    if (JSON.stringify(measured.resolution) !== JSON.stringify(asset.targetResolution)) {
      const message = `${asset.id}: actual resolution ${fmt(measured.resolution)} differs from target ${fmt(asset.targetResolution)}`
      if (productionReady) errors.push(message)
      else warnings.push(message)
    }
  }

  if (asset.kind === 'audio') {
    if (Math.abs(measured.durationSeconds - asset.durationSeconds) > 0.05) {
      errors.push(`${asset.id}: actual duration ${measured.durationSeconds.toFixed(3)}s differs from target ${asset.durationSeconds}s`)
    }
    if (productionReady && /ogg-or-aac/.test(asset.requiredCompression) && measured.container === 'wav') {
      errors.push(`${asset.id}: production-ready audio remains WAV instead of OGG/AAC`)
    }
  }

  if (productionReady && asset.kind === 'texture' && /ktx2-or-webp/.test(asset.requiredCompression) && measured.format === 'svg') {
    errors.push(`${asset.id}: production-ready particle atlas remains SVG instead of KTX2/WebP`)
  }

  results.push({ id: asset.id, fixedPath: asset.fixedPath, bytes: bytes.length, sha256, releaseState: asset.releaseState, measured })
}

const report = {
  ok: errors.length === 0,
  candidateOnly: manifest.assets.every((asset) => asset.releaseState !== 'production-ready'),
  manifestId: manifest.manifestId,
  checkedAt: new Date().toISOString(),
  checkedAssets: results.length,
  expectedAssets: manifest.assets.length,
  results,
  warnings,
  errors,
}

console.log(JSON.stringify(report, null, 2))
if (errors.length) process.exitCode = 1

function inspectAsset(asset, bytes) {
  if (asset.kind === 'model') return inspectGlb(bytes)
  if (asset.kind === 'hdr') return inspectHdr(bytes)
  if (asset.kind === 'audio') return inspectWav(bytes)
  if (asset.kind === 'texture') return inspectSvg(bytes)
  if (asset.kind === 'material-pack' || asset.kind === 'loading-sequence') {
    JSON.parse(bytes.toString('utf8'))
    return { format: 'json' }
  }
  throw new Error(`unsupported asset kind ${asset.kind}`)
}

function inspectGlb(bytes) {
  if (bytes.length < 20 || bytes.toString('utf8', 0, 4) !== 'glTF') throw new Error('invalid GLB magic')
  if (bytes.readUInt32LE(4) !== 2) throw new Error(`unsupported GLB version ${bytes.readUInt32LE(4)}`)
  if (bytes.readUInt32LE(8) !== bytes.length) throw new Error('GLB declared length does not match file length')
  const jsonLength = bytes.readUInt32LE(12)
  if (bytes.toString('utf8', 16, 20) !== 'JSON') throw new Error('first GLB chunk is not JSON')
  const json = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString('utf8').trim())
  let triangleCount = 0
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  for (const mesh of json.meshes ?? []) {
    for (const primitive of mesh.primitives ?? []) {
      const indexAccessor = json.accessors?.[primitive.indices]
      if (!indexAccessor) throw new Error('GLB primitive is missing an index accessor')
      triangleCount += Math.floor(indexAccessor.count / 3)
      const positionAccessor = json.accessors?.[primitive.attributes?.POSITION]
      if (!positionAccessor?.min || !positionAccessor?.max) throw new Error('GLB POSITION accessor is missing min/max bounds')
      for (let axis = 0; axis < 3; axis += 1) {
        min[axis] = Math.min(min[axis], positionAccessor.min[axis])
        max[axis] = Math.max(max[axis], positionAccessor.max[axis])
      }
    }
  }
  return {
    format: 'glb',
    version: 2,
    generator: json.asset?.generator ?? null,
    nodes: json.nodes?.length ?? 0,
    meshes: json.meshes?.length ?? 0,
    materials: json.materials?.length ?? 0,
    triangleCount,
    boundsMin: min,
    boundsMax: max,
    boundsMeters: max.map((value, axis) => round(value - min[axis])),
    extensionsUsed: json.extensionsUsed ?? [],
    extensionsRequired: json.extensionsRequired ?? [],
  }
}

function inspectHdr(bytes) {
  const headerEnd = bytes.indexOf(Buffer.from('\n\n'))
  if (headerEnd < 0) throw new Error('HDR header terminator is missing')
  const headerAndResolution = bytes.subarray(0, Math.min(bytes.length, headerEnd + 128)).toString('ascii')
  if (!headerAndResolution.startsWith('#?RADIANCE')) throw new Error('invalid Radiance HDR signature')
  const match = headerAndResolution.match(/-Y\s+(\d+)\s+\+X\s+(\d+)/)
  if (!match) throw new Error('HDR resolution line is missing')
  return { format: 'hdr', resolution: [Number(match[2]), Number(match[1])] }
}

function inspectWav(bytes) {
  if (bytes.length < 44 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error('invalid WAV header')
  }
  const channels = bytes.readUInt16LE(22)
  const sampleRate = bytes.readUInt32LE(24)
  const byteRate = bytes.readUInt32LE(28)
  const bitsPerSample = bytes.readUInt16LE(34)
  const dataBytes = bytes.readUInt32LE(40)
  return { format: 'audio', container: 'wav', channels, sampleRate, bitsPerSample, durationSeconds: round(dataBytes / byteRate) }
}

function inspectSvg(bytes) {
  const text = bytes.toString('utf8')
  if (!/^\s*<svg\b/.test(text)) throw new Error('invalid SVG root')
  const width = Number(text.match(/\bwidth="(\d+)"/)?.[1])
  const height = Number(text.match(/\bheight="(\d+)"/)?.[1])
  if (!width || !height) throw new Error('SVG width/height are missing')
  return { format: 'svg', resolution: [width, height] }
}

function round(value) { return Math.round(value * 1000) / 1000 }
function fmt(values) { return `[${values.join(', ')}]` }
