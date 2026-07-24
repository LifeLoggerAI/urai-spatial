import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()
const read = (relativePath) => {
  const absolute = path.join(root, relativePath)
  assert.ok(fs.existsSync(absolute), `missing expected file: ${relativePath}`)
  return fs.readFileSync(absolute, 'utf8')
}
const canonical = (source) => source.replace(/\r\n/g, '\n').replace(/"/g, "'").replace(/\s+/g, ' ').trim()
const includesCanonical = (source, marker) => canonical(source).includes(canonical(marker))

const template = read('src/app/template.tsx')
const homeRuntime = read('src/app/HomeSpatialRuntimeLayer.tsx')
const assetHome = read('src/app/AssetDrivenHomeWorld.tsx')
const finalHome = read('src/app/FinalHomeWorld.tsx')
const companion = read('src/spatial/world/PersistentWorldCompanion.tsx')
const css = read('src/app/spatial-runtime-restoration.css')
const structuralCss = read('src/app/continuous-spatial-proof-defects.css')
const proof = read('../scripts/capture-continuous-spatial-proof.mjs')
const proofRunner = read('../scripts/run-continuous-spatial-proof-fixed.mjs')
const proofWorkflow = read('../.github/workflows/continuous-spatial-visual-proof.yml')
const groundOwner = read('src/app/ground/page.tsx')
const ground = read('src/app/GroundSpatialWorldClean.tsx')
const groundModel = read('src/app/ground/GroundWorldModel.ts')
const groundScene = read('src/app/ground/EmbodiedGroundScene.tsx')
const groundArchitecture = read('src/app/ground/GroundContinuityArchitecture.tsx')
const lifeMapOwner = read('src/app/life-map/page.tsx')
const groundGateway = read('src/spatial/world/GroundGateway.tsx')
const homeGraph = `${homeRuntime}\n${assetHome}\n${finalHome}`
const groundGraph = `${ground}\n${groundModel}\n${groundScene}\n${groundArchitecture}`
const groundCanonical = canonical(ground)

test('app template mounts the current WebGL owners without redirecting certified routes', () => {
  assert.match(template, /HomeSpatialRuntimeLayer/)
  assert.match(template, /spatial-runtime-restoration\.css/)
  assert.match(template, /continuous-spatial-proof-defects\.css/)
  assert.match(homeRuntime, /data-urai-home-runtime="asset-driven-primary-with-procedural-degraded-fallback"/)
  assert.match(homeRuntime, /data-home-visual-owner="asset-driven-personalized-sanctuary"/)
  assert.match(homeRuntime, /data-home-exploration="walkable"/)
  assert.match(homeRuntime, /AssetDrivenHomeWorld/)
  assert.match(assetHome, /data-home-primary-owner="asset-driven"/)
  assert.match(assetHome, /FinalHomeWorld/)
  assert.match(groundOwner, /GroundSpatialWorldClean/)
  assert.match(lifeMapOwner, /SpatialLifeMapCanonical/)
  assert.doesNotMatch(template, /focus|replay/i)
  assert.doesNotMatch(homeRuntime, /pathname === ['"]\/focus['"]|pathname === ['"]\/replay['"]/)
})

test('Home is one living sanctuary with canonical Ground and Life Map thresholds', () => {
  for (const marker of [
    'FinalHomeWorld', 'Stars', 'SanctuaryWorld',
    'data-home-spatial-renderer="webgl"', 'data-home-visible-world="final-physical-sanctuary-memory-rooms"',
    'data-home-movement="walk-keyboard-click-touch"', 'data-home-pointer-lock="false"',
    'data-testid="urai-home-walkable-surface"', 'data-testid="urai-home-webgl-orb"',
    'data-testid="urai-home-embodied-avatar"', 'aria-label="Open Orb directly"',
    'aria-label="Open Ground directly"', 'aria-label="Open Life Map directly"',
    'home-visible-navigable-sanctuary-world', 'home-memory-vignette-',
    'place-loved', 'ride-home', 'voices-dinner', 'song-returned', 'quiet-growth',
  ]) assert.ok(homeGraph.includes(marker), `missing Home spatial marker: ${marker}`)

  assert.match(groundGateway, /aria-label="Open the ground and descend into Hidden Infrastructure"/)
  assert.doesNotMatch(homeGraph, /requestPointerLock|OrbitControls|EffectComposer|<Bloom\b|<Vignette\b/)
})

test('Home keeps one accessible companion plus first-frame and recovery evidence', () => {
  assert.match(homeRuntime, /requestUraiWorldOrbOpen/)
  assert.match(homeRuntime, /addEventListener\('webglcontextlost', onContextLost\)/)
  assert.match(homeRuntime, /addEventListener\('webglcontextrestored', onContextRestored\)/)
  assert.match(homeRuntime, /accessible-fallback-after-renderer-failure/)
  assert.match(companion, /aria-label="Travel through the URAI world"/)
  assert.match(companion, /URAI_WORLD_ORB_OPEN_EVENT/)
  assert.doesNotMatch(homeRuntime, /urai-home-spatial-runtime-portals|urai-home-spatial-runtime-orb/)
})

test('Home visual overrides stay scoped and cannot veil the active canvas', () => {
  assert.match(css, /html:has\(\.urai-home-spatial-runtime-layer\)/)
  assert.match(structuralCss, /living Home canvas owns the painted world/i)
  assert.match(structuralCss, /No DOM veil, rounded mask, blur or inherited visual effect/i)
  for (const marker of ['content: none !important', 'border-radius: 0 !important', 'clip-path: none !important', 'filter: none !important', 'backdrop-filter: none !important']) {
    assert.ok(structuralCss.includes(marker), `missing veil-removal marker: ${marker}`)
  }
})

test('Ground is a procedural architectural workforce world with truthful destinations', () => {
  for (const marker of [
    'const DESTINATIONS', "id: 'reception'", "id: 'privacy'", "id: 'council'", "id: 'logistics'",
    "id: 'wellness'", "id: 'archive'", "id: 'mirror'", "id: 'passport'", "id: 'consent'",
    "id: 'atlas'", "id: 'focus'", "id: 'replay'", 'GroundDestination',
    'data-ground-destination', 'data-workforce-state', 'data-service-availability',
    'data-testid="urai-ground-private-workforce-world"',
    'data-ground-visual-owner="shared-continuity-architecture"',
    'data-ground-no-compositing-bands="true"', 'GroundContinuityArchitecture', 'EmbodiedGroundScene',
    'ground-continuity-architectural-shell', 'ground-walkable-navigation-surface',
    'ground-walkable-path-network', 'ground-central-nexus', 'ground-enterable-threshold-',
    'ground-workforce-and-council-presences', "availability: 'degraded'", "workforceState: 'blocked'",
  ]) assert.ok(includesCanonical(groundGraph, marker), `missing Ground embodied-world marker: ${marker}`)

  assert.doesNotMatch(groundGraph, /data-ground-visual-owner="authored-provider-art"|ground-authored-art|--ground-provider-|assetCssStack\(groundAssets\./)
  assert.doesNotMatch(groundScene, /WorldEnvelope|LayeredTerraces|InitialOverlook|EffectComposer|<Bloom\b|<Vignette\b|<color attach="background"/)
  assert.doesNotMatch(groundCanonical, /function\s+GroundPin|<GroundPin|OrbitControls/)
})

test('Ground navigation remains contained, keyboard-operable and safe-area aware', () => {
  assert.match(groundCanonical, /className='ground-destination-compass ground-rail'/)
  assert.ok(includesCanonical(ground, 'useMovementInput({'))
  assert.ok(includesCanonical(ground, 'onEscape: () => {'))
  assert.ok(includesCanonical(ground, 'onInteract: () => {'))
  assert.ok(includesCanonical(ground, 'onReset: resetOrientation'))
  assert.ok(includesCanonical(ground, '<MobileMovementPad'))
  assert.match(groundCanonical, /min-height:48px/)
  assert.doesNotMatch(groundCanonical, /min-height:44px/)
  assert.match(groundCanonical, /scrollIntoView\(\{\s*block:\s*'nearest',\s*inline:\s*'nearest',?\s*\}\)/)
  assert.match(groundCanonical, /scroll-padding-inline-start:max\(14px,env\(safe-area-inset-left\)\)/)
  assert.match(groundCanonical, /scroll-padding-inline-end:max\(14px,env\(safe-area-inset-right\)\)/)
})

test('exact-head browser proof stays deterministic, diagnostic and fallback-safe', () => {
  for (const marker of [
    "schemaVersion: 'urai-continuous-spatial-visual-proof-7'", 'home-no-webgl-fallback',
    'probeWebGL', 'WEBGL_debug_renderer_info', 'waitForFirstSpatialFrame',
    'urai:first-spatial-frame', 'canvasEvidence',
    'navigationRailContained', 'life-map-selected', 'selectedMemoryControlsVisible',
    '--enable-unsafe-swiftshader', 'fallbackOwnerVisible', 'desktop-no-webgl', 'receipt.json',
  ]) assert.ok(proof.includes(marker), `missing browser-proof marker: ${marker}`)
  assert.doesNotMatch(proof, /waitForTimeout/)
  assert.match(proof, /getByRole\('navigation', \{ name: 'Direct Home destinations' \}\)/)
  assert.match(proofRunner, /!source\.includes\('sceneLabelRetired'\) && !source\.includes\('thresholdLabelsVisible'\)/)
  assert.match(proofWorkflow, /PLAYWRIGHT_BROWSERS_PATH: '0'/)
  assert.match(proofWorkflow, /pnpm --dir urai-tier1 exec playwright install --with-deps chromium/)
})

test('Life Map true 3D owner and Canvas wrapper remain full viewport', () => {
  assert.match(structuralCss, /data-testid="urai-true-3d-life-map"/)
  assert.match(structuralCss, /position: fixed !important/)
  assert.match(structuralCss, /height: 100svh !important/)
  assert.match(structuralCss, /> div:has\(> canvas\)/)
  assert.match(structuralCss, /> div:has\(> canvas\) > canvas/)
})

test('legacy route-image veils stay suppressed while current spatial owners remain visible', () => {
  assert.match(css, /\.ground-provider-art\s*\{\s*display: none !important;/s)
  assert.doesNotMatch(groundGraph, /\.ground-authored-art\{|var\(--ground-provider-desktop\)|var\(--ground-provider-mobile\)/)
  assert.match(css, /data-testid="urai-r3f-canonical-lifemap"/)
  assert.match(css, /data-testid="urai-true-3d-life-map"/)
  assert.match(css, /prefers-reduced-motion: reduce/)
})
