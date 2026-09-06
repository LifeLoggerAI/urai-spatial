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
  for (const marker of [
    'useMovementInput',
    'stepEmbodiedMotion',
    'MovementBounds',
    'THREE.MathUtils.clamp',
  ]) has(travel, marker)
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

test('V163 keeps the runway suppressed while deepening basin geology, destination scars, and the compact no-pedestal Orb', () => {
  for (const marker of [
    'function SculptedCanyonGround(',
    'home-v125-sculpted-canyon-ground',
    'function SanctuaryTerraces(',
    'home-v126-continuous-walkable-terrace-network',
    'home-v154-inlaid-stone-approach',
    'narrow-meandering-inlay-not-road-slab',
    'hairline-stone-trace-integrated-into-ground-no-road-read',
    'broken-buried-wayfinding-traces-no-continuous-track',
    'orientation-traces-retained-as-nonrendered-geometry-no-runway-read',
    'legacy-alcove-meshes-remain-disabled-no-gate-facade',
    'function GeologicalFrame(',
    'home-v126-bounded-geological-edge-masses',
    'scan-provenance-kept-off-axis-while-authored-ground-owns-frame',
    'scan-provenance-remains-off-axis-after-ground-scar-refinement',
    'function FramedFissure(',
    'home-v126-${side}-framed-fissure',
    'v154-buried-irregular-stone-fissure-no-facade-hoops-or-translucent-panels',
    'ground-laid-navigation-scar-no-upright-gate-silhouette',
    'terrain-flush-navigation-scar-no-upright-sliver',
    'larger-terrain-basin-scar-with-localized-destination-light-no-gate',
    'function weatheredSanctuaryMassGeometry(',
    'home-v149-weathered-rift-threshold-sanctuary',
    'v154-faceted-broken-buttresses-no-rounded-boulder-gates',
    'terrain-relief-shelves-sunk-into-ground-no-boulder-piles',
    'ground-rift-bearing-mass',
    'life-map-rift-bearing-mass',
    'far-port-weathered-ridge',
    'far-starboard-weathered-ridge',
    'mid-port-canyon-shoulder',
    'mid-starboard-canyon-shoulder',
    'asymmetric-canyon-ridges-add-depth-without-gates-or-boulder-piles',
    'deep-overlapping-canyon-basin-landmarks-without-rings-facades-or-boulder-piles',
    'deep-asymmetric-basin-geology-with-recessed-lit-navigation-scars',
    'function ApseAndOrbCradle(',
    'home-v126-layered-apse-orb-cradle',
    'v154-broken-side-shelves-frame-orb-without-pedestal',
    'apse-ledges-sunk-into-terrain-clear-orb-air-gap',
    'raised-side-geology-frames-orb-without-under-orb-pedestal',
    'function LivingOrb(',
    'home-v126-apse-integrated-orb',
    'home-v126-orb-memory-motes',
    'home-v154-orb-memory-depth-motes',
    'contained-memory-core-not-particle-fountain',
    'orb-floats-over-continuous-terrain-without-rock-cradle-clutter',
    'compact-memory-cloud-preserved-unchanged',
    'orb-primary-focal-presence-framed-by-side-geology-not-pedestal',
    "const GOVERNED_ORB = '/assets/urai/generated/models/urai-orb-avatar-v1.glb'",
    'ORB_PALETTE',
    'home-v125-atmospheric-depth-motes',
    'v154-visible-canyon-fissures-memory-swarm-no-pedestal',
    'v158-ground-scar-thresholds-hairline-path-sunken-geology',
    'v163-deeper-canyon-basin-landmarks-no-runway',
    'destination-basin-light-without-gate-facade',
    'taller-overlapping-ridges-reduce-empty-sky-without-wall-or-ring',
  ]) has(homeArt, marker)
  assert.match(homeArt, /name="home-v154-inlaid-stone-approach"[^>]*visible=\{false\}/)
  assert.match(homeArt, /name="home-v131-passive-signal-arrival-path"[^>]*visible=\{false\}/)
  assert.match(homeArt, /<primitive object=\{thresholds\} visible=\{false\} \/>/)
  assert.doesNotMatch(homeArt, /function RelicMachine\(|function PortalRecess\(|<TerracedGround|name="home-v124-authored-asymmetric-landform"|name="home-v76-apse-embedded-orb-relic-machine"/)
  assert.doesNotMatch(homeArt, /function layeredSanctuaryWingGeometry|function cradleSupportGeometry|home-v148-open-buttress-threshold-sanctuary/)
  assert.doesNotMatch(homeArt, /<ringGeometry|<torusGeometry|<RoundedBox/)
  assert.match(homeArt, /const stations = 80/)
  assert.match(homeArt, /const half = 0\.024 - t \* 0\.007/)
  assert.match(homeArt, /const phase = index % 12/)
  assert.match(homeArt, /if \(phase > 2\) continue/)
  assert.match(homeArt, /new THREE\.IcosahedronGeometry\(1, 2\)/)
  assert.match(homeArt, /new THREE\.IcosahedronGeometry\(0\.72, 3\)/)
  assert.match(homeArt, /for \(let index = 0; index < 980; index \+= 1\)/)
  assert.match(homeArt, /Array\.from\(\{ length: 6 \}/)
  assert.match(homeArt, /rotation=\{\[-1\.38, isGround \? 0\.16 : -0\.16, isGround \? -0\.10 : 0\.10\]\}/)
  assert.match(homeArt, /scale=\{isGround \? \[0\.31, 0\.46, 0\.32\] : \[0\.30, 0\.47, 0\.32\]\}/)
  assert.match(homeArt, /size=\{0\.012\} transparent opacity=\{0\.34\}/)
  assert.match(homeArt, /intensity=\{0\.16\} distance=\{3\.2\}/)
  assert.match(homeArt, /for \(let index = 0; index < 48; index \+= 1\)/)
  assert.match(homeArt, /new THREE\.ExtrudeGeometry\(frame, \{ depth: 0\.12/)
  assert.match(homeArt, /boxGeometry args=\{\[4\.20, 4\.20, 2\.80\]\}/)
  assert.match(homeArt, /far-port-weathered-ridge[^\n]*scale: \[3\.72, 1\.04, 1\.34\]/)
  assert.match(homeArt, /far-starboard-weathered-ridge[^\n]*scale: \[4\.02, 1\.14, 1\.42\]/)
  assert.match(homeArt, /mid-port-canyon-shoulder[^\n]*scale: \[2\.28, 0\.70, 1\.02\]/)
  assert.match(homeArt, /mid-starboard-canyon-shoulder[^\n]*scale: \[2\.42, 0\.66, 1\.08\]/)
  assert.match(homeArt, /scale=\{\[1\.18, 0\.18, 0\.72\]\}/)
  assert.match(homeArt, /scale=\{\[1\.10, 0\.17, 0\.70\]\}/)
  assert.match(homeArt, /name="home-v125-sculpted-canyon-ground"[^>]*>[\s\S]*?<meshPhysicalMaterial/)
  assert.match(homeArt, /retained-stone-provenance[^\n]*castShadow receiveShadow>/)
  assert.match(homeArt, /retired-threshold-panel[^\n]*geometry=\{field\}[^\n]*>/)
  assert.match(homeArt, /const rejectedHorizonRepeat = object\.name\.startsWith\('horizon-mountain-'\)/)
  assert.match(homeArt, /const ORB = new THREE\.Vector3\(-0\.18, 2\.18, -6\.90\)/)
  assert.match(homeArt, /<primitive object=\{orb\} visible=\{false\} \/>/)
  assert.match(homeArt, /onClick=\{\(event\) => \{ event\.stopPropagation\(\); onOrb\(\) \}\}/)
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
  for (const marker of [
    'function GroundWorld(',
    'stepEmbodiedMotion({',
    'useMovementInput({',
    'router.push(destination.href)',
    'router.push("/home?returnFrom=ground")',
    'data-ground-exploration="walkable"',
  ]) has(ground, marker)
})

test('Life Map preserves private-by-default canonical ownership and semantic return behavior', () => {
  for (const marker of [
    'SpatialLifeMapCanonical',
    'LifeMapRouteBoundary',
    'requestUraiWorldReturn',
    'data-private-memory-mounted="false"',
    'data-life-map-access={mode}',
    'data-selected-memory-owner="spatial-lens-only"',
  ]) has(lifeMap, marker)
})

test('travel infrastructure keeps movement input, bounded stepping, and virtual controls', () => {
  for (const marker of [
    'useMovementInput',
    'stepEmbodiedMotion',
    'setVirtualMovement',
    'clearVirtualMovement',
  ]) has(travel, marker)
})
