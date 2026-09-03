import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const world = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionV76.tsx', import.meta.url), 'utf8')

test('V88 keeps the governed Home source bound without rendering its rejected overlay geometry', () => {
  assert.match(world, /root\.visible = false/)
  assert.match(world, /home-v83-governed-open-sanctuary-environment/)
  assert.match(world, /loaded-governed-source-with-rejected-overlay-geometry-suppressed/)
  assert.match(world, /legacyTreatment: 'full-authored-composition-with-duplicate-interaction-art-suppressed'/)
  assert.match(world, /candidateArtRevision: 'v88-governed-sanctuary-plate-composition'/)
})

test('V88 removes the sphere shell and temporary industrial overlay composition', () => {
  assert.match(world, /orb-aura\|orb-core\|orb-orbit\|orb-filament/)
  assert.match(world, /home-v88-removed-relic-conduits/)
  assert.match(world, /home-v88-removed-industrial-overlays/)
  assert.doesNotMatch(world, /<Conduit name=/)
  assert.doesNotMatch(world, /<ProductionAsset url=/)
})

test('V88 retains the petal-and-heart Orb and real interaction volume', () => {
  assert.match(world, /<primitive object=\{governedOrb\}/)
  assert.match(world, /home-v78-orb-interaction-volume/)
  assert.match(world, /onClick=\{\(event: ThreeEvent<MouseEvent>\)/)
})
