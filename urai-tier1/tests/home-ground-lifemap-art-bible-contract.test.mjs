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

test('Home is an authored inhabitable threshold with transparent spatial interaction', () => {
  for (const marker of [
    'assetCssStack(homeAssets.primary)',
    'assetCssStack(homeAssets.mobile)',
    'SanctuaryFloor',
    'SanctuaryGardens',
    'EmbodiedAvatar',
    'RelationshipPresences',
    'FrameScheduler',
    'data-home-spatial-geometry="authored-sanctuary-avatar-orb-sky-ground"',
    'data-home-visual-owner="authored-provider-art"',
    'data-home-no-finite-horizon-band="true"',
    'data-testid="urai-home-authored-sanctuary"',
    'data-testid="urai-home-sculpted-gardens"',
    'data-testid="urai-home-embodied-avatar"',
    'data-testid="urai-home-webgl-orb"',
    'data-testid="urai-home-threshold-controls"',
    'aria-label="Open the Life Map and ascend into Memory Sky"',
    'urai-home-authored-environment',
  ]) assert.ok(home.includes(marker), `missing Home convergence marker: ${marker}`)

  assert.match(groundGateway, /aria-label="Open the ground and descend into Hidden Infrastructure"/)
  assert.match(home, /gl=\{\{[^}]*alpha:\s*true[^}]*premultipliedAlpha:\s*false/s)
  assert.match(home, /gl\.setClearColor\(0x000000, 0\)/)
  assert.match(home, /var\(--home-authored-desktop\)/)
  assert.match(home, /var\(--home-authored-mobile\)/)
  assert.match(home, /refresh\(\)\s*try\s*\{\s*window\.sessionStorage\.setItem\('urai:home:visited', 'true'\)\s*\}\s*catch\s*\{[\s\S]*?\}\s*window\.addEventListener\('storage', refresh\)/)
  assert.match(home, /window\.addEventListener\('urai:home-world-state', refresh as EventListener\)/)
  assert.doesNotMatch(home, /<color attach="background"/)
  assert.doesNotMatch(home, /<planeGeometry args=\{\[160, 160/)
  assert.doesNotMatch(home, /HorizonArchitecture/)
  assert.doesNotMatch(home, /<torusGeometry/)
  assert.doesNotMatch(home, /function Tree|const TREES|OrbitControls/)
  assert.doesNotMatch(home, /EffectComposer|Bloom|Vignette/)
})

test('Ground uses authored infrastructure art with transparent truthful beacons', () => {
  for (const marker of [
    'data-ground-visual-owner="authored-provider-art"',
    'data-ground-no-compositing-bands="true"',
    'assetCssStack(groundAssets.primary)',
    'assetCssStack(groundAssets.mobile)',
    'GroundNexus',
    'DestinationBeacon',
    'WorkforceSignals',
    'ground-authored-beacon-',
    'ground-workforce-presence-signals',
    'urai-ground-central-nexus',
  ]) assert.ok(groundOwner.includes(marker) || groundScene.includes(marker), `missing Ground authored-owner marker: ${marker}`)

  for (const form of ['pavilion', 'sanctuary', 'council', 'transit', 'restorative', 'archive', 'reflection', 'vault', 'observatory', 'aperture', 'theater']) assert.ok(groundModel.includes(`"${form}"`) || groundModel.includes(`'${form}'`), `missing Ground chamber form: ${form}`)
  for (const signature of ['Arrival Horizon', 'Boundary Model', 'Decision Field', 'Movement Table', 'Quiet Pool', 'Provenance Spine', 'Many-Sided Mirror', 'Sovereignty Ledger', 'Consent Thread', 'Relational Weather Field', 'Memory Aperture', 'Replay Gate']) assert.ok(groundModel.includes(signature), `missing chamber signature: ${signature}`)

  assert.match(groundStructures, /destination\.workforceState === ['"]blocked['"]/)
  assert.match(groundStructures, /destination\.workforceState === ['"]awaiting-owner-approval['"]/)
  assert.match(groundStructures, /ownerBoundary/)
  assert.match(groundOwner, /data-ground-layer/)
  assert.match(groundOwner, /max-width:\s*48px/)
  assert.match(groundOwner, /aria-label.*emotionalSentence/s)
  assert.match(groundOwner, /gl=\{\{[^}]*alpha:\s*true[^}]*premultipliedAlpha:\s*false/s)
  assert.match(groundOwner, /gl\.setClearColor\(0x000000, 0\)/)
  assert.match(groundOwner, /opacity:\.94/)
  assert.doesNotMatch(groundScene, /<color attach="background"/)
  assert.doesNotMatch(groundScene, /WorldEnvelope|LayeredTerraces|InitialOverlook/)
  assert.doesNotMatch(groundScene, /EffectComposer|Bloom|Vignette/)
  assert.doesNotMatch(groundScene, /<boxGeometry/)
})

test('Life Map loading and reduced capability remain authored private experiences', () => {
  assert.match(lifeMap, /data-testid="urai-life-map-authored-fallback"/)
  assert.match(lifeMap, /FALLBACK_MEMORIES/)
  assert.match(lifeMap, /Memories, people, places, eras, and artifacts remain distinct/)
  assert.match(lifeMap, /Nothing private is exposed by this\s+authored fallback/)
  assert.doesNotMatch(lifeMap, /Restoring Life Map/)
  assert.doesNotMatch(lifeMap, /Loading home experience/)
})
