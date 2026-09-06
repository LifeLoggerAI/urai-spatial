#!/usr/bin/env node
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const args = parseArgs(process.argv.slice(2))
const repoRoot = process.cwd()
const legacyRoot = path.resolve(repoRoot, args['legacy-root'] || 'comparison/legacy')
const outputRoot = path.resolve(repoRoot, args.output || 'operations/assets/comparison')
const legacyHead = args['legacy-head'] || 'e4e94a501a64e7375a5cfdbe9547436fbc8e75a2'

const pairs = [
  {
    id: 'home-entry-chamber',
    current: 'urai-tier1/public/assets/urai/generated/models/home-entry-chamber-v1.glb',
    legacy: 'urai-tier1/public/assets/urai/generated/models/home-entry-chamber-v1.glb',
  },
  {
    id: 'ground-world-terrain',
    current: 'urai-tier1/public/assets/urai/generated/models/ground-world-terrain-v1.glb',
    legacy: 'urai-tier1/public/assets/urai/generated/models/ground-world-terrain-v1.glb',
  },
  {
    id: 'focus-environment',
    current: 'urai-tier1/public/assets/urai/generated/models/focus-memory-chamber-v1.glb',
    legacy: 'urai-tier1/public/assets/urai/generated/models/focus-star-flight-v1.glb',
  },
  {
    id: 'replay-environment',
    current: 'urai-tier1/public/assets/urai/generated/models/replay-memory-environment-v1.glb',
    legacy: 'urai-tier1/public/assets/urai/generated/models/replay-memory-film-v1.glb',
  },
  {
    id: 'portal-ring',
    current: 'urai-tier1/public/assets/urai/generated/models/portal-ring-master-v1.glb',
    legacy: 'urai-tier1/public/assets/urai/generated/models/portal-ring-master-v1.glb',
  },
  {
    id: 'global-cinematic-material-pack',
    current: 'urai-tier1/public/assets/urai/generated/textures/global-cinematic-material-pack-v1.json',
    legacy: 'urai-tier1/public/assets/urai/generated/textures/global-cinematic-material-pack-v1.json',
  },
  {
    id: 'passport-status-room',
    current: 'urai-tier1/public/assets/urai/generated/models/passport-status-room-v1.glb',
    legacy: 'urai-tier1/public/assets/urai/generated/models/passport-status-room-v1.glb',
  },
]

const unmatchedCurrent = [
  'urai-tier1/public/assets/urai/generated/models/life-map-memory-star-v1.glb',
  'urai-tier1/public/assets/urai/generated/models/urai-orb-avatar-v1.glb',
  'urai-tier1/public/assets/urai/generated/textures/spatial-particle-atlas-v1.svg',
  'urai-tier1/public/assets/urai/generated/loading/urai-loading-sequence-v1.json',
  'urai-tier1/public/assets/urai/generated/audio/urai-ambient-bed-v1.wav',
]

// The former Life Map HDR is intentionally not a current launch candidate.
// assetManifest.ts marks it `future` and routes Life Map through its governed
// fallback while the final memory-star GLB is ready. Preserve the pinned HDR
// here as explicit legacy-only evidence rather than fabricating a current file.
const unmatchedLegacy = [
  'urai-tier1/public/assets/urai/generated/skyboxes/life-map-galaxy-skybox-v1.hdr',
]

fs.mkdirSync(outputRoot, { recursive: true })

const comparisons = pairs.map((pair) => {
  const currentPath = path.join(repoRoot, pair.current)
  const legacyPath = path.join(legacyRoot, pair.legacy)
  requireFile(currentPath, `current candidate ${pair.id}`)
  requireFile(legacyPath, `legacy candidate ${pair.id}`)

  const current = inspectFile(currentPath)
  const legacy = inspectFile(legacyPath)
  return {
    id: pair.id,
    currentPath: pair.current,
    legacyPath: pair.legacy,
    sameBytes: current.sha256 === legacy.sha256,
    current,
    legacy,
    disposition: 'visual-review-required',
  }
})

const currentOnly = unmatchedCurrent.map((relativePath) => {
  const absolutePath = path.join(repoRoot, relativePath)
  requireFile(absolutePath, `current-only candidate ${relativePath}`)
  return { path: relativePath, ...inspectFile(absolutePath) }
})

const legacyOnly = unmatchedLegacy.map((relativePath) => {
  const absolutePath = path.join(legacyRoot, relativePath)
  requireFile(absolutePath, `legacy-only candidate ${relativePath}`)
  return { path: relativePath, ...inspectFile(absolutePath) }
})

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  candidateOnly: true,
  legacySource: {
    pullRequest: 463,
    branch: 'asset-safe-launch-pack',
    headSha: legacyHead,
  },
  comparisonCount: comparisons.length,
  comparisons,
  currentOnly,
  legacyOnly,
  policy: {
    mergeLegacyBranch: false,
    promoteAutomatically: false,
    visualReviewRequired: true,
    productionCompressionRequired: true,
  },
}

fs.writeFileSync(path.join(outputRoot, 'legacy-candidate-comparison.json'), `${JSON.stringify(report, null, 2)}\n`)
fs.writeFileSync(path.join(outputRoot, 'legacy-candidate-comparison.md'), renderMarkdown(report))
console.log(JSON.stringify({
  ok: true,
  compared: comparisons.length,
  currentOnly: currentOnly.length,
  legacyOnly: legacyOnly.length,
  outputRoot: path.relative(repoRoot, outputRoot),
}, null, 2))

function parseArgs(values) {
  const parsed = {}
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index]
    if (!value.startsWith('--')) continue
    const key = value.slice(2)
    const next = values[index + 1]
    if (!next || next.startsWith('--')) parsed[key] = true
    else {
      parsed[key] = next
      index += 1
    }
  }
  return parsed
}

function requireFile(filePath, label) {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    throw new Error(`Missing ${label}: ${filePath}`)
  }
}

function inspectFile(filePath) {
  const payload = fs.readFileSync(filePath)
  const extension = path.extname(filePath).toLowerCase()
  const base = {
    bytes: payload.length,
    sha256: crypto.createHash('sha256').update(payload).digest('hex'),
    extension,
  }

  if (extension === '.glb') return { ...base, format: 'glb', ...inspectGlb(payload) }
  if (extension === '.hdr') return { ...base, format: 'radiance-hdr', ...inspectHdr(payload) }
  if (extension === '.json') return { ...base, format: 'json', ...inspectJson(payload) }
  if (extension === '.svg') return { ...base, format: 'svg', ...inspectSvg(payload) }
  if (extension === '.wav') return { ...base, format: 'wav', ...inspectWav(payload) }
  return { ...base, format: extension.slice(1) || 'unknown' }
}

function inspectGlb(payload) {
  if (payload.length < 20 || payload.toString('ascii', 0, 4) !== 'glTF') {
    throw new Error('Invalid GLB header')
  }
  const version = payload.readUInt32LE(4)
  const declaredLength = payload.readUInt32LE(8)
  if (declaredLength !== payload.length) {
    throw new Error(`GLB declared length ${declaredLength} differs from actual ${payload.length}`)
  }

  let offset = 12
  let json = null
  while (offset + 8 <= payload.length) {
    const chunkLength = payload.readUInt32LE(offset)
    const chunkType = payload.readUInt32LE(offset + 4)
    const start = offset + 8
    const end = start + chunkLength
    if (end > payload.length) throw new Error('GLB chunk exceeds payload length')
    if (chunkType === 0x4e4f534a) {
      json = JSON.parse(payload.toString('utf8', start, end).replace(/\u0000+$/g, '').trim())
    }
    offset = end
  }
  if (!json) throw new Error('GLB JSON chunk missing')

  let triangleCount = 0
  for (const mesh of json.meshes || []) {
    for (const primitive of mesh.primitives || []) {
      if (Number.isInteger(primitive.indices)) {
        const accessor = json.accessors?.[primitive.indices]
        if (accessor) triangleCount += Math.floor(accessor.count / 3)
      } else if (Number.isInteger(primitive.attributes?.POSITION)) {
        const accessor = json.accessors?.[primitive.attributes.POSITION]
        if (accessor) triangleCount += Math.floor(accessor.count / 3)
      }
    }
  }

  const bounds = aggregateAccessorBounds(json)
  const extensionsUsed = [...new Set(json.extensionsUsed || [])].sort()
  const compressed = extensionsUsed.some((name) => name === 'KHR_draco_mesh_compression' || name.startsWith('EXT_meshopt_compression'))

  return {
    version,
    sceneCount: (json.scenes || []).length,
    nodeCount: (json.nodes || []).length,
    meshCount: (json.meshes || []).length,
    materialCount: (json.materials || []).length,
    triangleCount,
    accessorBounds: bounds,
    extensionsUsed,
    compressed,
  }
}

function aggregateAccessorBounds(json) {
  const mins = [Infinity, Infinity, Infinity]
  const maxs = [-Infinity, -Infinity, -Infinity]
  let found = false
  for (const mesh of json.meshes || []) {
    for (const primitive of mesh.primitives || []) {
      const positionIndex = primitive.attributes?.POSITION
      if (!Number.isInteger(positionIndex)) continue
      const accessor = json.accessors?.[positionIndex]
      if (!accessor || !Array.isArray(accessor.min) || !Array.isArray(accessor.max)) continue
      found = true
      for (let axis = 0; axis < 3; axis += 1) {
        mins[axis] = Math.min(mins[axis], accessor.min[axis])
        maxs[axis] = Math.max(maxs[axis], accessor.max[axis])
      }
    }
  }
  if (!found) return null
  return {
    min: mins.map(roundMetric),
    max: maxs.map(roundMetric),
    size: maxs.map((value, axis) => roundMetric(value - mins[axis])),
    note: 'Accessor-space bounds; visual review remains authoritative for composed scenes.',
  }
}

function inspectHdr(payload) {
  const header = payload.subarray(0, Math.min(payload.length, 4096)).toString('ascii')
  if (!header.startsWith('#?RADIANCE') && !header.startsWith('#?RGBE')) {
    throw new Error('Invalid Radiance HDR header')
  }
  const match = header.match(/-Y\s+(\d+)\s+\+X\s+(\d+)/)
  if (!match) throw new Error('HDR resolution line missing')
  return { resolution: [Number(match[2]), Number(match[1])] }
}

function inspectJson(payload) {
  const value = JSON.parse(payload.toString('utf8'))
  return {
    topLevelType: Array.isArray(value) ? 'array' : typeof value,
    topLevelKeys: value && typeof value === 'object' && !Array.isArray(value) ? Object.keys(value).sort() : [],
  }
}

function inspectSvg(payload) {
  const text = payload.toString('utf8')
  if (!/<svg\b/i.test(text)) throw new Error('Invalid SVG document')
  const width = Number(text.match(/\bwidth=["'](\d+)/i)?.[1] || 0)
  const height = Number(text.match(/\bheight=["'](\d+)/i)?.[1] || 0)
  return { resolution: width && height ? [width, height] : null }
}

function inspectWav(payload) {
  if (payload.toString('ascii', 0, 4) !== 'RIFF' || payload.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error('Invalid WAV header')
  }
  const channels = payload.readUInt16LE(22)
  const sampleRate = payload.readUInt32LE(24)
  const byteRate = payload.readUInt32LE(28)
  let dataBytes = 0
  let offset = 12
  while (offset + 8 <= payload.length) {
    const id = payload.toString('ascii', offset, offset + 4)
    const size = payload.readUInt32LE(offset + 4)
    if (id === 'data') {
      dataBytes = size
      break
    }
    offset += 8 + size + (size % 2)
  }
  return {
    channels,
    sampleRate,
    durationSeconds: byteRate ? roundMetric(dataBytes / byteRate) : null,
  }
}

function renderMarkdown(report) {
  const lines = [
    '# URAI legacy candidate comparison',
    '',
    `Generated: ${report.generatedAt}`,
    '',
    `Pinned legacy source: PR #${report.legacySource.pullRequest} at \`${report.legacySource.headSha}\``,
    '',
    '> Candidate comparison only. This report does not authorize a merge or production promotion.',
    '',
    '| Asset | Current bytes | Legacy bytes | Same SHA-256 | Current metrics | Legacy metrics | Disposition |',
    '|---|---:|---:|:---:|---|---|---|',
  ]

  for (const item of report.comparisons) {
    lines.push(`| ${item.id} | ${item.current.bytes} | ${item.legacy.bytes} | ${item.sameBytes ? 'yes' : 'no'} | ${formatMetrics(item.current)} | ${formatMetrics(item.legacy)} | ${item.disposition} |`)
  }

  lines.push('', '## Current-only candidates', '')
  for (const item of report.currentOnly) lines.push(`- \`${item.path}\` — ${item.bytes} bytes; ${formatMetrics(item)}`)
  lines.push('', '## Legacy-only candidates', '')
  for (const item of report.legacyOnly) lines.push(`- \`${item.path}\` — ${item.bytes} bytes; ${formatMetrics(item)}`)
  lines.push(
    '',
    '## Promotion gate',
    '',
    '- Do not merge PR #463.',
    '- Review both candidate bundles visually in representative Home, Ground, Life Map, Focus and Replay compositions.',
    '- Select winners by composition quality, semantic fit, measured performance, accessibility and licensing evidence.',
    '- Compress selected GLBs with Draco or Meshopt and create optimized texture/audio derivatives before production promotion.',
    '- Record the selected SHA-256 and disposition in the canonical launch manifest.',
    '',
  )
  return `${lines.join('\n')}\n`
}

function formatMetrics(item) {
  if (item.format === 'glb') return `${item.triangleCount} tris; ${item.meshCount} meshes; ${item.compressed ? 'compressed' : 'uncompressed'}`
  if (item.resolution) return `${item.resolution[0]}x${item.resolution[1]}`
  if (item.format === 'wav') return `${item.durationSeconds}s; ${item.sampleRate}Hz; ${item.channels}ch`
  if (item.format === 'json') return `${item.topLevelKeys.length} top-level keys`
  return item.format
}

function roundMetric(value) {
  return Number(Number(value).toFixed(5))
}
