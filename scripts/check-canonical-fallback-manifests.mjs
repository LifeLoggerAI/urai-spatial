#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = path.resolve(import.meta.dirname, '..')
const publicRoot = path.join(root, 'urai-tier1/public')

const expected = [
  {
    version: 'v2',
    count: 80,
    route: '/assets/urai/final/manifests/v2-asset-factory-spatial-handoff.json',
  },
  {
    version: 'v3',
    count: 14,
    route: '/assets/urai/final/manifests/v3-relationship-asset-factory-spatial-handoff.json',
  },
  {
    version: 'v4',
    count: 39,
    route: '/assets/urai/final/manifests/canonical-v4-handoff.json',
  },
]

const component = fs.readFileSync(
  path.join(root, 'urai-tier1/src/app/CanonicalAssetGates.tsx'),
  'utf8',
)

for (const item of expected) {
  const file = path.join(publicRoot, item.route.slice(1))
  if (!fs.existsSync(file)) {
    throw new Error(`Missing fallback manifest: ${item.route}`)
  }
  const manifest = JSON.parse(fs.readFileSync(file, 'utf8'))
  if (manifest.version !== item.version) {
    throw new Error(`${item.route} has version ${manifest.version}`)
  }
  if (Number(manifest.ready) + Number(manifest.missing) !== item.count) {
    throw new Error(`${item.route} does not account for ${item.count} assets`)
  }
}

for (const token of [
  'v3-relationship-',
  'canonical-',
  'v4-handoff.json',
]) {
  if (!component.includes(token)) {
    throw new Error(`CanonicalAssetGates is missing ${token}`)
  }
}

for (const stale of [
  '/assets/urai/final/manifests/v3-${handoffName}',
  '/assets/urai/final/manifests/v4-${handoffName}',
]) {
  if (component.includes(stale)) {
    throw new Error(`CanonicalAssetGates still contains stale path ${stale}`)
  }
}

console.log(JSON.stringify({ check: 'canonical-fallback-manifests', expected }, null, 2))
