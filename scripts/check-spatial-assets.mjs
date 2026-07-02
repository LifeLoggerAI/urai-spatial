#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const publicRoot = path.join(root, 'urai-tier1', 'public')
const uraiAssetRoot = path.join(publicRoot, 'assets', 'urai')

function fail(title, items = []) {
  console.error(`[check:spatial-assets] ${title}`)
  for (const item of items) console.error(`- ${item}`)
  process.exit(1)
}

const requiredXrFiles = [
  'urai-tier1/public/xr/navmeshes/home-platform-v1.json',
  'urai-tier1/src/spatial/xr/uraiXrRoomRuntime.ts',
  'urai-tier1/src/spatial/xr/useUraiXrRoom.ts',
  'urai-tier1/scripts/xr/bake-navmesh.mjs',
  'urai-tier1/scripts/xr/quest-device-validation.mjs',
  'urai-tier1/tests/xr-runtime-contract.test.mjs',
]

const missingXrFiles = requiredXrFiles.filter((file) => !fs.existsSync(path.join(root, file)))
if (missingXrFiles.length > 0) fail('missing required Spatial/XR files:', missingXrFiles)

const navmeshPath = path.join(root, 'urai-tier1/public/xr/navmeshes/home-platform-v1.json')
const navmesh = JSON.parse(fs.readFileSync(navmeshPath, 'utf8'))
const anchors = new Set(navmesh.anchors || [])
const requiredAnchors = ['spawn', 'orbFocus', 'safeReturn']
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
    requiredFiles: requiredXrFiles.length,
    navmesh: {
      id: navmesh.id,
      coordinateSystem: navmesh.coordinateSystem,
      anchors: requiredAnchors,
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
