import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const world = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionV76.tsx', import.meta.url), 'utf8')

test('V95 keeps the governed Home source visibly bound while recursively removing rejected node families', () => {
  assert.match(world, /root\.traverse\(\(object\) =>/)
  assert.match(world, /for \(const object of rejectedNodes\) object\.parent\?\.remove\(object\)/)
  assert.match(world, /sanctuary-terrain\|mirror-basin\|orb-sanctuary-pedestal/)
  assert.match(world, /home-v83-governed-open-sanctuary-environment/)
  assert.match(world, /visible-governed-threshold-architecture-with-rejected-node-families-removed/)
  assert.match(world, /legacyTreatment: 'full-authored-composition-with-duplicate-interaction-art-suppressed'/)
  assert.match(world, /successorVisualRepair: 'v95-recursive-rejected-family-removal'/)
  assert.doesNotMatch(world, /root\.visible\s*=\s*false/)
})

test('V95 replaces rings and foreground occluders with human-scale integrated thresholds', () => {
  assert.doesNotMatch(world, /<ringGeometry/)
  assert.match(world, /v95-architectural-rock-cut-threshold-no-ring-marker/)
  assert.match(world, /home-v95-\$\{destination\}-threshold-lintel/)
  assert.match(world, /scale=\{\[1\.90, 1\.90, 1\.90\]\}/)
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

test('V101 removes rejected portal and rock repetition while restoring Orb hierarchy', () => {
  assert.match(world, /rejectedUtilityDetail = \/\(\?:pipe\|tube\|conduit\|duct\|cable\)\/i/)
  assert.match(world, /home-v101-removed-entrance-rock-clutter/)
  assert.match(world, /home-v101-\$\{destination\}-foreground-portal-frame-removed/)
  assert.doesNotMatch(world, /<PortalStoneFrame/)
  assert.doesNotMatch(world, /<circleGeometry/)
  assert.doesNotMatch(world, /<ProductionAsset[^>]*entry-buttress/)
  assert.match(world, /position=\{\[-0\.28, 2\.48, -6\.18\]\}/)
  assert.match(world, /scale=\{\[1\.90, 1\.90, 1\.90\]\}/)
  assert.match(world, /home-v101-\$\{destination\}-embedded-wayfinding-inlay/)
  assert.match(world, /successorVisualRepair: 'v101-legible-orb-decluttered-asymmetric-thresholds'/)
})
