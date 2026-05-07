import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8')
}

function flat(code) {
  return code.replace(/\s+/g, ' ')
}

const homeScene = read('src/scene/HomeScene.tsx')
const useManifest = read('src/spatial/assets/useManifest.ts')
const demoStars = read('src/spatial/demo/demoMemoryStars.ts')
const visualOverlay = read('src/scene/SpatialVisualOverlayPremium.tsx')

test('focus and replay default to a demo memory star', () => {
  const source = flat(homeScene)
  assert.match(source, /DEMO_FOCUS_MANIFEST_ID/)
  assert.match(source, /const effectiveManifestId = modeNeedsManifest \? \(manifestId \?\? DEMO_FOCUS_MANIFEST_ID\) : manifestId/)
  assert.match(source, /useManifest\(gateBlocksMode \? null : effectiveManifestId\)/)
  assert.doesNotMatch(source, /Memory star unavailable/)
})

test('demo memory stars are centralized and reusable', () => {
  assert.match(demoStars, /export const DEMO_MEMORY_STARS/)
  assert.match(demoStars, /seed-memory-bloom/)
  assert.match(demoStars, /seed-threshold-storm/)
  assert.match(demoStars, /seed-dream-signal/)
  assert.match(demoStars, /export const DEMO_SPATIAL_MANIFESTS/)
  assert.match(demoStars, /createDemoSpatialManifest/)
})

test('manifest loader uses demo fallback instead of hard failing in preview', () => {
  const source = flat(useManifest)
  assert.match(source, /DEMO_SPATIAL_MANIFESTS/)
  assert.match(source, /NEXT_PUBLIC_URAI_DISABLE_DEMO_FALLBACK/)
  assert.match(source, /getDemoSpatialManifest\(manifestId\)/)
  assert.match(source, /setError\(fallback \? null : `Manifest not found:/)
  assert.match(source, /setError\(fallback \? null : `Invalid spatial manifest:/)
})

test('premium home, lifemap, ascent, and focus overlays expose stable visual test ids', () => {
  assert.match(visualOverlay, /data-testid="urai-home-scene"/)
  assert.match(visualOverlay, /data-testid="urai-ascent-scene"/)
  assert.match(visualOverlay, /data-testid="urai-lifemap-scene"/)
  assert.match(visualOverlay, /data-testid="lifemap-starfield"/)
  assert.match(visualOverlay, /data-testid="urai-focus-scene"/)
  assert.match(visualOverlay, /DEMO_MEMORY_STARS/)
  assert.match(visualOverlay, /urai-life-map-paths/)
})
