import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8')

const files = {
  root: read('src/app/page.tsx'),
  home: read('src/app/home/page.tsx'),
  threshold: read('src/app/FinalHomeThreshold.tsx'),
  homeRuntime: read('src/app/HomeSpatialRuntimeLayer.tsx'),
  ascent: read('src/app/ascent/page.tsx'),
  lifeMapPage: read('src/app/life-map/page.tsx'),
  lifeMapLayout: read('src/app/life-map/layout.tsx'),
  lifeMap: read('src/spatial/lifemap/SpatialLifeMapCanonical.tsx'),
  lifeMapScene: read('src/components/lifemap/ComposedLifeMapScene.tsx'),
  focus: read('src/app/focus/page.tsx'),
  focusClient: read('src/app/focus/FocusChamberClient.tsx'),
  replay: read('src/app/replay/page.tsx'),
  replayClient: read('src/app/replay/CinematicReplayClient.tsx'),
  unwind: read('src/app/unwind/page.tsx'),
  rules: read('../firebase/firestore.rules'),
  renderer: read('src/spatial/assets/ManifestRenderer.tsx'),
  manifests: read('src/spatial/constellation/useConstellationManifests.ts'),
}

test('Home uses the final route threshold plus pathname-scoped runtime boundary', () => {
  assert.match(files.root, /FinalHomeThreshold/)
  assert.match(files.home, /FinalHomeThreshold/)
  assert.match(files.threshold, /HomeSpatialWorldFinal/)
  assert.match(files.threshold, /useWebGLAvailable/)
  assert.match(files.homeRuntime, /normalizedPathname === '\/' \|\| normalizedPathname === '\/home'/)
  assert.match(files.homeRuntime, /AssetDrivenHomeWorld/)
  assert.doesNotMatch(files.root + files.home + files.threshold + files.homeRuntime, /TierOneExperience|UraiV1Experience|UraiSpatialStage/)
})

test('ascent is a compatibility route into the canonical Home-owned camera path', () => {
  assert.match(files.ascent, /redirect\('\/home\?from=ascent'\)/)
  assert.doesNotMatch(files.ascent, /Canvas|TierOneExperience|UraiSpatialStage/)
  assert.match(files.homeRuntime, /cameraCheckpoint: 'home-sky-ascent'/)
  assert.match(files.homeRuntime, /href: '\/life-map\/\?from=home-sky'/)
})

test('Life Map has one canonical route-layout owner and one Canvas scene', () => {
  assert.match(files.lifeMapLayout, /SpatialLifeMapCanonical/)
  assert.match(files.lifeMapPage, /SpatialLifeMapCanonical/)
  assert.match(files.lifeMap, /data-testid="urai-r3f-canonical-lifemap"/)
  assert.match(files.lifeMap, /LifeMapRouteBoundary/)
  assert.equal((files.lifeMapScene.match(/<Canvas\b/g) || []).length, 1)
  assert.match(files.lifeMapScene, /data-testid="urai-true-3d-life-map"/)
})

test('Life Map selection enters Focus and Replay without a parallel mode router', () => {
  assert.match(files.lifeMapScene, /destinationHref\("focus"\)/)
  assert.match(files.lifeMapScene, /destinationHref\("replay"\)/)
  assert.match(files.lifeMapScene, /Enter Focus/)
  assert.match(files.lifeMapScene, /Replay/)
  assert.match(files.focus, /FinalFocusChamber/)
  assert.match(files.replay, /FinalReplayFilm/)
  assert.match(files.focusClient, /requestUraiWorldReturn/)
  assert.match(files.replayClient, /requestUraiWorldReturn/)
})

test('Escape and unwind recover to canonical safe owners', () => {
  assert.match(files.lifeMapScene, /event\.key !== "Escape"/)
  assert.match(files.lifeMapScene, /router\.push\("\/home"\)/)
  assert.match(files.unwind, /redirect\('\/life-map\?from=unwind&overview=1'\)/)
  assert.doesNotMatch(files.unwind, /TierOneExperience|Canvas/)
})

test('Home and Life Map keep reduced-motion and WebGL failure handling', () => {
  assert.match(files.homeRuntime, /webglcontextlost/)
  assert.match(files.homeRuntime, /webglcontextrestored/)
  assert.match(files.homeRuntime, /data-testid="urai-home-accessible-fallback"/)
  assert.match(files.lifeMap, /useWebGLCapability/)
  assert.match(files.lifeMapScene, /profile\.reducedMotion/)
  assert.match(files.lifeMapScene, /webglcontextlost/)
  assert.match(files.lifeMapScene, /webglcontextrestored/)
})

test('retired parallel product runtimes stay removed', () => {
  for (const retired of [
    'src/spatial/layout/TierOneExperience.tsx',
    'src/components/urai/UraiV1Experience.tsx',
    'src/app/RootModeExperience.tsx',
    'src/spatial/v1/UraiSpatialStage.tsx',
  ]) {
    assert.equal(fs.existsSync(path.join(root, retired)), false, `${retired} must stay removed`)
  }
})

test('Firestore, constellation listener, and manifest renderer remain production safe', () => {
  assert.match(files.rules, /match \/assetManifests\/\{manifestId\}/)
  assert.match(files.rules, /allow get, list: if isAdmin\(\) \|\| isManifestOwner\(\) \|\| isLaunchDemoOwner\(resource\.data\.ownerId\);/)
  assert.match(files.rules, /allow create: if isAdmin\(\) && isValidSpatialManifestCreate\(\);/)
  assert.match(files.rules, /allow update: if isAdmin\(\) && isValidSpatialManifestCreate\(\);/)
  assert.match(files.rules, /allow delete: if isAdmin\(\);/)

  assert.match(files.manifests, /where\('ownerId', '==', ownerId\)/)
  assert.match(files.manifests, /orderBy\('createdAt', 'desc'\)/)
  assert.match(files.manifests, /NEXT_PUBLIC_URAI_MANIFEST_OWNER_ID/)
  assert.match(files.manifests, /LAUNCH_DEMO_OWNER_ID = 'launch-demo'/)

  assert.match(files.renderer, /function FallbackPanel/)
  assert.match(files.renderer, /function isSafeAssetUrl/)
  assert.match(files.renderer, /No asset attached/)
  assert.match(files.renderer, /Asset URL unavailable/)
  assert.match(files.renderer, /Unsupported asset type/)
})
