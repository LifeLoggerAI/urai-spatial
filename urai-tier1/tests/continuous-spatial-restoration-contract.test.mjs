import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()

function read(relativePath) {
  const absolute = path.join(root, relativePath)
  assert.ok(fs.existsSync(absolute), `missing expected file: ${relativePath}`)
  return fs.readFileSync(absolute, 'utf8')
}

const template = read('src/app/template.tsx')
const layer = read('src/app/HomeSpatialRuntimeLayer.tsx')
const canvas = read('src/app/HomeSpatialCanvas.tsx')
const fallback = read('src/app/HomeSanctuaryFallback.tsx')
const companion = read('src/spatial/world/PersistentWorldCompanion.tsx')
const css = read('src/app/spatial-runtime-restoration.css')
const finalCss = read('src/app/home-sanctuary-final.css')
const ownerCss = read('src/spatial/world/routeOwnerConvergence.css')
const structuralCss = read('src/app/continuous-spatial-proof-defects.css')
const proof = read('../scripts/capture-continuous-spatial-proof.mjs')
const proofWorkflow = read('../.github/workflows/continuous-spatial-visual-proof.yml')
const homeOwner = read('src/app/FinalHomeThreshold.tsx')
const groundOwner = read('src/app/ground/page.tsx')
const groundWorld = read('src/app/GroundSpatialWorldClean.tsx')
const lifeMapOwner = read('src/app/life-map/page.tsx')

test('app template mounts one authoritative Home runtime without redirecting certified routes', () => {
  assert.match(template, /HomeSpatialRuntimeLayer/)
  assert.match(template, /home-sanctuary-final\.css/)
  assert.match(layer, /data-urai-home-runtime="single-authoritative-sanctuary"/)
  assert.match(layer, /HomeSanctuaryFallback/)
  assert.match(homeOwner, /HomeSpatialWorldFinal/)
  assert.match(groundOwner, /GroundSpatialWorldClean/)
  assert.match(lifeMapOwner, /SpatialLifeMapCanonical/)
  assert.doesNotMatch(template, /focus|replay/i)
  assert.doesNotMatch(layer, /pathname === '\/focus'|pathname === '\/replay'/)
})

test('Home is an authored sacred-tech sanctuary with embodied avatar and one visible Orb', () => {
  for (const marker of [
    'CameraRig',
    'SanctuaryFloor',
    'EmbodiedAvatar',
    'RelationshipPresences',
    'HorizonArchitecture',
    'Atmosphere',
    'FirstHomeFrame',
    'FrameScheduler',
    'useWebGLAvailable',
    'data-home-spatial-renderer="webgl"',
    'data-home-spatial-geometry="authored-sanctuary-avatar-orb-sky-ground"',
    'data-home-device-tier',
    'data-home-personalized="true"',
    'data-testid="urai-home-authored-sanctuary"',
    'data-testid="urai-home-embodied-avatar"',
    'data-testid="urai-home-relationship-presences"',
    'data-testid="urai-home-horizon-architecture"',
    'data-testid="urai-home-webgl-orb"',
    'urai:first-home-spatial-frame',
    'meshPhysicalMaterial',
    'frameloop="demand"',
    'powerPreference',
    'webglcontextlost',
  ]) assert.ok(canvas.includes(marker), `missing final Home sanctuary marker: ${marker}`)

  assert.doesNotMatch(canvas, /OrbitControls/)
  assert.doesNotMatch(canvas, /urai-home-spatial-portal-label/)
  assert.doesNotMatch(canvas, /tap the ground to enter below/i)
  assert.doesNotMatch(canvas, /const TREES|const HILLS/)
  assert.doesNotMatch(canvas, /frameloop="always"/)
  assert.match(canvas, /requestUraiWorldTravel/)
  assert.match(canvas, /destination: 'life-map' \| 'infrastructure-hub'/)
  assert.match(canvas, /Open Orb companion/)
  assert.match(canvas, /Open embodied self/)
  assert.match(canvas, /Ascend to Life Map/)
  assert.match(canvas, /Descend to Ground/)
})

test('Home owns native camera composition instead of CSS scaling a desktop canvas', () => {
  for (const mode of ['arrival', 'idle', 'look', 'orb', 'avatar', 'ascending', 'descending']) {
    assert.ok(canvas.includes(`'${mode}'`), `missing camera mode: ${mode}`)
  }
  assert.match(canvas, /const compact = size\.height < 650/)
  assert.match(canvas, /camera\.position\.lerp/)
  assert.match(canvas, /camera\.lookAt/)
  assert.match(canvas, /camera\.fov = THREE\.MathUtils\.lerp/)
  assert.match(ownerCss, /\.urai-home-spatial-runtime-layer canvas[\s\S]*transform: none !important/)
  assert.doesNotMatch(ownerCss, /urai-home-spatial-canvas[\s\S]{0,160}scale\(/)
})

test('Home provides premium no-WebGL and context-loss fallback with identical actions', () => {
  assert.match(layer, /contextLost/)
  assert.match(layer, /webglAvailable === false \|\| contextLost/)
  assert.match(layer, /reason=\{contextLost \? 'context-lost' : 'no-webgl'\}/)
  assert.match(fallback, /data-home-spatial-renderer="layered-2d"/)
  assert.match(fallback, /Ascend to Life Map/)
  assert.match(fallback, /Descend to Ground/)
  assert.match(fallback, /Open Orb companion/)
  assert.match(fallback, /Open embodied self/)
  assert.match(finalCss, /\.urai-home-fallback__floor/)
  assert.match(finalCss, /\.urai-home-fallback__avatar/)
  assert.match(finalCss, /\.urai-home-fallback__orb/)
  assert.match(finalCss, /prefers-reduced-motion: no-preference/)
  assert.match(finalCss, /prefers-contrast: more/)
})

test('Home keeps one accessible persistent companion and suppresses the duplicate launcher', () => {
  assert.match(layer, /requestUraiWorldOrbOpen/)
  assert.match(companion, /aria-label="Travel through the URAI world"/)
  assert.match(companion, /URAI_WORLD_ORB_OPEN_EVENT/)
  assert.match(ownerCss, /data-world-destination='home'\] \.urai-world-companion__orb/)
  assert.match(ownerCss, /clip-path: inset\(50%\)/)
  assert.match(ownerCss, /data-world-destination='home'\] \.urai-world-companion__menu/)
})

test('Home visual overrides remove the second painted page and leave semantic ownership intact', () => {
  assert.match(ownerCss, /body\.urai-home-runtime-active \.urai-genesis-home__world/)
  assert.match(ownerCss, /body\.urai-home-runtime-active \.urai-genesis-home__hero/)
  assert.match(ownerCss, /body\.urai-home-runtime-active \.urai-genesis-home__orb/)
  assert.match(ownerCss, /pointer-events: none !important/)
  assert.match(structuralCss, /living Home canvas owns the painted world/i)
  assert.match(structuralCss, /No DOM veil, rounded mask, blur or inherited visual effect/i)
  assert.match(finalCss, /\.urai-home-spatial-canvas[\s\S]*filter: none !important/)
})

test('Ground is a six-chamber private workforce world rather than an anonymous runway', () => {
  for (const marker of [
    'const GROUND_DISTRICTS',
    "id: 'reception'",
    "id: 'sanctuary'",
    "id: 'council'",
    "id: 'logistics'",
    "id: 'wellness'",
    "id: 'archive'",
    'Reception',
    'Privacy Sanctuary',
    'Council Table',
    'Logistics',
    'Wellness',
    'Archive',
    'GroundDistrict',
    'WorkforceAvatar',
    'CouncilPlaza',
    'GroundPaths',
    'data-ground-district',
    'data-ground-workforce-avatar',
    'data-testid="urai-ground-council-plaza"',
    'data-testid="urai-ground-private-workforce-world"',
    'Your private workforce.',
    'Nothing acts without you.',
  ]) assert.ok(groundWorld.includes(marker), `missing Ground workforce marker: ${marker}`)

  assert.doesNotMatch(groundWorld, /function GroundPin/)
  assert.doesNotMatch(groundWorld, /<GroundPin/)
  assert.match(groundWorld, /GROUND_DISTRICTS\.map/)
  assert.match(groundWorld, /WORKFORCE\.map/)
  assert.match(groundWorld, /ground-district-label/)
  assert.match(groundWorld, /capsuleGeometry/)
})

test('Ground navigation remains contained and touch-safe', () => {
  assert.match(groundWorld, /const groundLinkStyle: CSSProperties/)
  assert.match(groundWorld, /const groundActiveLinkStyle: CSSProperties/)
  assert.match(groundWorld, /display: 'inline-flex'/)
  assert.match(groundWorld, /whiteSpace: 'nowrap'/)
  assert.match(groundWorld, /aria-current=\{active \? 'page' : undefined\}/)
  assert.match(groundWorld, /max-width:calc\(100vw - 28px\)/)
  assert.match(structuralCss, /\.ground-rail a/)
})

test('exact-head browser proof stays deterministic, diagnostic and fallback-safe', () => {
  for (const marker of [
    "schemaVersion: 'urai-continuous-spatial-visual-proof-7'",
    'home-no-webgl-fallback',
    'patchedGetContext',
    'probeWebGL',
    'WEBGL_debug_renderer_info',
    'waitForFirstSpatialFrame',
    'waitForStableAnimationFrames',
    'urai:first-spatial-frame',
    'urai:first-home-spatial-frame',
    'firstHomeFrameMarked',
    'canvasEvidence',
    'visibleElementCount',
    'navigationPillsStyled',
    'navigationRailContained',
    'life-map-selected',
    'selectedMemoryControlsVisible',
    '--enable-unsafe-swiftshader',
    'runtimeAbsent',
    'fallbackOwnerVisible',
    'fallbackActionVisible',
    'desktop-no-webgl',
    'receipt.json',
  ]) assert.ok(proof.includes(marker), `missing browser-proof marker: ${marker}`)

  assert.doesNotMatch(proof, /waitForTimeout/)
  assert.match(proof, /requestAnimationFrame\(\(\) => requestAnimationFrame\(resolve\)\)/)
  assert.match(proofWorkflow, /PLAYWRIGHT_BROWSERS_PATH: '0'/)
  assert.match(proofWorkflow, /pnpm --dir urai-tier1 exec playwright install --with-deps chromium/)
  assert.match(proofWorkflow, /chromium\.executablePath\(\)/)
})

test('Life Map true 3D owner and Canvas wrapper remain full viewport', () => {
  assert.match(structuralCss, /data-testid="urai-true-3d-life-map"/)
  assert.match(structuralCss, /position: fixed !important/)
  assert.match(structuralCss, /height: 100svh !important/)
  assert.match(structuralCss, /> div:has\(> canvas\)/)
  assert.match(structuralCss, /> div:has\(> canvas\) > canvas/)
  assert.match(structuralCss, /height: 100% !important/)
})

test('flat route-image veils remain suppressed while Ground and Life Map canvases own the scene', () => {
  assert.match(css, /\.ground-provider-art\s*\{\s*display: none !important;/s)
  assert.match(css, /data-testid="urai-r3f-canonical-lifemap"/)
  assert.match(css, /data-testid="urai-true-3d-life-map"/)
  assert.match(css, /\.urai-cinematic-backdrop/)
  assert.match(css, /prefers-reduced-motion: reduce/)
})
