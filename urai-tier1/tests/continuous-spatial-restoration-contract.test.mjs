import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { URAI_SOURCE_MESSAGES } from '../src/lib/i18n/locales.ts'

const root = process.cwd()
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8')
const canonical = (source) => source.replace(/\r\n/g, '\n').replace(/"/g, "'").replace(/\s+/g, ' ').trim()
const includesCanonical = (source, marker) => canonical(source).includes(canonical(marker))
const template = read('src/app/template.tsx')
const homeRuntime = read('src/app/HomeSpatialRuntimeLayer.tsx')
const assetHome = read('src/app/AssetDrivenHomeWorld.tsx')
const homeProductionEntry = read('src/spatial/layout/HomeWorldProduction.tsx')
const homeProduction = read('src/spatial/layout/HomeWorldProductionPolished.tsx')
const embodiedNavigation = read('src/spatial/navigation/EmbodiedNavigation.tsx')
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
const homeGraph = `${homeRuntime}\n${assetHome}\n${homeProductionEntry}\n${homeProduction}\n${homeCss}`
const groundGraph = `${ground}\n${groundModel}`
const groundCanonical = canonical(ground)

test('app template mounts current WebGL owners without certified-route redirects', () => {
  for (const marker of ['HomeSpatialRuntimeLayer', 'spatial-runtime-restoration.css', 'continuous-spatial-proof-defects.css']) assert.match(template, new RegExp(marker.replace('.', '\\.')))
  for (const marker of ['asset-driven-primary-with-procedural-degraded-fallback', 'asset-driven-personalized-sanctuary', 'data-home-exploration="walkable"', 'AssetDrivenHomeWorld']) assert.ok(homeRuntime.includes(marker))
  assert.match(assetHome, /HomeWorldProduction/)
  assert.match(homeProductionEntry, /export \{ HomeWorldProductionPolished as HomeWorldProduction \} from "\.\/HomeWorldProductionPolished"/)
  assert.match(homeProduction, /data-home-primary-owner="asset-driven"/)
  assert.match(homeProduction, /data-home-visible-world="authored-coherent-three-dimensional-sanctuary"/)
  assert.match(groundOwner, /GroundSpatialWorldClean/)
  assert.match(lifeMapOwner, /SpatialLifeMapCanonical/)
  assert.doesNotMatch(template, /focus|replay/i)
})

test('Home remains one embodied authored natural sanctuary 3D environment with accessible thresholds and recovery', () => {
  for (const marker of [
    'HomeWorldProductionPolished',
    'Stars',
    'home-entry-chamber-v1.glb',
    'polyhaven-fern-02-geometry-v1.glb',
    'living-orb',
    'reflecting-water',
    'data-home-primary-owner="asset-driven"',
    'data-home-visible-world="authored-coherent-three-dimensional-sanctuary"',
    'data-home-world-character="believable-natural-inhabitable-environment"',
    'data-home-physical-base="authored-coherent-world"',
    'data-home-visual-ownership="three-dimensional-geometry"',
    'data-home-desktop-mobile-world="same-scene"',
    'data-home-embodied-self="privacy-preserving-shadow"',
    'data-home-movement="walk-keyboard-click-touch"',
    'data-testid="urai-home-webgl-orb"',
    'data-testid="urai-home-embodied-avatar"',
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
    'URAI_ORB_STATE_EVENT',
    'resolveOrbSensoryOutput',
    'data-home-orb-state={orbState}',
    '<Canvas',
  ]) assert.ok(homeGraph.includes(marker), `missing Home marker: ${marker}`)
  assert.doesNotMatch(homeCss, /replay-memory-film-mobile\.webp/)
  assert.match(homeProduction, /function SanctuaryPath\(/)
  assert.match(homeProduction, /function Horizon\(/)
  assert.match(homeProduction, /function Orb\(/)
  assert.match(homeProduction, /function OrbGroundGlow\(/)
  assert.match(homeProduction, /function EmbodiedPresence\(/)
  assert.match(homeProduction, /function Water\(/)
  assert.match(homeProduction, /function Thresholds\(/)
  assert.match(homeProduction, /function PlayerRig\(/)
  assert.match(homeProduction, /requestUraiWorldTravel/)
  assert.match(groundGateway, /Open the ground and descend into Hidden Infrastructure/)
  assert.match(homeRuntime, /requestUraiWorldOrbOpen/)
  assert.match(homeRuntime, /webglcontextlost/)
  assert.match(homeRuntime, /webglcontextrestored/)
  assert.match(companion, /URAI_WORLD_ORB_OPEN_EVENT/)
  assert.match(companion, /publishOrbState\('attention', 'companion'\)/)
  assert.match(companion, /publishOrbState\('transition', 'companion'\)/)
  assert.match(homeProduction, /const HOME_FERN_MODEL = '\/assets\/urai\/home-production\/cc0\/polyhaven-fern-02-geometry-v1\.glb'/)
  assert.match(homeProduction, /useGLTF\(HOME_FERN_MODEL\)/)
  assert.doesNotMatch(homeProduction, /WorldPortal|home-ground-portal-world-owned|home-life-map-portal-world-owned|destinationNames|dodecahedronGeometry/)
  assert.doesNotMatch(homeGraph, /requestPointerLock|OrbitControls/)
})


test('Home telemetry and continuous proof stay aligned to the polished interaction geometry', () => {
  const runtimeMarkers = [
    "const SPAWN = new THREE.Vector3(-0.85, 0, 8.4)",
    "const ORB = new THREE.Vector3(0, 0.82, -4.25)",
    "const GROUND_THRESHOLD = new THREE.Vector3(-5.4, 0, -10.8)",
    "const LIFE_MAP_LOOKOUT = new THREE.Vector3(5.4, 0, -10.8)",
    "['orb', ORB, 2.4]",
    "['ground', GROUND_THRESHOLD, 2.8]",
    "['life-map', LIFE_MAP_LOOKOUT, 2.8]",
  ]
  for (const marker of runtimeMarkers) assert.ok(includesCanonical(homeProduction, marker), `missing polished Home geometry marker: ${marker}`)

  for (const marker of [
    "HOME_SPAWN = { x: -0.85, z: 8.4 }",
    "HOME_ORB = { x: 0, z: -4.25 }",
    "HOME_GROUND = { x: -5.4, z: -10.8 }",
    "HOME_LIFE_MAP = { x: 5.4, z: -10.8 }",
  ]) assert.ok(includesCanonical(assetHome, marker), `stale AssetDrivenHomeWorld telemetry: ${marker}`)

  for (const marker of [
    "const spawnX = -0.85",
    "const spawnZ = 8.4",
    "position.z + 4.25",
    "position.x + 5.4, position.z + 10.8",
    "position.x - 5.4, position.z + 10.8",
  ]) assert.ok(includesCanonical(embodiedNavigation, marker), `stale movement telemetry: ${marker}`)

  for (const marker of [
    "orb: { x: 0, z: -4.25, radius: 2.4",
    "ground: { x: -5.4, z: -10.8, radius: 2.8",
    "'life-map': { x: 5.4, z: -10.8, radius: 2.8",
    "result.orbClip === orbClips[expected.orbState]",
  ]) assert.ok(includesCanonical(proof, marker), `stale continuous proof geometry: ${marker}`)
})

test('Home Life Map entry is one canonical sky ascent transaction with one camera authority and a closing handoff', () => {
  assert.match(sceneStore, /enterLifeMap: \(\) => set\(\{ mode: "ASCENT", sceneMode: "ASCENT", phase: "ASCENT", isTransitioning: true, inputLocked: true, progress: 0 \}\)/)
  assert.match(worldEvents, /function shouldBeginHomeAscent/)
  assert.match(worldEvents, /function markHomeAscentClosing/)
  assert.match(worldEvents, /request\.entryPortal !== 'home-sky'/)
  assert.match(worldEvents, /request\.cameraCheckpoint !== 'home-sky-ascent'/)
  assert.match(worldEvents, /request\.cameraCheckpoint !== 'home-sky-ascent-complete'/)
  assert.match(worldEvents, /owner\.setAttribute\('data-home-portal-sequence', 'life-map:closing'\)/)
  assert.match(worldEvents, /if \(scene\.phase !== 'ASCENT'\) scene\.enterLifeMap\(\)/)
  assert.match(worldEvents, /window\.dispatchEvent\(new CustomEvent<UraiWorldTravelRequest>\(URAI_HOME_ASCENT_EVENT/)
  assert.match(worldEvents, /return\s*\n\s*}/)
  assert.match(homeProduction, /const ascending = store\.phase === 'ASCENT'/)
  assert.match(homeProduction, /setProgress\(t\)/)
  assert.ok(includesCanonical(homeProduction, "cameraCheckpoint: 'home-sky-ascent-complete'"))
  assert.ok(includesCanonical(homeProduction, "data-home-camera-mode={groundDescent ? 'descent' : phase === 'ASCENT' ? 'ascent' : dragging ? 'look' : 'embodied-first-person'}"))
  assert.ok(includesCanonical(homeProduction, "data-home-input-locked={transitioning || inputLocked ? 'true' : 'false'}"))
  assert.match(homeProduction, /store\.setPhase\('HOME'\)/)
  assert.match(homeProduction, /store\.unlock\(\)/)
  assert.doesNotMatch(homeProduction, /<CinematicCameraRig|<SpatialSceneClient/)
})

test('Home Ground entry is a physical environmental descent rather than a floating menu portal', () => {
  assert.ok(includesCanonical(homeProduction, 'setGroundDescent(true)'))
  assert.match(homeProduction, /home-ground-environmental-threshold/)
  assert.ok(includesCanonical(homeProduction, "destination: 'infrastructure-hub'"))
  assert.ok(includesCanonical(homeProduction, "cameraCheckpoint: 'home-ground-descent'"))
  assert.doesNotMatch(homeProduction, /<WorldPortal type="ground"|dodecahedronGeometry/)
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
  for (const marker of ["schemaVersion: 'urai-home-state-proof-6'", 'retained-canvas-png', 'page.screenshot', 'clip:', 'homeState=permission-limited', 'homeState=unavailable', 'homeState=offline', 'reducedMotion', 'forcedColors', 'home-real-offline-transition', 'orb-lifecycle-production-ui', 'orb-lifecycle-reduced-motion', '__uraiObservedOrbStates', "'thinking'", "'speaking'", 'orb-state-static', 'settleAnimationFrames', 'minimumLuminanceRange', '--enable-unsafe-swiftshader']) assert.ok(stateProof.includes(marker), `missing supplemental state proof marker: ${marker}`)
  assert.doesNotMatch(`${proof}\n${stateProof}`, /waitForTimeout/)
  assert.match(stateProof, /settleAnimationFrames\(page, frameCount, timeoutMs = 15_000\)/)
  assert.match(stateProof, /window\.setTimeout\(\(\) => finish\(true\), timeoutMs\)/)
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

test('Home environmental thresholds and generated manifest filter remain observable on a saturated host', () => {
  assert.match(homeProduction, /home-ground-environmental-threshold/)
  assert.match(homeProduction, /home-life-map-sky-lookout/)
  assert.ok(includesCanonical(homeProduction, "destination: 'infrastructure-hub'"))
  assert.ok(includesCanonical(homeProduction, "destination: 'life-map'"))
  assert.match(homeProduction, /nearby === 'life-map' \? 'home.skyNearby'/)
  assert.match(homeProduction, /locale.text\(contextId\)/)
  assert.equal(URAI_SOURCE_MESSAGES['home.skyNearby'].source, 'Look to the sky')
  assert.ok(hostStableProof.includes('const manifestRegexSource = String.raw`&& /^\\/assets\\/urai'))
  assert.ok(hostStableProof.includes('const escapedManifestRegexSource = String.raw`&& /^\\\\/assets\\\\/urai'))
  assert.ok(hostStableProof.includes('.replace(manifestRegexSource, escapedManifestRegexSource)'))
})
