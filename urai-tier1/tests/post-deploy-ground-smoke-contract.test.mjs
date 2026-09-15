import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const smoke = fs.readFileSync('../scripts/urai-post-deploy-smoke.mjs', 'utf8')
const visualAudit = fs.readFileSync('../scripts/run-live-visual-audit-current.mjs', 'utf8')
const groundPage = fs.readFileSync('src/app/ground/page.tsx', 'utf8')
const ground = fs.readFileSync('src/app/GroundSpatialWorldClean.tsx', 'utf8')

const expectedGroundMarkers = [
  'urai-ground-lived-world',
  'ground-lived-world-v1',
  'first-person-lived-world',
  'eye-level-terrain-following',
  'data-ground-exploration="first-person"',
  'data-ground-collision="visible-terrain-heightfield"',
  'data-ground-place-layer="consent-aware-empty-by-default"',
  'data-ground-private-location-mounted="false"',
  'ground-visible-traversable-terrain',
  'stepEmbodiedMotion',
  'useMovementInput',
  'useDragLook',
  'MobileMovementPad',
]

const retiredGroundMarkers = [
  'urai-ground-private-workforce-world',
  'ground-destination-compass',
  'data-ground-destination',
  'ground-central-nexus',
  'ground-enterable-threshold-',
  'ground-workforce-and-council-presences',
  'Walk deeper. Approach a chamber.',
  'Private infrastructure beneath the living world',
]

test('post-deploy Ground smoke is tied to the live first-person lived-world authority', () => {
  assert.ok(groundPage.includes('walkable-first-person-ground-layer'))
  for (const marker of expectedGroundMarkers) {
    assert.ok(ground.includes(marker), `missing lived-world Ground marker: ${marker}`)
  }

  for (const marker of ['walkable-first-person-ground-layer', 'urai-ground-lived-world', 'ground-lived-world-v1', 'first-person-lived-world', 'eye-level-terrain-following']) {
    assert.ok(smoke.includes(`'${marker}'`), `post-deploy smoke is missing current Ground marker: ${marker}`)
  }

  assert.match(smoke, /\['\/ground', \['walkable-first-person-ground-layer'/)
})

test('Ground visual audit traceability names current authority and retires chamber copy', () => {
  for (const marker of ['urai-ground-lived-world', 'ground-lived-world-v1', 'first-person-lived-world', 'eye-level-terrain-following']) {
    assert.ok(visualAudit.includes(`'${marker}'`), `visual audit is missing current Ground marker: ${marker}`)
  }
  for (const marker of retiredGroundMarkers) {
    assert.ok(!ground.includes(marker), `retired Ground authority returned to runtime: ${marker}`)
  }
})

test('Ground keeps visible terrain as traversal and location data fail-closed', () => {
  assert.match(ground, /name="ground-visible-traversable-terrain"[\s\S]*onClick=\{onTerrainClick\}/)
  assert.match(ground, /event\.delta > 8/)
  assert.match(ground, /data-ground-private-location-mounted="false"/)
  assert.match(ground, /href="\/location-map\/geographic\/"/)
  assert.match(ground, /href="\/privacy-controls"/)
  assert.doesNotMatch(ground, /requestPointerLock|sprint|jump|crouch/i)
  assert.doesNotMatch(ground, /ground-walkable-navigation-surface|GroundPhysicalArchitecture|GroundVaultArchitecture/)
  assert.match(ground, /min-width:48px;min-height:48px/)
  assert.match(ground, /safe-area-inset-bottom/)
})

test('live smoke rejects retired chamber-hub authority', () => {
  for (const marker of ['URAI Ground embodied private infrastructure', 'ground-destination-compass', 'Walk deeper. Approach a chamber.', 'Street-level city world']) {
    assert.ok(smoke.includes(`'${marker}'`), `smoke must explicitly forbid retired Ground marker: ${marker}`)
  }
})
