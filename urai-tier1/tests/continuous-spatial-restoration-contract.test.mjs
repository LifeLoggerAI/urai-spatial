import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8')
const canonical = (source) => source.replace(/\r\n/g, '\n').replace(/"/g, "'").replace(/\s+/g, ' ').trim()
const includesCanonical = (source, marker) => canonical(source).includes(canonical(marker))
const template = read('src/app/template.tsx')
const homeRuntime = read('src/app/HomeSpatialRuntimeLayer.tsx')
const assetHome = read('src/app/AssetDrivenHomeWorld.tsx')
const homeProductionEntry = read('src/spatial/layout/HomeWorldProduction.tsx')
const homeProduction = read('src/spatial/layout/HomeWorldProductionV70.tsx')
const homeArt = read('src/spatial/layout/HomeWorldProductionV76.tsx')
const homeCss = read('src/spatial/layout/HomeWorldProduction.module.css')
const worldEvents = read('src/spatial/world/worldEvents.ts')
const sceneStore = read('src/spatial/store/useSceneStore.ts')
const companion = read('src/spatial/world/PersistentWorldCompanion.tsx')
const css = read('src/app/spatial-runtime-restoration.css')
const structuralCss = read('src/app/continuous-spatial-proof-defects.css')
const proof = read('../scripts/capture-continuous-spatial-proof-v18.mjs')
const stateProof = read('../scripts/capture-home-state-proof.mjs')
const proofWorkflow = read('../.github/workflows/continuous-spatial-visual-proof.yml')
const stateProofWorkflow = read('../.github/workflows/home-state-proof.yml')
const hostStableProof = read('../scripts/run-continuous-spatial-proof-v18-host-stable.mjs')
const groundOwner = read('src/app/ground/page.tsx')
const ground = read('src/app/GroundSpatialWorldClean.tsx')
const groundModel = read('src/app/ground/GroundWorldModel.ts')
const lifeMapOwner = read('src/app/life-map/page.tsx')
const groundGateway = read('src/spatial/world/GroundGateway.tsx')
const homeGraph = `${homeRuntime}\n${assetHome}\n${homeProductionEntry}\n${homeProduction}\n${homeArt}\n${homeCss}`
const groundGraph = `${ground}\n${groundModel}`
const groundCanonical = canonical(ground)

test('app template mounts the exact active Home production owner without certified-route redirects', () => {
  for (const marker of ['HomeSpatialRuntimeLayer', 'spatial-runtime-restoration.css', 'continuous-spatial-proof-defects.css']) assert.match(template, new RegExp(marker.replace('.', '\\.')))
  for (const marker of ['asset-driven-primary-with-procedural-degraded-fallback', 'asset-driven-personalized-sanctuary', 'data-home-exploration="walkable"', 'AssetDrivenHomeWorld']) assert.ok(homeRuntime.includes(marker))
  assert.match(assetHome, /HomeWorldProduction/)
  assert.match(homeProductionEntry, /export \{ HomeWorldProductionV70 as HomeWorldProduction \} from "\.\/HomeWorldProductionV70"/)
  assert.match(homeProduction, /export function HomeWorldProductionV70/)
  assert.match(homeProduction, /data-home-primary-owner="asset-driven"/)
  assert.match(assetHome, /world\.setAttribute\('data-home-v126-art-layer', 'single-canvas-ground-owned-sanctuary-framed-fissures-integrated-orb-apse'\)/)
  assert.match(assetHome, /world\.setAttribute\('data-home-art-certification', 'v126-retained-pixels-pending-not-certified'\)/)
  assert.doesNotMatch(assetHome, /HomeV75RetainedPixelWorld|HomeWorldProductionV75/)
  assert.doesNotMatch(homeArt, /<Canvas/)
  assert.match(groundOwner, /GroundSpatialWorldClean/)
  assert.match(lifeMapOwner, /SpatialLifeMapCanonical/)
  assert.doesNotMatch(template, /focus|replay/i)
})

test('V126 is one continuous single-Canvas sanctuary with bounded geology, framed fissures and an integrated Orb', () => {
  for (const marker of [
    'HomeWorldProductionV70',
    'urai-orb-avatar-v1.glb',
    'rock_face_01/asset.gltf',
    'rock_face_02/asset.gltf',
    'data-home-primary-owner="asset-driven"',
    'data-home-visual-ownership="single-canvas-three-dimensional-geometry"',
    'data-home-desktop-mobile-world="same-scene"',
    'data-home-movement="walk-keyboard-click-touch"',
    'data-testid="urai-home-webgl-orb"',
    'data-testid="urai-home-embodied-avatar"',
    'data-home-v126-retained-pixel-rebuild="active"',
    "data-home-v126-art-layer', 'single-canvas-ground-owned-sanctuary-framed-fissures-integrated-orb-apse",
    "data-home-physical-base', 'continuous-sculpted-ground-staggered-terraces-layered-apse",
    "data-home-visual-grade', 'cinematic-pbr-v126-ground-owned-depth-candidate",
    "data-home-final-art-revision', 'v126-retained-pixels-pending",
    "data-home-visible-production-assets', 'rock_face_01 rock_face_02 sculpted-ground staggered-terraces framed-fissures governed-orb-petal-heart layered-apse",
    'function SculptedCanyonGround(',
    'home-v125-sculpted-canyon-ground',
    'function GeologicalFrame(',
    'home-v126-bounded-geological-edge-masses',
    'function FramedFissure(',
    'home-v126-${side}-framed-fissure',
    'function LivingOrb(',
    'home-v126-apse-integrated-orb',
    'home-v126-orb-memory-motes',
    'home-v126-layered-apse-orb-cradle',
    'home-v125-atmospheric-depth-motes',
    'home-authored-terrain',
    'home-mountain-horizon',
    'home-living-vegetation',
    'home-sanctuary-pavilion',
    'stepEmbodiedMotion',
    'useMovementInput',
    'MobileMovementPad',
    'URAI_ORB_STATE_EVENT',
    'resolveOrbSensoryOutput',
    'data-home-orb-state={orbState}',
    'function ReducedMotionCadence',
    "frameloop={reducedMotion ? 'demand' : 'always'}",
    'cadenceTimer = window.setTimeout(renderNext, 250)',
    '<Canvas',
  ]) assert.ok(homeGraph.includes(marker), `missing V126 Home marker: ${marker}`)

  assert.doesNotMatch(homeCss, /replay-memory-film-mobile\.webp/)
  assert.match(homeProduction, /<HomeV76Sanctuary/)
  assert.match(homeArt, /export function HomeV76Sanctuary\(/)
  assert.match(homeArt, /const GOVERNED_ORB = '\/assets\/urai\/generated\/models\/urai-orb-avatar-v1\.glb'/)
  assert.match(homeArt, /const source = useGLTF\(GOVERNED_ORB\)\.scene/)
  assert.match(homeArt, /<primitive object=\{orb\}/)
  assert.match(homeArt, /<FramedFissure side="ground" onActivate=\{onGround\}/)
  assert.match(homeArt, /<FramedFissure side="life-map" onActivate=\{onLifeMap\}/)
  assert.match(homeProduction, /function PlayerRig\(/)
  assert.match(homeProduction, /requestUraiWorldTravel/)
  assert.match(homeProduction, /dpr=\{1\}/)
  assert.match(homeProduction, /shadow-mapSize-width=\{768\}/)
  assert.match(homeProduction, /yaw: yaw\.current/)
  assert.match(homeProduction, /new THREE\.BufferGeometry\(\)/)
  assert.match(homeArt, /useGLTF\.preload\(GOVERNED_ORB\)/)
  assert.match(homeArt, /useGLTF\.preload\(ROCK_FACE_A\)/)
  assert.match(homeArt, /useGLTF\.preload\(ROCK_FACE_B\)/)
  assert.equal((homeProduction.match(/<Canvas/g) ?? []).length, 1)
  const traversalTimerIndex = homeProduction.indexOf('const traversalTimer = window.setTimeout(() => {')
  const closingTimerIndex = homeProduction.indexOf('closingTimer = window.setTimeout(() => {')
  const navigationTimerIndex = homeProduction.indexOf('navigationTimer = window.setTimeout(() => {')
  assert.ok(traversalTimerIndex >= 0 && closingTimerIndex > traversalTimerIndex && navigationTimerIndex > closingTimerIndex, 'portal lifecycle timers must be nested in opening → traversal → closing → navigation order')
  assert.match(homeProduction, /reducedMotion \? 180 : 900/)
  assert.match(homeProduction, /reducedMotion \? 520 : 1600/)
  assert.match(homeProduction, /reducedMotion \? 500 : 1100/)
  assert.doesNotMatch(homeArt, /<TerracedGround|<GovernedModel|RoundedBox|octahedronGeometry|icosahedronGeometry|torusGeometry|capsuleGeometry/)
  assert.doesNotMatch(homeArt, /#37e5ff|#48dfff|#6cf4ff/i)
  assert.doesNotMatch(homeGraph, /requestPointerLock|OrbitControls/)
  assert.match(groundGateway, /Open the ground and descend into Hidden Infrastructure/)
  assert.match(homeRuntime, /requestUraiWorldOrbOpen/)
  assert.match(homeRuntime, /webglcontextlost/)
  assert.match(homeRuntime, /webglcontextrestored/)
  assert.match(companion, /URAI_WORLD_ORB_OPEN_EVENT/)
  assert.match(companion, /publishOrbState\('attention', 'companion'\)/)
  assert.match(companion, /publishOrbState\('transition', 'companion'\)/)
})

test('Home Life Map entry preserves one canonical ascent transaction and a closing handoff', () => {
  assert.match(sceneStore, /enterLifeMap: \(\) => set\(\{ mode: "ASCENT", sceneMode: "ASCENT", phase: "ASCENT", isTransitioning: true, inputLocked: true, progress: 0 \}\)/)
  assert.match(worldEvents, /function shouldBeginHomeAscent/)
  assert.match(worldEvents, /function markHomeAscentClosing/)
  assert.match(worldEvents, /request\.entryPortal !== 'home-sky'/)
  assert.match(worldEvents, /request\.cameraCheckpoint !== 'home-sky-ascent'/)
  assert.match(worldEvents, /request\.cameraCheckpoint !== 'home-sky-ascent-complete'/)
  assert.match(worldEvents, /owner\.setAttribute\('data-home-portal-sequence', 'life-map:closing'\)/)
  assert.match(worldEvents, /if \(scene\.phase !== 'ASCENT'\) scene\.enterLifeMap\(\)/)
  assert.match(worldEvents, /window\.dispatchEvent\(new CustomEvent<UraiWorldTravelRequest>\(URAI_HOME_ASCENT_EVENT/)
  assert.match(homeProduction, /transition === 'life-map'/)
  assert.match(homeProduction, /cameraCheckpoint: 'home-sky-ascent-complete'/)
  assert.match(homeProduction, /data-home-camera-mode=\{transition !== 'none'/)
  assert.match(homeProduction, /data-home-input-locked=\{transition !== 'none'/)
  assert.doesNotMatch(homeProduction, /<CinematicCameraRig|<SpatialSceneClient/)
})

test('Home Ground entry is a physical environmental descent rather than a floating menu portal', () => {
  assert.match(homeProduction, /transition === 'ground'/)
  assert.match(homeProduction, /home-ground-environmental-threshold/)
  assert.match(homeProduction, /destination: 'infrastructure-hub'/)
  assert.match(homeProduction, /cameraCheckpoint: 'home-ground-descent'/)
  assert.doesNotMatch(homeProduction, /<WorldPortal type="ground"/)
})

test('visual overrides cannot veil active spatial owners', () => {
  assert.match(css, /html:has\(\.urai-home-spatial-runtime-layer\)/)
  assert.match(structuralCss, /living Home canvas owns the painted world/i)
  for (const marker of ['content: none !important', 'border-radius: 0 !important', 'clip-path: none !important', 'filter: none !important', 'backdrop-filter: none !important']) assert.ok(structuralCss.includes(marker))
})

test('Ground keeps embodied infrastructure ownership and contained navigation', () => {
  for (const marker of [
    "id: 'reception'",
    "id: 'privacy'",
    "id: 'mirror'",
    "id: 'passport'",
    "id: 'focus'",
    "id: 'replay'",
    'data-ground-destination',
    'data-testid="urai-ground-private-workforce-world"',
    'data-testid="urai-ground-walkable-surface"',
    'ground-continuity-architectural-shell',
    'ground-walkable-path-network',
    'ground-central-nexus',
    'ground-workforce-and-council-presences',
  ]) assert.ok(includesCanonical(groundGraph, marker), `missing Ground marker: ${marker}`)
  assert.ok(includesCanonical(ground, 'useMovementInput({'))
  assert.ok(includesCanonical(ground, '<MobileMovementPad'))
  assert.match(groundCanonical, /min-height:48px/)
  assert.match(ground, /scrollIntoView\(\{ block: "nearest", inline: "nearest" \}\)/)
  assert.doesNotMatch(groundGraph, /authored-provider-art|ground-authored-art/)
})

test('browser proof and supplemental state proof cover required exact-head evidence', () => {
  for (const marker of ["schemaVersion: 'urai-continuous-spatial-visual-proof-18'", "id: 'home-normal-root'", "id: 'home-normal-home'", 'portrait-mobile', 'landscape-mobile', 'homeOrbState', 'Orb_Resting', 'Orb_Transition', 'recordVideo', 'home-pointer-look-desktop', 'capturePortal', 'home-no-webgl-fallback', 'receipt.json']) assert.ok(proof.includes(marker), `missing primary proof marker: ${marker}`)
  for (const marker of ["schemaVersion: 'urai-home-state-proof-5'", 'retained-canvas-png', 'page.screenshot', 'clip:', 'homeState=permission-limited', 'homeState=unavailable', 'homeState=offline', 'reducedMotion', 'forcedColors', 'home-real-offline-transition', 'orb-lifecycle-production-ui', 'orb-lifecycle-reduced-motion', '__uraiObservedOrbStates', "'thinking'", "'speaking'", 'orb-state-static', 'settleAnimationFrames', 'minimumLuminanceRange', '--enable-unsafe-swiftshader']) assert.ok(stateProof.includes(marker), `missing supplemental state proof marker: ${marker}`)
  assert.doesNotMatch(`${proof}\n${stateProof}`, /waitForTimeout/)
  assert.doesNotMatch(stateProof, /gl\.readPixels/)
  assert.match(proofWorkflow, /run-continuous-spatial-proof-v22-natural\.mjs/)
  assert.match(stateProofWorkflow, /capture-home-state-proof\.mjs/)
})

test('Life Map owner and legacy veil suppression remain full viewport', () => {
  assert.match(structuralCss, /data-testid="urai-true-3d-life-map"/)
  assert.match(structuralCss, /position: fixed !important/)
  assert.match(structuralCss, /height: 100svh !important/)
  assert.match(css, /\.ground-provider-art\s*\{\s*display: none !important;/s)
  assert.match(css, /prefers-reduced-motion: reduce/)
})

test('Home environmental thresholds and generated identity manifest filter remain observable on a saturated host', () => {
  assert.match(homeProduction, /home-ground-environmental-threshold/)
  assert.match(homeProduction, /home-life-map-sky-lookout/)
  assert.match(homeProduction, /destination: 'infrastructure-hub'/)
  assert.match(homeProduction, /destination: 'life-map'/)
  assert.ok(hostStableProof.includes('const manifestRegexSource = String.raw`&& /^\\/assets\\/urai'))
  assert.ok(hostStableProof.includes('const escapedManifestRegexSource = String.raw`&& /^\\\\/assets\\\\/urai'))
  assert.ok(hostStableProof.includes('.replace(manifestRegexSource, escapedManifestRegexSource)'))
})
