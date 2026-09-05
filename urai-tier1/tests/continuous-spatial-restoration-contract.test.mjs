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
const homeProduction = read('src/spatial/layout/HomeWorldProductionSacred.tsx')
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
  assert.match(homeProductionEntry, /export \{ HomeWorldProductionSacred as HomeWorldProduction \} from "\.\/HomeWorldProductionSacred"/)
  assert.match(homeProduction, /data-home-primary-owner="asset-driven"/)
  assert.match(homeProduction, /data-home-visible-world="moonlit-sacred-tech-sanctuary"/)
  assert.match(groundOwner, /GroundSpatialWorldClean/)
  assert.match(lifeMapOwner, /SpatialLifeMapCanonical/)
  assert.doesNotMatch(template, /focus|replay/i)
})

test('Home remains one embodied authored sacred-tech 3D environment with accessible thresholds and recovery', () => {
  for (const marker of [
    'HomeWorldProductionSacred',
    'Stars',
    'home-entry-chamber-model-v1',
    'home-human-makehuman-v4',
    'urai-orb-avatar-glb-v1',
    'portal-ring-master-glb-v1',
    'data-home-primary-owner="asset-driven"',
    'data-home-visible-world="moonlit-sacred-tech-sanctuary"',
    'data-home-world-character="premium-cinematic-sacred-tech"',
    'data-home-physical-base="authored-obsidian-ritual-platform"',
    'data-home-visual-ownership="three-dimensional-geometry"',
    'data-home-desktop-mobile-world="same-scene"',
    'data-home-embodied-self="makehuman-v4"',
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
    'home-life-map-physical-portal',
    'stepEmbodiedMotion',
    'useMovementInput',
    'MobileMovementPad',
    'URAI_ORB_STATE_EVENT',
    'resolveOrbSensoryOutput',
    'data-home-orb-state={orbState}',
    '<Canvas',
  ]) assert.ok(homeGraph.includes(marker), `missing Home marker: ${marker}`)
  assert.doesNotMatch(homeCss, /replay-memory-film-mobile\.webp/)
  assert.match(homeProduction, /function RitualFloor\(/)
  assert.match(homeProduction, /function MoonAndMist\(/)
  assert.match(homeProduction, /function SacredOrb\(/)
  assert.match(homeProduction, /function OrbPlatform\(/)
  assert.match(homeProduction, /function HumanPresence\(/)
  assert.match(homeProduction, /function LifeMapPortal\(/)
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
  assert.match(homeProduction, /portal:\s*resolveDisclosedReviewUraiSpatialAssetPath\('portal-ring-master-glb-v1', disclosedReview\)!/)
  assert.match(homeProduction, /function LifeMapPortal\(\{ onActivate, modelUrl \}/)
  assert.match(homeProduction, /const portal = useGLTF\(modelUrl\)/)
  assert.match(homeProduction, /<LifeMapPortal onActivate=\{onLifeMap\} modelUrl=\{portalModel\}/)
  assert.match(homeProduction, /<Thresholds onGround=\{props\.onGround\} onLifeMap=\{props\.onLifeMap\} portalModel=\{props\.assets\.portal\}/)
  assert.doesNotMatch(homeProduction, /const PORTAL_MODEL\s*=|useGLTF\(['"]\/.*portal-ring/)
  assert.doesNotMatch(homeProduction, /WorldPortal|home-ground-portal-world-owned|home-life-map-portal-world-owned|destinationNames|dodecahedronGeometry/)
  assert.doesNotMatch(homeGraph, /requestPointerLock|OrbitControls/)
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
  assert.match(homeProduction, /transition==='life-map'/)
  assert.match(homeProduction, /setProgress\(t\)/)
  assert.match(homeProduction, /cameraCheckpoint:'home-sky-ascent-complete'/)
  assert.match(homeProduction, /data-home-camera-mode=\{transition!=='none'\?transition:dragging\?'look':'embodied-third-person'\}/)
  assert.match(homeProduction, /data-home-input-locked=\{transition!=='none'\?'true':'false'\}/)
  assert.match(homeProduction, /store\.setPhase\('HOME'\)/)
  assert.match(homeProduction, /store\.unlock\(\)/)
  assert.doesNotMatch(homeProduction, /<CinematicCameraRig|<SpatialSceneClient/)
})

test('Home Ground entry is a physical environmental descent rather than a floating menu portal', () => {
  assert.match(homeProduction, /transition==='ground'/)
  assert.match(homeProduction, /home-ground-environmental-threshold/)
  assert.match(homeProduction, /destination:'infrastructure-hub'/)
  assert.match(homeProduction, /cameraCheckpoint:'home-ground-descent'/)
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
    'ground-room-shell',
    'ground-spine',
    'ground-node-proximity',
    'ground-portal-volume',
    'data-ground-nearby',
    'data-ground-camera-mode',
    'data-ground-mobile-controls',
    'data-ground-transition-phase',
    'data-ground-fallback-mode',
    'stepEmbodiedMotion',
    'useMovementInput',
    'MobileMovementPad',
  ]) assert.ok(includesCanonical(groundGraph, marker), `missing Ground marker: ${marker}`)
  assert.doesNotMatch(groundGraph, /requestPointerLock|OrbitControls/)
  assert.match(groundModel, /export type GroundDestination/)
  assert.match(groundModel, /export const DESTINATIONS/)
  assert.match(ground, /import \{ DESTINATIONS, type GroundDestination, type GroundChamberForm \} from "\.\/ground\/GroundWorldModel"/)
  assert.match(ground, /ground-enterable-threshold-\$\{destination\.id\}/)
  assert.match(groundCanonical, /data-ground-destination/)
})

test('browser proof and supplemental state proof cover their current exact-head evidence contract', () => {
  const proofGraph = `${proof}\n${stateProof}\n${proofWorkflow}\n${stateProofWorkflow}`
  for (const marker of [
    'captureHomeState', 'captureOrbStates', 'captureInteraction', 'capturePointerLook', 'capturePortalSequence',
    "for (const destination of ['ground', 'life-map'])",
    'desktop', 'portrait-mobile', 'landscape-mobile', 'reducedMotion', 'fallbackSelector', 'screenshot',
    'permission-limited', 'unavailable', 'offline', 'orb-lifecycle-reduced-motion', 'forcedColors',
  ]) assert.ok(proofGraph.includes(marker), `missing proof marker: ${marker}`)
  assert.match(proofWorkflow, /capture-continuous-spatial-proof-v18/)
  assert.match(stateProofWorkflow, /capture-home-state-proof/)
  assert.match(hostStableProof, /capture-continuous-spatial-proof-v18/)
})

test('Life Map owner and legacy veil suppression remain full viewport', () => {
  assert.match(lifeMapOwner, /SpatialLifeMapCanonical/)
  assert.match(css, /data-testid="urai-r3f-canonical-lifemap"/)
  assert.match(css, /data-testid="urai-true-3d-life-map"/)
  assert.match(structuralCss, /life-map/i)
})

test('Home environmental thresholds and generated manifest filter remain observable on a saturated host', () => {
  assert.match(homeGraph, /home-ground-environmental-threshold/)
  assert.match(homeGraph, /home-life-map-physical-portal/)
  assert.match(homeGraph, /data-home-assets-ready/)
  assert.match(homeGraph, /resolveDisclosedReviewUraiSpatialAssetPath/)
})
