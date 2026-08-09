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
const homeProduction = read('src/spatial/layout/HomeWorldProductionFinal.tsx')
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
  assert.match(homeProductionEntry, /export \{ HomeWorldProductionFinal as HomeWorldProduction \} from "\.\/HomeWorldProductionFinal"/)
  assert.match(homeProduction, /data-home-primary-owner="asset-driven"/)
  assert.match(homeProduction, /data-home-real-world-first="true"/)
  assert.match(groundOwner, /GroundSpatialWorldClean/)
  assert.match(lifeMapOwner, /SpatialLifeMapCanonical/)
  assert.doesNotMatch(template, /focus|replay/i)
})

test('Home remains one embodied authored 3D environment with accessible natural thresholds and recovery', () => {
  for (const marker of [
    'HomeWorldProductionFinal',
    'Stars',
    'HOME_PROVIDER_ENVIRONMENT',
    'replay-memory-film-main.webp',
    'data-home-primary-owner="asset-driven"',
    'data-home-real-world-first="true"',
    'data-home-visible-world="authored-coherent-three-dimensional-sanctuary"',
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
    'data-testid="urai-home-webgl-orb"',
    'data-testid="urai-home-embodied-avatar"',
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
    '<Canvas',
  ]) assert.ok(homeGraph.includes(marker), `missing Home marker: ${marker}`)
  assert.doesNotMatch(homeCss, /replay-memory-film-mobile\.webp/)
  assert.match(homeCss, /opacity:\s*\.2/)
  assert.match(homeProduction, /function prepareAuthoredSanctuary/)
  assert.match(homeProduction, /object\.visible = !rejected/)
  assert.match(homeProduction, /world\.userData\.suppressedPortalProps = true/)
  assert.match(homeProduction, /world\.userData\.centeredForHomeCamera = true/)
  assert.match(homeProduction, /providerImageRole: "atmospheric-support-only"/)
  assert.match(homeProduction, /ContactShadows/)
  assert.match(homeProduction, /function GroundThresholdLandmark/)
  assert.match(homeProduction, /function LifeMapSkyLookout/)
  assert.match(homeProduction, /requestUraiWorldTravel/)
  assert.match(groundGateway, /Open the ground and descend into Hidden Infrastructure/)
  assert.match(homeRuntime, /requestUraiWorldOrbOpen/)
  assert.match(homeRuntime, /webglcontextlost/)
  assert.match(homeRuntime, /webglcontextrestored/)
  assert.match(companion, /URAI_WORLD_ORB_OPEN_EVENT/)
  assert.doesNotMatch(homeProduction, /PORTAL_MODEL|WorldPortal|home-ground-portal-world-owned|home-life-map-portal-world-owned|destinationNames|dodecahedronGeometry/)
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
  assert.match(homeProduction, /if \(store\.phase === "ASCENT"\)/)
  assert.match(homeProduction, /store\.setProgress\(linear\)/)
  assert.match(homeProduction, /cameraCheckpoint: "home-sky-ascent-complete"/)
  assert.match(homeProduction, /data-home-camera-mode=\{groundDescent \? "descent" : phase === "ASCENT" \? "ascent"/)
  assert.match(homeProduction, /data-home-ascent-progress=/)
  assert.match(homeProduction, /data-home-input-locked=/)
  assert.match(homeProduction, /store\.setPhase\("HOME"\)/)
  assert.match(homeProduction, /store\.unlock\(\)/)
  assert.doesNotMatch(homeProduction, /<CinematicCameraRig|<SpatialSceneClient/)
})

test('Home Ground entry is a physical environmental descent rather than a floating menu portal', () => {
  assert.match(homeProduction, /GROUND_DESCENT_DURATION_SECONDS/)
  assert.match(homeProduction, /home-ground-environmental-threshold/)
  assert.match(homeProduction, /transition: "physical-descent"/)
  assert.match(homeProduction, /cameraCheckpoint: "home-ground-descent"/)
  assert.match(homeProduction, /GROUND_DESCENT/)
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
  for (const marker of ["schemaVersion: 'urai-home-state-proof-3'", 'retained-canvas-png', 'page.screenshot', 'clip:', 'homeState=permission-limited', 'homeState=unavailable', 'homeState=offline', 'reducedMotion', 'forcedColors', 'home-real-offline-transition', 'settleAnimationFrames', 'minimumLuminanceRange', '--enable-unsafe-swiftshader']) assert.ok(stateProof.includes(marker), `missing supplemental state proof marker: ${marker}`)
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

test('Home environmental thresholds and generated manifest filter remain observable on a saturated host', () => {
  assert.match(homeProduction, /home-ground-environmental-threshold/)
  assert.match(homeProduction, /home-life-map-sky-lookout/)
  assert.match(homeProduction, /destination: "infrastructure-hub"/)
  assert.match(homeProduction, /destination: "life-map"/)
  assert.match(homeProduction, /Look to the sky/)
  assert.ok(hostStableProof.includes('const manifestRegexSource = String.raw`&& /^\\/assets\\/urai'))
  assert.ok(hostStableProof.includes('const escapedManifestRegexSource = String.raw`&& /^\\\\/assets\\\\/urai'))
  assert.ok(hostStableProof.includes('.replace(manifestRegexSource, escapedManifestRegexSource)'))
})
