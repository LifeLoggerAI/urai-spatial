import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const read = (path) => fs.readFileSync(path, 'utf8')
const homeRuntime = read('src/app/HomeSpatialRuntimeLayer.tsx')
const assetHome = read('src/app/AssetDrivenHomeWorld.tsx')
const homeEntry = read('src/spatial/layout/HomeWorldProduction.tsx')
const homeProduction = read('src/spatial/layout/HomeWorldProductionV70.tsx')
const homeArt = read('src/spatial/layout/HomeWorldProductionV76.tsx')
const currentHome = read('src/spatial/layout/HomeWorldProductionV223.tsx')
const currentHomeGeometry = read('src/spatial/layout/HomeWorldProductionV223Geometry.tsx')
const historicalV225 = read('src/spatial/layout/HomeWorldProductionV225PolishV2.tsx')
const currentHomeVisual = read('src/spatial/layout/HomeWorldProductionV225PolishV3.tsx')
const groundGateway = read('src/spatial/world/GroundGateway.tsx')
const groundOwner = read('src/app/GroundSpatialWorldClean.tsx')
const groundModel = read('src/app/ground/GroundWorldModel.ts')
const atmosphereCss = read('src/spatial/world/persistentRealmAtmosphere.css')
const lifeMap = read('src/spatial/lifemap/SpatialLifeMapCanonical.tsx')
const lifeMapWorld = read('src/components/lifemap/LifeMapProductionWorld.tsx')
const homeGraph = `${homeRuntime}\n${assetHome}\n${homeEntry}\n${currentHome}\n${currentHomeGeometry}\n${historicalV225}\n${currentHomeVisual}`
const groundGraph = `${groundOwner}\n${groundModel}\n${atmosphereCss}`

const has = (source, marker) => assert.ok(source.includes(marker), `missing marker: ${marker}`)

test('Home is one coherent Sacred-Tech 3D environment with V226 visible art and governed identity', () => {
  for (const marker of [
    'AssetDrivenHomeWorld','HomeWorldProduction','data-home-primary-owner="asset-driven"',
    'data-home-visual-ownership="single-canvas-three-dimensional-geometry"','data-home-desktop-mobile-world="same-scene"',
    'data-home-embodied-self="privacy-preserving-first-person"','data-home-movement="walk-keyboard-click-touch"',
    'data-home-pointer-lock="false"','data-testid="urai-home-webgl-orb"','data-testid="urai-home-embodied-avatar"',
    'stepEmbodiedMotion','useMovementInput','MobileMovementPad',
  ]) has(homeGraph, marker)
  for (const marker of [
    "world.setAttribute('data-home-v223-art-layer', 'historical-runtime-movement-authority')",
    "world.setAttribute('data-home-v224-art-layer', 'superseded-rejected-pixels')",
    "world.setAttribute('data-home-v225-art-layer', 'superseded-v3-visual-owner')",
    "world.setAttribute('data-home-v226-art-layer', 'rooted-canopy-weathered-banks-inhabited-ground-lineage-observatory-rooted-living-memory-presence')",
    "world.setAttribute('data-home-v226-certification', 'fresh-exact-head-pixels-required')",
    "world.setAttribute('data-home-visible-world', 'v226-rooted-inhabited-memory-sanctuary')",
    "world.setAttribute('data-home-animation-owner', 'v226-rooted-living-memory-presence')",
    "world.setAttribute('data-home-audio', 'production-opus-consent-controlled')",
    'data-home-v226-retained-pixel-rebuild="active"',
    'data-home-v225-retained-pixel-rebuild="superseded"',
  ]) has(assetHome, marker)
  for (const marker of [
    'export function HomeWorldProductionV223',
    'data-home-primary-owner="asset-driven"',
    'data-home-art-certification="fresh-exact-head-pixels-required"',
    '<Terrain walk={walk} onGround={p.onGround} onLifeMap={p.onLifeMap}/>',
    '<Escarpment side={-1}/>', '<Escarpment side={1}/>', '<DestinationLights/>', '<Orb state={p.orbState}',
    'HomeV225PolishV2', 'HomeV225PolishV3',
  ]) has(currentHome, marker)
  for (const marker of [
    'home-v225-authored-memory-valley','home-v225-ground-sheltered-memory-basin','home-v225-life-map-rooted-memory-observatory',
    'home-v225-sculpted-sanctuary-floor','home-v225-rooted-memory-rib','home-v225-life-map-braided-lineage-vault',
    'home-v225-single-connected-folded-living-memory-mantle','home-v225-embedded-memory-veins',
  ]) has(currentHomeGeometry, marker)
  for (const marker of [
    'home-v225-v2-production-memory-sanctuary','home-v225-v2-continuous-sculpted-memory-valley','home-v225-v2-authored-valley-floor',
    'home-v225-v2-grown-memory-walk','home-v225-v2-cathedral-memory-ribs','home-v225-v2-weathered-memory-walls',
    'home-v225-v2-ground-memory-hearth','home-v225-v2-life-map-lineage-observatory','home-v225-v2-intimate-veined-living-memory-orb',
  ]) has(historicalV225, marker)
  for (const marker of [
    'home-v226-production-rooted-memory-sanctuary','home-v226-weathered-memory-banks','home-v226-rooted-inhabited-canopy',
    'home-v226-ground-inhabited-hearth','home-v226-life-map-lineage-observatory','home-v226-root-cradle','home-v226-rooted-single-living-memory-presence',
  ]) has(currentHomeVisual, marker)
  assert.match(homeEntry, /HomeWorldProductionV223 as HomeWorldProduction/)
  assert.equal((currentHome.match(/<Canvas/g) ?? []).length, 1)
  assert.doesNotMatch(currentHomeVisual, /useGLTF\(|RoundedBox|octahedronGeometry|torusGeometry|IcosahedronGeometry/)
  assert.doesNotMatch(`${currentHomeGeometry}\n${historicalV225}\n${currentHomeVisual}`, /PRODUCTION CERTIFIED|retained-pixel-pass|pixel-certified/)
  assert.match(groundGateway, /aria-label="Open the ground and descend into Hidden Infrastructure"/)

  // Historical source remains covered without being treated as current visual authority.
  assert.match(homeProduction, /export function HomeWorldProductionV70/)
  assert.match(homeArt, /export function HomeV76Sanctuary/)
  assert.match(homeArt, /home-v126-orb-memory-motes/)
})

test('Home keeps governed Orb states, reduced motion, and real traversal semantics', () => {
  for (const state of ['dormant','idle','attention','listening','thinking','speaking','guiding','reflecting','calming','privacy','warning','transition']) has(currentHomeVisual, `${state}:`)
  assert.match(currentHomeVisual, /const posture:\s*Record<OrbState,\s*Posture>/)
  assert.match(currentHomeVisual, /const t = clock\.elapsedTime \* pose\.speed, breath = reducedMotion \? 1 : 1 \+ Math\.sin\(t \* \.78\) \* \.006/)
  assert.match(assetHome, /data-home-portal-sequence/)
  assert.match(assetHome, /\$\{destination\}:opening/)
  assert.match(assetHome, /\$\{destination\}:traversal/)
  assert.match(assetHome, /\$\{destination\}:closing/)
  assert.match(homeProduction, /prefers-reduced-motion: reduce/)
  assert.match(homeProduction, /pointer: coarse/)
  assert.match(homeProduction, /cameraCheckpoint: 'home-ground-descent'/)
  assert.match(homeProduction, /cameraCheckpoint: 'home-sky-ascent-complete'/)
  assert.match(homeRuntime, /aria-label="Open Life Map directly"/)
  assert.match(homeRuntime, /aria-label="Open Ground directly"/)
  assert.match(currentHomeVisual, /home-v227-split-asymmetric-memory-bloom/)
  assert.match(currentHomeVisual, /home-v227-branching-memory-nervature/)
  assert.match(currentHomeVisual, /home-v228-deep-braided-horizon-crown/)
  assert.match(currentHomeVisual, /home-v228-life-map-rooted-branching-threshold/)
  assert.match(currentHomeVisual, /camera\.zoom = size\.height > size\.width \? \.94 : 1/)
  assert.match(currentHome, /portrait \? \.62 : \.92/)
  assert.doesNotMatch(currentHomeVisual, /<mesh geometry=\{shell\}/)
  assert.doesNotMatch(currentHomeVisual, /memoryRings\[/)
  assert.doesNotMatch(currentHomeVisual, /scale=\{\[\.66,1\.12,\.76\]\}/)
})

test('Ground remains one embodied cinematic infrastructure world', () => {
  for (const marker of ['data-ground-exploration="walkable"','data-ground-pointer-lock="false"','ground-walkable-navigation-surface','ground-walkable-path-network','ground-central-nexus','ground-enterable-threshold-','stepEmbodiedMotion','useMovementInput','MobileMovementPad']) has(groundGraph, marker)
  for (const form of ['pavilion','sanctuary','council','transit','restorative','archive','reflection','vault','observatory','aperture','theater']) assert.ok(groundModel.includes(`"${form}"`) || groundModel.includes(`'${form}'`), `missing Ground chamber form: ${form}`)
  assert.match(groundOwner, /scene\.background = null/)
  assert.doesNotMatch(groundGraph, /data-ground-visual-owner="authored-provider-art"/)
})

test('Life Map remains layered, semantic, private by default, and free of retired terrain/shard presentation', () => {
  for (const marker of ['life-map-white-gold-life-core','life-map-authored-chapter-regions','life-map-light-bridges','life-map-privacy-vault','life-map-emotional-weather','life-map-far-future-horizon','life-map-v226-nebula-volume','CinematicPostProcessing']) assert.match(lifeMapWorld, new RegExp(marker))
  assert.doesNotMatch(lifeMapWorld, /planeGeometry|memoryLedgerGeometry|memorySiteGeometry|life-map-v215-rooted-strata-memory/)
  assert.match(lifeMap, /data-testid="urai-life-map-authored-fallback"/)
  assert.match(lifeMap, /data-private-memory-mounted="false"/)
  assert.match(lifeMap, /No private memory data is mounted\./)
  assert.match(lifeMap, /Return Home/)
})
