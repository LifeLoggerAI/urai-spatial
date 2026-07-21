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

function canonicalSource(source) {
  return source.replace(/\r\n/g, '\n').replace(/"/g, "'").replace(/\s+/g, ' ').trim()
}

function includesCanonical(source, marker) {
  return canonicalSource(source).includes(canonicalSource(marker))
}

const template = read('src/app/template.tsx')
const layer = read('src/app/HomeSpatialRuntimeLayer.tsx')
const canvas = read('src/app/HomeSpatialCanvas.tsx')
const companion = read('src/spatial/world/PersistentWorldCompanion.tsx')
const css = read('src/app/spatial-runtime-restoration.css')
const structuralCss = read('src/app/continuous-spatial-proof-defects.css')
const proof = read('../scripts/capture-continuous-spatial-proof.mjs')
const proofRunner = read('../scripts/run-continuous-spatial-proof-fixed.mjs')
const proofWorkflow = read('../.github/workflows/continuous-spatial-visual-proof.yml')
const homeOwner = read('src/app/FinalHomeThreshold.tsx')
const groundOwner = read('src/app/ground/page.tsx')
const groundWorld = read('src/app/GroundSpatialWorldClean.tsx')
const groundModel = read('src/app/ground/GroundWorldModel.ts')
const groundScene = read('src/app/ground/GroundWorldScene.tsx')
const groundSourceGraph = `${groundWorld}\n${groundModel}\n${groundScene}`
const groundCanonical = canonicalSource(groundWorld)
const lifeMapOwner = read('src/app/life-map/page.tsx')
const groundGateway = read('src/spatial/world/GroundGateway.tsx')

test('app template mounts the restored WebGL owners without redirecting certified routes', () => {
  assert.match(template, /HomeSpatialRuntimeLayer/)
  assert.match(template, /spatial-runtime-restoration\.css/)
  assert.match(template, /continuous-spatial-proof-defects\.css/)
  assert.match(layer, /data-urai-home-runtime="embodied-continuous-webgl-world"/)
  assert.match(layer, /data-home-exploration="walkable"/)
  assert.match(homeOwner, /HomeSpatialWorldFinal/)
  assert.match(groundOwner, /GroundSpatialWorldClean/)
  assert.match(lifeMapOwner, /SpatialLifeMapCanonical/)
  assert.doesNotMatch(template, /focus|replay/i)
  assert.doesNotMatch(layer, /pathname === ['"]\/focus['"]|pathname === ['"]\/replay['"]/)
})

test('Home is an authored sanctuary with transparent depth and canonical Ground and Life Map thresholds', () => {
  for (const marker of [
    'CameraRig', 'SanctuaryFloor', 'SanctuaryGardens', 'EmbodiedAvatar',
    'RelationshipPresences', 'FirstHomeFrame', 'FrameScheduler', 'Stars',
    'useWebGLAvailable', 'cachedWebGLAvailable', 'data-home-spatial-renderer="webgl"',
    'data-home-spatial-geometry="authored-sanctuary-avatar-orb-sky-ground"',
    'data-home-visual-owner="authored-provider-art"', 'data-home-no-finite-horizon-band="true"',
    'data-tier0-ground-gateway="true"', 'data-testid="urai-home-authored-sanctuary"',
    'data-testid="urai-home-sculpted-gardens"', 'data-testid="urai-home-embodied-avatar"',
    'data-testid="urai-home-webgl-orb"', 'data-testid="urai-home-threshold-controls"',
    'urai:first-home-spatial-frame', 'toneMappingExposure = 1.02',
    'assetCssStack(homeAssets.primary)', 'assetCssStack(homeAssets.mobile)',
    'urai-home-authored-environment', 'gl.setClearColor(0x000000, 0)',
  ]) assert.ok(canvas.includes(marker), `missing Home spatial marker: ${marker}`)

  assert.doesNotMatch(canvas, /tap the ground to enter below/i)
  assert.match(canvas, /const \[available, setAvailable\] = useState<boolean \| null>\(null\)/)
  assert.match(canvas, /if \(cachedWebGLAvailable !== null\)/)
  assert.doesNotMatch(canvas, /useState<boolean \| null>\(cachedWebGLAvailable\)/)
  assert.match(canvas, /const mobile = size\.width < 720/)
  assert.match(canvas, /const compact = size\.height < 650/)
  assert.match(canvas, /if \(mobile\) cameraBase\.set\(0, compact \? 4\.9 : 5\.6, compact \? 14\.2 : 15\.8\)/)
  assert.match(canvas, /else cameraBase\.set\(0, 4\.45, 12\.6\)/)
  assert.match(canvas, /camera\.fov = THREE\.MathUtils\.lerp\(camera\.fov, mobile \? 52 : 45, easing\)/)
  assert.match(canvas, /alpha:\s*true/)
  assert.match(canvas, /premultipliedAlpha:\s*false/)
  assert.doesNotMatch(canvas, /<color attach="background"/)
  assert.doesNotMatch(canvas, /<planeGeometry args=\{\[160, 160/)
  assert.doesNotMatch(canvas, /HorizonArchitecture/)
  assert.doesNotMatch(canvas, /<torusGeometry/)
  assert.doesNotMatch(canvas, /function Tree|const TREES|OrbitControls/)
  assert.doesNotMatch(canvas, /const portals/)
  assert.doesNotMatch(canvas, /portals\.map/)
  assert.doesNotMatch(canvas, /data-urai-home-portal/)
  assert.doesNotMatch(canvas, /id: 'mirror'|id: 'passport'|id: 'xr'/)
  assert.match(groundGateway, /aria-label="Open the ground and descend into Hidden Infrastructure"/)
  assert.match(canvas, /aria-label="Open the Life Map and ascend into Memory Sky"/)
  assert.doesNotMatch(canvas, /aria-label="Open the ground and descend into Hidden Infrastructure"/)
  assert.doesNotMatch(canvas, /onContextLost/)
  assert.doesNotMatch(canvas, /EffectComposer|Bloom|Vignette/)
})

test('Home keeps one accessible persistent companion plus first-frame evidence and defensive browser cleanup', () => {
  assert.match(canvas, /typeof media\.addEventListener === 'function'/)
  assert.match(canvas, /media\.addListener\(update\)/)
  assert.match(canvas, /media\.removeListener\(update\)/)
  assert.match(canvas, /document\.body\.style\.cursor = 'default'/)
  assert.match(layer, /EmbodiedHomeSpatialCanvas/)
  assert.match(layer, /import \{ useWebGLAvailable \} from '\.\/HomeSpatialCanvas'/)
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

test('Ground is an authored private workforce world with explicit truthful destinations', () => {
  for (const marker of [
    'const DESTINATIONS', "id: 'reception'", "id: 'privacy'", "id: 'council'", "id: 'logistics'",
    "id: 'wellness'", "id: 'archive'", "id: 'mirror'", "id: 'passport'", "id: 'consent'",
    "id: 'atlas'", "id: 'focus'", "id: 'replay'", 'GroundDestination', 'DestinationBeacon',
    'WorkforceSignals', 'CameraRig', 'data-ground-destination', 'data-workforce-state',
    'data-service-availability', 'data-testid="urai-ground-private-workforce-world"',
    'data-ground-visual-owner="authored-provider-art"', 'data-ground-no-compositing-bands="true"',
    'ground-authored-beacon-', 'ground-workforce-presence-signals', 'DESTINATIONS.map',
    "availability: 'degraded'", "workforceState: 'blocked'", 'gl.setClearColor(0x000000, 0)',
  ]) assert.ok(includesCanonical(groundSourceGraph, marker), `missing Ground embodied-world marker: ${marker}`)

  assert.doesNotMatch(groundScene, /WorldEnvelope|LayeredTerraces|InitialOverlook/)
  assert.doesNotMatch(groundScene, /<boxGeometry/)
  assert.doesNotMatch(groundScene, /EffectComposer|Bloom|Vignette/)
  assert.doesNotMatch(groundScene, /<color attach="background"/)
  assert.doesNotMatch(groundCanonical, /function\s+GroundPin/)
  assert.doesNotMatch(groundCanonical, /<GroundPin/)
  assert.doesNotMatch(groundCanonical, /OrbitControls/)
})

test('Ground navigation remains contained, keyboard-operable and exposes active destination state', () => {
  assert.match(groundCanonical, /className='ground-destination-compass ground-rail'/)
  assert.match(groundCanonical, /aria-current=\{activeId\s*===\s*destination\.id\s*\?\s*'location'\s*:\s*undefined\}/)
  assert.ok(includesCanonical(groundWorld, 'useMovementInput({'))
  assert.ok(includesCanonical(groundWorld, 'onEscape: () => {'))
  assert.ok(includesCanonical(groundWorld, 'onInteract: () => {'))
  assert.ok(includesCanonical(groundWorld, 'onReset: resetOrientation'))
  assert.ok(includesCanonical(groundWorld, '<MobileMovementPad'))
  assert.ok(includesCanonical(groundWorld, 'Escape returns Home.'))
  assert.match(groundCanonical, /min-height:48px/)
  assert.doesNotMatch(groundCanonical, /min-height:44px/)
  // Ground nearest-edge focus reveal is canonical and prevents mobile rail overflow.
  assert.match(groundCanonical, /scrollIntoView\(\{\s*block:\s*'nearest',\s*inline:\s*'nearest',?\s*\}\)/)
  assert.match(groundCanonical, /@media\(max-width:700px\)[\s\S]*?font-size:\s*9px;\s*transition:\s*none[\s\S]*?strong\{\s*transition:\s*none\s*\}/)
  assert.match(groundCanonical, /overflow-x:auto/)
  assert.match(groundCanonical, /scrollbar-width:none/)
  assert.match(groundCanonical, /max\(12px,env\(safe-area-inset-left\)\)/)
  assert.match(groundCanonical, /aria-label.*destination\.label/s)
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
  assert.ok(proof.includes("path: '/life-map/?demo=1&manifestId=replay-recovery-thread&overview=1'"))
  assert.ok(proof.includes("path: '/life-map/?demo=1&memoryId=quiet-reset&manifestId=replay-recovery-thread&node=quiet-reset'"))
  assert.doesNotMatch(proof, /id: 'life-map',\s*path: '\/life-map\/',/)
  assert.doesNotMatch(proof, /id: 'life-map-selected',\s*path: '\/life-map\/\?memoryId=/)
  assert.match(proof, /getByRole\('navigation', \{ name: 'Direct Home destinations' \}\)/)
  assert.doesNotMatch(proof, /page\.locator\('\.urai-home-spatial-portal-label'\)/)
  assert.match(proofRunner, /!source\.includes\('sceneLabelRetired'\) && !source\.includes\('thresholdLabelsVisible'\)/)
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

test('legacy route-image veils remain suppressed while authored Home and Ground owners stay visible', () => {
  assert.match(css, /\.ground-provider-art\s*\{\s*display: none !important;/s)
  assert.match(groundWorld, /\.ground-authored-art\{[^}]*opacity:\.94/s)
  assert.match(groundWorld, /var\(--ground-provider-desktop\)/)
  assert.match(groundWorld, /var\(--ground-provider-mobile\)/)
  assert.match(canvas, /var\(--home-authored-desktop\)/)
  assert.match(canvas, /var\(--home-authored-mobile\)/)
  assert.match(css, /data-testid="urai-r3f-canonical-lifemap"/)
  assert.match(css, /data-testid="urai-true-3d-life-map"/)
  assert.match(css, /\.urai-cinematic-backdrop/)
  assert.match(css, /prefers-reduced-motion: reduce/)
})
