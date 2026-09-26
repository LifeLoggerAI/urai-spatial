import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const owner = fs.readFileSync(new URL('../src/spatial/layout/HomeWorldProductionV223.tsx', import.meta.url), 'utf8')
const currentRepair = fs.readFileSync(new URL('../src/spatial/layout/HomeCurrentArtRepair.tsx', import.meta.url), 'utf8')
const aaaRepair = fs.readFileSync(new URL('../src/spatial/layout/HomeAAAVisualRepair.tsx', import.meta.url), 'utf8')
const visualAuthority = fs.readFileSync(new URL('../src/spatial/layout/HomeVisualAuthority.tsx', import.meta.url), 'utf8')
const groundedOrb = fs.readFileSync(new URL('../src/spatial/assets/HomeOrbGroundedV288.tsx', import.meta.url), 'utf8')
const reliquary = fs.readFileSync(new URL('../src/spatial/assets/HomeOrbReliquaryV286.tsx', import.meta.url), 'utf8')
const sky = fs.readFileSync(new URL('../src/spatial/assets/HomeAtmosphericSky.tsx', import.meta.url), 'utf8')
const authority = JSON.parse(fs.readFileSync(new URL('../src/app/currentHomeVisualAuthority.json', import.meta.url), 'utf8'))

test('Home authority advances the translucent living-memory candidate while direct first-person remains uncertified', () => {
  assert.equal(authority.artRevision, 'v293-direct-bodyless-first-person-convergence')
  assert.equal(authority.currentRuntimeCandidate.homePresentationAuthority, 'direct-bodyless-first-person')
  assert.equal(authority.currentRuntimeCandidate.nonXrFirstPersonBodyPolicy, 'camera-only-no-hands-arms-visible-avatar-or-body-rig')
  assert.equal(authority.currentRuntimeCandidate.orbVisualAuthority, 'living-memory-translucent-heart')
  assert.equal(authority.currentRuntimeCandidate.orbInteractionAuthority, 'v291-current-home-orb-state-and-speech-runtime')
  assert.equal(authority.currentRuntimeCandidate.certified, false)
  assert.ok(!authority.runtimeAssets.includes('HomeEmbodiedAvatar.tsx'))
  assert.doesNotMatch(visualAuthority, /HomeOrbGroundedV288|HomeOrbReliquaryV286/)
  assert.match(visualAuthority, /home-orb-living-memory-visible-authority/)
})

test('active Home is direct camera-only first-person with Passport and broad-sky ownership', () => {
  assert.match(owner, /data-home-art-revision="v293-direct-bodyless-first-person-convergence"/)
  assert.match(owner, /data-home-presence-policy="direct-first-person-camera-only-no-hands-body-rig"/)
  assert.match(owner, /data-home-avatar-activation-gate="none-direct-first-person-home"/)
  assert.match(owner, /data-home-ground-entry="physical-world-surface"/)
  assert.match(owner, /data-home-life-map-entry="visible-sky-broad-interaction"/)
  assert.doesNotMatch(owner, /import\s+\{?\s*HomeEmbodiedAvatar|<HomeEmbodiedAvatar\b|home-human-makehuman-v4\.glb/)
  assert.match(owner, /\/urai-home-user-avatar\//)
  assert.match(owner, /function RetireLegacyHomeHotspots\(\)/)
  assert.match(owner, /const CURRENT_HOME_PRESENCE_ROOTS = new Set\(\['home-living-memory-orb', 'home-orb-living-memory-visible-authority'\]\)/)
})

test('retired overlays remain retired while first-person Passport ownership stays active', () => {
  assert.match(currentRepair, /Current architectural repair stays inside the existing Home owner/)
  assert.doesNotMatch(currentRepair, /home-current-roof-slat-/)
  assert.match(currentRepair, /Open-air authority: perimeter beams frame Home without creating a ceiling/)
  assert.match(aaaRepair, /function HomePassportOwnershipObject/)
  assert.match(aaaRepair, /visibility: 'first-person-only'/)
  assert.match(aaaRepair, /backendAuthority: 'existing-passport-vault'/)
  assert.match(aaaRepair, /HOME_PASSPORT_ORIGIN_CAPTURE_EVENT/)
})

test('visible sky is the broad Life Map interaction surface', () => {
  assert.match(sky, /name="home-sky-life-map-threshold"/)
  assert.match(sky, /threshold: 'broad-visible-sky'/)
  assert.match(sky, /localGroundPortal: false/)
  assert.match(sky, /event\.ray\.direction\.y > \.015/)
  assert.match(sky, /onClick=\{activateSky\}/)
})

test('historical V288 adapter remains preserved but is excluded from current visual authority', () => {
  assert.match(groundedOrb, /HomeOrbReliquaryV286/)
  assert.match(groundedOrb, /home-v288-grounded-biomorphic-memory-reliquary/)
  assert.match(groundedOrb, /fallbackVisualOwner: false/)
  assert.match(groundedOrb, /material\.colorWrite = false/)
  assert.match(groundedOrb, /material\.depthWrite = false/)
  for (const marker of ['plateSpecsV286','reliquaryPlateGeometryV286','home-v286-layered-internal-memory-world']) assert.match(reliquary, new RegExp(marker))
})
