import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const orb = readFileSync(new URL('../src/spatial/assets/HomeOrbReliquaryV286.tsx', import.meta.url), 'utf8')
const authority = readFileSync(new URL('../src/spatial/layout/HomeVisualAuthority.tsx', import.meta.url), 'utf8')
const inventory = JSON.parse(readFileSync(new URL('../src/app/currentHomeVisualAuthority.json', import.meta.url), 'utf8'))
const workflow = readFileSync(new URL('../../.github/workflows/portal-orb-exact-proof.yml', import.meta.url), 'utf8')

test('V286 is one biomorphic layered reliquary rather than a heart, sphere, crystal, or blob authority', () => {
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

test('current Home authority mounts V286 and no longer mounts the rejected V253 Orb render owner', () => {
  assert.match(authority, /import \{ HomeOrbReliquaryV286 \} from '\.\.\/assets\/HomeOrbReliquaryV286'/)
  assert.match(authority, /<HomeOrbReliquaryV286 \/>/)
  assert.match(authority, /home-v253-authored-sanctuary-dressing/)
  assert.doesNotMatch(authority, /livingHeartGeometryV253|home-v253-literal-living-memory-heart|<GroundedOrbRootsV253|<LiteralOrbAuthorityV253/)
  assert.ok(inventory.runtimeAssets.includes('HomeOrbReliquaryV286.tsx'))
  assert.equal(inventory.orbVisualAuthority, 'v286-biomorphic-memory-reliquary')
})

test('normal exact-head Portal/Orb proof watches and rejects regression away from V286', () => {
  assert.match(workflow, /HomeOrbReliquaryV286\.tsx/)
  assert.match(workflow, /Verify V286 biomorphic Orb authority/)
  assert.match(workflow, /home-v286-biomorphic-memory-reliquary/)
  assert.match(workflow, /livingHeart\|living-memory-heart/)
  assert.match(workflow, /Retired V253 heart\/root render authority remains mounted/)
})
