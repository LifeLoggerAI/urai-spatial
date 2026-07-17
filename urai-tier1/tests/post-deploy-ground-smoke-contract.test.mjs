import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const smoke = fs.readFileSync('../scripts/urai-post-deploy-smoke.mjs', 'utf8')
const ground = fs.readFileSync('src/app/GroundSpatialWorldClean.tsx', 'utf8')

const obsoleteTitle = 'Street-level city world'
const expectedGroundMarkers = [
  'URAI Ground embodied private infrastructure',
  'ground-spatial-root',
  'ground-destination-compass',
  'data-ground-destination',
  'data-workforce-state',
  'data-service-availability',
  'data-testid="urai-ground-council-population"',
  'data-testid="urai-ground-webgl-fallback"',
  'Your private workforce.',
  'Six chambers active · private by default',
  'Reception',
  'Privacy Sanctuary',
  'Council',
  'Logistics',
  'Wellness',
  'Archive',
  'Reflection Realm',
  'Ownership Vault',
  'Consent Sanctuary',
  'Emotional Atlas',
  'Focus Chamber',
  'Replay Theater',
]

test('post-deploy Ground smoke remains tied to the embodied destination world', () => {
  for (const marker of expectedGroundMarkers) {
    assert.ok(ground.includes(marker), `missing embodied Ground marker: ${marker}`)
  }

  assert.match(smoke, /\['\/ground', \['walkable-first-person-ground-layer', 'Your private workforce\.', 'Six chambers active · private by default'\], \['Street-level city world'\]\]/)
})

test('Ground source rejects obsolete copy and retains accessibility, fallback, and world-routing contracts', () => {
  assert.doesNotMatch(ground, new RegExp(obsoleteTitle))
  assert.match(ground, /DESTINATIONS\.map/)
  assert.match(ground, /WalkingPresence/)
  assert.match(ground, /CouncilPopulation/)
  assert.match(ground, /DestinationArchitecture/)
  assert.match(ground, /EnvironmentMotion/)
  assert.match(ground, /requestUraiWorldTravel/)
  assert.match(ground, /requestUraiWorldReturn/)
  assert.match(ground, /aria-current=\{activeId === destination\.id \? 'location' : undefined\}/)
  assert.match(ground, /min-height:48px/)
  assert.match(ground, /overflow-x:auto/)
  assert.match(ground, /safe-area-inset-bottom/)
  assert.match(ground, /webglcontextlost/)
  assert.match(ground, /prefers-reduced-motion: reduce/)
})
