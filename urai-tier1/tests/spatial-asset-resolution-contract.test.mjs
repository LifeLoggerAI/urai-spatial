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

test('quarantined portal geometry cannot resolve as active runtime asset authority', () => {
  assert.doesNotMatch(manifest, /portal-ring-master-glb-v1|portal-ring-proof-fallback/)
  assert.doesNotMatch(assetLayer, /portal-ring-master-glb-v1|entry-ground-portal-ring/)
  assert.match(worldManifest, /label: 'Life Map Sky Threshold \\(legacy compatibility slot\\)'/)
  assert.match(worldManifest, /status: 'missing'/)
  assert.match(worldManifest, /portal\\/ring geometry is quarantined as historical provenance/)
})

test('retired or supporting GLBs stay non-authoritative across Life Map Focus Replay and Passport', () => {
  assert.doesNotMatch(manifest, /focus-star-tunnel-proof-fallback|replay-film-portal-proof-fallback/)
  assert.match(manifest, /supportingGlb\('life-map-memory-star-glb-v1'[\s\S]*'life-map-galaxy-assets'/)
  assert.match(manifest, /supportingGlb\('focus-memory-chamber-glb-v1'[\s\S]*'focus-star-assets'/)
  assert.match(manifest, /supportingGlb\('replay-memory-environment-glb-v1'[\s\S]*'replay-memory-assets'/)
  assert.match(manifest, /supportingGlb\('passport-status-room-glb-v1'[\s\S]*'passport-status-room-assets'/)
  assert.match(manifest, /Retained supporting reference only/)
  assert.match(manifest, /status: 'candidate'/)
  assert.match(manifest, /'urai-orb-avatar-glb-v1'[\s\S]*'home'/)
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

test('legacy support asset layer is route-bounded and cannot inject retired cross-route visuals', () => {
  assert.match(assetLayer, /resolvePromotedUraiSpatialAssetPath/)
  assert.match(assetLayer, /data-urai-legacy-support-layer="true"/)
  assert.match(assetLayer, /const showHome = phase === "HOME"/)
  assert.match(assetLayer, /const showGround = phase === "GROUND"/)
  assert.match(assetLayer, /assetId="home-entry-chamber-model-v1"/)
  assert.match(assetLayer, /assetId="ground-world-terrain-glb-v1"/)
  assert.doesNotMatch(assetLayer, /assetId="life-map-memory-star-glb-v1"|assetId="passport-status-room-glb-v1"|focus-selected-star-node-v1/)
  assert.doesNotMatch(assetLayer, /src="\/assets\/urai\/spatial/)
  assert.doesNotMatch(assetLayer, /focus-star-tunnel|replay-film-portal|focus-memory-chamber-glb-v1|replay-memory-environment-glb-v1/)
  assert.match(assetLayer, /if \(!\/\\\.\(\?:gltf\|glb\)\$\/i\.test\(path\)\)/)
})

test('legacy world slots delegate only where canon still permits a model and fail closed elsewhere', () => {
  assert.match(worldManifest, /resolveUraiSpatialAssetPath/)
  assert.doesNotMatch(worldManifest, /\/assets\/models\//)
  assert.match(worldManifest, /resolved\('home-entry-chamber-model-v1'\)/)
  assert.match(worldManifest, /resolved\('ground-world-terrain-glb-v1'\)/)
  assert.match(worldManifest, /lifeMap\.memoryStars[\s\S]*finalModel: ''[\s\S]*status: 'missing'/)
  assert.match(worldManifest, /current visible authority is procedural point\/photosphere plus layered corona/)
  assert.match(worldManifest, /focus\.memoryDiorama[\s\S]*finalModel: ''[\s\S]*status: 'missing'/)
  assert.match(worldManifest, /Focus authority is V395 selected stellar photosphere\/corona with contained memory/)
  assert.match(worldManifest, /Replay authority is an immersive memory interior with truthful source grammar/)
  assert.match(worldManifest, /passport\.identityVault[\s\S]*finalModel: ''[\s\S]*status: 'missing'/)
  assert.match(worldManifest, /Home physical Passport own current product authority/)
  assert.doesNotMatch(worldManifest, /resolved\('life-map-memory-star-glb-v1'\)|resolved\('passport-status-room-glb-v1'\)/)
})
