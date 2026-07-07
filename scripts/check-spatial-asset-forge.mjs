#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const publicRoot = path.join(root, 'urai-tier1', 'public')
const manifestPath = path.join(publicRoot, 'assets', 'urai', 'spatial', 'asset-forge-manifest.json')

if (!fs.existsSync(manifestPath)) {
  console.error('[check-spatial-asset-forge] missing manifest')
  process.exit(1)
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
const missing = []

for (const asset of manifest.assets || []) {
  const file = String(asset.file || '')
  const rel = file.startsWith('/') ? file.slice(1) : file
  const local = path.join(publicRoot, rel)
  if (!fs.existsSync(local)) missing.push(file)
}

if (missing.length > 0) {
  console.error('[check-spatial-asset-forge] missing outputs')
  for (const item of missing) console.error(item)
  process.exit(1)
}

console.log(JSON.stringify({ ok: true, service: 'urai-spatial-asset-forge-check', checkedAssets: (manifest.assets || []).length }, null, 2))
