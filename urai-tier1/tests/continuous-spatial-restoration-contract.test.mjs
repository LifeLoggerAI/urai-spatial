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
const proof = read('../scripts/capture-continuous-spatial-proof.mjs')
const proofWorkflow = read('../.github/workflows/continuous-spatial-visual-proof.yml')
const homeOwner = read('src/app/FinalHomeThreshold.tsx')
const groundOwner = read('src/app/ground/page.tsx')
const groundWorld = read('src/app/GroundSpatialWorldClean.tsx')
const lifeMapOwner = read('src/app/life-map/page.tsx')

test('app template mounts the restored Home WebGL runtime without replacing route owners', () => {
  assert.match(template, /HomeSpatialRuntimeLayer/)
  assert.match(template, /spatial-runtime-restoration\.css/)
  assert.match(layer, /const normalizedPathname = pathname\.replace/)
  assert.match(layer, /normalizedPathname !== '\/' && normalizedPathname !== '\/home'/)
  assert.match(layer, /data-urai-home-runtime="one-continuous-webgl-world"/)
  assert.match(homeOwner, /HomeSpatialWorldFinal/)
  assert.match(groundOwner, /GroundSpatialWorldClean/)
  assert.match(lifeMapOwner, /SpatialLifeMapCanonical/)
})

test('restored Home is a deterministic visible world with grounded routes and fallback behavior', () => {
  for (const marker of [
    "id: 'ground'",
    "id: 'life-map'",
    "id: 'mirror'",
    "id: 'passport'",
    "id: 'xr'",
    'CameraRig',
    'LivingGround',
    'OrbitControls',
    'Stars',
    'useWebGLAvailable',
    'data-home-spatial-renderer="webgl"',
    'data-home-spatial-geometry="terrain-portals-orb"',
    'data-testid="urai-home-living-ground"',
    'data-testid="urai-home-webgl-orb"',
    'toneMappingExposure = 1.32',
  ]) assert.ok(canvas.includes(marker), `missing Home spatial marker: ${marker}`)

  assert.doesNotMatch(canvas, /EffectComposer|Bloom|Vignette/)
})

test('reviewed Home runtime keeps semantic portal navigation and defensive browser cleanup', () => {
  assert.match(canvas, /import Link from 'next\/link'/)
  assert.match(canvas, /<Link\s+[\s\S]*href=\{spec\.href\}/)
  assert.match(canvas, /data-urai-home-portal=\{spec\.id\}/)
  assert.match(canvas, /typeof query\.addEventListener === 'function'/)
  assert.match(canvas, /query\.addListener\(update\)/)
  assert.match(canvas, /query\.removeListener\(update\)/)
  assert.match(canvas, /document\.body\.style\.cursor = 'default'/)
  assert.match(layer, /HomeSpatialCanvas, \{ useWebGLAvailable \}/)
  assert.doesNotMatch(layer, /function useHomeWebGLAvailable/)
  assert.match(layer, /webglAvailable=\{webglAvailable\}/)
  assert.match(layer, /const doorwayLinks =/)
  assert.match(layer, /className="urai-home-spatial-runtime-portals"/)
  assert.match(layer, /aria-label="Spatial doorway shortcuts"/)
  assert.match(layer, /data-orb-open=\{orbOpen \? 'true' : 'false'\}/)
})

test('Home visual overrides activate only when the WebGL runtime exists', () => {
  assert.match(css, /html:has\(\.urai-home-spatial-runtime-layer\)/)
  assert.match(css, /body:has\(\.urai-home-spatial-runtime-layer\) \.urai-home-spatial-world-final::before/)
  assert.match(css, /body:has\(\.urai-home-spatial-runtime-layer\) \.urai-home-spatial-world-final \.urai-genesis-home__world/)
  assert.doesNotMatch(css, /\n\.urai-home-spatial-world-final::before/)
  assert.doesNotMatch(css, /body:has\(\.urai-home-spatial-world-final\) \.urai-cinematic-backdrop/)
})

test('exact-head browser proof captures desktop mobile and no-WebGL fallback receipts', () => {
  assert.match(proof, /schemaVersion: 'urai-continuous-spatial-visual-proof-5'/)
  assert.match(proof, /home-no-webgl-fallback/)
  assert.match(proof, /patchedGetContext/)
  assert.match(proof, /probeWebGL/)
  assert.match(proof, /WEBGL_debug_renderer_info/)
  assert.match(proof, /browserWebGL/)
  assert.match(proof, /--enable-unsafe-swiftshader/)
  assert.match(proof, /portalShortcutsVisible/)
  assert.match(proof, /portalShortcutsStyled/)
  assert.match(proof, /navigationPillsStyled/)
  assert.match(proof, /navigationRailContained/)
  assert.match(proof, /runtimeAbsent/)
  assert.match(proof, /fallbackOwnerVisible/)
  assert.match(proof, /fallbackActionVisible/)
  assert.match(proof, /\.urai-genesis-home__threshold-gate--ground/)
  assert.match(proof, /fallbackActionHref\?\.startsWith\('\/ground'\)/)
  assert.match(proof, /animations: 'disabled'/)
  assert.match(proof, /timeout: 60_000/)
  assert.match(proof, /desktop-no-webgl/)
  assert.match(proof, /receipt\.json/)
  assert.match(proofWorkflow, /PLAYWRIGHT_BROWSERS_PATH: '0'/)
  assert.match(proofWorkflow, /pnpm --dir urai-tier1 exec playwright install --with-deps chromium/)
  assert.doesNotMatch(proofWorkflow, /resolve\('playwright\/cli'\)/)
  assert.match(proofWorkflow, /chromium\.executablePath\(\)/)
  assert.match(proofWorkflow, /test -x "\$browser_path"/)
  assert.match(proofWorkflow, /playwright-executable-path\.txt/)
  assert.match(proofWorkflow, /Capture desktop mobile and fallback spatial proof/)

  const buildIndex = proofWorkflow.indexOf('Build exact static release candidate before browser installation')
  const installIndex = proofWorkflow.indexOf('Install and prove exact Tier-1 Chromium')
  assert.ok(buildIndex >= 0, 'visual proof must build the exact candidate')
  assert.ok(installIndex > buildIndex, 'browser installation must occur after low-disk build cleanup')
})

test('Ground navigation is rendered as contained touch-safe pills', () => {
  assert.match(groundWorld, /const groundLinkStyle: CSSProperties/)
  assert.match(groundWorld, /display: 'inline-flex'/)
  assert.match(groundWorld, /whiteSpace: 'nowrap'/)
  assert.match(groundWorld, /style=\{groundLinkStyle\}/)
  assert.match(groundWorld, /width:calc\(100vw - 28px\)/)
  assert.match(groundWorld, /scrollbar-width:none/)
})

test('flat route-image veils are suppressed while current Ground and Life Map canvases remain authoritative', () => {
  assert.match(css, /\.ground-provider-art\s*\{\s*display: none !important;/s)
  assert.match(css, /data-testid="urai-r3f-canonical-lifemap"/)
  assert.match(css, /data-testid="urai-true-3d-life-map"/)
  assert.match(css, /\.urai-cinematic-backdrop/)
  assert.match(css, /prefers-reduced-motion: reduce/)
})

test('restoration does not redirect Focus or Replay away from their certified static owners', () => {
  assert.doesNotMatch(template, /focus|replay/i)
  assert.doesNotMatch(layer, /pathname === '\/focus'|pathname === '\/replay'/)
})
