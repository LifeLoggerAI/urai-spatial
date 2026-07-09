import assert from 'node:assert/strict'
import fs from 'node:fs'

const read = (path) => fs.readFileSync(path, 'utf8')

const contractDoc = read('docs/URAI_SPATIAL_WORLD_CONTRACT.md')
const runtimeContract = read('urai-tier1/src/spatial/uraiSpatialWorldContract.ts')
const homeWorld = read('urai-tier1/src/app/HomeSpatialWorldFinal.tsx')
const memorySurfaces = read('urai-tier1/src/app/FinalMemorySurfaces.tsx')

for (const pillar of ['Sky', 'Ground', 'Orb', 'Avatar', 'Camera']) {
  assert.match(contractDoc, new RegExp(`\\| ${pillar} \\|`), `world contract documents ${pillar}`)
}

for (const route of ['`/life-map`', '`/ground`', '`/focus`', '`/replay`']) {
  assert.ok(contractDoc.includes(route), `world contract documents ${route}`)
}

for (const runtimeToken of [
  'URAI_SPATIAL_WORLD_CONTRACT_VERSION',
  'uraiSpatialPillars',
  'uraiSpatialRouteContract',
  'uraiSpatialMotionContract',
  'uraiSpatialMemorySelectionContract',
  'uraiSpatialNonNegotiables',
]) {
  assert.ok(runtimeContract.includes(runtimeToken), `runtime contract exposes ${runtimeToken}`)
}

assert.ok(homeWorld.includes('data-spatial-contract={URAI_SPATIAL_WORLD_CONTRACT_VERSION}'), 'Home binds to spatial contract version')
assert.ok(homeWorld.includes('data-spatial-pillars="sky ground orb avatar camera"'), 'Home declares all five pillars')
assert.ok(homeWorld.includes('data-place-contract="oriented-calm-curious"'), 'Home declares arrival emotional contract')
assert.ok(homeWorld.includes('prefers-reduced-motion: reduce'), 'Home respects reduced-motion camera travel')
assert.ok(homeWorld.includes('Ground below · memory above'), 'Home orients sky/ground relationship')

assert.ok(memorySurfaces.includes('data-route-polish="selected-memory-camera-chamber"'), 'Focus remains a selected memory camera chamber')
assert.ok(memorySurfaces.includes('data-route-polish="cinematic-memory-camera-film"'), 'Replay remains a cinematic memory film')
assert.ok(memorySurfaces.includes('@media (prefers-reduced-motion: reduce)'), 'Memory surfaces respect reduced-motion')
assert.ok(memorySurfaces.includes('Camera into Replay'), 'Focus transitions into Replay through camera language')

console.log('URAI Spatial world contract passed.')
