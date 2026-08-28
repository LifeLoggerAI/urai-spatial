import { createHash } from 'node:crypto'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

const USER_AGENT = 'URAI-Home-V48-Production-Asset-Importer/1.0 (LifeLoggerAI/urai-spatial; PR-1177)'
const API_ROOT = 'https://api.polyhaven.com/files'
const OUT_ROOT = 'urai-tier1/public/assets/urai/home-production/cc0/polyhaven-v48'
const PROVENANCE = 'operations/assets/home-v48-production-asset-provenance.json'
const ASSETS = [
  { id: 'rock_face_01', role: 'sanctuary-architectural-rock-face' },
  { id: 'rock_face_02', role: 'sanctuary-secondary-rock-face' },
  { id: 'modular_industrial_pipes_01', role: 'reliquary-mechanical-load-and-service-system' },
  { id: 'industrial_caged_sconce', role: 'sanctuary-authored-practical-light-fixture' },
]

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex')
}

function collectFileRecords(node, keyPath = [], out = []) {
  if (!node || typeof node !== 'object') return out
  if (typeof node.url === 'string' && /^https:\/\//.test(node.url)) {
    out.push({
      keyPath: keyPath.join('/'),
      url: node.url,
      size: Number.isFinite(Number(node.size)) ? Number(node.size) : null,
      md5: typeof node.md5 === 'string' ? node.md5 : null,
    })
  }
  for (const [key, value] of Object.entries(node)) collectFileRecords(value, [...keyPath, key], out)
  return out
}

async function fetchChecked(url, binary = false) {
  const response = await fetch(url, { headers: { 'user-agent': USER_AGENT } })
  if (!response.ok) throw new Error(`Fetch failed ${response.status} for ${url}`)
  return binary ? Buffer.from(await response.arrayBuffer()) : await response.text()
}

function chooseGltf(records) {
  const candidates = records.filter((entry) => /\.gltf(?:\?|$)/i.test(entry.url))
  const ranked = candidates.sort((a, b) => {
    const a1k = /(?:\/|_|-)1k(?:\/|_|-|\.)/i.test(`${a.keyPath}/${a.url}`) ? 0 : 1
    const b1k = /(?:\/|_|-)1k(?:\/|_|-|\.)/i.test(`${b.keyPath}/${b.url}`) ? 0 : 1
    if (a1k !== b1k) return a1k - b1k
    const agltf = /gltf/i.test(a.keyPath) ? 0 : 1
    const bgltf = /gltf/i.test(b.keyPath) ? 0 : 1
    if (agltf !== bgltf) return agltf - bgltf
    return (a.size ?? Number.MAX_SAFE_INTEGER) - (b.size ?? Number.MAX_SAFE_INTEGER)
  })
  if (!ranked.length) throw new Error('Poly Haven file map contains no glTF entrypoint')
  return ranked[0]
}

function safeRelativeUri(uri) {
  if (!uri || uri.startsWith('data:')) return null
  const decoded = decodeURIComponent(uri.split('?')[0])
  if (decoded.startsWith('/') || decoded.includes('..') || /^[a-z]+:/i.test(decoded)) {
    throw new Error(`Unsafe external glTF URI: ${uri}`)
  }
  return decoded.replaceAll('\\', '/')
}

async function importAsset(asset) {
  const apiUrl = `${API_ROOT}/${asset.id}`
  const apiText = await fetchChecked(apiUrl)
  const fileMap = JSON.parse(apiText)
  const records = collectFileRecords(fileMap)
  const gltfRecord = chooseGltf(records)
  const gltfText = await fetchChecked(gltfRecord.url)
  const gltf = JSON.parse(gltfText)
  const outputDir = path.join(OUT_ROOT, asset.id)
  await rm(outputDir, { recursive: true, force: true })
  await mkdir(outputDir, { recursive: true })

  const files = []
  const entrypoint = path.join(outputDir, 'asset.gltf')
  await writeFile(entrypoint, gltfText, 'utf8')
  files.push({
    path: entrypoint,
    sourceUrl: gltfRecord.url,
    bytes: Buffer.byteLength(gltfText),
    sha256: sha256(Buffer.from(gltfText)),
  })

  const uris = new Set([
    ...(Array.isArray(gltf.buffers) ? gltf.buffers.map((item) => item?.uri) : []),
    ...(Array.isArray(gltf.images) ? gltf.images.map((item) => item?.uri) : []),
  ])

  for (const rawUri of uris) {
    const uri = safeRelativeUri(rawUri)
    if (!uri) continue
    const sourceUrl = new URL(rawUri, gltfRecord.url).toString()
    const buffer = await fetchChecked(sourceUrl, true)
    const destination = path.join(outputDir, uri)
    await mkdir(path.dirname(destination), { recursive: true })
    await writeFile(destination, buffer)
    files.push({ path: destination, sourceUrl, bytes: buffer.length, sha256: sha256(buffer) })
  }

  const totalBytes = files.reduce((sum, file) => sum + file.bytes, 0)
  return {
    id: asset.id,
    role: asset.role,
    license: 'CC0-1.0',
    provider: 'Poly Haven',
    providerApi: apiUrl,
    userAgent: USER_AGENT,
    entrypoint: `/${entrypoint.replace(/^urai-tier1\/public\//, '')}`,
    sourceEntrypoint: gltfRecord.url,
    totalBytes,
    files,
  }
}

const imported = []
for (const asset of ASSETS) {
  const result = await importAsset(asset)
  imported.push(result)
  console.log(`Imported ${asset.id}: ${result.files.length} files, ${result.totalBytes} bytes`)
}

await mkdir(path.dirname(PROVENANCE), { recursive: true })
await writeFile(PROVENANCE, `${JSON.stringify({
  schema: 'urai.home.v48-production-assets.v1',
  purpose: 'PR #1177 production sanctuary replacement for rejected procedural V47 art',
  importedAt: new Date().toISOString(),
  runtimeFetchesPolyHavenApi: false,
  apiUse: 'materialization-time only; assets are committed into the canonical repository',
  attribution: 'Source assets: Poly Haven (CC0). Live API used only by the governed importer.',
  sourceAssets: imported,
}, null, 2)}\n`, 'utf8')

const verify = JSON.parse(await readFile(PROVENANCE, 'utf8'))
if (verify.sourceAssets.length !== ASSETS.length) throw new Error('Incomplete V48 production asset provenance')
console.log(`Wrote ${PROVENANCE}`)
