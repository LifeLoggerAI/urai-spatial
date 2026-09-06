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
  for (const marker of ['useMovementInput','stepEmbodiedMotion','MovementBounds','THREE.MathUtils.clamp']) has(travel, marker)
})

test('Home keeps one V70 Canvas owner while V171 owns the visible sanctuary art', () => {
  has(homeRuntime, 'HomeWorldProductionV70 as HomeWorldProduction')
  has(homeRuntime3d, 'HomeV76Sanctuary')
  has(homeRuntime3d, 'URAI_ORB_STATE_EVENT')
  has(homeRuntime3d, 'resolveOrbSensoryOutput')
  assert.equal((homeRuntime3d.match(/<Canvas/g) ?? []).length, 1)
  assert.doesNotMatch(homeArt, /<Canvas/)
  assert.doesNotMatch(homeGraph, /PRODUCTION CERTIFIED|retained-pixel-pass|pixel-certified/)
})

test('V171 preserves embodied authority while repairing dead-sky, flat-terrain, destination-light, and bright-seed regressions', () => {
  for (const marker of [
    'function SculptedCanyonGround(', 'home-v125-sculpted-canyon-ground',
    'high-relief-continuous-canyon-rim-layered-stone-no-dead-sky',
    'home-v126-continuous-walkable-terrace-network',
    'governed-landscape-provenance-retained-nonrendered-single-ground-owner',
    'legacy-alcove-meshes-remain-disabled-no-gate-facade',
    'edge-scans-outside-primary-frustum-no-pasted-islands',
    'function FramedFissure(', 'terrain-flush-readable-destination-cut-clear-camera-corridor-no-door-no-ring',
    'bright-localized-rift-language-without-gate-silhouette',
    'function weatheredSanctuaryMassGeometry(', 'home-v149-weathered-rift-threshold-sanctuary',
    'detached-mass-family-retained-as-nonrendered-provenance-no-piles',
    'function ApseAndOrbCradle(', 'home-v126-layered-apse-orb-cradle',
    'detached-apse-masses-retained-nonrendered-no-pedestal',
    'function LivingOrb(', 'home-v126-apse-integrated-orb', 'home-v126-orb-memory-motes',
    'home-v154-orb-memory-depth-motes', 'swarm-dominant-memory-presence-minimal-seed-no-glowing-ball-read',
    'v171-high-relief-canyon-swarm-dominant-orb-no-runway',
    'raise-continuous-basin-rim-add-geologic-relief-strengthen-destination-light-minimize-orb-seed',
  ]) has(homeArt, marker)
  assert.match(homeArt, /name="home-v154-inlaid-stone-approach"[^>]*visible=\{false\}/)
  assert.match(homeArt, /name="home-v131-passive-signal-arrival-path"[^>]*visible=\{false\}/)
  assert.match(homeArt, /<primitive object=\{environment\} visible=\{false\} \/>/)
  assert.match(homeArt, /<primitive object=\{thresholds\} visible=\{false\} \/>/)
  assert.match(homeArt, /name="home-v126-apse-integrated-orb"[^>]*scale=\{\[1\.42,1\.42,1\.42\]\}/)
  assert.match(homeArt, /transparent opacity=\{0\.020\}/)
  assert.match(homeArt, /name="home-v133-orb-memory-seed"[^>]*scale=\{\[0\.10,0\.14,0\.09\]\}/)
  assert.match(homeArt, /const ORB = new THREE\.Vector3\(-0\.18, 2\.18, -6\.90\)/)
  assert.doesNotMatch(homeArt, /function canyonShelfGeometry|function CanyonShelf|home-v164-\$\{side\}-continuous-canyon-shelf/)
  assert.doesNotMatch(homeArt, /<ringGeometry|<torusGeometry|<RoundedBox/)
  assert.doesNotMatch(homeArt, /retained-pixel-pass|pixel-certified|PRODUCTION CERTIFIED/)
})

test('Home telemetry and destination authority remain aligned to V70', () => {
  for (const marker of ['const ORB = new THREE.Vector3(','const GROUND = new THREE.Vector3(','const LIFE_MAP = new THREE.Vector3(','URAI_ORB_STATE_EVENT','resolveOrbSensoryOutput','requestUraiWorldTravel',"destination: 'infrastructure-hub'","destination: 'life-map'",'requestUraiWorldOrbOpen']) has(homeRuntime3d, marker)
})

test('Ground and Life Map keep their canonical embodied contracts', () => {
  for (const marker of ['function GroundWorld(','stepEmbodiedMotion({','useMovementInput({','router.push(destination.href)','data-ground-exploration="walkable"']) has(ground, marker)
  for (const marker of ['SpatialLifeMapCanonical','LifeMapRouteBoundary','requestUraiWorldReturn','data-private-memory-mounted="false"','data-life-map-access={mode}']) has(lifeMap, marker)
})

test('travel infrastructure keeps movement input and virtual controls', () => {
  for (const marker of ['useMovementInput','stepEmbodiedMotion','setVirtualMovement','clearVirtualMovement']) has(travel, marker)
})
