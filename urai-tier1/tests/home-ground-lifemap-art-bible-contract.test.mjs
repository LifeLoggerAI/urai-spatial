import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const read = (path) => fs.readFileSync(path, 'utf8')
const homeRuntime = read('src/app/HomeSpatialRuntimeLayer.tsx')
const assetHome = read('src/app/AssetDrivenHomeWorld.tsx')
const homeEntry = read('src/spatial/layout/HomeWorldProduction.tsx')
const homeProduction = read('src/spatial/layout/HomeWorldProductionV70.tsx')
const homeArt = read('src/spatial/layout/HomeWorldProductionV76.tsx')
const groundGateway = read('src/spatial/world/GroundGateway.tsx')
const groundOwner = read('src/app/GroundSpatialWorldClean.tsx')
const groundModel = read('src/app/ground/GroundWorldModel.ts')
const atmosphereCss = read('src/spatial/world/persistentRealmAtmosphere.css')
const lifeMap = read('src/spatial/lifemap/SpatialLifeMapCanonical.tsx')
const lifeMapWorld = read('src/components/lifemap/LifeMapProductionWorld.tsx')
const homeGraph = `${homeRuntime}\n${assetHome}\n${homeEntry}\n${homeProduction}\n${homeArt}`
const groundGraph = `${groundOwner}\n${groundModel}\n${atmosphereCss}`

const has = (source, marker) => assert.ok(source.includes(marker), `missing marker: ${marker}`)

test('Home is one coherent Sacred-Tech 3D environment with V126 visible art and governed identity', () => {
  for (const marker of [
    'AssetDrivenHomeWorld','HomeWorldProduction','data-home-primary-owner="asset-driven"',
    'data-home-visual-ownership="single-canvas-three-dimensional-geometry"','data-home-desktop-mobile-world="same-scene"',
    'data-home-embodied-self="privacy-preserving-first-person"','data-home-movement="walk-keyboard-click-touch"',
    'data-home-pointer-lock="false"','data-testid="urai-home-webgl-orb"','data-testid="urai-home-embodied-avatar"',
    'home-authored-terrain','home-sanctuary-pavilion','stepEmbodiedMotion','useMovementInput','MobileMovementPad',
  ]) has(homeGraph, marker)
  has(assetHome, "data-home-v126-art-layer', 'single-canvas-ground-owned-sanctuary-framed-fissures-integrated-orb-apse")
  has(assetHome, "data-home-physical-base', 'continuous-sculpted-ground-staggered-terraces-layered-apse")
  for (const marker of [
    "const ROCK_FACE_A = '/assets/urai/home-production/cc0/polyhaven-v48/rock_face_01/asset.gltf'",
    "const ROCK_FACE_B = '/assets/urai/home-production/cc0/polyhaven-v48/rock_face_02/asset.gltf'",
    "const GOVERNED_ORB = '/assets/urai/generated/models/urai-orb-avatar-v1.glb'",
    'function SculptedCanyonGround(','function GeologicalFrame(','function FramedFissure(','function LivingOrb(',
    'home-v125-sculpted-canyon-ground','home-v126-bounded-geological-edge-masses','home-v126-orb-memory-motes','home-v126-layered-apse-orb-cradle',
  ]) has(homeArt, marker)
  assert.match(homeEntry, /HomeWorldProductionV70 as HomeWorldProduction/)
  assert.equal((homeProduction.match(/<Canvas/g) ?? []).length, 1)
  assert.doesNotMatch(homeArt, /<Canvas|TerracedGround|PortalRecess|PortalStoneFrame|function RelicMachine\(/)
  assert.doesNotMatch(homeGraph, /PRODUCTION CERTIFIED|retained-pixel-pass|pixel-certified/)
  assert.match(groundGateway, /aria-label="Open the ground and descend into Hidden Infrastructure"/)
})

test('Home keeps governed Orb states, reduced motion, and real traversal semantics', () => {
  for (const state of ['dormant','idle','attention','listening','thinking','speaking','guiding','reflecting','calming','privacy','warning','transition']) has(homeArt, `${state}:`)
  assert.match(homeProduction, /prefers-reduced-motion: reduce/)
  assert.match(homeProduction, /pointer: coarse/)
  assert.match(homeProduction, /cameraCheckpoint: 'home-ground-descent'/)
  assert.match(homeProduction, /cameraCheckpoint: 'home-sky-ascent-complete'/)
  assert.match(homeRuntime, /aria-label="Open Life Map directly"/)
  assert.match(homeRuntime, /aria-label="Open Ground directly"/)
})

test('Ground remains one embodied cinematic infrastructure world', () => {
  for (const marker of ['data-ground-exploration="walkable"','data-ground-pointer-lock="false"','ground-walkable-navigation-surface','ground-walkable-path-network','ground-central-nexus','ground-enterable-threshold-','stepEmbodiedMotion','useMovementInput','MobileMovementPad']) has(groundGraph, marker)
  for (const form of ['pavilion','sanctuary','council','transit','restorative','archive','reflection','vault','observatory','aperture','theater']) assert.ok(groundModel.includes(`"${form}"`) || groundModel.includes(`'${form}'`), `missing Ground chamber form: ${form}`)
  assert.match(groundOwner, /scene\.background = null/)
  assert.doesNotMatch(groundGraph, /data-ground-visual-owner="authored-provider-art"/)
})

test('Life Map remains layered, semantic, and private by default', () => {
  for (const marker of ['life-map-white-gold-life-core','life-map-authored-chapter-regions','life-map-light-bridges','life-map-privacy-vault','life-map-emotional-weather','life-map-far-future-horizon','CinematicPostProcessing']) assert.match(lifeMapWorld, new RegExp(marker))
  assert.match(lifeMap, /data-testid="urai-life-map-authored-fallback"/)
  assert.match(lifeMap, /data-private-memory-mounted="false"/)
  assert.match(lifeMap, /No private memory data is mounted\./)
  assert.match(lifeMap, /Return Home/)
})
