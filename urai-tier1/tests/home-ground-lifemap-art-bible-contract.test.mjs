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

test('Home preserves Avatar presentation then bodyless camera-only first-person without changing Ground/Sky ownership', () => {
  for (const marker of [
    'HomeEmbodiedAvatar',
    'visible-avatar-presentation-activation-gate',
    'bodyless-first-person-home',
    'presentation-avatar-then-first-person-camera-only-no-hands-body-rig',
    'data-home-avatar-activation-gate="required-before-first-person-home"',
    'data-home-presence-presentation=',
    'avatar-embodiment-transition',
    'data-home-movement=',
    'walk-look-interact',
    'avatar-presentation-target-activate',
    'data-home-ground-entry="physical-world-surface"',
    'data-home-life-map-entry="visible-sky-broad-interaction"',
    'data-home-camera-mode=',
    'home-first-person',
    'home-avatar-presentation',
    'avatar-presentation-to-bodyless-first-person-authored-living-memory-orb-sculpted-sanctuary-and-broad-sky-threshold',
    'home-living-memory-orb',
    '/assets/urai/generated/models/urai-orb-avatar-v1.glb',
    'physicalWorldClick',
    'event.point.clone()',
  ]) has(currentHome, marker)

  assert.match(currentHome, /useHomeExperienceController/)
  assert.match(currentHome, /homeApi\.activateAvatar\(\)/)
  assert.match(currentHome, /avatarState=\{avatarPresentationState\}/)
  assert.match(currentHome, /homeState\.stableState === 'HOME_PRESENTATION'/)
  assert.match(currentHome, /homeState\.stableState === 'AVATAR_HOME_FIRST_PERSON'/)
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

test('Home runtime preserves two-mode Home while restoring V288 visible Orb morphology over V291 interaction semantics', () => {
  assert.match(assetHome, /cinematic-home-ground-threshold-convergence/)
  assert.match(assetHome, /continuous-lived-physical-world/)
  assert.match(currentHome, /home-living-memory-orb/)
  assert.match(currentHome, /presentation-avatar-then-first-person-camera-only-no-hands-body-rig/)
  assert.match(currentHome, /home-avatar-presentation/)
  assert.match(currentHome, /home-first-person/)
  assert.match(currentHome, /<HomeEmbodiedAvatar/)
  assert.match(currentHome, /CURRENT_HOME_PRESENCE_ROOTS = new Set\(\['home-living-memory-orb', 'home-orb-v288-visible-authority', 'urai-home-user-avatar'\]\)/)
  assert.doesNotMatch(assetHome, /HOME_GROUND|HOME_SPAWN|stagePortalLifecycle|PortalDestination/)
  assert.equal(currentHomeVisualAuthority.artRevision, 'v292-avatar-presentation-bodyless-first-person-convergence')
  assert.equal(currentHomeVisualAuthority.orbVisualAuthority, 'v288-grounded-biomorphic-reliquary')
  assert.equal(currentHomeVisualAuthority.currentRuntimeCandidate.orbVisualAuthority, 'v288-grounded-biomorphic-reliquary')
  assert.equal(currentHomeVisualAuthority.currentRuntimeCandidate.orbInteractionAuthority, 'v291-current-home-orb-state-and-speech-runtime')
  assert.equal(currentHomeVisualAuthority.currentRuntimeCandidate.certified, false)
  assert.equal(currentHomeVisualAuthority.lastCertifiedPredecessor.orbVisualAuthority, 'v288-grounded-biomorphic-reliquary')
  assert.equal(currentHomeVisualAuthority.worldIdentifier, 'cinematic-lived-world-threshold')
  assert.match(currentHome, /home-orb-reference-glass-shell/)
  assert.match(currentHome, /home-orb-memory-bloom-core/)
  assert.match(currentHome, /<HomeVisualAuthority \/>/)
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
  assert.match(groundOwner, /urai-sparse-background-canopy-v30-with-polyhaven-fern-rock-understory/)
  assert.match(groundOwner, /seed-varied-branch-architecture-ovate-leaf-canopy-v26/)
  assert.match(groundOwner, /v26-ovate-leaflets-remove-primitive-ball-canopy/)
  assert.match(groundOwner, /new THREE\.BufferGeometry\(\)/)
  assert.doesNotMatch(groundOwner, /new THREE\.SphereGeometry\(1, 12, 8\)/)
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
