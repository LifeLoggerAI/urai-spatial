import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8')
const template = read('src/app/template.tsx')
const homeRuntime = read('src/app/HomeSpatialRuntimeLayer.tsx')
const assetHome = read('src/app/AssetDrivenHomeWorld.tsx')
const authority = JSON.parse(read('src/app/currentHomeVisualAuthority.json'))
const renderer = read('src/spatial/layout/HomeWorldProductionV223.tsx')
const visualAuthority = read('src/spatial/layout/HomeVisualAuthority.tsx')
const groundedOrb = read('src/spatial/assets/HomeOrbGroundedV288.tsx')
const reliquary = read('src/spatial/assets/HomeOrbReliquaryV286.tsx')
const sky = read('src/spatial/assets/HomeAtmosphericSky.tsx')
const ground = read('src/app/GroundSpatialWorldClean.tsx')
const groundGateway = read('src/spatial/world/GroundGateway.tsx')
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

const has = (source, marker) => assert.ok(source.includes(marker), `missing marker: ${marker}`)

test('current Home candidate uses one cinematic owner while certified V288 metadata remains fail-closed', () => {
  for (const marker of ['HomeSpatialRuntimeLayer','spatial-runtime-restoration.css','continuous-spatial-proof-defects.css']) assert.match(template, new RegExp(marker.replace('.', '\\.')))
  has(homeRuntime, 'AssetDrivenHomeWorld')
  has(assetHome, 'HomeWorldProductionV223')
  has(assetHome, 'data-home-canvas-owner="home-world-production-v223-cinematic-threshold-authority"')
  has(assetHome, "world.setAttribute('data-home-art-certification', 'fresh-exact-head-pixels-required')")
  has(assetHome, "world.setAttribute('data-home-scanned-composition', 'visible-avatar-living-memory-orb-physical-ground-and-broad-sky-threshold')")
  has(assetHome, 'data-home-spatial-regions="home-physical-world home-visible-avatar home-living-memory-orb home-life-map-sky-threshold"')
  assert.equal(authority.artRevision, 'v288-cinematic-lived-world-grounded-reliquary')
  assert.equal(authority.worldIdentifier, 'cinematic-lived-world-threshold')
  assert.equal(authority.orbVisualAuthority, 'v288-grounded-biomorphic-reliquary')
  for (const asset of ['HomeWorldProductionV223.tsx','HomeVisualAuthority.tsx','HomeOrbReliquaryV286.tsx','HomeOrbGroundedV288.tsx','HomeAtmosphericSky.tsx']) assert.ok(authority.runtimeAssets.includes(asset), `missing certified predecessor runtime asset ${asset}`)
  assert.equal((renderer.match(/<Canvas/g) ?? []).length, 1)
  assert.doesNotMatch(`${assetHome}\n${renderer}`, /PRODUCTION CERTIFIED|retained-pixel-pass|pixel-certified/)
})

test('V288 biomorphic reliquary remains certified predecessor evidence while the current candidate Orb advances separately', () => {
  has(visualAuthority, '<HomeOrbGroundedV288 />')
  for (const marker of ['v288-grounded-biomorphic-memory-reliquary','home-gold-companion','fallbackVisualOwner: false','material.colorWrite = false','material.depthWrite = false','material.opacity = 0','interactionOwner: true','interactionOwner: false']) has(groundedOrb, marker)
  for (const marker of ['plateSpecsV286','reliquaryPlateGeometryV286','home-v286-layered-internal-memory-world','home-v286-embedded-memory-filament','home-v286-localized-memory-field']) has(reliquary, marker)
  assert.match(reliquary, /raycast=\{\(\) => null\}/)
  assert.doesNotMatch(reliquary, /home-v253-literal-living-memory-heart|livingHeartGeometryV253/)
  has(renderer, '/assets/urai/generated/models/urai-orb-avatar-v1.glb')
  has(renderer, 'name="home-living-memory-orb"')
  has(renderer, 'setLoop(THREE.LoopOnce, 1)')
  assert.doesNotMatch(renderer, /next\.reset\(\)\.setLoop\(THREE\.LoopRepeat\s*,\s*Infinity\)/)
})

test('Home Life Map is the broad visible sky and preserves one canonical ascent transaction', () => {
  for (const marker of ['name="home-sky-life-map-threshold"',"threshold: 'broad-visible-sky'",'localGroundPortal: false','event.ray.direction.y > .015','onClick={activateSky}']) has(sky, marker)
  for (const marker of ["cameraCheckpoint: 'home-sky-ascent'","cameraCheckpoint: 'home-sky-ascent-complete'",'data-home-life-map-entry="visible-sky-broad-interaction"']) has(renderer, marker)
  assert.match(sceneStore, /enterLifeMap:/)
  assert.match(worldEvents, /home-sky-ascent/)
  assert.match(worldEvents, /home-sky-ascent-complete/)
  assert.doesNotMatch(renderer, /HOME_LIFE_MAP|nearby\s*===\s*['"]life-map['"]/)
})

test('Home Ground entry remains a physical world-surface descent into the lived first-person Ground', () => {
  for (const marker of ['data-home-ground-entry="physical-world-surface"','event.point.clone()',"destination: 'infrastructure-hub'","cameraCheckpoint: 'ground-first-person-arrival'"]) has(renderer, marker)
  for (const marker of ['data-ground-exploration="first-person"','data-ground-runtime-owner="first-person-lived-world"','data-ground-camera="eye-level-terrain-following"','data-ground-collision="visible-terrain-heightfield"','data-ground-place-layer="consent-aware-empty-by-default"','ground-visible-traversable-terrain','surfaceY + EYE_HEIGHT']) has(ground, marker)
  has(groundGateway, 'aria-label="Enter your physical Ground world"')
  has(groundGateway, "cameraCheckpoint: world.cameraCheckpoint ?? 'home-ground-descent'")
  assert.doesNotMatch(ground, /ground-central-nexus|ground-destination-compass|GroundPhysicalArchitecture|GroundVaultArchitecture/)
})

test('Home interaction and accessibility ownership stays visible-avatar, cinematic-third-person and bounded', () => {
  has(renderer, 'data-testid="urai-home-webgl-orb"')
  has(renderer, 'data-home-embodied-self="visible-cinematic-avatar"')
  has(renderer, 'data-home-presence-presentation="visible-avatar-third-person"')
  has(renderer, 'name="home-visible-user-avatar"')
  has(renderer, '/assets/urai/generated/human-makehuman-v4/home-human-makehuman-v4.glb')
  has(renderer, "data-home-orb-model-clip={reducedMotion ? 'stopped-reduced-motion'")
  assert.match(renderer, /data-home-camera-mode=\{transition !== 'none' \? transition : dragging \? 'cinematic-third-person-look' : 'cinematic-third-person'\}/)
  assert.doesNotMatch(renderer, /first-person-viewpoint-no-avatar|privacy-preserving-first-person/)
  assert.doesNotMatch(renderer, /useMovementInput|MobileMovementPad|stepEmbodiedMotion/)
  has(homeRuntime, 'requestUraiWorldOrbOpen')
  has(homeRuntime, 'webglcontextlost')
  has(homeRuntime, 'webglcontextrestored')
  has(companion, 'URAI_WORLD_ORB_OPEN_EVENT')
  assert.match(companion, /publishOrbState\('attention', 'companion'\)/)
  assert.match(companion, /publishOrbState\('transition', 'companion'\)/)
})

test('visual overrides cannot veil active spatial owners', () => {
  assert.match(css, /html:has\(\.urai-home-spatial-runtime-layer\)/)
  assert.match(structuralCss, /living Home canvas owns the painted world/i)
  for (const marker of ['content: none !important','border-radius: 0 !important','clip-path: none !important','filter: none !important','backdrop-filter: none !important']) has(structuralCss, marker)
})

test('browser and state proofs retain exact-head desktop mobile reduced-motion and Orb lifecycle evidence', () => {
  for (const marker of ["schemaVersion: 'urai-continuous-spatial-visual-proof-18'","id: 'home-normal-root'",'portrait-mobile','landscape-mobile','homeOrbState','Orb_Resting','Orb_Transition','home-pointer-look-desktop','home-no-webgl-fallback','receipt.json']) has(proof, marker)
  for (const marker of ['visualAuthority.proofSchema','retained-canvas-png','page.screenshot','homeState=permission-limited','homeState=unavailable','homeState=offline','reducedMotion','forcedColors','orb-lifecycle-production-ui','orb-lifecycle-reduced-motion',"'thinking'","'speaking'",'minimumLuminanceRange','--enable-unsafe-swiftshader']) has(stateProof, marker)
  assert.doesNotMatch(`${proof}\n${stateProof}`, /waitForTimeout/)
  assert.doesNotMatch(stateProof, /gl\.readPixels/)
  assert.match(proofWorkflow, /run-continuous-spatial-proof-v22-natural\.mjs/)
  assert.match(stateProofWorkflow, /capture-home-state-proof\.mjs/)
})

test('host-stable generated identity filter remains observable without changing runtime authority', () => {
  assert.ok(hostStableProof.includes('const manifestRegexSource = String.raw`&& /^\\/assets\\/urai'))
  assert.ok(hostStableProof.includes('const escapedManifestRegexSource = String.raw`&& /^\\\\/assets\\\\/urai'))
  assert.ok(hostStableProof.includes('.replace(manifestRegexSource, escapedManifestRegexSource)'))
})