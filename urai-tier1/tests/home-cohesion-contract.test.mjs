import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()
const read = (relativePath) => {
  const absolutePath = path.join(root, relativePath)
  assert.ok(fs.existsSync(absolutePath), `missing expected file: ${relativePath}`)
  return fs.readFileSync(absolutePath, 'utf8')
}

const threshold = read('src/app/FinalHomeThreshold.tsx')
const runtime = read('src/app/HomeSpatialRuntimeLayer.tsx')
const world = read('src/app/HomeSpatialWorldFinal.tsx')

test('Home has one canonical route entry and no retired multi-mode shell', () => {
  assert.match(threshold, /HomeSpatialWorldFinal/)
  assert.match(threshold, /useWebGLAvailable/)
  assert.doesNotMatch(threshold, /TierOneExperience|UraiV1Experience|RootModeExperience|UraiSpatialStage/)
  for (const retired of [
    'src/spatial/layout/TierOneExperience.tsx',
    'src/components/urai/UraiV1Experience.tsx',
    'src/app/RootModeExperience.tsx',
    'src/spatial/v1/UraiSpatialStage.tsx',
  ]) {
    assert.equal(fs.existsSync(path.join(root, retired)), false, `${retired} must stay removed`)
  }
})

test('Home runtime ownership only activates on canonical Home paths', () => {
  assert.match(runtime, /normalizedPathname === '\/' \|\| normalizedPathname === '\/home'/)
  assert.match(runtime, /data-urai-home-runtime=/)
  assert.match(runtime, /data-home-visual-owner="asset-driven-personalized-sanctuary"/)
  assert.match(runtime, /AssetDrivenHomeWorld/)
})

test('Home keeps one capability-aware accessible fallback', () => {
  assert.match(runtime, /webglAvailable === false \|\| rendererState === 'failed'/)
  assert.match(runtime, /data-testid="urai-home-accessible-fallback"/)
  assert.match(runtime, /aria-label="Spatial Home fallback"/)
  assert.match(runtime, /<HomeSemanticNavigation \/>/)
  assert.match(runtime, /<HomeSpatialWorldFinal \/>/)
})

test('Home keeps direct semantic Ground, Orb, and Life Map navigation in the runtime boundary', () => {
  assert.match(runtime, /requestUraiWorldOrbOpen/)
  assert.match(runtime, /href: '\/ground\/'/)
  assert.match(runtime, /aria-label="Open Life Map directly"/)
  assert.match(runtime, /href: '\/life-map\/'/)
  assert.match(runtime, /entryPortal: 'home-ground'/)
})

test('Home world preserves separate bounded cinematic ascent and reduced-motion behavior', () => {
  assert.match(world, /HOME_CAMERA_ASCENT_MS/)
  assert.match(world, /navigateThroughThreshold/)
  assert.match(world, /primeTransition\('sky'\)/)
  assert.match(world, /\/life-map\?from=home-sky/)
  assert.match(world, /prefers-reduced-motion: reduce/)
})

test('Home runtime handles WebGL loss and one recovery attempt before semantic fallback', () => {
  assert.match(runtime, /webglcontextlost/)
  assert.match(runtime, /webglcontextrestored/)
  assert.match(runtime, /recoveryAttemptsRef\.current >= 1/)
  assert.match(runtime, /setRendererState\('failed'\)/)
})
