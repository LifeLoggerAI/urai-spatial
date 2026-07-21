import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const smoke = fs.readFileSync('../scripts/urai-post-deploy-smoke.mjs', 'utf8')
const visualAudit = fs.readFileSync('../scripts/run-live-visual-audit-current.mjs', 'utf8')
const groundPage = fs.readFileSync('src/app/ground/page.tsx', 'utf8')
const ground = fs.readFileSync('src/app/GroundSpatialWorldClean.tsx', 'utf8')
const groundModel = fs.readFileSync('src/app/ground/GroundWorldModel.ts', 'utf8')
const groundScene = fs.readFileSync('src/app/ground/GroundWorldScene.tsx', 'utf8')
const groundGraph = `${ground}\n${groundModel}\n${groundScene}`
const canonicalGround = ground.replace(/\r\n/g, '\n').replace(/"/g, "'").replace(/\s+/g, ' ').trim()

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
  'data-ground-visual-owner="authored-provider-art"',
  'data-ground-no-compositing-bands="true"',
  'DestinationBeacon',
  'WorkforceSignals',
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

const liveGroundVisualCopy = [
  'URAI Ground',
  'Private infrastructure, embodied.',
  'Reception',
  'Archive',
]

test('post-deploy Ground smoke remains tied to the embodied destination world', () => {
  for (const marker of expectedGroundMarkers) {
    assert.ok(groundGraph.includes(marker), `missing embodied Ground marker: ${marker}`)
  }

  for (const [marker, sourceOwner] of liveGroundMarkers) {
    assert.ok(sourceOwner.includes(marker), `Ground source owner is missing live marker: ${marker}`)
    assert.ok(smoke.includes(`'${marker}'`), `post-deploy smoke is missing live Ground marker: ${marker}`)
  }

  assert.match(smoke, /\['\/ground', \['walkable-first-person-ground-layer'/)
  assert.match(smoke, /\['Street-level city world'\]/)
})

test('Ground screenshot audit requires current visible world copy', () => {
  for (const copy of liveGroundVisualCopy) {
    assert.ok(groundGraph.includes(copy), `Ground source graph is missing current visual copy: ${copy}`)
    assert.ok(visualAudit.includes(`'${copy}'`), `visual audit is missing current Ground copy: ${copy}`)
  }
  assert.ok(!visualAudit.includes("'PRIVATE COUNCIL'"))
  assert.ok(!visualAudit.includes("'Nothing acts without you'"))
})

test('obsolete Ground copy and opaque blockout owners are rejected', () => {
  assert.doesNotMatch(groundGraph, new RegExp(obsoleteTitle))
  for (const copy of retiredSmokeCopy) {
    assert.ok(!groundGraph.includes(copy), `retired Ground copy returned to the source graph: ${copy}`)
    assert.ok(!smoke.includes(`'${copy}'`), `post-deploy smoke still requires retired Ground copy: ${copy}`)
  }
  assert.match(canonicalGround, /DESTINATIONS\.map/)
  assert.match(groundScene, /DestinationBeacon/)
  assert.match(groundScene, /WorkforceSignals/)
  assert.match(groundScene, /ground-authored-beacon-/)
  assert.doesNotMatch(groundScene, /WorldEnvelope|LayeredTerraces|InitialOverlook/)
  assert.doesNotMatch(groundScene, /<boxGeometry|<color attach="background"/)
  assert.match(canonicalGround, /aria-current=\{activeId\s*===\s*destination\.id\s*\?\s*'location'\s*:\s*undefined\}/)
  assert.match(canonicalGround, /min-height:48px/)
  assert.doesNotMatch(canonicalGround, /min-height:44px/)
  assert.match(canonicalGround, /scrollIntoView\(\{\s*block:\s*'nearest',\s*inline:\s*'nearest',?\s*\}\)/)
  assert.doesNotMatch(canonicalGround, /padding-inline:12px 210px/)
  assert.match(canonicalGround, /scroll-padding-inline-start:max\(14px,env\(safe-area-inset-left\)\)/)
  assert.match(canonicalGround, /scroll-padding-inline-end:max\(14px,env\(safe-area-inset-right\)\)/)
  assert.match(canonicalGround, /overflow-x:auto/)
  assert.match(canonicalGround, /safe-area-inset-bottom/)
})
