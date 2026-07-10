import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8')
}

const manifest = read('src/spatial/assets/assetManifest.ts')
const worldManifest = read('src/spatial/assets/worldAssetManifest.ts')
const assetLayer = read('src/spatial/scene/SpatialWorldAssetLayer.tsx')

test('canonical manifest separates selected and proof fallback namespaces', () => {
  assert.match(manifest, /const generatedRoot = '\/assets\/urai\/generated'/)
  assert.match(manifest, /const proofFallbackRoot = '\/assets\/urai\/spatial'/)
  assert.doesNotMatch(manifest, /\/assets\/models\//)
  assert.doesNotMatch(manifest, /status: 'placeholder'/)
})

test('only explicitly ready selected assets count as ready', () => {
  assert.match(
    manifest,
    /export function isUraiSpatialAssetReady\(assetId: string\): boolean \{\s*return getUraiSpatialAsset\(assetId\)\?\.status === 'ready'\s*\}/,
  )
  assert.doesNotMatch(manifest, /status === 'ready' \|\| .*placeholder/)
})

test('resolver chooses selected assets only when ready and otherwise uses explicit fallback', () => {
  assert.match(manifest, /if \(selectedAsset\.status === 'ready'\)/)
  assert.match(manifest, /if \(fallbackAsset\?\.status === 'fallback'\)/)
  assert.match(manifest, /source: 'selected'/)
  assert.match(manifest, /source: 'fallback'/)
  assert.match(manifest, /source: 'unavailable'/)
})

test('active spatial model layer resolves asset ids instead of hardcoded paths', () => {
  assert.match(assetLayer, /resolveUraiSpatialAssetPath/)
  assert.match(assetLayer, /assetId="home-entry-chamber-model-v1"/)
  assert.match(assetLayer, /assetId="ground-world-terrain-glb-v1"/)
  assert.match(assetLayer, /assetId="life-map-memory-star-glb-v1"/)
  assert.match(assetLayer, /assetId="focus-memory-chamber-glb-v1"/)
  assert.match(assetLayer, /assetId="replay-memory-environment-glb-v1"/)
  assert.doesNotMatch(assetLayer, /src="\/assets\/urai\/spatial/)
  assert.match(assetLayer, /if \(!\/\\\.\(\?:gltf\|glb\)\$\/i\.test\(path\)\)/)
})

test('legacy world slots delegate to canonical resolution and contain no competing paths', () => {
  assert.match(worldManifest, /resolveUraiSpatialAssetPath/)
  assert.doesNotMatch(worldManifest, /\/assets\/models\//)
  assert.match(worldManifest, /resolved\('home-entry-chamber-model-v1'\)/)
  assert.match(worldManifest, /resolved\('ground-world-terrain-glb-v1'\)/)
  assert.match(worldManifest, /resolved\('focus-memory-chamber-glb-v1'\)/)
  assert.match(worldManifest, /resolved\('replay-memory-environment-glb-v1'\)/)
})
