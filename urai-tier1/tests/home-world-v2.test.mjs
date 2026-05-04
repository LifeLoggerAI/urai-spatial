import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()
const homeDir = path.join(root, 'src', 'spatial', 'home')

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8')
}

test('Home World V2 route architecture is not query-param redirected', () => {
  const rootPage = read('src/app/page.tsx')
  const lifeMapPage = read('src/app/life-map/page.tsx')
  const mirrorPage = read('src/app/mirror/page.tsx')
  const replayPage = read('src/app/replay/page.tsx')
  const focusPage = read('src/app/focus/page.tsx')

  assert.match(rootPage, /SpatialHomeWorld/)
  assert.match(lifeMapPage, /SpatialScene/)
  assert.match(mirrorPage, /SpatialScene/)
  assert.match(replayPage, /SpatialScene/)
  assert.match(focusPage, /SpatialScene/)
  assert.doesNotMatch(lifeMapPage, /phase=lifemap/)
  assert.doesNotMatch(mirrorPage, /phase=mirror/)
  assert.doesNotMatch(replayPage, /phase=replay/)
  assert.doesNotMatch(focusPage, /phase=focus/)
})

test('Home World V2 exposes data-driven state attributes and accessibility hooks', () => {
  const scene = read('src/spatial/home/SpatialHomeWorld.tsx')
  const orb = read('src/spatial/home/layers/OrbCompanionLayer.tsx')
  const narrator = read('src/spatial/home/layers/NarratorEffectLayer.tsx')

  for (const attr of [
    'data-ground-tier',
    'data-orb-tier',
    'data-sky-tier',
    'data-mood',
    'data-recovery',
    'data-energy',
    'data-narrator-speaking',
  ]) {
    assert.match(scene, new RegExp(attr))
  }

  assert.match(orb, /aria-label="Enter Life Map"/)
  assert.match(orb, /aria-disabled=\{opening\}/)
  assert.match(narrator, /aria-label="Why the Home World looks this way"/)
  assert.match(narrator, /sr-only/)
})

test('Home World V2 has modular layers and production contracts', () => {
  const requiredFiles = [
    'HomeWorldLayerStack.tsx',
    'SpatialHomeWorld.tsx',
    'homeWorldTypes.ts',
    'homeWorldDefaults.ts',
    'deriveHomeWorldStateFromSignals.ts',
    'homeWorldTokens.ts',
    'motion/useAscentTransition.ts',
    'motion/useReducedMotion.ts',
    'motion/useTierUpgradeMotion.ts',
    'layers/DeepSkyLayer.tsx',
    'layers/StarfieldLayer.tsx',
    'layers/HorizonSystem.tsx',
    'layers/GroundTierLayer.tsx',
    'layers/AvatarLayer.tsx',
    'layers/OrbCompanionLayer.tsx',
    'layers/NarratorEffectLayer.tsx',
    'assets/homeWorldAssets.ts',
    'HOME_WORLD_V2_ASSET_CONTRACT.md',
    'HOME_WORLD_V2_QA_AND_LAUNCH_READINESS.md',
  ]

  for (const file of requiredFiles) {
    assert.equal(fs.existsSync(path.join(homeDir, file)), true, `${file} should exist`)
  }
})

test('Home World V2 derivation helper contains clamped tier and explainability logic', () => {
  const derivation = read('src/spatial/home/deriveHomeWorldStateFromSignals.ts')
  const firebase = read('src/lib/firebase/homeWorld.ts')

  assert.match(derivation, /deriveHomeWorldStateFromSignals/)
  assert.match(derivation, /tierFromScore/)
  assert.match(derivation, /sourceSignals/)
  assert.match(derivation, /reason:/)
  assert.match(firebase, /users.*homeWorld.*state|homeWorldRef/)
  assert.match(firebase, /homeWorldExplainability/)
  assert.match(firebase, /deriveAndSaveHomeWorldState/)
})

test('Home World V2 asset generator is Node-safe', () => {
  const generator = read('scripts/generate-aura-assets.mjs')
  assert.doesNotMatch(generator, /OffscreenCanvas/)
  assert.doesNotMatch(generator, /await blob\.arrayBuffer/)
  assert.match(generator, /writePng/)
})
