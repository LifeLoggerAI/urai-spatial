import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const owner = fs.readFileSync(new URL('../src/spatial/layout/HomeWorldProductionV223.tsx', import.meta.url), 'utf8')
const embodiedAvatar = fs.readFileSync(new URL('../src/spatial/home/HomeEmbodiedAvatar.tsx', import.meta.url), 'utf8')
const currentRepair = fs.readFileSync(new URL('../src/spatial/layout/HomeCurrentArtRepair.tsx', import.meta.url), 'utf8')
const aaaRepair = fs.readFileSync(new URL('../src/spatial/layout/HomeAAAVisualRepair.tsx', import.meta.url), 'utf8')
const visualAuthority = fs.readFileSync(new URL('../src/spatial/layout/HomeVisualAuthority.tsx', import.meta.url), 'utf8')
const groundedOrb = fs.readFileSync(new URL('../src/spatial/assets/HomeOrbGroundedV288.tsx', import.meta.url), 'utf8')
const reliquary = fs.readFileSync(new URL('../src/spatial/assets/HomeOrbReliquaryV286.tsx', import.meta.url), 'utf8')
const sky = fs.readFileSync(new URL('../src/spatial/assets/HomeAtmosphericSky.tsx', import.meta.url), 'utf8')
const authority = JSON.parse(fs.readFileSync(new URL('../src/app/currentHomeVisualAuthority.json', import.meta.url), 'utf8'))

test('Home authority keeps V288 as predecessor provenance while V291 authored Orb remains the uncertified current candidate', () => {
  assert.equal(authority.artRevision, 'v291-sculpted-sanctuary-translucent-reference-orb')
  assert.equal(authority.worldIdentifier, 'cinematic-lived-world-threshold')
  assert.equal(authority.certificationState, 'candidate-requires-fresh-exact-head-pixels')
  assert.equal(authority.lastCertifiedPredecessor.orbVisualAuthority, 'v288-grounded-biomorphic-reliquary')
  assert.equal(authority.currentRuntimeCandidate.orbVisualAuthority, 'v291-translucent-memory-orb-reference-candidate')
  assert.equal(authority.currentRuntimeCandidate.orbRuntimeAsset, '/assets/urai/generated/models/urai-orb-avatar-v1.glb')
  assert.equal(authority.currentRuntimeCandidate.certified, false)
  assert.equal(authority.orbVisualAuthority, 'v291-translucent-memory-orb-reference-candidate')
  for (const asset of ['HomeWorldProductionV223.tsx','HomeVisualAuthority.tsx','HomeAtmosphericSky.tsx','HomeWorldProductionV225PolishV3.tsx','urai-orb-avatar-v1.glb']) {
    assert.ok(authority.runtimeAssets.includes(asset), `missing Home runtime/provenance asset ${asset}`)
  }
  for (const asset of ['HomeOrbReliquaryV286.tsx','HomeOrbGroundedV288.tsx']) {
    assert.ok(authority.lastCertifiedPredecessor.runtimeAssets.includes(asset), `missing V288 certified predecessor asset ${asset}`)
  }
  assert.doesNotMatch(JSON.stringify(authority.runtimeAssets), /HomeLaunchSanctuaryV254\.tsx|HomeWorldProductionV225PolishV2\.tsx/)
  assert.doesNotMatch(visualAuthority, /HomeOrbGroundedV288|<HomeOrbGroundedV288/)
  assert.match(visualAuthority, /return null/)
})

test('retired localized Home overlays stay retired while first-person Passport ownership remains the active AAA repair surface', () => {
  assert.match(currentRepair, /Historical V249 localized destination art is retained only as repository/)
  assert.match(currentRepair, /broad visible atmosphere for Life Map, and the authored living-memory Orb/)
  assert.match(currentRepair, /V288 remains certified predecessor provenance/)
  assert.match(currentRepair, /export function HomeCurrentArtRepair/)
  assert.match(currentRepair, /return null/)
  assert.doesNotMatch(currentRepair, /home-v249-ground-geological-descent|home-v249-life-map-rooted-celestial-ascent|home-v249-organic-living-memory-presence|function suppressRaycast\(/)

  assert.match(aaaRepair, /Historical V281 localized Ground\/ascent overlays[\s\S]*remain retired/)
  assert.match(aaaRepair, /predecessor V288 Orb[\s\S]*remain retired/)
  assert.match(aaaRepair, /authored living-memory Orb[\s\S]*keeps current Orb pixels/)
  assert.match(aaaRepair, /function HomePassportOwnershipObject/)
  assert.match(aaaRepair, /visibility: 'first-person-only'/)
  assert.match(aaaRepair, /backendAuthority: 'existing-passport-vault'/)
  assert.match(aaaRepair, /visualForm: 'protected-custody-stone-v2'/)
  assert.match(aaaRepair, /visualStatus: 'candidate-requires-literal-pixel-acceptance'/)
  assert.match(aaaRepair, /passport-ownership-shell-primary/)
  assert.match(aaaRepair, /passport-ownership-shell-protected-face/)
  assert.match(aaaRepair, /passport-custody-seam/)
  assert.match(aaaRepair, /passport-custody-memory-inclusion/)
  assert.match(aaaRepair, /HOME_PASSPORT_ORIGIN_CAPTURE_EVENT/)
  assert.match(aaaRepair, /export function HomeAAAVisualRepair/)
  assert.match(aaaRepair, /<HomePassportOwnershipObject \/>[\s\S]*<HomeGlobalEmotionalFieldEarth state="unavailable" \/>/)
  assert.doesNotMatch(aaaRepair, /RoundedBox|cylinderGeometry/)
  assert.doesNotMatch(aaaRepair, /HomeOrbGroundedV288|<HomeOrbGroundedV288/)
  assert.doesNotMatch(aaaRepair, /aaa-celestial-ascent-v3-gold-master-depth|home-aaa-life-map-celestial-ascent|home-aaa-v281-rooted-ascent-ribbons|buildCelestialVolume/)
})

test('retired localized Home hotspots are disabled while the active Avatar and living-memory Orb hierarchies are protected', () => {
  assert.match(owner, /function RetireLegacyHomeHotspots\(\)/)
  assert.match(owner, /object\.visible = false/)
  assert.match(owner, /object\.raycast = \(\) => undefined/)
  assert.match(owner, /child\.raycast = \(\) => undefined/)
  assert.match(owner, /\/home-v226-rooted-single-living-memory-presence\//)
  assert.match(owner, /\/home-current-orb\//)
  assert.match(owner, /\/home-v249-organic-living-memory-presence\//)
  assert.match(owner, /const CURRENT_HOME_PRESENCE_ROOTS = new Set\(\[[\s\S]*'home-living-memory-orb'[\s\S]*'urai-home-user-avatar'[\s\S]*\]\)/)
  assert.match(owner, /function isInsideCurrentHomePresence\(object: THREE\.Object3D\)/)
  assert.match(owner, /if \(isInsideCurrentHomePresence\(object\)\) return/)
  assert.match(owner, /<HomeEmbodiedAvatar/)
  assert.match(embodiedAvatar, /name="urai-home-user-avatar"/)
  assert.match(embodiedAvatar, /semanticOwner: 'avatar'/)
  assert.match(owner, /name="home-living-memory-orb"/)
  assert.doesNotMatch(owner, /\/urai-home-user-avatar\//, 'the active Avatar must not be included in the legacy-retirement pattern list')
})

test('Ground is owned by the physical world surface and Life Map by the broad visible sky', () => {
  for (const marker of [
    'data-home-ground-entry="physical-world-surface"',
    'data-home-life-map-entry="visible-sky-broad-interaction"',
    'data-home-distance-ground="world-surface"',
    'data-home-distance-life-map="sky-threshold"',
    'data-home-portal-sequence="idle"',
    "cameraCheckpoint: 'ground-first-person-arrival'",
    "cameraCheckpoint: 'home-sky-ascent-complete'",
  ]) assert.match(owner, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  assert.match(owner, /event\.point\.clone\(\)/)
  assert.match(owner, /<HomeAtmosphericSky reducedMotion=\{reducedMotion\} active=\{transition === 'life-map'\} weatherState=\{personalWeatherState\} onLifeMap=\{onLifeMap\} \/>/)
  assert.doesNotMatch(owner, /nearby\s*===?\s*['"]life-map['"]|HOME_LIFE_MAP|home-life-map-physical-portal/)
})

test('visible sky is the canonical broad Life Map interaction surface and localized gateways are retired', () => {
  assert.match(sky, /function RetireLocalizedLifeMapGateways\(\)/)
  assert.match(sky, /name="home-sky-life-map-threshold"/)
  assert.match(sky, /threshold: 'broad-visible-sky'/)
  assert.match(sky, /localGroundPortal: false/)
  assert.match(sky, /event\.ray\.direction\.y > \.015/)
  assert.match(sky, /raycast=\{skyRaycast\}/)
  assert.match(sky, /onClick=\{activateSky\}/)
  assert.match(sky, /object\.raycast = \(\) => undefined/)
  assert.doesNotMatch(sky, /HomeLaunchSanctuaryV254|home-v249-life-map-rooted-celestial-ascent/)
})

test('V288 Orb remains intact as predecessor provenance but is not mounted over V291 current pixels', () => {
  assert.doesNotMatch(visualAuthority, /HomeOrbGroundedV288/)
  assert.match(groundedOrb, /HomeOrbReliquaryV286/)
  assert.match(groundedOrb, /home-v288-grounded-biomorphic-memory-reliquary/)
  assert.match(groundedOrb, /home-gold-companion/)
  assert.match(groundedOrb, /interactionOwner: true/)
  assert.match(groundedOrb, /interactionOwner: false/)
  assert.match(groundedOrb, /fallbackVisualOwner: false/)
  assert.match(groundedOrb, /material\.colorWrite = false/)
  assert.match(groundedOrb, /material\.depthWrite = false/)
  assert.match(groundedOrb, /material\.opacity = 0/)
  assert.doesNotMatch(groundedOrb, /fallbackVisualOwner:\s*true/)
  for (const marker of ['plateSpecsV286','reliquaryPlateGeometryV286','home-v286-layered-internal-memory-world','home-v286-embedded-memory-filament','home-v286-localized-memory-field']) {
    assert.match(reliquary, new RegExp(marker))
  }
  assert.match(reliquary, /raycast=\{\(\) => null\}/)
})


test('current Home candidate restores the authoritative sculpted sanctuary layer and retires the failed residence rewire', () => {
  assert.match(owner, /import \{ HomeV225PolishV3 \} from '\.\/HomeWorldProductionV225PolishV3'/)
  assert.match(owner, /<HomeV225PolishV3/)
  assert.match(owner, /data-home-art-revision="v291-sculpted-sanctuary-translucent-reference-orb"/)
  assert.match(owner, /data-home-scanned-composition="visible-avatar-authored-living-memory-orb-sculpted-sanctuary-and-broad-sky-threshold"/)
  assert.doesNotMatch(owner, /HOME_ARCHITECTURE_MODEL|ReferenceHomeArchitecture|home-v289-governed-lived-residence/)
  assert.match(owner, /data-home-visual-grade="current-literal-pixel-candidate-not-certified"/)
  assert.match(owner, /home-orb-reference-glass-shell/)
  assert.match(owner, /home-orb-luminous-inner-volume/)
  assert.match(owner, /home-orb-memory-bloom-core/)
  assert.match(owner, /home-orb-memory-motes/)
  assert.match(owner, /visualAuthority: 'v291-translucent-memory-orb-reference-candidate'/)
  assert.doesNotMatch(owner, /home-orb-stabilizer-ring|home-orb-crystalline-fragments|<torusGeometry|<tetrahedronGeometry/)
})
