import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const runtime = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionV70.tsx', import.meta.url), 'utf8')
const art = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionV76.tsx', import.meta.url), 'utf8')
const owner = readFileSync(new URL('../src/app/AssetDrivenHomeWorld.tsx', import.meta.url), 'utf8')

const has = (source, marker) => assert.ok(source.includes(marker), `missing marker: ${marker}`)

test('V125 remains one authoritative Canvas with a governed V70 runtime owner', () => {
  has(runtime, '<HomeV76Sanctuary')
  has(runtime, 'data-home-visual-ownership="single-canvas-three-dimensional-geometry"')
  has(owner, 'data-home-canvas-owner="home-world-production-v70-single-authority"')
  assert.equal((runtime.match(/<Canvas/g) ?? []).length, 1)
  assert.doesNotMatch(art, /<Canvas/)
})

test('V125 visible world is sculpted geology rather than the rejected slab/twin-arch stage', () => {
  for (const marker of ['function SculptedCanyonGround(','home-v125-sculpted-canyon-ground','function GeologicalFrame(','home-v125-asymmetric-geological-frame','function NaturalFissure(','home-v125-${side}-natural-fissure','home-v125-atmospheric-depth-motes']) has(art, marker)
  assert.match(art, /BufferGeometry/)
  assert.match(art, /computeVertexNormals\(\)/)
  assert.doesNotMatch(art, /TerracedGround|PortalRecess|PortalStoneFrame|home-v124-authored-asymmetric-landform|home-v76-continuous-stone-floor/)
  assert.doesNotMatch(art, /<ringGeometry|<torusGeometry|<RoundedBox/)
})

test('V125 Orb uses the governed binary and state-readable light/memory field', () => {
  has(art, "const GOVERNED_ORB = '/assets/urai/generated/models/urai-orb-avatar-v1.glb'")
  has(art, 'function LivingOrb(')
  has(art, 'ORB_PALETTE')
  has(art, 'home-v125-living-orb-presence')
  has(art, 'home-v125-orb-memory-motes')
  assert.match(art, /<primitive object=\{orb\}/)
  assert.match(art, /onClick=\{\(event\) => \{ event\.stopPropagation\(\); onOrb\(\) \}\}/)
  for (const state of ['dormant','idle','attention','listening','thinking','speaking','guiding','reflecting','calming','privacy','warning','transition']) has(art, `${state}:`)
  assert.match(runtime, /const ORB = new THREE\.Vector3\(-0\.18, 2\.18, -6\.90\)/)
  assert.match(owner, /const HOME_ORB = \{ x: -0\.18, z: -6\.9 \} as const/)
})

test('V125 keeps bounded rendering, real traversal and fail-closed certification', () => {
  assert.match(runtime, /dpr=\{1\}/)
  assert.match(runtime, /data-home-telemetry-owner="embodied-motion-kernel-v66"/)
  assert.match(runtime, /reducedMotion \? 180 : 900/)
  assert.match(runtime, /reducedMotion \? 520 : 1600/)
  assert.match(runtime, /reducedMotion \? 500 : 1100/)
  has(owner, "data-home-v125-certification', 'retained-pixel-candidate-not-certified")
  has(owner, "data-home-art-certification', 'v125-retained-pixels-pending-not-certified")
  assert.doesNotMatch(`${runtime}\n${art}\n${owner}`, /PRODUCTION CERTIFIED|retained-pixel-pass|pixel-certified/)
})
