import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8')
const has = (source, marker) => assert.equal(source.includes(marker), true, `missing ${marker}`)

const homeGraph = read('src/app/AssetDrivenHomeWorld.tsx')
const homeRuntime = read('src/spatial/layout/HomeWorldProduction.tsx')
const homeRuntime3d = read('src/spatial/layout/HomeWorldProductionV70.tsx')
const homeArt = read('src/spatial/layout/HomeWorldProductionV76.tsx')
const ground = read('src/app/GroundSpatialWorldClean.tsx')
const lifeMap = read('src/spatial/lifemap/SpatialLifeMapCanonical.tsx')
const travel = read('src/spatial/navigation/EmbodiedNavigation.tsx')

test('shared movement kernel preserves stable embodied controls and bounded motion', () => {
  for (const marker of ['useMovementInput', 'stepEmbodiedMotion', 'MovementBounds', 'THREE.MathUtils.clamp']) has(travel, marker)
})

test('Home keeps one V70 Canvas owner while V126 owns the visible sanctuary art', () => {
  has(homeRuntime, 'HomeWorldProductionV70 as HomeWorldProduction')
  has(homeRuntime3d, 'HomeV76Sanctuary')
  has(homeRuntime3d, 'URAI_ORB_STATE_EVENT')
  has(homeRuntime3d, 'resolveOrbSensoryOutput')
  assert.equal((homeRuntime3d.match(/<Canvas/g) ?? []).length, 1)
  assert.doesNotMatch(homeArt, /<Canvas/)
  assert.doesNotMatch(homeGraph, /PRODUCTION CERTIFIED|retained-pixel-pass|pixel-certified/)
})

test('V165 preserves embodied authority while removing V164 slab and capsule regressions', () => {
  for (const marker of [
    'function SculptedCanyonGround(',
    'home-v125-sculpted-canyon-ground',
    'smoothed-open-basin-clear-camera-corridors-no-road-groove',
    'function SanctuaryTerraces(',
    'home-v126-continuous-walkable-terrace-network',
    'runway-and-arrival-traces-remain-nonrendered',
    'legacy-alcove-meshes-remain-disabled-no-gate-facade',
    'scan-provenance-pushed-beyond-clear-navigation-corridors-no-card-slabs',
    'function FramedFissure(',
    'terrain-flush-readable-destination-cut-clear-camera-corridor-no-door-no-ring',
    'function weatheredSanctuaryMassGeometry(',
    'home-v149-weathered-rift-threshold-sanctuary',
    'low-broad-canyon-silhouettes-clear-destination-camera-corridors-no-piles',
    'open-navigation-basin-with-layered-side-ridges-and-recessed-lit-cuts',
    'function ApseAndOrbCradle(',
    'low-lateral-apse-geology-clear-under-orb-air-gap-no-pedestal',
    'function LivingOrb(',
    'home-v126-apse-integrated-orb',
    'home-v126-orb-memory-motes',
    'home-v154-orb-memory-depth-motes',
    'contained-memory-mote-heart-primary-presence-no-capsule-no-aura-no-pedestal',
    'home-v125-atmospheric-depth-motes',
    'bounded-depth-motes-reduced-render-load-no-screen-overlay',
    'v165-smoothed-canyon-corridors-contained-orb-no-runway',
    'remove-v164-jagged-connected-shelves-clear-camera-corridors-contain-orb-shell',
  ]) has(homeArt, marker)

  assert.match(homeArt, /name="home-v154-inlaid-stone-approach"[^>]*visible=\{false\}/)
  assert.match(homeArt, /name="home-v131-passive-signal-arrival-path"[^>]*visible=\{false\}/)
  assert.match(homeArt, /<primitive object=\{thresholds\} visible=\{false\} \/>/)
  assert.doesNotMatch(homeArt, /function canyonShelfGeometry|function CanyonShelf|home-v164-\$\{side\}-continuous-canyon-shelf/)
  assert.match(homeArt, /far-port-weathered-ridge[^\n]*scale: \[4\.20, 0\.88, 1\.50\]/)
  assert.match(homeArt, /far-starboard-weathered-ridge[^\n]*scale: \[4\.46, 0\.94, 1\.56\]/)
  assert.match(homeArt, /mid-port-canyon-shoulder[^\n]*scale: \[2\.72, 0\.54, 1\.14\]/)
  assert.match(homeArt, /mid-starboard-canyon-shoulder[^\n]*scale: \[2\.84, 0\.54, 1\.18\]/)
  assert.match(homeArt, /name="home-v126-apse-integrated-orb"[^>]*scale=\{\[1\.18, 1\.18, 1\.18\]\}/)
  assert.match(homeArt, /name="home-v132-orb-memory-volume"[^>]*scale=\{\[0\.58, 0\.64, 0\.56\]\}/)
  assert.match(homeArt, /transparent opacity=\{0\.15\}/)
  assert.match(homeArt, /<primitive object=\{orb\} visible=\{false\} \/>/)
  assert.match(homeArt, /const ORB = new THREE\.Vector3\(-0\.18, 2\.18, -6\.90\)/)
  assert.match(homeArt, /onClick=\{\(event\) => \{ event\.stopPropagation\(\); onOrb\(\) \}\}/)
  assert.doesNotMatch(homeArt, /function RelicMachine\(|function PortalRecess\(|<TerracedGround|name="home-v124-authored-asymmetric-landform"|name="home-v76-apse-embedded-orb-relic-machine"/)
  assert.doesNotMatch(homeArt, /function layeredSanctuaryWingGeometry|function cradleSupportGeometry|home-v148-open-buttress-threshold-sanctuary/)
  assert.doesNotMatch(homeArt, /<ringGeometry|<torusGeometry|<RoundedBox/)
  assert.doesNotMatch(homeArt, /retained-pixel-pass|pixel-certified|PRODUCTION CERTIFIED/)
})

test('Home telemetry, transition, and destination authority remain aligned to the current V70 runtime', () => {
  for (const marker of [
    'const ORB = new THREE.Vector3(',
    'const GROUND = new THREE.Vector3(',
    'const LIFE_MAP = new THREE.Vector3(',
    'URAI_ORB_STATE_EVENT',
    'resolveOrbSensoryOutput',
    'requestUraiWorldTravel',
    "destination: 'infrastructure-hub'",
    "destination: 'life-map'",
    'requestUraiWorldOrbOpen',
  ]) has(homeRuntime3d, marker)
})

test('Ground remains a walkable infrastructure world with semantic exits', () => {
  for (const marker of ['function GroundWorld(', 'stepEmbodiedMotion({', 'useMovementInput({', 'router.push(destination.href)', 'router.push("/home?returnFrom=ground")', 'data-ground-exploration="walkable"']) has(ground, marker)
})

test('Life Map preserves private-by-default canonical ownership and semantic return behavior', () => {
  for (const marker of ['SpatialLifeMapCanonical', 'LifeMapRouteBoundary', 'requestUraiWorldReturn', 'data-private-memory-mounted="false"', 'data-life-map-access={mode}', 'data-selected-memory-owner="spatial-lens-only"']) has(lifeMap, marker)
})

test('travel infrastructure keeps movement input, bounded stepping, and virtual controls', () => {
  for (const marker of ['useMovementInput', 'stepEmbodiedMotion', 'setVirtualMovement', 'clearVirtualMovement']) has(travel, marker)
})
