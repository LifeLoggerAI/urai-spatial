import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const read = (path) => fs.readFileSync(path, 'utf8')
const home = read('src/app/HomeSpatialCanvas.tsx')
const groundGateway = read('src/spatial/world/GroundGateway.tsx')
const groundOwner = read('src/app/GroundSpatialWorldClean.tsx')
const groundModel = read('src/app/ground/GroundWorldModel.ts')
const groundScene = read('src/app/ground/GroundWorldScene.tsx')
const groundStructures = read('src/app/ground/GroundWorldStructures.tsx')
const lifeMap = read('src/spatial/lifemap/SpatialLifeMapCanonical.tsx')

test('Home is one authored inhabitable threshold with Ground below and Life Map above', () => {
  for (const marker of [
    'SanctuaryFloor',
    'SanctuaryGardens',
    'HorizonArchitecture',
    'EmbodiedAvatar',
    'RelationshipPresences',
    'FrameScheduler',
    'data-home-spatial-geometry="authored-sanctuary-avatar-orb-sky-ground"',
    'data-testid="urai-home-authored-sanctuary"',
    'data-testid="urai-home-sculpted-gardens"',
    'data-testid="urai-home-embodied-avatar"',
    'data-testid="urai-home-webgl-orb"',
    'data-testid="urai-home-threshold-controls"',
    'aria-label="Open the Life Map and ascend into Memory Sky"',
  ]) assert.ok(home.includes(marker), `missing Home convergence marker: ${marker}`)
  assert.match(groundGateway, /aria-label="Open the ground and descend into Hidden Infrastructure"/)
  assert.match(home, /<planeGeometry args=\{\[160, 160, 1, 1\]\}/)
  assert.doesNotMatch(home, /function Tree|const TREES|OrbitControls/)
  assert.doesNotMatch(home, /EffectComposer|Bloom|Vignette/)
})

test('Ground is layered, partially revealed, state truthful, and architecturally differentiated', () => {
  for (const marker of ['GroundNexus', 'LayeredTerraces', 'InitialOverlook', 'urai-ground-central-nexus', 'urai-ground-layered-terraces', 'urai-ground-arrival-overlook']) assert.ok(groundScene.includes(marker), `missing Ground spatial marker: ${marker}`)
  for (const form of ['pavilion', 'sanctuary', 'council', 'transit', 'restorative', 'archive', 'reflection', 'vault', 'observatory', 'aperture', 'theater']) assert.ok(groundModel.includes(`"${form}"`) || groundModel.includes(`'${form}'`), `missing Ground chamber form: ${form}`)
  for (const signature of ['Arrival Horizon', 'Boundary Model', 'Decision Field', 'Movement Table', 'Quiet Pool', 'Provenance Spine', 'Many-Sided Mirror', 'Sovereignty Ledger', 'Consent Thread', 'Relational Weather Field', 'Memory Aperture', 'Replay Gate']) assert.ok(groundModel.includes(signature), `missing chamber signature: ${signature}`)
  assert.match(groundStructures, /destination\.workforceState === ['"]blocked['"]/)
  assert.match(groundStructures, /destination\.workforceState === ['"]awaiting-owner-approval['"]/)
  assert.match(groundStructures, /ownerBoundary/)
  assert.match(groundOwner, /data-ground-layer/)
  assert.match(groundOwner, /max-width:\s*48px/)
  assert.match(groundOwner, /aria-label.*emotionalSentence/s)
})

test('Life Map loading and reduced capability remain authored private experiences', () => {
  assert.match(lifeMap, /data-testid="urai-life-map-authored-fallback"/)
  assert.match(lifeMap, /FALLBACK_MEMORIES/)
  assert.match(lifeMap, /Memories, people, places, eras, and artifacts remain distinct/)
  assert.match(lifeMap, /Nothing private is exposed by this\s+authored fallback/)
  assert.doesNotMatch(lifeMap, /Restoring Life Map/)
  assert.doesNotMatch(lifeMap, /Loading home experience/)
})
