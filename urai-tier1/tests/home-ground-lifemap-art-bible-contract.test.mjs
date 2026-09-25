import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const read = (path) => fs.readFileSync(path, 'utf8')
const homeRuntime = read('src/app/HomeSpatialRuntimeLayer.tsx')
const assetHome = read('src/app/AssetDrivenHomeWorld.tsx')
const homeEntry = read('src/spatial/layout/HomeWorldProduction.tsx')
const currentHome = read('src/spatial/layout/HomeWorldProductionV223.tsx')
const currentHomeVisualAuthority = JSON.parse(read('src/app/currentHomeVisualAuthority.json'))
const groundGateway = read('src/spatial/world/GroundGateway.tsx')
const groundOwner = read('src/app/GroundSpatialWorldClean.tsx')
const lifeMap = read('src/spatial/lifemap/SpatialLifeMapCanonical.tsx')

const has = (source, marker) => assert.ok(source.includes(marker), `missing marker: ${marker}`)

test('Home is direct bodyless camera-only first-person without changing Ground or Sky ownership', () => {
  for (const marker of [
    'bodyless-first-person-home',
    'direct-first-person-camera-only-no-hands-body-rig',
    'data-home-avatar-activation-gate="none-direct-first-person-home"',
    'data-home-ground-entry="physical-world-surface"',
    'data-home-life-map-entry="visible-sky-broad-interaction"',
    'home-first-person',
    'home-living-memory-orb',
    '/assets/urai/generated/models/urai-orb-avatar-v1.glb',
    'physicalWorldClick',
    'event.point.clone()',
  ]) has(currentHome, marker)
  assert.doesNotMatch(currentHome, /import\s+\{?\s*HomeEmbodiedAvatar|<HomeEmbodiedAvatar\b|home-human-makehuman-v4\.glb|visible-avatar-presentation-activation-gate|home-avatar-presentation/)
  assert.match(currentHome, /\/urai-home-user-avatar\//)
  assert.match(currentHome, /function RetireLegacyHomeHotspots\(\)/)
  assert.match(currentHome, /data-home-art-revision="v293-direct-bodyless-first-person-convergence"/)
  assert.match(currentHome, /CURRENT_HOME_PRESENCE_ROOTS = new Set\(\['home-living-memory-orb', 'home-orb-v288-visible-authority'\]\)/)
})

test('Home runtime keeps V288 Orb morphology over V291 interaction semantics', () => {
  assert.match(assetHome, /cinematic-home-ground-threshold-convergence/)
  assert.match(currentHome, /home-living-memory-orb/)
  assert.equal(currentHomeVisualAuthority.artRevision, 'v293-direct-bodyless-first-person-convergence')
  assert.equal(currentHomeVisualAuthority.currentRuntimeCandidate.homePresentationAuthority, 'direct-bodyless-first-person')
  assert.equal(currentHomeVisualAuthority.orbVisualAuthority, 'v288-grounded-biomorphic-reliquary')
  assert.equal(currentHomeVisualAuthority.currentRuntimeCandidate.orbInteractionAuthority, 'v291-current-home-orb-state-and-speech-runtime')
  assert.match(homeEntry, /HomeWorldProductionV223 as HomeWorldProduction/)
  assert.match(groundGateway, /aria-label="Enter Ground — explore your physical lived world in first person"/)
  assert.match(homeRuntime, /aria-label="Open Life Map directly"/)
  assert.match(homeRuntime, /aria-label="Open Ground directly"/)
})

test('Ground remains bodyless first-person and fail-closed around canopy assets', () => {
  for (const marker of [
    'data-ground-exploration="first-person-no-visible-body"',
    'data-ground-visible-avatar="false"',
    'data-ground-visible-hands="false"',
    'GROUND_BROADLEAF_CANOPY = "/assets/urai/ground-production/cc0/polyhaven-jacaranda-web-v1.glb"',
    'class GroundCanopyBoundary extends Component',
    'scanned-understory-remains-if-canopy-load-fails',
    'new KTX2Loader().setTranscoderPath("/basis/").detectSupport(gl)',
  ]) has(groundOwner, marker)
  assert.doesNotMatch(groundOwner, /ground-natural-canopy-v3\.glb|CanopyLeafInstances|makeOrganicTaperedTube/)
})

test('Life Map keeps its private default boundary', () => {
  assert.match(lifeMap, /data-testid="urai-life-map-authored-fallback"/)
  assert.match(lifeMap, /data-private-memory-mounted="false"/)
  assert.match(lifeMap, /No private memory data is mounted\./)
})
