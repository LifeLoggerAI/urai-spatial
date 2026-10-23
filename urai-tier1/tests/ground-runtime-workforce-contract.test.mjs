import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const route = read('src/app/ground/page.tsx')
const world = read('src/app/GroundSpatialWorldClean.tsx')
const workforce = read('src/app/GroundWorkforcePresences.tsx')
const legacy = read('src/app/UraiAutonomousV1Layer.tsx')
const roles = [...workforce.matchAll(/\{ id: '([A-Za-z]+)', label: '([^']+)', destinationId: '([^']+)', asset: avatarAssets\.([A-Za-z]+), offset: \[([^\]]+)\], category: '(helper|specialist)' \}/g)]
const specialists = ['relationshipLiaison', 'operator', 'builder', 'protector', 'mirror', 'guide']
const helpers = ['receptionist', 'privacySteward', 'scheduleSteward', 'wellnessGuide', 'archivist']

test('live Ground workforce uses the canonical authored GLB owner, not retired fixed-layer art', () => {
  assert.match(route, /<GroundSpatialWorldClean \/>/)
  assert.match(world, /<primitive object=\{world\} \/>[\s\S]*<GroundWorkforcePresences world=\{world\} \/>/)
  assert.match(world, /data-ground-runtime-owner="final-glb-infrastructure-world"/)
  assert.match(world, /data-ground-workforce-art="provider-reference-pending-acceptance"/)
  assert.match(world, /ground-world-terrain-v1\.glb/)
  assert.doesNotMatch(legacy, /pathname\.startsWith\(["']\/ground/)
  assert.match(workforce, /actionAuthority: 'none'/)
})

test('all five helpers and six distinct Council presences resolve to their world anchors', () => {
  assert.equal(roles.length, 11)
  assert.equal(new Set(roles.map(role => role[1])).size, 11)
  for (const role of roles) {
    assert.equal(role[1], role[4], 'each role must reference its own provider-rendered asset')
    assert.ok(helpers.includes(role[1]) || specialists.includes(role[1]), 'unknown workforce identity')
    assert.equal(role[6], specialists.includes(role[1]) ? 'specialist' : 'helper')
    if (specialists.includes(role[1])) assert.equal(role[3], 'council')
  }
  assert.equal(roles.filter(role => role[6] === 'specialist').length, 6)
  assert.equal(roles.filter(role => role[6] === 'helper').length, 5)
  assert.match(workforce, /world\.getObjectByName\(\x60ground-destination-\$\{member\.destinationId\}\x60\)/)
  assert.match(workforce, /uraiEnterableThreshold: \x60ground-enterable-threshold-\$\{member\.destinationId\}\x60/)
})

test('world-space portrait failures cannot suspend Ground and mobile navigation stays accessible', () => {
  assert.match(workforce, /<group name="ground-world-workforce-presences"/)
  assert.match(workforce, /<mesh position=\{\[0, 0\.7, 0\.051\]\}>/)
  assert.match(workforce, /map=\{texture\} transparent alphaTest=\{0\.02\}/)
  assert.match(workforce, /<GroundPortraitLoadBoundary key=\{member\.id\} roleId=\{member\.id\}>/)
  assert.match(workforce, /getDerivedStateFromError/)
  assert.match(workforce, /<Suspense fallback=\{null\}>/)
  assert.match(world, /aria-label="Ground workforce presences"/)
  assert.match(world, /aria-expanded=\{workforceOpen\}/)
  assert.match(world, /aria-label=\{\x60Approach \$\{member\.label\} in Ground\x60\}/)
  assert.match(world, /focusDestination\(destination\)/)
  assert.match(world, /min-height:48px/)
  assert.match(world, /@media\(max-width:760px\)/)
  assert.match(world, /@media\(prefers-reduced-motion:reduce\)/)
  assert.doesNotMatch(world, /uraiGroundHelperHead|uraiGroundHelperBody/)
})
