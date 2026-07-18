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
const companion = read('src/spatial/world/PersistentWorldCompanion.tsx')
const css = read('src/app/spatial-runtime-restoration.css')
const structuralCss = read('src/app/continuous-spatial-proof-defects.css')
const proof = read('../scripts/capture-continuous-spatial-proof.mjs')
const proofWorkflow = read('../.github/workflows/continuous-spatial-visual-proof.yml')
const homeOwner = read('src/app/FinalHomeThreshold.tsx')
const groundOwner = read('src/app/ground/page.tsx')
const groundWorld = read('src/app/GroundSpatialWorldClean.tsx')
const lifeMapOwner = read('src/app/life-map/page.tsx')

test('app template mounts the restored WebGL owners without redirecting certified routes', () => {
  assert.match(template, /HomeSpatialRuntimeLayer/)
  assert.match(template, /spatial-runtime-restoration\.css/)
  assert.match(template, /continuous-spatial-proof-defects\.css/)
  assert.match(layer, /data-urai-home-runtime="one-continuous-webgl-world"/)
  assert.match(homeOwner, /HomeSpatialWorldFinal/)
  assert.match(groundOwner, /GroundSpatialWorldClean/)
  assert.match(lifeMapOwner, /SpatialLifeMapCanonical/)
  assert.doesNotMatch(template, /focus|replay/i)
  assert.doesNotMatch(layer, /pathname === '\/focus'|pathname === '\/replay'/)
})

test('Home is an authored sanctuary with adaptive framing and canonical Ground and Life Map thresholds', () => {
  for (const marker of [
    'CameraRig', 'SanctuaryFloor', 'SanctuaryGardens', 'HorizonArchitecture', 'EmbodiedAvatar',
    'RelationshipPresences', 'FirstHomeFrame', 'FrameScheduler', 'Stars',
    'useWebGLAvailable', 'cachedWebGLAvailable', 'data-home-spatial-renderer="webgl"',
    'data-home-spatial-geometry="authored-sanctuary-avatar-orb-sky-ground"', 'data-tier0-ground-gateway="true"',
    'data-testid="urai-home-authored-sanctuary"', 'data-testid="urai-home-sculpted-gardens"',
    'data-testid="urai-home-embodied-avatar"', 'data-testid="urai-home-horizon-architecture"',
    'data-testid="urai-home-webgl-orb"', 'data-testid="urai-home-threshold-controls"',
    'urai:first-home-spatial-frame', 'toneMappingExposure = 1.08',
  ]) assert.ok(canvas.includes(marker), `missing Home spatial marker: ${marker}`)

  assert.doesNotMatch(canvas, /tap the ground to enter below/i)
  assert.match(canvas, /data-tier0-ground-gateway="true"/)
  assert.match(canvas, /const \[available, setAvailable\] = useState<boolean \| null>\(null\)/)
  assert.match(canvas, /if \(cachedWebGLAvailable !== null\)/)
  assert.doesNotMatch(canvas, /useState<boolean \| null>\(cachedWebGLAvailable\)/)
  assert.match(canvas, /const mobile = size\.width < 720/)
  assert.match(canvas, /const compact = size\.height < 650/)
  assert.match(canvas, /if \(mobile\) cameraBase\.set\(0, compact \? 5\.9 : 6\.7, compact \? 15\.6 : 17\.6\)/)
  assert.match(canvas, /else cameraBase\.set\(0, 5\.15, 13\.4\)/)
  assert.match(canvas, /const nextFov = mobile \? \(compact \? 58 : 54\) : 48/)

  assert.match(canvas, /<planeGeometry args=\{\[160, 160, 1, 1\]\}/)
  assert.doesNotMatch(canvas, /<planeGeometry args=\{\[48, 48\]\}/)
  assert.doesNotMatch(canvas, /<circleGeometry args=\{\[13\.5, 128\]\}/)
  assert.doesNotMatch(canvas, /function Tree|const TREES|OrbitControls/)
  assert.doesNotMatch(canvas, /const portals/)
  assert.doesNotMatch(canvas, /portals\.map/)
  assert.doesNotMatch(canvas, /data-urai-home-portal/)
  assert.doesNotMatch(canvas, /id: 'mirror'|id: 'passport'|id: 'xr'/)
  assert.match(canvas, /aria-label="Open the ground and descend into Hidden Infrastructure"/)
  assert.match(canvas, /aria-label="Open the Life Map and ascend into Memory Sky"/)
  assert.doesNotMatch(canvas, /onContextLost/)
  assert.doesNotMatch(canvas, /EffectComposer|Bloom|Vignette/)
})

test('Home keeps one accessible persistent companion plus first-frame evidence and defensive browser cleanup', () => {
  assert.match(canvas, /typeof media\.addEventListener === 'function'/)
  assert.match(canvas, /media\.addListener\(update\)/)
  assert.match(canvas, /media\.removeListener\(update\)/)
  assert.match(canvas, /document\.body\.style\.cursor = 'default'/)
  assert.match(layer, /HomeSpatialCanvas, \{ useWebGLAvailable \}/)
  assert.match(layer, /requestUraiWorldOrbOpen/)
  assert.doesNotMatch(layer, /aria-label="Accessible world entrances"/)
  assert.doesNotMatch(layer, />Enter through Ground</)
  assert.doesNotMatch(layer, />Open the Life Map sky</)
  assert.doesNotMatch(layer, /urai-home-spatial-orb-trigger/)
  assert.doesNotMatch(layer, /urai-home-spatial-runtime-orb/)
  assert.match(companion, /aria-label="Travel through the URAI world"/)
  assert.match(companion, /URAI_WORLD_ORB_OPEN_EVENT/)
  assert.doesNotMatch(layer, /urai-home-spatial-runtime-portals/)
  assert.doesNotMatch(layer, />Mirror<|>Passport<|>XR</)
})

test('Home visual overrides remain scoped to the active WebGL runtime and remove canvas veils', () => {
  assert.match(css, /html:has\(\.urai-home-spatial-runtime-layer\)/)
  assert.match(css, /body:has\(\.urai-home-spatial-runtime-layer\) \.urai-home-spatial-world-final::before/)
  assert.match(structuralCss, /living Home canvas owns the painted world/i)
  assert.match(structuralCss, /No DOM veil, rounded mask, blur or inherited visual effect/i)
  assert.match(structuralCss, /content: none !important/)
  assert.match(structuralCss, /border-radius: 0 !important/)
  assert.match(structuralCss, /clip-path: none !important/)
  assert.match(structuralCss, /filter: none !important/)
  assert.match(structuralCss, /backdrop-filter: none !important/)
  assert.match(structuralCss, /display: none !important/)
})

test('Ground is an embodied private workforce world with explicit destinations and service state', () => {
  for (const marker of [
    'const DESTINATIONS', "id: 'reception'", "id: 'privacy'", "id: 'council'", "id: 'logistics'",
    "id: 'wellness'", "id: 'archive'", "id: 'mirror'", "id: 'passport'", "id: 'consent'",
    "id: 'atlas'", "id: 'focus'", "id: 'replay'", 'GroundDestination', 'WorkforcePresence',
    'DestinationArchitecture', 'Corridor', 'CameraRig', 'data-ground-destination', 'data-workforce-state',
    'data-service-availability', 'data-testid="urai-ground-private-workforce-world"', 'capsuleGeometry',
    'DESTINATIONS.map', 'DESTINATIONS.slice(0, 8).map', "availability: 'degraded'", "workforceState: 'blocked'",
  ]) assert.ok(groundWorld.includes(marker), `missing Ground embodied-world marker: ${marker}`)

  assert.doesNotMatch(groundWorld, /function GroundPin/)
  assert.doesNotMatch(groundWorld, /<GroundPin/)
  assert.doesNotMatch(groundWorld, /OrbitControls/)
})

test('Ground navigation remains contained, keyboard-operable and exposes active destination state', () => {
  assert.match(groundWorld, /className="ground-destination-compass(?: ground-rail)?"/)
  assert.match(groundWorld, /aria-current=\{activeId === destination\.id \? 'location' : undefined\}/)
  assert.match(groundWorld, /window\.addEventListener\('keydown', handleKeyDown\)/)
  assert.match(groundWorld, /window\.removeEventListener\('keydown', handleKeyDown\)/)
  assert.match(groundWorld, /event\.key === 'Escape'/)
  assert.match(groundWorld, /event\.key === 'Enter'/)
  assert.match(groundWorld, /event\.key === 'ArrowRight' \|\| event\.key === 'ArrowDown'/)
  assert.match(groundWorld, /event\.key === 'ArrowLeft' \|\| event\.key === 'ArrowUp'/)
  assert.match(groundWorld, /min-height:48px/)
  assert.doesNotMatch(groundWorld, /min-height:44px/)
  assert.match(groundWorld, /scrollIntoView\(\{ block: 'nearest', inline: 'center' \}\)/)
  assert.match(groundWorld, /overflow-x:auto/)
  assert.match(groundWorld, /scrollbar-width:none/)
  assert.match(groundWorld, /max\(12px,env\(safe-area-inset-left\)\)/)
  assert.match(groundWorld, /aria-label.*destination\.label/s)
})

test('exact-head browser proof stays deterministic, diagnostic and fallback-safe', () => {
  for (const marker of [
    "schemaVersion: 'urai-continuous-spatial-visual-proof-7'", 'home-no-webgl-fallback', 'patchedGetContext',
    'probeWebGL', 'WEBGL_debug_renderer_info', 'waitForFirstSpatialFrame', 'waitForStableAnimationFrames',
    'urai:first-spatial-frame', 'urai:first-home-spatial-frame', 'firstHomeFrameMarked', 'canvasEvidence',
    'visibleElementCount', 'sceneLabelsRendered', 'portalShortcutsVisible', 'portalShortcutsStyled',
    'navigationPillsStyled', 'activeGroundLinkVisible', 'navigationRailContained', 'life-map-selected',
    'selectedMemoryControlsVisible', '--enable-unsafe-swiftshader', 'runtimeAbsent', 'fallbackOwnerVisible',
    'fallbackActionVisible', 'desktop-no-webgl', 'receipt.json',
  ]) assert.ok(proof.includes(marker), `missing browser-proof marker: ${marker}`)

  assert.doesNotMatch(proof, /waitForTimeout/)
  assert.match(proof, /requestAnimationFrame\(\(\) => requestAnimationFrame\(resolve\)\)/)
  assert.match(proofWorkflow, /PLAYWRIGHT_BROWSERS_PATH: '0'/)
  assert.match(proofWorkflow, /pnpm --dir urai-tier1 exec playwright install --with-deps chromium/)
  assert.doesNotMatch(proofWorkflow, /resolve\('playwright\/cli'\)/)
  assert.match(proofWorkflow, /chromium\.executablePath\(\)/)

  const buildIndex = proofWorkflow.indexOf('Build exact static release candidate before browser installation')
  const installIndex = proofWorkflow.indexOf('Install and prove exact Tier-1 Chromium')
  assert.ok(buildIndex >= 0)
  assert.ok(installIndex > buildIndex)
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
