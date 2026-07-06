#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const publicRoot = path.join(root, 'urai-tier1/public')
const expected = [
  ['v2', 80, '/assets/urai/final/manifests/v2-asset-factory-spatial-handoff.json'],
  ['v3', 14, '/assets/urai/final/manifests/v3-relationship-asset-factory-spatial-handoff.json'],
  ['v4', 39, '/assets/urai/final/manifests/canonical-v4-handoff.json'],
]

for (const [version, count, route] of expected) {
  const file = path.join(publicRoot, route.slice(1))
  if (!fs.existsSync(file)) throw new Error(`Missing fallback manifest: ${route}`)
  const manifest = JSON.parse(fs.readFileSync(file, 'utf8'))
  if (manifest.version !== version) throw new Error(`${route} has version ${manifest.version}`)
  if (Number(manifest.ready) + Number(manifest.missing) !== count) {
    throw new Error(`${route} does not account for ${count} assets`)
  }
}

const component = fs.readFileSync(
  path.join(root, 'urai-tier1/src/app/CanonicalAssetGates.tsx'),
  'utf8',
)
for (const token of ['v3-relationship-', 'canonical', 'v4', 'handoff.json']) {
  if (!component.includes(token)) throw new Error(`CanonicalAssetGates is missing ${token}`)
}

console.log(JSON.stringify({ check: 'canonical-fallback-manifests', expected }, null, 2))
