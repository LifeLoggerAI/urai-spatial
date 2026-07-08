#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const repoRoot = process.cwd()
const assetId = process.argv[2] ?? process.env.URAI_V1_ASSET_ID ?? 'home-entry-chamber-model-v1'
const manifestPath = path.join(repoRoot, 'docs/assets/v1-critical-paid-assets.json')
const outDir = path.join(repoRoot, 'docs/assets/receipts')
const spendingOrder = [
  'home-entry-chamber-model-v1',
  'portal-ring-master-glb-v1',
  'ground-world-terrain-glb-v1',
  'life-map-galaxy-skybox-v1',
  'global-cinematic-material-pack-v1',
]

function hashFile(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

function nextAssetAfter(id) {
  const index = spendingOrder.indexOf(id)
  if (index < 0) return null
  return spendingOrder[index + 1] ?? null
}

const manifest = readJson(manifestPath)
const asset = manifest.assets.find((entry) => entry.id === assetId)
if (!asset) {
  console.error(`Unknown V1 paid asset id: ${assetId}`)
  process.exit(2)
}

const file = path.join(repoRoot, asset.path)
const exists = fs.existsSync(file)
const extension = path.extname(asset.path).slice(1).toLowerCase()
const extensionMatches = extension === asset.format
const sizeBytes = exists ? fs.statSync(file).size : 0
const sha256 = exists ? hashFile(file) : null
let jsonValid = null
if (exists && asset.format === 'json') {
  try {
    readJson(file)
    jsonValid = true
  } catch {
    jsonValid = false
  }
}

const accepted = exists && extensionMatches && sizeBytes > 0 && jsonValid !== false
const generatedAt = new Date().toISOString()
const receipt = {
  schemaVersion: '1.0.0',
  generatedAt,
  asset: {
    id: asset.id,
    priority: asset.priority,
    path: asset.path,
    format: asset.format,
    targetSurface: asset.targetSurface,
    exists,
    extensionMatches,
    sizeBytes,
    sha256,
    jsonValid,
    accepted,
  },
  nextSpendAllowed: accepted,
  nextAsset: accepted ? nextAssetAfter(asset.id) : asset.id,
  rule: 'One V1 paid asset must be present, hashed, and accepted before spending on the next asset.',
}

fs.mkdirSync(outDir, { recursive: true })
const safeId = asset.id.replace(/[^a-z0-9.-]+/gi, '-')
const jsonPath = path.join(outDir, `${safeId}-receipt.json`)
const mdPath = path.join(outDir, `${safeId}-receipt.md`)
fs.writeFileSync(jsonPath, JSON.stringify(receipt, null, 2) + '\n')
fs.writeFileSync(mdPath, [
  `# ${asset.id} Receipt`,
  '',
  `Generated: ${generatedAt}`,
  '',
  `- Present: ${exists ? 'yes' : 'no'}`,
  `- Extension matches: ${extensionMatches ? 'yes' : 'no'}`,
  `- Size: ${sizeBytes}`,
  `- SHA-256: ${sha256 ?? 'missing'}`,
  `- Accepted: ${accepted ? 'yes' : 'no'}`,
  `- Next spend allowed: ${accepted ? 'yes' : 'no'}`,
  `- Next asset: ${receipt.nextAsset ?? 'none'}`,
  `- Canonical path: \`${asset.path}\``,
  '',
].join('\n'))

console.log(JSON.stringify(receipt, null, 2))
if (!accepted) process.exit(1)
