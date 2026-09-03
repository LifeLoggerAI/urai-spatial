import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const world = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionV76.tsx', import.meta.url), 'utf8')

test('V93 keeps the governed Home source visibly bound while removing only rejected node families', () => {
  assert.match(world, /root\.remove\(\.\.\.root\.children\.filter/)
  assert.match(world, /sanctuary-terrain\|mirror-basin\|orb-sanctuary-pedestal/)
  assert.match(world, /home-v83-governed-open-sanctuary-environment/)
  assert.match(world, /visible-governed-threshold-architecture-with-rejected-node-families-removed/)
  assert.match(world, /legacyTreatment: 'full-authored-composition-with-duplicate-interaction-art-suppressed'/)
  assert.match(world, /candidateArtRevision: 'v93-governed-dimensional-sanctuary'/)
  assert.doesNotMatch(world, /root\.visible\s*=\s*false/)
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
