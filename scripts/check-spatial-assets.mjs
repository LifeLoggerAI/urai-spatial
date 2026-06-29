#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()

const requiredFiles = [
  'urai-tier1/public/xr/navmeshes/home-platform-v1.json',
  'urai-tier1/src/spatial/xr/uraiXrRoomRuntime.ts',
  'urai-tier1/src/spatial/xr/useUraiXrRoom.ts',
  'urai-tier1/scripts/xr/bake-navmesh.mjs',
  'urai-tier1/scripts/xr/quest-device-validation.mjs',
  'urai-tier1/tests/xr-runtime-contract.test.mjs',
]

const missing = requiredFiles.filter((file) => !fs.existsSync(path.join(root, file)))
if (missing.length > 0) {
  console.error('[check:spatial-assets] missing required Spatial/XR files:')
  for (const file of missing) console.error(`- ${file}`)
  process.exit(1)
}

const navmeshPath = path.join(root, 'urai-tier1/public/xr/navmeshes/home-platform-v1.json')
const navmesh = JSON.parse(fs.readFileSync(navmeshPath, 'utf8'))

const anchors = new Set(navmesh.anchors || [])
const requiredAnchors = ['spawn', 'orbFocus', 'safeReturn']
const missingAnchors = requiredAnchors.filter((anchor) => !anchors.has(anchor))

if (navmesh.coordinateSystem !== 'webxr-local-floor') {
  console.error(`[check:spatial-assets] expected webxr-local-floor navmesh coordinate system, found ${navmesh.coordinateSystem}`)
  process.exit(1)
}

if (missingAnchors.length > 0) {
  console.error('[check:spatial-assets] missing required navmesh anchors:')
  for (const anchor of missingAnchors) console.error(`- ${anchor}`)
  process.exit(1)
}

if (!Array.isArray(navmesh.vertices) && typeof navmesh.vertices !== 'number') {
  console.error('[check:spatial-assets] navmesh vertices are missing or invalid')
  process.exit(1)
}

if (!Array.isArray(navmesh.triangles) && typeof navmesh.triangles !== 'number') {
  console.error('[check:spatial-assets] navmesh triangles are missing or invalid')
  process.exit(1)
}

console.log(JSON.stringify({
  ok: true,
  service: 'urai-spatial-assets',
  requiredFiles: requiredFiles.length,
  navmesh: {
    id: navmesh.id,
    coordinateSystem: navmesh.coordinateSystem,
    anchors: requiredAnchors,
  },
}, null, 2))
