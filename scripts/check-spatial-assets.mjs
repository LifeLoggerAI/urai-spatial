#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const root = process.cwd()
const tier1Root = path.join(root, 'urai-tier1')
const publicRoot = path.join(tier1Root, 'public')
const uraiAssetRoot = path.join(publicRoot, 'assets', 'urai')

function fail(title, items = []) {
  console.error(`[check:spatial-assets] ${title}`)
  for (const item of items) console.error(`- ${item}`)
  process.exit(1)
}

function run(command, cwd = root) {
  const result = spawnSync(command, {
    cwd,
    shell: true,
    encoding: 'utf8',
    env: { ...process.env, FORCE_COLOR: '0', CI: process.env.CI || '1' },
  })
  if (result.status !== 0) {
    fail(`command failed: ${command}`, [result.stdout || '', result.stderr || ''].filter(Boolean))
  }
  return result
}

const requiredXrSourceFiles = [
  'urai-tier1/src/spatial/xr/uraiXrRoomRuntime.ts',
  'urai-tier1/src/spatial/xr/useUraiXrRoom.ts',
  'urai-tier1/scripts/xr/bake-navmesh.mjs',
  'urai-tier1/scripts/xr/quest-device-validation.mjs',
  'urai-tier1/tests/xr-runtime-contract.test.mjs',
]

const missingXrSourceFiles = requiredXrSourceFiles.filter((file) => !fs.existsSync(path.join(root, file)))
if (missingXrSourceFiles.length > 0) fail('missing required Spatial/XR source files:', missingXrSourceFiles)

const navmeshPath = path.join(publicRoot, 'xr', 'navmeshes', 'home-platform-v1.json')
if (!fs.existsSync(navmeshPath)) {
  run('node scripts/xr/bake-navmesh.mjs', tier1Root)
}

if (!fs.existsSync(navmeshPath)) {
  fail('XR navmesh was not generated:', ['urai-tier1/public/xr/navmeshes/home-platform-v1.json'])
}

const navmesh = JSON.parse(fs.readFileSync(navmeshPath, 'utf8'))
const requiredAnchors = ['spawn', 'orbFocus', 'safeReturn']
const anchors = Array.isArray(navmesh.anchors)
  ? new Set(navmesh.anchors)
  : new Set(Object.keys(navmesh.anchors || {}))
const missingAnchors = requiredAnchors.filter((anchor) => !anchors.has(anchor))

if (navmesh.coordinateSystem !== 'webxr-local-floor') {
  fail(`expected webxr-local-floor navmesh coordinate system, found ${navmesh.coordinateSystem}`)
}

if (missingAnchors.length > 0) fail('missing required navmesh anchors:', missingAnchors)

if (!Array.isArray(navmesh.vertices) && typeof navmesh.vertices !== 'number') {
  fail('navmesh vertices are missing or invalid')
}

if (!Array.isArray(navmesh.triangles) && typeof navmesh.triangles !== 'number') {
  fail('navmesh triangles are missing or invalid')
}

const assetRegistryPath = path.join(root, 'urai-tier1/src/spatial/assets/uraiAssets.ts')
if (!fs.existsSync(assetRegistryPath)) fail('missing URAI route asset registry:', [assetRegistryPath])

const assetRegistry = fs.readFileSync(assetRegistryPath, 'utf8')
const referencedAssetPaths = new Set()
for (const match of assetRegistry.matchAll(/\b(?:webp|fallback)\("([^"\n]+)"\)/g)) {
  referencedAssetPaths.add(match[1])
}

const missingRouteAssets = [...referencedAssetPaths]
  .map((assetPath) => assetPath.replace(/^\/+/, ''))
  .filter((assetPath) => !fs.existsSync(path.join(uraiAssetRoot, assetPath)))

if (missingRouteAssets.length > 0) {
  fail('missing URAI route assets referenced by uraiAssets.ts:', missingRouteAssets.map((assetPath) => `/assets/urai/${assetPath}`))
}

const finalAssetReceiptPath = path.join(root, 'docs/final-asset-receipt.md')
let finalAssetReceipt = { present: false, result: 'missing', placeholderFinalCount: 0 }
if (fs.existsSync(finalAssetReceiptPath)) {
  const receipt = fs.readFileSync(finalAssetReceiptPath, 'utf8')
  const result = receipt.match(/^Result:\s*(.+)$/m)?.[1]?.trim() || 'unknown'
  const placeholderFinalCount = (receipt.match(/placeholder-final/g) || []).length
  finalAssetReceipt = { present: true, result, placeholderFinalCount }
}

console.log(JSON.stringify({
  ok: true,
  service: 'urai-spatial-assets',
  xr: {
    requiredSourceFiles: requiredXrSourceFiles.length,
    generatedNavmesh: true,
    navmesh: {
      id: navmesh.id,
      coordinateSystem: navmesh.coordinateSystem,
      anchors: requiredAnchors,
      vertices: Array.isArray(navmesh.vertices) ? navmesh.vertices.length : navmesh.vertices,
      triangles: Array.isArray(navmesh.triangles) ? navmesh.triangles.length : navmesh.triangles,
    },
  },
  routeAssets: {
    registry: 'urai-tier1/src/spatial/assets/uraiAssets.ts',
    publicRoot: 'urai-tier1/public/assets/urai',
    referencedAssets: referencedAssetPaths.size,
    missingAssets: 0,
  },
  finalAssetReceipt,
}, null, 2))
