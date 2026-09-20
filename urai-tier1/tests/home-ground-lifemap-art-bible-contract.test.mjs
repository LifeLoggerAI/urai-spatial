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

test('Home enforces bodyless camera-only first-person presence without changing Ground/Sky ownership', () => {
  for (const marker of [
    'data-home-embodied-self="camera-only-first-person-home"',
    'data-home-presence-presentation=',
    'transitioning-camera-only-first-person',
    'camera-only-first-person-home',
    'data-home-movement=',
    'walk-look-interact',
    'camera-only-transition',
    'data-home-ground-entry="physical-world-surface"',
    'data-home-life-map-entry="visible-sky-broad-interaction"',
    'data-home-camera-mode=',
    'home-first-person',
    'home-camera-only-first-person',
    'bodyless-first-person-authored-living-memory-orb-sculpted-sanctuary-and-broad-sky-threshold',
    'home-living-memory-orb',
    '/assets/urai/generated/models/urai-orb-avatar-v1.glb',
    'physicalWorldClick',
    'event.point.clone()',
    'data-home-non-xr-body-policy="camera-only-no-hands-body-rig"',
  ]) has(currentHome, marker)

  assert.match(currentHome, /useHomeExperienceController/)
  assert.doesNotMatch(currentHome, /<HomeEmbodiedAvatar/)
  assert.doesNotMatch(currentHome, /HOME_AVATAR_MODEL/)
  assert.doesNotMatch(currentHome, /homeApi\.activateAvatar\(\)/)
  assert.doesNotMatch(currentHome, /visible-cinematic-avatar|visible-avatar-third-person|hidden-exterior-avatar-first-person|cinematic-third-person/)
  assert.doesNotMatch(currentHome, /privacy-preserving-first-person/)
  assert.doesNotMatch(currentHome, /next\.reset\(\)\.setLoop\(THREE\.LoopRepeat\s*,\s*Infinity\)/)
  assert.doesNotMatch(currentHome, /nearby==='ground'|nearby === 'ground'/)
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
  assert.doesNotMatch(currentHome, /home-life-map-physical-portal|LifeMapPortal|PORTAL_MODEL/)
})

test('Home runtime exposes the current Orb candidate while preserving bodyless Home and certified predecessor provenance', () => {
  assert.match(assetHome, /cinematic-home-ground-threshold-convergence/)
  assert.match(assetHome, /continuous-lived-physical-world/)
  assert.match(currentHome, /home-living-memory-orb/)
  assert.match(currentHome, /data-home-non-xr-body-policy="camera-only-no-hands-body-rig"/)
  assert.match(currentHome, /home-camera-only-first-person/)
  assert.doesNotMatch(currentHome, /<HomeEmbodiedAvatar|HOME_AVATAR_MODEL|urai-home-user-avatar/)
  assert.doesNotMatch(assetHome, /HOME_GROUND|HOME_SPAWN|stagePortalLifecycle|PortalDestination/)
  assert.equal(currentHomeVisualAuthority.artRevision, 'v291-sculpted-sanctuary-translucent-reference-orb')
  assert.equal(currentHomeVisualAuthority.orbVisualAuthority, 'v291-translucent-memory-orb-reference-candidate')
  assert.equal(currentHomeVisualAuthority.currentRuntimeCandidate.orbVisualAuthority, 'v291-translucent-memory-orb-reference-candidate')
  assert.equal(currentHomeVisualAuthority.currentRuntimeCandidate.certified, false)
  assert.equal(currentHomeVisualAuthority.lastCertifiedPredecessor.orbVisualAuthority, 'v288-grounded-biomorphic-reliquary')
  assert.equal(currentHomeVisualAuthority.worldIdentifier, 'cinematic-lived-world-threshold')
  assert.match(currentHome, /home-orb-reference-glass-shell/)
  assert.match(currentHome, /home-orb-memory-bloom-core/)
  assert.doesNotMatch(currentHome, /home-orb-stabilizer-ring|home-orb-crystalline-fragments/)
  assert.match(homeEntry, /HomeWorldProductionV223 as HomeWorldProduction/)
  assert.match(groundGateway, /aria-label="Enter Ground — explore your physical lived world in first person"/)
  assert.match(homeRuntime, /aria-label="Open Life Map directly"/)
  assert.match(homeRuntime, /aria-label="Open Ground directly"/)
})

test('Ground remains a bodyless first-person lived world with privacy-safe empty-by-default place authority', () => {
  for (const marker of [
    'data-ground-exploration="first-person-no-visible-body"',
    'data-ground-runtime-owner="first-person-lived-world"',
    'data-ground-camera="eye-level-terrain-following-no-authored-bob"',
    'data-ground-collision="terrain-plus-authored-obstacle-field"',
    'data-ground-place-layer="consent-aware-empty-by-default"',
    'data-ground-private-location-mounted="false"',
    'data-ground-visible-avatar="false"',
    'data-ground-visible-hands="false"',
    'ground-visible-traversable-terrain',
    'stepEmbodiedMotion',
    'useMovementInput',
    'MobileMovementPad',
    'GROUND_EYE_HEIGHT_M',
  ]) has(groundOwner, marker)
  for (const profile of ['temperate','urban','woodland','arid','coastal']) has(groundOwner, `id: "${profile}"`)
  assert.match(groundOwner, /surfaceY \+ GROUND_EYE_HEIGHT_M/)
  assert.doesNotMatch(groundOwner, /const EYE_HEIGHT = 1\.69/)
  assert.doesNotMatch(groundOwner, /GroundPhysicalArchitecture|GroundVaultArchitecture|ground-destination-compass|ground-central-nexus|ground-enterable-threshold-/)
  assert.match(groundOwner, /ground-natural-canopy-v3\.glb/)
  assert.match(groundOwner, /class GroundCanopyBoundary extends Component/)
  assert.match(groundOwner, /scanned-understory-remains-without-canopy/)
  assert.match(groundOwner, /urai-self-authored-varied-canopy-v13-with-polyhaven-fern-rock-understory/)
  assert.match(groundOwner, /ground-authored-distant-ridge-v4/)
  assert.match(groundOwner, /authored-irregular-ridge-v4-muted-fog-blended/)
  assert.doesNotMatch(groundOwner, /placeholder-trees-retired/)
  assert.doesNotMatch(groundOwner, /<sphereGeometry args=\{\[1, 48, 24\]\} \/>/)
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
