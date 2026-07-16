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
const css = read('src/app/spatial-runtime-restoration.css')
const structuralCss = read('src/app/continuous-spatial-proof-defects.css')
const premiumMobileCss = read('src/app/premium-mobile-composition.css')
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
  assert.match(template, /premium-mobile-composition\.css/)
  assert.match(layer, /data-urai-home-runtime="one-continuous-webgl-world"/)
  assert.match(homeOwner, /HomeSpatialWorldFinal/)
  assert.match(groundOwner, /GroundSpatialWorldClean/)
  assert.match(lifeMapOwner, /SpatialLifeMapCanonical/)
  assert.doesNotMatch(template, /focus|replay/i)
  assert.doesNotMatch(layer, /pathname === '\/focus'|pathname === '\/replay'/)
})

test('Home is a premium coherent world with aspect-aware framing and layered gateway architecture', () => {
  for (const marker of [
    "id: 'ground'",
    "id: 'life-map'",
    "id: 'mirror'",
    "id: 'passport'",
    "id: 'xr'",
    'CameraRig',
    'LivingGround',
    'HorizonMonoliths',
    'FirstHomeFrame',
    'OrbitControls',
    'Stars',
    'useWebGLAvailable',
    'cachedWebGLAvailable',
    'data-home-spatial-renderer="webgl"',
    'data-home-spatial-geometry="terrain-portals-orb"',
    'data-testid="urai-home-living-ground"',
    'data-testid="urai-home-horizon-architecture"',
    'data-testid="urai-home-webgl-orb"',
    'urai:first-home-spatial-frame',
    'toneMappingExposure = 1.22',
  ]) assert.ok(canvas.includes(marker), `missing Home spatial marker: ${marker}`)

  assert.match(canvas, /const \[available, setAvailable\] = useState<boolean \| null>\(null\)/)
  assert.match(canvas, /if \(cachedWebGLAvailable !== null\)/)
  assert.doesNotMatch(canvas, /useState<boolean \| null>\(cachedWebGLAvailable\)/)
  assert.match(canvas, /const mobile = size\.width < 720/)
  assert.match(canvas, /mobile \? 7\.2 : 5\.25/)
  assert.match(canvas, /mobile \? 24\.5 : 14\.6/)
  assert.match(canvas, /camera\.fov = mobile \? 64 : 50/)
  assert.match(canvas, /position: \[-2\.75, 0\.08, -2\.4\]/)
  assert.match(canvas, /position: \[2\.75, 0\.08, -2\.4\]/)
  assert.match(canvas, /position: \[-5\.2, 0\.08, 0\.75\]/)
  assert.match(canvas, /position: \[5\.2, 0\.08, 0\.75\]/)
  assert.match(canvas, /position: \[0, 0\.08, -5\.4\]/)

  assert.match(canvas, /<planeGeometry args=\{\[48, 48\]\}/)
  assert.doesNotMatch(canvas, /<circleGeometry args=\{\[18, 128\]\}/)
  assert.match(canvas, /<cylinderGeometry args=\{\[1\.75, 2\.05, 0\.24, 72\]\}/)
  assert.match(canvas, /<torusGeometry args=\{\[1\.28, 0\.11, 18, 96, Math\.PI\]\}/)
  assert.match(canvas, /<torusGeometry args=\{\[0\.88, 0\.045, 14, 96\]\}/)
  assert.match(canvas, /spec\.metal/)
  assert.match(canvas, /HorizonMonoliths/)
  assert.match(canvas, /portals\.map/)
  assert.doesNotMatch(canvas, /EffectComposer|Bloom|Vignette/)
})

test('Home keeps semantic navigation, first-frame evidence and defensive browser cleanup', () => {
  assert.match(canvas, /import Link from 'next\/link'/)
  assert.match(canvas, /<Link href=\{spec\.href\}/)
  assert.match(canvas, /data-urai-home-portal=\{spec\.id\}/)
  assert.match(canvas, /typeof query\.addEventListener === 'function'/)
  assert.match(canvas, /query\.addListener\(update\)/)
  assert.match(canvas, /query\.removeListener\(update\)/)
  assert.match(canvas, /document\.body\.style\.cursor = 'default'/)
  assert.match(layer, /HomeSpatialCanvas, \{ useWebGLAvailable \}/)
  assert.match(layer, /className="urai-home-spatial-runtime-portals"/)
  assert.match(layer, /aria-label="Spatial doorway shortcuts"/)
})

test('Home visual overrides remain scoped and final mobile composition defeats canvas cropping', () => {
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
  assert.match(premiumMobileCss, /left: 0 !important/)
  assert.match(premiumMobileCss, /width: 100% !important/)
  assert.match(premiumMobileCss, /max-width: 100% !important/)
  assert.match(premiumMobileCss, /left: -18vw !important/)
  assert.match(premiumMobileCss, /width: 136vw !important/)
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

test('Ground navigation remains contained, touch-safe and exposes the active route', () => {
  assert.match(groundWorld, /const groundLinkStyle: CSSProperties/)
  assert.match(groundWorld, /const groundActiveLinkStyle: CSSProperties/)
  assert.match(groundWorld, /display: 'inline-flex'/)
  assert.match(groundWorld, /whiteSpace: 'nowrap'/)
  assert.match(groundWorld, /aria-current=\{active \? 'page' : undefined\}/)
  assert.match(groundWorld, /style=\{active \? groundActiveLinkStyle : groundLinkStyle\}/)
  assert.match(groundWorld, /max-width:calc\(100vw - 28px\)/)
  assert.match(groundWorld, /scrollbar-width:none/)
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
    'sceneLabelsRendered',
    'portalShortcutsVisible',
    'portalShortcutsStyled',
    'navigationPillsStyled',
    'activeGroundLinkVisible',
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
