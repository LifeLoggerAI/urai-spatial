import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const runtime = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionV70.tsx', import.meta.url), 'utf8')
const art = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionV76.tsx', import.meta.url), 'utf8')
const owner = readFileSync(new URL('../src/app/AssetDrivenHomeWorld.tsx', import.meta.url), 'utf8')

const productionAssets = [
  "const GOVERNED_HOME = '/assets/urai/generated/models/home-entry-chamber-v1.glb'",
  "const ROCK_FACE_A = '/assets/urai/home-production/cc0/polyhaven-v48/rock_face_01/asset.gltf'",
  "const ROCK_FACE_B = '/assets/urai/home-production/cc0/polyhaven-v48/rock_face_02/asset.gltf'",
  "const PIPE_SYSTEM = '/assets/urai/home-production/cc0/polyhaven-v48/modular_industrial_pipes_01/asset.gltf'",
  "const CAGED_SCONCE = '/assets/urai/home-production/cc0/polyhaven-v48/industrial_caged_sconce/asset.gltf'",
  'home-v83-governed-open-sanctuary-environment',
  'home-v83-authored-open-sanctuary',
  'home-v76-port-integrated-service-manifold',
  'home-v76-starboard-integrated-service-manifold',
  'home-v76-port-caged-practical',
  'home-v76-starboard-caged-practical',
]

test('V76 is one authoritative Canvas with a deep continuous photogrammetry sanctuary', () => {
  for (const marker of productionAssets) assert.ok(art.includes(marker), `missing V76 production marker: ${marker}`)
  for (const marker of [
    'home-v76-continuous-hand-cut-vault',
    'home-v76-port-canted-bearing-wall',
    'home-v76-starboard-canted-bearing-wall',
    'home-v76-deep-concave-apse',
    'home-v76-single-canvas-retained-pixel-sanctuary',
    'home-ground-environmental-threshold',
    'home-life-map-physical-portal',
  ]) assert.ok(art.includes(marker), `missing V76 continuous-world marker: ${marker}`)

  assert.match(runtime, /<HomeV76Sanctuary reducedMotion=\{reducedMotion\}/)
  assert.match(runtime, /data-home-visible-world="v76-deep-apse-relic-machine-sanctuary"/)
  assert.match(runtime, /data-home-visual-ownership="single-canvas-three-dimensional-geometry"/)
  assert.match(runtime, /data-home-final-art-revision="v93-dimensional-governed-rebuild"/)
  assert.match(runtime, /data-home-visible-production-assets="governed-threshold-architecture rock_face_01 rock_face_02 rock-face-pbr"/)
  assert.match(owner, /data-home-canvas-owner="home-world-production-v70-single-authority"/)
  assert.doesNotMatch(owner, /HomeV75RetainedPixelWorld|HomeWorldProductionV75/)
  assert.doesNotMatch(art, /<Canvas|from '@react-three\/fiber'.*Canvas/)
  assert.equal((runtime.match(/<Canvas/g) ?? []).length, 1)
})

test('V76 Orb is a curved load-bearing apse machine with connected service paths', () => {
  for (const marker of [
    'home-v76-apse-embedded-orb-relic-machine',
    'home-v76-machine-rear-bearing-plate',
    'home-v76-port-curved-armor',
    'home-v76-starboard-curved-armor',
    'home-v76-machine-vertical-aperture',
    'home-v76-machine-floor-cradle',
    'home-v76-machine-crown-crosshead',
    'home-v76-port-apse-load-feed',
    'home-v76-starboard-apse-load-feed',
    'home-v76-port-floor-keel-feed',
    'home-v76-starboard-floor-keel-feed',
    'connectedLoadPaths: true',
    'noSphere: true',
    'noCage: true',
  ]) assert.ok(art.includes(marker), `missing V76 relic-machine marker: ${marker}`)

  assert.match(art, /const GOVERNED_ORB = '\/assets\/urai\/generated\/models\/urai-orb-avatar-v1\.glb'/)
  assert.match(art, /function useGovernedOrbModel\(/)
  assert.match(art, /<primitive object=\{governedOrb\} \/>/)
  assert.match(art, /home-v82-governed-living-orb/)
  assert.doesNotMatch(art, /ORB_MEMORY_SHARDS|function MemoryShard\(/)
  assert.match(art, /new THREE\.ExtrudeGeometry/)
  assert.match(art, /new THREE\.CatmullRomCurve3/)
  assert.match(art, /onClick=\{\(event: ThreeEvent<MouseEvent>\) => \{ event\.stopPropagation\(\); onOpen\(\) \}\}/)
  assert.match(runtime, /data-home-animation-owner="v93-dimensional-governed-sanctuary"/)
  assert.doesNotMatch(art, /<(?:sphereGeometry|octahedronGeometry|icosahedronGeometry|torusGeometry|capsuleGeometry|RoundedBox)|display-case|#37e5ff|#48dfff|#6cf4ff/i)
})

test('V98 combines visible governed thresholds with an open physical PBR sanctuary', () => {
  for (const marker of [
    'home-v83-governed-open-sanctuary-environment',
    'home-v83-authored-open-sanctuary',
    'committed-governed-home-environment',
    'full-authored-composition-with-duplicate-interaction-art-suppressed',
    'home-v83-removed-procedural-tunnel',
    'home-v83-removed-panel-like-orb-armor',
    "liveArtRevision: 'v93-governed-dimensional-sanctuary'",
  ]) assert.ok(art.includes(marker), `missing V93 governed-composition marker: ${marker}`)
  assert.match(runtime, /data-home-live-art-revision="v93-governed-dimensional-sanctuary"/)
  assert.match(runtime, /data-home-live-orb-owner="governed-urai-orb-avatar-v1"/)
  assert.match(art, /root\.position\.set\(0, -0\.16, -8\.2\)/)
  assert.match(art, /root\.scale\.setScalar\(0\.70\)/)
  assert.match(art, /position=\{\[-0\.18, 1\.42, -8\.86\]\}/)
  const liveComposition = art.slice(art.indexOf('export function HomeV76Sanctuary'))
  const sanctuaryBackdrop = art.slice(art.indexOf('function SanctuaryBackdrop'), art.indexOf('function GovernedHomeEnvironment'))
  assert.match(sanctuaryBackdrop, /<OpenAtmosphere[\s\S]*<TerracedGround[\s\S]*<VaultShell[\s\S]*<CantedWall[\s\S]*<DeepApse[\s\S]*<BearingRib/)
  assert.match(art, /if \(Math\.abs\(xCenter\) < 3\.35\) continue/)
  assert.match(art, /if \(Math\.abs\(xCenter\) < 3\.15\) continue/)
  assert.match(art, /<ProductionAsset url=\{ROCK_FACE_A\}/)
  assert.match(art, /<ProductionAsset url=\{ROCK_FACE_B\}/)
  assert.match(liveComposition, /<SanctuaryBackdrop onWalk=\{onWalk\}/)
  assert.doesNotMatch(art, /backgroundImage:|scene\.userData\.sanctuaryBackdrop|root\.visible\s*=\s*false/)
})

test('V76 preserves bounded rendering, real traversal, and fail-closed certification', () => {
  assert.match(runtime, /dpr=\{1\}/)
  assert.match(runtime, /shadow-mapSize-width=\{768\}/)
  assert.match(runtime, /data-home-telemetry-owner="embodied-motion-kernel-v66"/)
  const traversalTimerIndex = runtime.indexOf('const traversalTimer = window.setTimeout(() => {')
  const closingTimerIndex = runtime.indexOf('closingTimer = window.setTimeout(() => {')
  const navigationTimerIndex = runtime.indexOf('navigationTimer = window.setTimeout(() => {')
  assert.ok(traversalTimerIndex >= 0 && closingTimerIndex > traversalTimerIndex && navigationTimerIndex > closingTimerIndex)
  assert.match(runtime, /reducedMotion \? 180 : 900/)
  assert.match(runtime, /reducedMotion \? 520 : 1600/)
  assert.match(runtime, /reducedMotion \? 500 : 1100/)
  assert.match(runtime, /data-home-art-certification="v76-retained-pixel-candidate-not-certified"/)
  assert.doesNotMatch(`${runtime}\n${art}`, /PRODUCTION CERTIFIED|retained-pixel-pass|pixel-certified/)
})
