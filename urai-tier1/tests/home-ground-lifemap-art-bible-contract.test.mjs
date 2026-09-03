import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const read = (path) => fs.readFileSync(path, 'utf8')
const homeRuntime = read('src/app/HomeSpatialRuntimeLayer.tsx')
const assetHome = read('src/app/AssetDrivenHomeWorld.tsx')
const homeProductionEntry = read('src/spatial/layout/HomeWorldProduction.tsx')
const homeProduction = read('src/spatial/layout/HomeWorldProductionV70.tsx')
const homeArt = read('src/spatial/layout/HomeWorldProductionV76.tsx')
const homeCss = read('src/spatial/layout/HomeWorldProduction.module.css')
const fallbackHome = read('src/app/FinalHomeWorld.tsx')
const groundGateway = read('src/spatial/world/GroundGateway.tsx')
const groundOwner = read('src/app/GroundSpatialWorldClean.tsx')
const groundModel = read('src/app/ground/GroundWorldModel.ts')
const atmosphereCss = read('src/spatial/world/persistentRealmAtmosphere.css')
const lifeMap = read('src/spatial/lifemap/SpatialLifeMapCanonical.tsx')
const lifeMapWorld = read('src/components/lifemap/LifeMapProductionWorld.tsx')

const homeGraph = `${homeRuntime}\n${assetHome}\n${homeProductionEntry}\n${homeProduction}\n${homeArt}\n${homeCss}\n${fallbackHome}`
const groundGraph = `${groundOwner}\n${groundModel}\n${atmosphereCss}`

test('Home is one coherent production Sacred-Tech 3D environment with governed identity and retained-pixel-safe visible art', () => {
  for (const marker of [
    'AssetDrivenHomeWorld',
    'HomeWorldProduction',
    'data-home-primary-owner="asset-driven"',
    'data-home-visible-world="v122-open-authored-canyon-contained-orb"',
    'data-home-world-character="production-cinematic-sacred-tech"',
    'data-home-physical-base="continuous-pbr-rock-industrial-machine-sanctuary"',
    'data-home-visual-ownership="single-canvas-three-dimensional-geometry"',
    'data-home-desktop-mobile-world="same-scene"',
    'data-home-embodied-self="privacy-preserving-first-person"',
    'data-home-movement="walk-keyboard-click-touch"',
    'data-home-pointer-lock="false"',
    'data-home-audio="production-opus-consent-controlled"',
    'data-home-input-owner="window-capture-movement"',
    'data-home-telemetry-owner="embodied-motion-kernel-v66"',
    'data-home-ready=',
    'data-home-player-z=',
    'home-visible-navigable-sanctuary-world',
    'data-testid="urai-home-embodied-avatar"',
    'data-testid="urai-home-webgl-orb"',
    'home-authored-terrain',
    'home-sanctuary-pavilion',
    'home-v76-apse-embedded-orb-relic-machine',
    'home-ground-environmental-threshold',
    'home-life-map-sky-lookout',
    'home-life-map-physical-portal',
    'stepEmbodiedMotion',
    'useMovementInput',
    'MobileMovementPad',
  ]) assert.ok(homeGraph.includes(marker), `missing production Home convergence marker: ${marker}`)

  assert.match(homeProductionEntry, /export \{ HomeWorldProductionV70 as HomeWorldProduction \} from "\.\/HomeWorldProductionV70"/)
  assert.match(groundGateway, /aria-label="Open the ground and descend into Hidden Infrastructure"/)
  assert.match(homeProduction, /const GOVERNED_HOME = '\/assets\/urai\/generated\/models\/home-entry-chamber-v1\.glb'/)
  assert.match(homeProduction, /const GOVERNED_ORB = '\/assets\/urai\/generated\/models\/urai-orb-avatar-v1\.glb'/)
  assert.match(homeProduction, /const GOVERNED_PORTAL = '\/assets\/urai\/generated\/models\/portal-ring-master-v1\.glb'/)
  assert.match(homeProduction, /function prepareAsset\(/)
  assert.match(homeProduction, /const clone = entry\.clone\(\)/)
  assert.match(homeProduction, /object\.castShadow = true/)
  assert.match(homeProduction, /object\.receiveShadow = true/)
  assert.match(homeProduction, /function ProductionAsset\(/)
  assert.match(homeProduction, /provenance: 'poly-haven-cc0-committed'/)
  for (const asset of ['rock_face_01/asset.gltf','rock_face_02/asset.gltf','modular_industrial_pipes_01/asset.gltf','industrial_caged_sconce/asset.gltf','rock-face-pbr','studio-small-08-1k.hdr']) {
    assert.ok(homeGraph.includes(asset), `missing visible production asset: ${asset}`)
  }

  assert.match(homeArt, /function RelicMachine\(/)
  assert.match(homeArt, /function useCurvedArmorGeometry\(/)
  assert.match(homeArt, /new THREE\.ExtrudeGeometry/)
  assert.match(homeArt, /home-v76-machine-vertical-aperture/)
  assert.match(homeArt, /connectedLoadPaths: true/)
  assert.match(homeArt, /home-v83-governed-open-sanctuary-environment/)
  assert.match(homeArt, /home-v83-removed-procedural-tunnel/)
  assert.match(homeArt, /home-v83-removed-panel-like-orb-armor/)
  // A retained-pixel Home cannot claim a navigable three-dimensional environment
  // while its visible room is a flat DOM/scene backdrop and the governed Home
  // hierarchy is wholly hidden. Orb and portal overlays do not make a flat plate
  // into a spatial world. Keep this integrity boundary fail-closed.
  const governedEnvironment = homeArt.slice(
    homeArt.indexOf('function useGovernedHomeEnvironment()'),
    homeArt.indexOf('function SanctuaryBackdrop()'),
  )
  assert.doesNotMatch(homeProduction, /backgroundImage:\s*["']url\([^)]*ground-world-main\.webp/)
  assert.doesNotMatch(homeArt, /scene\.(?:background|userData\.sanctuaryBackdrop)\s*=\s*(?:texture|SANCTUARY_BACKDROP)/)
  assert.doesNotMatch(governedEnvironment, /root\.visible\s*=\s*false/)
  assert.doesNotMatch(governedEnvironment, /object\.visible\s*=\s*false/)
  assert.doesNotMatch(homeArt, /<(?:sphereGeometry|octahedronGeometry|icosahedronGeometry|torusGeometry|capsuleGeometry|RoundedBox)|display-case/i)
  for (const clip of ['Orb_Resting','Orb_Idle','Orb_Attention','Orb_Listening','Orb_Thinking','Orb_Speaking','Orb_Guiding','Orb_Reflecting','Orb_Calming','Orb_Privacy','Orb_Degraded','Orb_Transition']) {
    assert.ok(homeProduction.includes(clip), `missing governed Orb state clip identity: ${clip}`)
  }

  assert.match(homeProduction, /data-home-art-certification="v76-retained-pixel-candidate-not-certified"/)
  assert.match(homeProduction, /privacy-preserving-first-person-presence-v76/)
  assert.match(homeProduction, /function PortalFrame\(/)
  assert.match(homeProduction, /governedPortalIdentity: GOVERNED_PORTAL/)
  assert.match(homeProduction, /function PlayerRig\(/)
  assert.match(homeProduction, /function ReadySignal\(/)
  assert.match(homeProduction, /\['orb', ORB, 2\.35\], \['ground', GROUND, 2\.65\], \['life-map', LIFE_MAP, 2\.65\]/)
  assert.match(homeProduction, /prefers-reduced-motion: reduce/)
  assert.match(homeProduction, /pointer: coarse/)
  assert.match(homeProduction, /cameraCheckpoint: 'home-ground-descent'/)
  assert.match(homeProduction, /cameraCheckpoint: 'home-sky-ascent-complete'/)
  assert.match(homeProduction, /href: '\/life-map\/\?from=home-sky'/)
  assert.match(homeRuntime, /aria-label="Open Life Map directly"/)
  assert.match(homeProduction, /data-home-runtime-assets="home-entry-chamber-v1\.glb portal-ring-master-v1\.glb urai-orb-avatar-v1\.glb rock_face_01\/asset\.gltf rock_face_02\/asset\.gltf modular_industrial_pipes_01\/asset\.gltf industrial_caged_sconce\/asset\.gltf rock-face-pbr studio-small-08-1k\.hdr"/)
  assert.match(homeProduction, /data-home-orb-model-clip=/)
  assert.match(homeProduction, /useGLTF\.preload\(GOVERNED_HOME\)/)
  assert.match(homeProduction, /useGLTF\.preload\(GOVERNED_PORTAL\)/)
  assert.match(homeProduction, /useGLTF\.preload\(GOVERNED_ORB\)/)
  assert.doesNotMatch(homeProduction, /<ProductionAsset url=\{GOVERNED_(?:HOME|PORTAL|ORB)\}/)
  assert.doesNotMatch(homeRuntime, /EmbodiedHomeSpatialCanvas|HomeSanctuaryWorld/)
  assert.doesNotMatch(assetHome, /HomeV75RetainedPixelWorld|HomeWorldProductionV75/)
  assert.doesNotMatch(homeArt, /<Canvas/)
  assert.doesNotMatch(homeGraph, /genesis-orb-placeholder\.svg|fallback-sky-bloom-12\.webp|fallback-ground-bloom-12\.png|TRANSPARENT_PIXEL/)
  assert.doesNotMatch(homeGraph, /requestPointerLock|OrbitControls/)
})

test('Ground is one embodied cinematic infrastructure world', () => {
  for (const marker of [
    'data-ground-visual-owner="shared-continuity-architecture"',
    'data-ground-no-compositing-bands="true"',
    'data-ground-compositing-treatment="v41-depth-fog-continuity-no-horizontal-band"',
    'ground-v41-continuous-architectural-underfloor',
    'v41-depth-fog-continuity-no-horizontal-band',
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
  assert.match(groundOwner, /gl=\{\{[^}]*alpha:\s*true/s)
  assert.match(groundOwner, /gl\.setClearColor\(0x000000, 0\)/)
  assert.match(groundOwner, /scene\.background = null/)
  assert.match(groundOwner, /<Environment files="\/assets\/urai\/home-production\/cc0\/environment\/studio-small-08-1k\.hdr" background=\{false\} environmentIntensity=\{1\.12\}/)
  assert.match(groundOwner, /gl\.toneMappingExposure = 1\.45/)
  assert.match(groundOwner, /<ambientLight intensity=\{1\.08\}/)
  assert.match(groundOwner, /<hemisphereLight args=\{\["#f5fff9", "#324b46", 1\.72\]\}/)
  assert.match(groundOwner, /<directionalLight position=\{\[9, 18, 12\]\} intensity=\{5\.15\}/)
  assert.match(groundOwner, /<Vignette eskil=\{false\} offset=\{0\.08\} darkness=\{0\.004\}/)
  assert.match(groundOwner, /brightness\(1\.14\)/)
  assert.match(groundOwner, /infrastructure-hub[^\n]*__horizon[^\n]*opacity:0!important/)
  assert.match(atmosphereCss, /V41 Ground owns physical fog and depth/)
  assert.match(atmosphereCss, /infrastructure-hub[^}]*__horizon,[\s\S]*display: none !important/)
  assert.match(groundOwner, /clone\.color\.multiplyScalar\(1\.06\)/)
  assert.match(groundOwner, /camera=\{\{ position: \[0, 7\.2, 22\], fov: 56/)
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
