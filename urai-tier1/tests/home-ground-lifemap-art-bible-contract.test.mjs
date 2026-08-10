import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const read = (path) => fs.readFileSync(path, 'utf8')
const homeRuntime = read('src/app/HomeSpatialRuntimeLayer.tsx')
const assetHome = read('src/app/AssetDrivenHomeWorld.tsx')
const homeProductionEntry = read('src/spatial/layout/HomeWorldProduction.tsx')
const homeProduction = read('src/spatial/layout/HomeWorldProductionPolished.tsx')
const homeCss = read('src/spatial/layout/HomeWorldProduction.module.css')
const fallbackHome = read('src/app/FinalHomeWorld.tsx')
const groundGateway = read('src/spatial/world/GroundGateway.tsx')
const groundOwner = read('src/app/GroundSpatialWorldClean.tsx')
const groundModel = read('src/app/ground/GroundWorldModel.ts')
const lifeMap = read('src/spatial/lifemap/SpatialLifeMapCanonical.tsx')
const lifeMapWorld = read('src/components/lifemap/LifeMapProductionWorld.tsx')

const homeGraph = `${homeRuntime}\n${assetHome}\n${homeProductionEntry}\n${homeProduction}\n${homeCss}\n${fallbackHome}`
const groundGraph = `${groundOwner}\n${groundModel}`

test('Home is one believable authored 3D real-world environment with atmospheric imagery only', () => {
  for (const marker of [
    'AssetDrivenHomeWorld',
    'HomeWorldProduction',
    'data-home-visual-owner="asset-driven-personalized-sanctuary"',
    'data-home-primary-owner="asset-driven"',
    'data-home-real-world-first="true"',
    'data-home-visible-world="authored-coherent-three-dimensional-sanctuary"',
    'data-home-world-character="believable-natural-inhabitable-environment"',
    'data-home-visible-portals="false"',
    'data-home-transition-affordances="ground-environmental-descent life-map-sky-lookout"',
    'data-home-provider-environment={HOME_PROVIDER_ENVIRONMENT}',
    'data-home-provider-role="atmospheric-support-only"',
    'data-home-generated-scenery="suppressed"',
    'data-home-physical-base="authored-coherent-world"',
    'data-home-visual-ownership="three-dimensional-geometry"',
    'data-home-desktop-mobile-world="same-scene"',
    'data-home-embodied-self="privacy-preserving-shadow"',
    'data-home-movement="walk-keyboard-click-touch"',
    'data-home-pointer-lock="false"',
    'home-visible-navigable-sanctuary-world',
    'data-testid="urai-home-embodied-avatar"',
    'data-testid="urai-home-webgl-orb"',
    'home-authored-terrain',
    'home-mountain-horizon',
    'home-living-vegetation',
    'home-reflecting-water',
    'home-orb-sanctuary',
    'home-ground-environmental-threshold',
    'home-life-map-sky-lookout',
    'stepEmbodiedMotion',
    'useMovementInput',
    'MobileMovementPad',
  ]) assert.ok(homeGraph.includes(marker), `missing Home coherent 3D convergence marker: ${marker}`)

  assert.match(homeProductionEntry, /export \{ HomeWorldProductionPolished as HomeWorldProduction \} from "\.\/HomeWorldProductionPolished"/)
  assert.match(groundGateway, /aria-label="Open the ground and descend into Hidden Infrastructure"/)
  assert.match(homeProduction, /HOME_PROVIDER_ENVIRONMENT = '\/assets\/urai\/replay\/replay-memory-film-main\.webp'/)
  assert.match(homeProduction, /HOME_FERN_MODEL = '\/assets\/urai\/home-production\/cc0\/polyhaven-fern-02-geometry-v1\.glb'/)
  assert.match(homeCss, /replay-memory-film-main\.webp/)
  assert.doesNotMatch(homeCss, /replay-memory-film-mobile\.webp/)
  assert.match(homeCss, /\.world::before\s*\{[\s\S]*z-index:\s*3[\s\S]*opacity:\s*\.028[\s\S]*mix-blend-mode:\s*soft-light/)
  assert.match(homeCss, /@media \(max-width: 700px\)[\s\S]*replay-memory-film-main\.webp[\s\S]*opacity:\s*\.02/)
  assert.match(homeCss, /\.world :global\(\.urai-mobile-movement\)\s*\{[\s\S]*opacity:\s*\.18/)
  assert.match(homeProduction, /gl=\{\{[^}]*alpha:\s*false/s)
  assert.match(homeProduction, /new THREE\.PlaneGeometry\(90, 90, 180, 180\)/)
  assert.match(homeProduction, /function Terrain\(/)
  assert.match(homeProduction, /function Vegetation\(/)
  assert.match(homeProduction, /useGLTF\(HOME_FERN_MODEL\)/)
  assert.match(homeProduction, /home-scanned-fern-/)
  assert.match(homeProduction, /function Horizon\(/)
  assert.match(homeProduction, /function Water\(/)
  assert.match(homeProduction, /function Orb\(/)
  assert.match(homeProduction, /function EmbodiedPresence\(/)
  assert.match(homeProduction, /function Thresholds\(/)
  assert.match(homeProduction, /function PlayerRig\(/)
  assert.match(homeProduction, /function SceneReady\(/)
  assert.match(homeProduction, /const candidates: readonly \[Nearby, THREE\.Vector3, number\]\[\]/)
  assert.match(homeProduction, /matchMedia\('\(prefers-reduced-motion: reduce\)'\)/)
  assert.match(homeProduction, /matchMedia\('\(pointer: coarse\), \(max-width: 700px\)'\)/)
  assert.match(homeProduction, /duration = reducedMotion \? \.42/)
  assert.match(homeProduction, /event\.key !== 'Escape'/)
  assert.match(homeProduction, /cameraCheckpoint: 'home-ground-descent'/)
  assert.match(homeProduction, /cameraCheckpoint: 'home-sky-ascent-complete'/)
  assert.match(homeProduction, /requestUraiWorldTravel/)
  assert.match(homeProduction, /representation: 'privacy-preserving-first-person-presence'/)
  assert.match(homeProduction, /data-home-runtime-assets="polyhaven-fern-02-geometry-v1\.glb local-three-dimensional-terrain living-orb reflecting-water"/)
  assert.doesNotMatch(homeProduction, /@react-three\/postprocessing|EffectComposer|<Bloom\b|<Vignette\b/)
  assert.doesNotMatch(homeProduction, /PORTAL_MODEL|WorldPortal|destinationNames|home-life-map-portal-world-owned|home-ground-portal-world-owned|dodecahedronGeometry/)
  assert.doesNotMatch(homeRuntime, /EmbodiedHomeSpatialCanvas|HomeSanctuaryWorld/)
  assert.doesNotMatch(homeGraph, /assetCssStack\(homeAssets\.|home-authored-art|requestPointerLock|OrbitControls/)
})

test('Ground is one embodied cinematic infrastructure world', () => {
  for (const marker of [
    'data-ground-visual-owner="shared-continuity-architecture"',
    'data-ground-no-compositing-bands="true"',
    'data-ground-exploration="walkable"',
    'data-ground-pointer-lock="false"',
    'data-ground-destination',
    'ground-continuity-architectural-shell',
    'ground-walkable-navigation-surface',
    'ground-walkable-path-network',
    'ground-central-nexus',
    'ground-enterable-threshold-',
    'ground-workforce-and-council-presences',
    'stepEmbodiedMotion',
    'useMovementInput',
    'MobileMovementPad',
    'EffectComposer',
    '<Bloom',
    '<Vignette',
    'liftedMaterial',
    'camera.position.lerp',
  ]) assert.ok(groundGraph.includes(marker), `missing Ground architectural-owner marker: ${marker}`)

  for (const form of ['pavilion', 'sanctuary', 'council', 'transit', 'restorative', 'archive', 'reflection', 'vault', 'observatory', 'aperture', 'theater']) {
    assert.ok(groundModel.includes(`"${form}"`) || groundModel.includes(`'${form}'`), `missing Ground chamber form: ${form}`)
  }
  for (const signature of ['Arrival Horizon', 'Boundary Model', 'Decision Field', 'Movement Table', 'Quiet Pool', 'Provenance Spine', 'Many-Sided Mirror', 'Sovereignty Ledger', 'Consent Thread', 'Relational Weather Field', 'Memory Aperture', 'Replay Gate']) {
    assert.ok(groundModel.includes(signature), `missing chamber signature: ${signature}`)
  }

  assert.match(groundOwner, /min-height:48px/)
  assert.match(groundOwner, /scrollIntoView\(\{ block: "nearest", inline: "nearest" \}\)/)
  assert.match(groundOwner, /gl=\{\{[^}]*alpha:\s*false/s)
  assert.match(groundOwner, /<color attach="background" args=\{\["#102b38"\]\} \/>/)
  assert.match(groundOwner, /<fogExp2 attach="fog" args=\{\["#173843", 0\.012\]\}/)
  assert.match(groundOwner, /gl\.setClearColor\(0x102b38, 1\)/)
  assert.match(groundOwner, /gl\.toneMappingExposure = 1\.35/)
  assert.match(groundOwner, /camera=\{\{ position: \[0, 8\.8, 25\], fov: 52/)
  assert.match(groundOwner, /\.ground-spatial-root\{[^}]*background:#102b38/)
  assert.doesNotMatch(groundGraph, /data-ground-visual-owner="authored-provider-art"/)
  assert.doesNotMatch(groundGraph, /assetCssStack\(groundAssets\.|ground-authored-art|--ground-provider-/)
})

test('Life Map is a layered cinematic memory universe with truthful private fallbacks', () => {
  for (const marker of [
    'life-map-white-gold-life-core',
    'life-map-authored-chapter-regions',
    'life-map-light-bridges',
    'life-map-curved-semantic-paths',
    'life-map-foreground-observatory',
    'life-map-relationship-observatory',
    'life-map-goal-horizon',
    'life-map-achievement-monument',
    'life-map-privacy-vault',
    'life-map-emotional-weather',
    'life-map-archive-particles',
    'life-map-far-future-horizon',
    'life-map-selected-arrival-sanctuary',
    'CinematicPostProcessing',
  ]) assert.match(lifeMapWorld, new RegExp(marker))

  assert.match(lifeMap, /data-testid="urai-life-map-authored-fallback"/)
  assert.match(lifeMap, /data-life-map-fallback="authored-semantic"/)
  assert.match(lifeMap, /assetCssStack\(lifeMapAssets\.primary\)/)
  assert.match(lifeMap, /Your life has depth\./)
  assert.match(lifeMap, /WebGL is unavailable\. Semantic navigation remains available/)
  assert.match(lifeMap, /data-testid="urai-life-map-signed-out-threshold"/)
  assert.match(lifeMap, /data-private-memory-mounted="false"/)
  assert.match(lifeMap, /No private memory data is mounted\./)
  assert.match(lifeMap, /Open disclosed sample/)
  assert.match(lifeMap, /if \(current\.get\("demo"\) === "1"\) \{ setMode\("explicit-demo"\); return; \}/)
  assert.match(lifeMap, /Return Home/)
  assert.doesNotMatch(lifeMap, /FALLBACK_MEMORIES|Restoring Life Map|Loading home experience/)
})
