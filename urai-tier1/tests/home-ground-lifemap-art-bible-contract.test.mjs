import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const read = (path) => fs.readFileSync(path, 'utf8')
const homeRuntime = read('src/app/HomeSpatialRuntimeLayer.tsx')
const home = read('src/app/FinalHomeWorld.tsx')
const groundGateway = read('src/spatial/world/GroundGateway.tsx')
const groundOwner = read('src/app/GroundSpatialWorldClean.tsx')
const groundModel = read('src/app/ground/GroundWorldModel.ts')
const groundScene = read('src/app/ground/EmbodiedGroundScene.tsx')
const groundArchitecture = read('src/app/ground/GroundContinuityArchitecture.tsx')
const lifeMap = read('src/spatial/lifemap/SpatialLifeMapCanonical.tsx')

const homeGraph = `${homeRuntime}\n${home}`
const groundGraph = `${groundOwner}\n${groundScene}\n${groundArchitecture}`

test('Home is one inhabitable sanctuary with embodied spatial interaction', () => {
  for (const marker of [
    'FinalHomeWorld',
    'data-home-visual-owner="final-coherent-sanctuary"',
    'data-home-visible-world="final-physical-sanctuary-memory-rooms"',
    'data-home-movement="walk-keyboard-click-touch"',
    'data-home-pointer-lock="false"',
    'home-visible-navigable-sanctuary-world',
    'home-memory-vignette-',
    'data-testid="urai-home-embodied-avatar"',
    'data-testid="urai-home-webgl-orb"',
    'data-testid="urai-home-walkable-surface"',
    'aria-label="Open Ground directly"',
    'aria-label="Open Life Map directly"',
  ]) assert.ok(homeGraph.includes(marker), `missing Home convergence marker: ${marker}`)

  assert.match(groundGateway, /aria-label="Open the ground and descend into Hidden Infrastructure"/)
  assert.match(home, /gl=\{\{[^}]*alpha:\s*false/s)
  assert.doesNotMatch(homeGraph, /EmbodiedHomeSpatialCanvas|HomeSanctuaryWorld|assetCssStack\(homeAssets\.|home-authored-art|requestPointerLock|OrbitControls|EffectComposer|<Bloom\b|<Vignette\b/)
})

test('Ground is one procedural architectural infrastructure world', () => {
  for (const marker of [
    'data-ground-visual-owner="shared-continuity-architecture"',
    'data-ground-no-compositing-bands="true"',
    'GroundContinuityArchitecture',
    'EmbodiedGroundScene',
    'ground-continuity-architectural-shell',
    'ground-walkable-navigation-surface',
    'ground-walkable-path-network',
    'ground-central-nexus',
    'ground-enterable-threshold-',
    'ground-workforce-and-council-presences',
  ]) assert.ok(groundGraph.includes(marker), `missing Ground architectural-owner marker: ${marker}`)

  for (const form of ['pavilion', 'sanctuary', 'council', 'transit', 'restorative', 'archive', 'reflection', 'vault', 'observatory', 'aperture', 'theater']) {
    assert.ok(groundModel.includes(`"${form}"`) || groundModel.includes(`'${form}'`), `missing Ground chamber form: ${form}`)
  }
  for (const signature of ['Arrival Horizon', 'Boundary Model', 'Decision Field', 'Movement Table', 'Quiet Pool', 'Provenance Spine', 'Many-Sided Mirror', 'Sovereignty Ledger', 'Consent Thread', 'Relational Weather Field', 'Memory Aperture', 'Replay Gate']) {
    assert.ok(groundModel.includes(signature), `missing chamber signature: ${signature}`)
  }

  assert.match(groundOwner, /data-ground-layer/)
  assert.match(groundOwner, /max-width:48px/)
  assert.match(groundOwner, /aria-label.*emotionalSentence/s)
  assert.match(groundOwner, /gl=\{\{[^}]*alpha:\s*false/s)
  assert.match(groundOwner, /gl\.setClearColor\(0x020812, 1\)/)
  assert.doesNotMatch(groundGraph, /data-ground-visual-owner="authored-provider-art"/)
  assert.doesNotMatch(groundGraph, /assetCssStack\(groundAssets\.|ground-authored-art|--ground-provider-/)
  assert.doesNotMatch(groundScene, /<color attach="background"|WorldEnvelope|LayeredTerraces|InitialOverlook|EffectComposer|<Bloom\b|<Vignette\b/)
})

test('Life Map loading and reduced capability remain authored private experiences', () => {
  assert.match(lifeMap, /data-testid="urai-life-map-authored-fallback"/)
  assert.match(lifeMap, /data-life-map-fallback="authored-semantic"/)
  assert.match(lifeMap, /assetCssStack\(lifeMapAssets\.primary\)/)
  assert.match(lifeMap, /Your life has depth\./)
  assert.match(lifeMap, /WebGL is unavailable\. Semantic navigation remains available/)
  assert.match(lifeMap, /data-testid="urai-life-map-signed-out-threshold"/)
  assert.match(lifeMap, /data-private-memory-mounted="false"/)
  assert.match(lifeMap, /No private memory data is mounted\./)
  assert.match(lifeMap, /Open disclosed sample/)
  assert.match(lifeMap, /if \(current\.get\("demo"\) === "1"\) \{ setMode\("explicit-demo"\); return; \}/)
  assert.match(lifeMap, /Return Home/)
  assert.doesNotMatch(lifeMap, /FALLBACK_MEMORIES|Restoring Life Map|Loading home experience/)
})
