import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const home = readFileSync(new URL('../src/spatial/layout/HomeAAAVisualRepair.tsx', import.meta.url), 'utf8')
const ground = readFileSync(new URL('../src/app/ground/GroundPhysicalArchitecture.tsx', import.meta.url), 'utf8')
const lifeMap = readFileSync(new URL('../src/components/lifemap/LifeMapStellarField.tsx', import.meta.url), 'utf8')

test('V280 Home polish remains visual-only and preserves interaction ownership', () => {
  assert.match(home, /v280-literal-pixel-convergence/)
  assert.match(home, /ForegroundVegetationCleanup/)
  assert.match(home, /LivingMemorySurfaceFinish/)
  assert.match(home, /GroundThresholdFinish/)
  assert.match(home, /aaa-v280-weathered-mineral-ground-readable-microrelief/)
  assert.match(home, /interactionOwner: false/)
  assert.match(home, /raycast=\{\(\) => null\}/)
  assert.doesNotMatch(home, /onClick=/)
})

test('V280 Ground keeps native threshold ownership while replacing block-door composition with layered vaults', () => {
  assert.match(ground, /ground-v280-vaulted-geological-civic-sanctuary/)
  assert.match(ground, /function vaultRibGeometry/)
  assert.match(ground, /<VaultRib width=\{opening \* 1\.58\}/)
  assert.match(ground, /uraiEnterableThreshold: `ground-enterable-threshold-\$\{destination\.id\}`/)
  assert.match(ground, /onClick=\{\(event\) => \{ event\.stopPropagation\(\); onSelect\(destination\); \}\}/)
  assert.match(ground, /ThresholdMemoryField/)
})

test('V280 Life Map carries near and deep stellar depth without acquiring semantic pointer ownership', () => {
  assert.match(lifeMap, /const deepCount = 1200/)
  assert.match(lifeMap, /const nearCount = 760/)
  assert.match(lifeMap, /v280-layered-personal-galaxy-depth/)
  assert.match(lifeMap, /life-map-v280-memory-constellation-currents/)
  assert.match(lifeMap, /v280-depth-bearing-memory-star/)
  assert.match(lifeMap, /interactionOwner: false/)
  assert.match(lifeMap, /raycast=\{\(\) => null\}/)
  assert.doesNotMatch(lifeMap, /onClick=/)
})
