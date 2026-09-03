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
  assert.match(homeProduction, /data-home-visible-world="v76-deep-apse-relic-machine-sanctuary"/)
  assert.match(homeProduction, /data-home-art-certification="v76-retained-pixel-candidate-not-certified"/)
  assert.doesNotMatch(assetHome, /HomeV75RetainedPixelWorld|HomeWorldProductionV75/)
  assert.doesNotMatch(homeArt, /<Canvas/)
  assert.match(groundOwner, /GroundSpatialWorldClean/)
  assert.match(lifeMapOwner, /SpatialLifeMapCanonical/)
  assert.doesNotMatch(template, /focus|replay/i)
})

test('V76 is one continuous single-Canvas industrial sanctuary with governed identities, contained Orb and real thresholds', () => {
  for (const marker of [
    'HomeWorldProductionV70',
    'home-entry-chamber-v1.glb',
    'portal-ring-master-v1.glb',
    'urai-orb-avatar-v1.glb',
    'rock_face_01/asset.gltf',
    'rock_face_02/asset.gltf',
    'modular_industrial_pipes_01/asset.gltf',
    'industrial_caged_sconce/asset.gltf',
    'rock_face_01_diff_1k.jpg',
    'studio-small-08-1k.hdr',
    'data-home-primary-owner="asset-driven"',
    'data-home-world-character="production-cinematic-sacred-tech"',
    'data-home-physical-base="continuous-pbr-rock-industrial-machine-sanctuary"',
    'data-home-visual-ownership="single-canvas-three-dimensional-geometry"',
    'data-home-desktop-mobile-world="same-scene"',
    'data-home-movement="walk-keyboard-click-touch"',
    'data-home-visual-grade="cinematic-pbr-v93-governed-dimensional-sanctuary"',
    'data-home-final-art-revision="v93-dimensional-governed-rebuild"',
    'data-home-visible-production-assets="governed-threshold-architecture rock_face_01 rock_face_02 rock-face-pbr"',
    'data-testid="urai-home-webgl-orb"',
    'data-testid="urai-home-embodied-avatar"',
    'home-authored-terrain',
    'home-mountain-horizon',
    'home-living-vegetation',
    'home-sanctuary-pavilion',
    'home-v76-continuous-hand-cut-vault',
    'home-v76-port-canted-bearing-wall',
    'home-v76-starboard-canted-bearing-wall',
    'home-v76-deep-concave-apse',
    'home-v83-governed-open-sanctuary-environment',
    'home-v83-authored-open-sanctuary',
    'home-v83-removed-procedural-tunnel',
    'home-v83-removed-panel-like-orb-armor',
    'home-v76-port-integrated-service-manifold',
    'home-v76-starboard-integrated-service-manifold',
    'home-v76-apse-embedded-orb-relic-machine',
    'home-ground-environmental-threshold',
    'home-life-map-sky-lookout',
    'home-life-map-physical-portal',
    'v93-dimensional-governed-sanctuary',
    'v76-single-canvas-deep-apse-sanctuary',
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
  ]) assert.ok(homeGraph.includes(marker), `missing V76 Home marker: ${marker}`)

  assert.doesNotMatch(homeCss, /replay-memory-film-mobile\.webp/)
  assert.match(homeProduction, /const GOVERNED_HOME = '\/assets\/urai\/generated\/models\/home-entry-chamber-v1\.glb'/)
  assert.match(homeProduction, /const GOVERNED_PORTAL = '\/assets\/urai\/generated\/models\/portal-ring-master-v1\.glb'/)
  assert.match(homeProduction, /const GOVERNED_ORB = '\/assets\/urai\/generated\/models\/urai-orb-avatar-v1\.glb'/)
  assert.match(homeProduction, /function Sanctuary\(/)
  assert.match(homeProduction, /<HomeV76Sanctuary/)
  assert.match(homeArt, /export function HomeV76Sanctuary\(/)
  assert.match(homeProduction, /function OrbMachine\(/)
  assert.match(homeProduction, /function OrbPanelGeometry\(/)
  assert.match(homeProduction, /function EngineeredOrbHullGeometry\(/)
  assert.match(homeProduction, /new THREE\.LatheGeometry\(profile, 12\)/)
  assert.match(homeProduction, /function PortalFrame\(/)
  assert.match(homeProduction, /function PlayerRig\(/)
  assert.match(homeProduction, /requestUraiWorldTravel/)
  assert.match(homeProduction, /dpr=\{1\}/)
  assert.match(homeProduction, /shadow-mapSize-width=\{768\}/)
  assert.match(homeProduction, /yaw: yaw\\.current/)
  assert.match(homeProduction, /new THREE\.BufferGeometry\(\)/)
  assert.doesNotMatch(homeProduction, /function StoneMass\(|function Beam\(|octahedronGeometry|icosahedronGeometry|capsuleGeometry/)
  assert.match(homeProduction, /useGLTF\.preload\(GOVERNED_HOME\)/)
  assert.match(homeProduction, /useGLTF\.preload\(GOVERNED_PORTAL\)/)
  assert.match(homeProduction, /useGLTF\.preload\(GOVERNED_ORB\)/)
  assert.match(homeProduction, /useGLTF\.preload\(ROCK_FACE_A\)/)
  assert.match(homeProduction, /useGLTF\.preload\(ROCK_FACE_B\)/)
  assert.match(homeProduction, /useGLTF\.preload\(PIPE_SYSTEM\)/)
  assert.match(homeProduction, /transmission = 0/)
  assert.equal((homeProduction.match(/<Canvas/g) ?? []).length, 1)
  const traversalTimerIndex = homeProduction.indexOf('const traversalTimer = window.setTimeout(() => {')
  const closingTimerIndex = homeProduction.indexOf('closingTimer = window.setTimeout(() => {')
  const navigationTimerIndex = homeProduction.indexOf('navigationTimer = window.setTimeout(() => {')
  assert.ok(traversalTimerIndex >= 0 && closingTimerIndex > traversalTimerIndex && navigationTimerIndex > closingTimerIndex, 'portal lifecycle timers must be nested in opening → traversal → closing → navigation order')
  assert.match(homeProduction, /reducedMotion \? 180 : 900/)
  assert.match(homeProduction, /reducedMotion \? 520 : 1600/)
  assert.match(homeProduction, /reducedMotion \? 500 : 1100/)
  assert.doesNotMatch(homeProduction, /<GovernedModel|RoundedBox|octahedronGeometry|icosahedronGeometry|torusGeometry|capsuleGeometry/)
  assert.doesNotMatch(homeProduction, /#37e5ff|#48dfff|#6cf4ff/i)
  assert.doesNotMatch(homeProduction, /WorldPortal|home-ground-portal-world-owned|home-life-map-portal-world-owned|destinationNames/)
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
