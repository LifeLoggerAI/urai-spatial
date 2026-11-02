import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = path => readFileSync(new URL('../src/app/' + path, import.meta.url), 'utf8')
const world = read('GroundSpatialWorldClean.tsx')
const workforce = read('GroundWorkforcePresences.tsx')
const route = read('ground/page.tsx')
const legacy = read('UraiAutonomousV1Layer.tsx')

test('eleven unique Ground roles use the source-provenance avatar registry', () => {
  const ids = [...workforce.matchAll(/\{ id: '([A-Za-z]+)', label: '([^']+)', destinationId: '([^']+)', asset: avatarAssets\.([A-Za-z]+),/g)]
  assert.equal(ids.length, 11, 'five helpers and six specialist references required')
  assert.equal(new Set(ids.map(match => match[1])).size, 11)
  assert.equal(new Set(ids.map(match => match[4])).size, 11)
  for (const match of ids) assert.equal(match[1], match[4], 'role must use matching avatar')
  assert.equal(ids.filter(match => ['relationshipLiaison', 'operator', 'builder', 'protector', 'mirror', 'guide'].includes(match[1])).length, 6)
})

test('workforce belongs to active GLB world and retired overlay remains excluded', () => {
  assert.match(route, /<GroundSpatialWorldClean \/>/)
  assert.match(world, /<primitive object=\{world\} \/>[\s\S]*<GroundWorkforcePresences world=\{world\} \/>/)
  assert.match(world, /data-ground-runtime-owner="final-glb-infrastructure-world"/)
  assert.doesNotMatch(legacy, /pathname\.startsWith\(["']\/ground/)
  assert.match(workforce, /world\.getObjectByName\(`ground-destination-\$\{member\.destinationId\}`\)/)
  assert.match(workforce, /visualStatus: 'provider-reference-pending-acceptance'/)
})

test('Ground workforce is advisory only, navigable and accessible on mobile', () => {
  assert.match(world, /aria-label="Ground workforce presences"/)
  assert.match(world, /aria-expanded=\{workforceOpen\}/)
  assert.match(world, /data-ground-workforce-entry=\{member\.id\}/)
  assert.match(world, /focusDestination\(destination\)/)
  assert.match(world, /min-height:48px/)
  assert.match(world, /@media\(max-width:760px\)/)
  assert.match(world, /@media\(prefers-reduced-motion:reduce\)/)
  assert.match(workforce, /actionAuthority: 'none'/)
  assert.match(workforce, /<GroundPortraitLoadBoundary key=\{member\.id\} roleId=\{member\.id\}>/)
  assert.match(workforce, /<Suspense fallback=\{null\}>/)
  assert.match(workforce, /getDerivedStateFromError/)
})
