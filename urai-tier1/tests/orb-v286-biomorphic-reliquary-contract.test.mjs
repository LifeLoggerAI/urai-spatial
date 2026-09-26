import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const orb = readFileSync(new URL('../src/spatial/assets/HomeOrbReliquaryV286.tsx', import.meta.url), 'utf8')
const adapter = readFileSync(new URL('../src/spatial/assets/HomeOrbGroundedV288.tsx', import.meta.url), 'utf8')
const authority = readFileSync(new URL('../src/spatial/layout/HomeVisualAuthority.tsx', import.meta.url), 'utf8')
const activeRepair = readFileSync(new URL('../src/spatial/layout/HomeAAAVisualRepair.tsx', import.meta.url), 'utf8')
const activeHome = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionV223.tsx', import.meta.url), 'utf8')
const inventory = JSON.parse(readFileSync(new URL('../src/app/currentHomeVisualAuthority.json', import.meta.url), 'utf8'))
const workflow = readFileSync(new URL('../../.github/workflows/portal-orb-exact-proof.yml', import.meta.url), 'utf8')

test('V286 remains the authored biomorphic layered reliquary rather than a heart, sphere, crystal, or blob authority', () => {
  assert.match(orb, /home-v286-biomorphic-memory-reliquary/)
  assert.match(orb, /reliquaryPlateGeometryV286/)
  assert.match(orb, /plateSpecsV286/)
  assert.match(orb, /home-v286-weathered-shell-plate-/)
  assert.match(orb, /home-v286-layered-internal-memory-world/)
  assert.match(orb, /home-v286-recessed-memory-node-/)
  assert.doesNotMatch(orb, /livingHeart|living-memory-heart|new THREE\.SphereGeometry|<sphereGeometry|wireframe|DoubleSide/)
})

test('V286 memory nervous system is embedded, branching, local, and visual-only', () => {
  assert.match(orb, /reliquaryFilamentGeometriesV286/)
  assert.match(orb, /new THREE\.TubeGeometry/)
  assert.match(orb, /home-v286-embedded-memory-filament-/)
  assert.match(orb, /memoryFieldV286/)
  assert.match(orb, /home-v286-localized-memory-field/)
  assert.match(orb, /interactionOwner: false/)
  assert.match(orb, /raycast=\{\(\) => null\}/)
  assert.doesNotMatch(orb, /fieldRef\.current\.rotation|rotation\.y\s*=\s*t\s*\*/)
})

test('V286 remains state-aware without whole-object pulse or bob authority', () => {
  for (const state of ['idle','listening','thinking','speaking','privacy','warning']) {
    assert.match(orb, new RegExp(`${state}: \\{`), `missing ${state} visual state`)
  }
  assert.match(orb, /URAI_ORB_STATE_EVENT/)
  assert.match(orb, /home-v286-reliquary-state-\$\{state\}/)
  assert.match(orb, /useReducedMotionV286/)
  assert.doesNotMatch(orb, /root\.current\.scale\.set|root\.current\.position\.y\s*=.*Math\.sin/)
  assert.doesNotMatch(orb, /fieldRef\.current\.rotation/)
})

test('V286 grounds through restrained inlaid traces instead of visible root tubes or a circular halo', () => {
  assert.match(orb, /reliquaryGroundTracesV286/)
  assert.match(orb, /home-v286-inlaid-ground-memory-traces/)
  assert.doesNotMatch(orb, /orbiting|rotating halo|memoryLoop|rootTendrils/)
})

test('current Home owns its living-memory visual and interaction while historical adapters remain unmounted', () => {
  assert.match(activeHome, /<HomeAAAVisualRepair \/>/)
  assert.match(activeHome, /name="home-living-memory-orb"/)
  assert.doesNotMatch(activeRepair, /import \{ HomeOrbGroundedV288 \} from '@\/spatial\/assets\/HomeOrbGroundedV288'/)
  assert.doesNotMatch(activeRepair, /<HomeOrbGroundedV288 \/>/)
  assert.match(activeRepair, /Historical V281 localized Ground\/ascent overlays remain retired/)
  assert.match(activeRepair, /HomeVisualAuthority contains the living-memory translucent heart[\s\S]*same visual and semantic owner/)
  assert.match(activeRepair, /Home runtime keeps Orb semantics, speech\/VAD timing and pointer\/touch ownership/)
  assert.match(activeRepair, /function HomePassportOwnershipObject/)
  assert.match(activeRepair, /visibility: 'first-person-only'/)
  assert.match(activeRepair, /<HomePassportOwnershipObject \/>[\s\S]*<HomeGlobalEmotionalFieldEarth state=\{globalFieldState\} \/>/)
  assert.match(adapter, /import \{ HomeOrbReliquaryV286 \} from '\.\/HomeOrbReliquaryV286'/)
  assert.match(adapter, /<HomeOrbReliquaryV286 \/>/)
  assert.match(adapter, /home-v288-grounded-biomorphic-memory-reliquary/)
  assert.match(adapter, /FALLBACK_INTERACTION_OWNER_NAMES/)
  assert.match(adapter, /home-living-memory-orb/)
  assert.match(adapter, /fallbackVisualOwner: false/)
  assert.match(adapter, /material\.colorWrite = false/)
  assert.match(adapter, /material\.depthWrite = false/)
  assert.match(adapter, /material\.opacity = 0/)
  assert.match(adapter, /object\.visible = false/)
  assert.match(adapter, /interactionOwner: false/)
  assert.match(adapter, /interactionOwner: true/)
})

test('certified predecessor inventory is preserved while the translucent current candidate remains uncertified', () => {
  assert.doesNotMatch(authority, /HomeOrbGroundedV288|HomeOrbReliquaryV286/)
  assert.match(authority, /home-orb-living-memory-visible-authority/)
  assert.match(authority, /The living-memory runtime owns its translucent shell/)
  assert.doesNotMatch(authority, /return null/)
  assert.doesNotMatch(authority, /livingHeartGeometryV253|home-v253-literal-living-memory-heart|<GroundedOrbRootsV253|<LiteralOrbAuthorityV253/)
  assert.ok(inventory.lastCertifiedPredecessor.runtimeAssets.includes('HomeOrbReliquaryV286.tsx'))
  assert.ok(inventory.lastCertifiedPredecessor.runtimeAssets.includes('HomeOrbGroundedV288.tsx'))
  assert.equal(inventory.lastCertifiedPredecessor.orbVisualAuthority, 'v288-grounded-biomorphic-reliquary')
  assert.equal(inventory.currentRuntimeCandidate.orbVisualAuthority, 'living-memory-translucent-heart')
  assert.equal(inventory.currentRuntimeCandidate.orbInteractionAuthority, 'v291-current-home-orb-state-and-speech-runtime')
  assert.equal(inventory.orbVisualAuthority, 'living-memory-translucent-heart')
  assert.equal(inventory.currentRuntimeCandidate.certified, false)
})

test('normal exact-head Portal/Orb proof checks the current living-memory candidate with executed runtime evidence', () => {
  assert.match(workflow, /verify-current-home-visual-authority\.mjs/)
  assert.match(workflow, /home-living-memory-orb-runtime\.test\.mjs/)
  assert.doesNotMatch(workflow, /grep.*return <HomeOrbGroundedV288/)
})
