import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const read = (path) => fs.readFileSync(path, 'utf8')
const homeRuntime = read('src/app/HomeSpatialRuntimeLayer.tsx')
const assetHome = read('src/app/AssetDrivenHomeWorld.tsx')
const homeEntry = read('src/spatial/layout/HomeWorldProduction.tsx')
const currentHome = read('src/spatial/layout/HomeWorldProductionV223.tsx')
const currentHomeGeometry = read('src/spatial/layout/HomeWorldProductionV223Geometry.tsx')
const sky = read('src/spatial/assets/HomeAtmosphericSky.tsx')
const currentHomeVisualAuthority = JSON.parse(read('src/app/currentHomeVisualAuthority.json'))
const groundGateway = read('src/spatial/world/GroundGateway.tsx')
const groundOwner = read('src/app/GroundSpatialWorldClean.tsx')
const lifeMap = read('src/spatial/lifemap/SpatialLifeMapCanonical.tsx')

const has = (source, marker) => assert.ok(source.includes(marker), `missing marker: ${marker}`)

test('Home is a cinematic threshold with a visible user, grounded Orb companion, physical-world Ground and broad-sky Life Map', () => {
  for (const marker of [
    'data-home-embodied-self="visible-cinematic-avatar"',
    'data-home-movement="camera-look-world-surface-selection"',
    'data-home-ground-entry="physical-world-surface"',
    'data-home-life-map-entry="visible-sky-broad-interaction"',
    'data-home-camera-mode=',
    'cinematic-third-person',
    'home-visible-user-avatar',
    'home-gold-companion',
    'physicalWorldClick',
    'event.point.clone()',
  ]) has(currentHome, marker)

  assert.doesNotMatch(currentHome, /stepEmbodiedMotion|useMovementInput|MobileMovementPad/)
  assert.doesNotMatch(currentHome, /nearby==='ground'|nearby === 'ground'/)
  assert.doesNotMatch(currentHome, /data-home-embodied-self="privacy-preserving-first-person"/)
  assert.doesNotMatch(currentHome, /data-home-movement="walk-keyboard-click-touch"/)
  assert.doesNotMatch(currentHome, /The path descends/)
  assert.doesNotMatch(currentHome, /from '\.\/HomeWorldProductionV223Geometry'.*GROUND/)
  assert.match(currentHome, /data-home-distance-ground="world-surface"/)
  assert.match(currentHome, /cameraCheckpoint: 'ground-first-person-arrival'/)
  assert.match(currentHome, /t >= \.995 && !completed\.current/)
  assert.doesNotMatch(currentHome, /window\.setTimeout\(\(\)=>transition==='ground'/)
})

test('Home sky is the canonical broad Life Map threshold and localized Home-side gateways are retired', () => {
  for (const marker of [
    'home-sky-life-map-threshold',
    "threshold: 'broad-visible-sky'",
    'localGroundPortal: false',
    'event.ray.direction.y > .015',
    'RetireLocalizedLifeMapGateways',
  ]) has(sky, marker)
  assert.match(currentHome, /<HomeAtmosphericSky[^>]*onLifeMap=\{onLifeMap\}/)
  assert.doesNotMatch(currentHome, /LIFE_MAP/)
})

test('Home runtime and metadata no longer advertise portal-hub or Home-locomotion ownership', () => {
  assert.match(assetHome, /cinematic-home-ground-threshold-convergence/)
  assert.match(assetHome, /continuous-lived-physical-world/)
  assert.match(assetHome, /home-visible-user-avatar home-grounded-companion home-life-map-sky-threshold/)
  assert.doesNotMatch(assetHome, /HOME_GROUND|HOME_SPAWN|stagePortalLifecycle|PortalDestination/)
  assert.equal(currentHomeVisualAuthority.artRevision, 'v288-cinematic-lived-world-grounded-reliquary')
  assert.equal(currentHomeVisualAuthority.orbVisualAuthority, 'v288-grounded-biomorphic-reliquary')
  assert.equal(currentHomeVisualAuthority.worldIdentifier, 'cinematic-lived-world-threshold')
  assert.match(homeEntry, /HomeWorldProductionV223 as HomeWorldProduction/)
  assert.match(groundGateway, /aria-label="Enter your physical Ground world"/)
  assert.match(homeRuntime, /aria-label="Open Life Map directly"/)
  assert.match(homeRuntime, /aria-label="Open Ground directly"/)
})

test('Ground remains a true first-person lived world with privacy-safe empty-by-default place authority', () => {
  for (const marker of [
    'data-ground-exploration="first-person"',
    'data-ground-runtime-owner="first-person-lived-world"',
    'data-ground-camera="eye-level-terrain-following"',
    'data-ground-collision="visible-terrain-heightfield"',
    'data-ground-place-layer="consent-aware-empty-by-default"',
    'data-ground-private-location-mounted="false"',
    'ground-visible-traversable-terrain',
    'stepEmbodiedMotion',
    'useMovementInput',
    'MobileMovementPad',
  ]) has(groundOwner, marker)
  for (const profile of ['temperate','urban','woodland','arid','coastal']) has(groundOwner, `id: "${profile}"`)
  assert.match(groundOwner, /const EYE_HEIGHT = 1\.69/)
  assert.match(groundOwner, /surfaceY \+ EYE_HEIGHT/)
  assert.doesNotMatch(groundOwner, /GroundPhysicalArchitecture|GroundVaultArchitecture|ground-destination-compass|ground-central-nexus|ground-enterable-threshold-/)
})

test('legacy geometry may remain as compatibility source but cannot own current Home interaction', () => {
  assert.match(currentHomeGeometry, /export const GROUND/)
  assert.match(currentHomeGeometry, /export const LIFE_MAP/)
  assert.doesNotMatch(currentHome, /import \{[^}]*GROUND[^}]*\} from '\.\/HomeWorldProductionV223Geometry'/)
  assert.doesNotMatch(currentHome, /import \{[^}]*LIFE_MAP[^}]*\} from '\.\/HomeWorldProductionV223Geometry'/)
})

test('Life Map keeps its private default boundary', () => {
  assert.match(lifeMap, /data-testid="urai-life-map-authored-fallback"/)
  assert.match(lifeMap, /data-private-memory-mounted="false"/)
  assert.match(lifeMap, /No private memory data is mounted\./)
  assert.match(lifeMap, /Return Home/)
})
