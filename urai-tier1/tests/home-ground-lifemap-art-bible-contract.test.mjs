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

test('Home is one coherent authored natural 3D sanctuary with final physical assets', () => {
  for (const marker of [
    'AssetDrivenHomeWorld',
    'HomeWorldProduction',
    'data-home-primary-owner="asset-driven"',
    'data-home-visible-world="authored-coherent-three-dimensional-sanctuary"',
    'data-home-world-character="believable-natural-inhabitable-environment"',
    'data-home-physical-base="authored-coherent-world"',
    'data-home-visual-ownership="three-dimensional-geometry"',
    'data-home-desktop-mobile-world="same-scene"',
    'data-home-embodied-self="privacy-preserving-shadow"',
    'data-home-movement="walk-keyboard-click-touch"',
    'home-visible-navigable-sanctuary-world',
    'data-testid="urai-home-embodied-avatar"',
    'data-testid="urai-home-webgl-orb"',
    'home-authored-terrain',
    'home-mountain-horizon',
    'home-living-vegetation',
    'home-sanctuary-pavilion',
    'home-orb-sanctuary',
    'home-ground-environmental-threshold',
    'home-life-map-sky-lookout',
    'home-reflecting-water',
    'stepEmbodiedMotion',
    'useMovementInput',
    'MobileMovementPad',
  ]) assert.ok(homeGraph.includes(marker), `missing natural Home convergence marker: ${marker}`)

  assert.match(homeProductionEntry, /export \{ HomeWorldProductionPolished as HomeWorldProduction \} from "\.\/HomeWorldProductionPolished"/)
  assert.match(groundGateway, /aria-label="Open the ground and descend into Hidden Infrastructure"/)
  assert.match(homeProduction, /HOME_SANCTUARY_MODEL = '\/assets\/urai\/generated\/models\/home-entry-chamber-v1\.glb'/)
  assert.match(homeProduction, /HOME_FERN_MODEL = '\/assets\/urai\/home-production\/cc0\/polyhaven-fern-02-geometry-v1\.glb'/)
  assert.match(homeProduction, /HOME_PROVIDER_ENVIRONMENT = '\/assets\/urai\/home\/home-threshold-main\.webp'/)
  assert.match(homeProduction, /data-home-provider-environment=\{HOME_PROVIDER_ENVIRONMENT\}/)
  assert.match(homeProduction, /data-home-provider-role="legacy-placeholder-metadata-only"/)
  assert.match(homeProduction, /data-home-provider-regions="not-rendered"/)
  assert.match(homeProduction, /<HomeSkyGradient \/>/)
  assert.doesNotMatch(homeProduction, /data-home-provider-atmosphere=/)
  assert.doesNotMatch(homeProduction, /backgroundImage:[^\n]*HOME_PROVIDER_ENVIRONMENT/)
  assert.doesNotMatch(homeProduction, /HOME_PROVIDER_ENVIRONMENT = '\/assets\/urai\/replay\//)
  assert.match(homeProduction, /object\.castShadow = true/)
  assert.match(homeProduction, /object\.receiveShadow = true/)
  assert.match(homeProduction, /function SanctuaryPath\(/)
  assert.match(homeProduction, /useGLTF\(HOME_SANCTUARY_MODEL\)/)
  assert.match(homeProduction, /function Horizon\(/)
  assert.match(homeProduction, /function Orb\(/)
  assert.match(homeProduction, /useGLTF\(HOME_FERN_MODEL\)/)
  assert.match(homeProduction, /useAnimations\(orb\.animations, authoredOrb\)/)
  const orb = homeProduction.slice(homeProduction.indexOf('function SacredOrb('), homeProduction.indexOf('function OrbPlatform('))
  assert.match(orb, /translucent-living-memory-heart-with-visible-authored-core/)
  assert.match(orb, /transparent opacity=\{0\.14\} depthWrite=\{false\}/)
  assert.doesNotMatch(orb, /color="#466c6d"/)

  for (const clip of ['Orb_Resting','Orb_Idle','Orb_Attention','Orb_Listening','Orb_Thinking','Orb_Speaking','Orb_Guiding','Orb_Reflecting','Orb_Calming','Orb_Privacy','Orb_Degraded','Orb_Transition']) {
    assert.ok(homeProduction.includes(clip), `missing authored Orb state clip: ${clip}`)
  }
  assert.match(homeProduction, /function EmbodiedPresence\(/)
  assert.match(homeProduction, /function Water\(/)
  assert.match(homeProduction, /function Thresholds\(/)
  assert.match(homeProduction, /function PlayerRig\(/)
  assert.match(homeProduction, /function SceneReady\(/)
  assert.match(homeProduction, /\['orb', ORB, 2\.4\], \['ground', GROUND_THRESHOLD, 2\.8\], \['life-map', LIFE_MAP_LOOKOUT, 2\.8\]/)
  assert.match(homeProduction, /prefers-reduced-motion: reduce/)
  assert.match(homeProduction, /pointer: coarse/)
  assert.match(homeProduction, /cameraCheckpoint:\s*'home-ground-descent'/)
  assert.match(homeProduction, /cameraCheckpoint:\s*'home-sky-ascent-complete'/)
  assert.match(homeProduction, /href:\s*'\/life-map\/\?from=home-sky'/)
  assert.match(homeRuntime, /aria-label="Open Life Map directly"/)
  assert.match(homeRuntime, /data-testid="home-semantic-life-map"/)
  assert.match(homeRuntime, /href="\/life-map\/\?from=home-sky&entryPortal=home-sky&cameraCheckpoint=home-sky-ascent-complete"/)
  assert.match(homeProduction, /data-home-runtime-assets="home-entry-chamber-v1\.glb polyhaven-fern-02-geometry-v1\.glb local-three-dimensional-terrain living-orb reflecting-water"/)
  assert.match(homeProduction, /data-home-orb-clip=\{ORB_CLIPS\[orbState\]\}/)
  assert.doesNotMatch(homeRuntime, /EmbodiedHomeSpatialCanvas|HomeSanctuaryWorld/)
  assert.doesNotMatch(homeGraph, /genesis-orb-placeholder\.svg|fallback-sky-bloom-12\.webp|fallback-ground-bloom-12\.png|TRANSPARENT_PIXEL/)
  assert.doesNotMatch(homeGraph, /requestPointerLock|OrbitControls/)
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
    'life-map-intimate-memory-chamber',
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
  assert.match(lifeMap, /current\.get\("demo"\) === "1"\s*\)\s*\{[\s\S]*setMode\("explicit-demo"\)/)
  assert.match(lifeMap, /Return Home/)
  assert.doesNotMatch(lifeMap, /FALLBACK_MEMORIES|Restoring Life Map|Loading home experience/)
})
