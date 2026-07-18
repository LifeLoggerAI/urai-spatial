import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const smoke = fs.readFileSync('../scripts/urai-post-deploy-smoke.mjs', 'utf8')
const groundPage = fs.readFileSync('src/app/ground/page.tsx', 'utf8')
const ground = fs.readFileSync('src/app/GroundSpatialWorldClean.tsx', 'utf8')

const obsoleteTitle = 'Street-level city world'
const retiredSmokeCopy = [
  'Your private workforce.',
  'Six chambers active · private by default',
]

const expectedGroundMarkers = [
  'URAI Ground embodied private infrastructure',
  'ground-spatial-root',
  'ground-destination-compass',
  'data-ground-destination',
  'data-workforce-state',
  'data-service-availability',
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

const liveGroundMarkers = [
  ['walkable-first-person-ground-layer', groundPage],
  ['urai-ground-private-workforce-world', ground],
  ['ground-destination-compass', ground],
  ['data-ground-destination', ground],
  ['URAI Ground embodied private infrastructure', ground],
]

test('post-deploy Ground smoke remains tied to the embodied destination world', () => {
  for (const marker of expectedGroundMarkers) {
    assert.ok(ground.includes(marker), `missing embodied Ground marker: ${marker}`)
  }

  for (const [marker, sourceOwner] of liveGroundMarkers) {
    assert.ok(sourceOwner.includes(marker), `Ground source owner is missing live marker: ${marker}`)
    assert.ok(smoke.includes(`'${marker}'`), `post-deploy smoke is missing live Ground marker: ${marker}`)
  }

  assert.match(smoke, /\['\/ground', \['walkable-first-person-ground-layer'/)
  assert.match(smoke, /\['Street-level city world'\]/)
})

test('obsolete Ground copy is rejected rather than required by the source owner', () => {
  assert.doesNotMatch(ground, new RegExp(obsoleteTitle))
  for (const copy of retiredSmokeCopy) {
    assert.ok(!ground.includes(copy), `retired Ground copy returned to the source owner: ${copy}`)
    assert.ok(!smoke.includes(`'${copy}'`), `post-deploy smoke still requires retired Ground copy: ${copy}`)
  }
  assert.match(ground, /DESTINATIONS\.map/)
  assert.match(ground, /WorkforcePresence/)
  assert.match(ground, /DestinationArchitecture/)
  assert.match(ground, /Corridor/)
  assert.match(ground, /aria-current=\{activeId === destination\.id \? 'location' : undefined\}/)
  assert.match(ground, /min-height:44px/)
  assert.match(ground, /overflow-x:auto/)
  assert.match(ground, /safe-area-inset-bottom/)
})
