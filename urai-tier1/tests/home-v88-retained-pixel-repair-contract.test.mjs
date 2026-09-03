import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const world = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionV76.tsx', import.meta.url), 'utf8')
const runtime = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionV70.tsx', import.meta.url), 'utf8')
const telemetry = readFileSync(new URL('../src/app/AssetDrivenHomeWorld.tsx', import.meta.url), 'utf8')
const proof = readFileSync(new URL('../../scripts/capture-continuous-spatial-proof-v18.mjs', import.meta.url), 'utf8')
const naturalProof = readFileSync(new URL('../../scripts/run-continuous-spatial-proof-v22-natural.mjs', import.meta.url), 'utf8')
const finalizer = readFileSync(new URL('../../.github/workflows/home-finalization-candidate-commit.yml', import.meta.url), 'utf8')

test('V112 keeps governed Home source visibly embedded beyond approach cameras', () => {
  assert.match(world, /root\.traverse\(\(object\) =>/)
  assert.match(world, /for \(const object of rejectedNodes\) object\.parent\?\.remove\(object\)/)
  assert.match(world, /sanctuary-terrain\|mirror-basin\|orb-sanctuary-pedestal/)
  assert.match(world, /home-v83-governed-open-sanctuary-environment/)
  assert.match(world, /root\.position\.set\(0, -0\.12, -20\.8\)/)
  assert.match(world, /root\.scale\.setScalar\(0\.18\)/)
  assert.match(world, /governed-home-source-visible-distant-relief-outside-approach-cameras/)
  assert.match(world, /committed-governed-home-distant-architectural-relief/)
  assert.match(world, /successorVisualRepair: 'v112-reposition-and-rescale-governed-relief'/)
  assert.doesNotMatch(world, /root\.visible\s*=\s*false/)
  assert.doesNotMatch(world, /object\.visible\s*=\s*false/)
})

test('V95 replaces rings and foreground occluders with human-scale integrated thresholds', () => {
  assert.doesNotMatch(world, /<ringGeometry/)
  assert.match(world, /v95-architectural-rock-cut-threshold-no-ring-marker/)
  assert.match(world, /home-v95-\$\{destination\}-threshold-lintel/)
  assert.match(world, /scale=\{\[1\.08, 1\.08, 1\.08\]\}/)
  assert.match(world, /home-v96-\$\{destination\}-recess-depth/)
  assert.match(world, /home-v97-\$\{destination\}-(?:port|starboard)-(?:lower|shoulder)-masonry/)
  assert.match(world, /home-v97-\$\{destination\}-floor-integrated-guidance/)
  assert.doesNotMatch(world, /home-v93-(?:port|starboard)-foreground-rock-mass/)
})

test('V98 replaces the rejected cave room and flat portal cards with open dimensional architecture', () => {
  assert.match(world, /home-v98-open-canyon-sanctuary-architecture/)
  assert.match(world, /home-v98-open-atmospheric-depth/)
  assert.match(world, /home-v98-terraced-navigable-ground/)
  assert.match(world, /home-v98-\$\{destination\}-single-connected-rock-cut-frame/)
  assert.match(world, /home-v98-\$\{destination\}-volumetric-threshold-depth/)
  assert.doesNotMatch(world, /<mesh name=\{`home-v95-\$\{destination\}-recess-veil`\}/)
  assert.doesNotMatch(world, /new THREE\.TubeGeometry\(curve, 56, 0\.026/)
})

test('V99 closes terrain seams and keeps wayfinding subordinate to the open world', () => {
  assert.match(world, /geometry\.setAttribute\('position', new THREE\.Float32BufferAttribute\(positions, 3\)\)/)
  assert.match(world, /home-v76-continuous-stone-floor" geometry=\{ground\}/)
  assert.match(world, /<meshBasicMaterial vertexColors side=\{THREE\.BackSide\}/)
  assert.match(world, /width: 0\.17 \+ t \* 0\.09/)
  assert.match(world, /emissiveIntensity=\{0\.025\}/)
  assert.doesNotMatch(world, /terraces\.map/)
})

test('V93 removes the sphere shell and temporary industrial overlay composition', () => {
  assert.match(world, /orb-aura\|orb-core\|orb-orbit\|orb-filament/)
  assert.match(world, /home-v88-removed-relic-conduits/)
  assert.match(world, /home-v88-removed-industrial-overlays/)
  assert.doesNotMatch(world, /<Conduit name=/)
  assert.doesNotMatch(world, /<ProductionAsset url=\{(?:CAGED_SCONCE|PIPE_SYSTEM)\}/)
  assert.match(world, /<ProductionAsset url=\{ROCK_FACE_A\}/)
  assert.match(world, /<ProductionAsset url=\{ROCK_FACE_B\}/)
})

test('V88 retains the petal-and-heart Orb and real interaction volume', () => {
  assert.match(world, /<primitive object=\{governedOrb\}/)
  assert.match(world, /home-v78-orb-interaction-volume/)
  assert.match(world, /onClick=\{\(event: ThreeEvent<MouseEvent>\)/)
})

test('V122 preserves the contained Orb composition and aligned runtime scale', () => {
  assert.match(world, /rejectedUtilityDetail = \/\(\?:pipe\|tube\|conduit\|duct\|cable\)\/i/)
  assert.match(world, /home-v101-removed-entrance-rock-clutter/)
  assert.match(world, /home-v101-\$\{destination\}-foreground-portal-frame-removed/)
  assert.match(world, /<PortalStoneFrame destination=\{destination\} textures=\{textures\.shell\} \/>/)
  assert.doesNotMatch(world, /<circleGeometry/)
  assert.doesNotMatch(world, /<ProductionAsset[^>]*entry-buttress/)
  assert.match(world, /position=\{\[-0\.18, 2\.18, -6\.90\]\}/)
  assert.match(world, /scale=\{\[1\.08, 1\.08, 1\.08\]\}/)
  assert.match(world, /swarm\.current\.scale\.setScalar\(1\.08 \* breath\)/)
  assert.match(world, /v102InteractionRepair: 'authored-scale-retained-and-proximity-aligned'/)
  assert.match(world, /home-v101-\$\{destination\}-embedded-wayfinding-inlay/)
  assert.match(world, /successorVisualRepair: 'v122-authored-depth-contained-orb-simplified-thresholds'/)
})

test('V122 preserves the 1.08 Orb hierarchy throughout normal animation', () => {
  assert.match(world, /swarm\.current\.scale\.setScalar\(1\.08 \* breath\)/)
  assert.doesNotMatch(world, /swarm\.current\.scale\.setScalar\(breath\)/)
})

test('V122 binds live proximity and all proof telemetry to the rendered Orb position', () => {
  assert.match(runtime, /const ORB = new THREE\.Vector3\(-0\.18, 2\.18, -6\.90\)/)
  assert.match(telemetry, /const HOME_ORB = \{ x: -0\.18, z: -6\.9 \} as const/)
  assert.match(proof, /orb: \{ x: -0\.18, z: -6\.90, radius: 2\.35/)
  assert.match(naturalProof, /orb: \{ x: -0\.18, z: -6\.90, radius: 2\.35/)
})

test('V108 preserves exact proximity gates and backs only the inspection camera out of rendered meshes', () => {
  assert.match(runtime, /\['orb', ORB, 2\.35\], \['ground', GROUND, 2\.65\], \['life-map', LIFE_MAP, 2\.65\]/)
  assert.match(runtime, /const inspectionClearance = nearby === 'orb' \? \(portrait \? 2\.80 : 2\.40\) : nearby \? \(portrait \? 2\.10 : 1\.65\) : 0\.10/)
  assert.match(runtime, /data-home-approach-clearance="v108-camera-outside-unchanged-thresholds"/)
  assert.match(world, /approachVisibilityRepair: 'v112-visible-governed-relief-outside-approach-cameras'/)
  assert.match(world, /visibleThresholdAuthority: 'authored-open-canyon-stone-cut-thresholds'/)
})

test('V101 finalization executes this contract and checks current source markers', () => {
  assert.match(finalizer, /urai-tier1\/tests\/home-v88-retained-pixel-repair-contract\.test\.mjs/)
  assert.match(finalizer, /home-v122-retired-procedural-shells/)
  assert.match(finalizer, /v122-authored-depth-contained-orb-simplified-thresholds/)
})
