import assert from 'node:assert/strict'
import test from 'node:test'
import {
  deterministicLifeMapNodes,
  readLifeMapDeterministicTestConfig,
} from '../src/components/lifemap/lifeMapDeterministicTestMode.ts'
import { lifeMapLocalPoint } from '../src/components/lifemap/lifeMapSpatialLayout.ts'

test('test mode defaults are deterministic and bounded', () => {
  const config = readLifeMapDeterministicTestConfig('?testMode=1')
  assert.equal(config.enabled, true)
  assert.equal(config.fixture, 'dense')
  assert.equal(config.seed, 1234)
  assert.equal(config.clockMs, 12000)
  assert.equal(config.freeze, true)
  assert.equal(config.quality, 'high')
  assert.equal(config.dpr, 1)
  assert.equal(config.locale, 'en')
})

test('test mode rejects unknown fixture/quality and clamps numeric controls', () => {
  const config = readLifeMapDeterministicTestConfig('?testMode=1&fixture=nope&quality=ultra&seed=-7&clock=999999999&dpr=9')
  assert.equal(config.fixture, 'dense')
  assert.equal(config.quality, 'high')
  assert.equal(config.seed, 0)
  assert.equal(config.clockMs, 86400000)
  assert.equal(config.dpr, 2)
})

test('synthetic fixtures never contain personal payloads and remain stable', () => {
  for (const fixture of ['zero', 'one', 'five', 'sparse', 'dense', 'emotional-weather', 'rtl', 'cjk', 'long-title']) {
    const first = deterministicLifeMapNodes(fixture)
    const second = deterministicLifeMapNodes(fixture)
    assert.deepEqual(second, first, `${fixture} fixture changed between reads`)
    for (const node of first) {
      assert.ok(node.tags?.includes('synthetic-test-fixture') || fixture === 'emotional-weather')
      assert.equal(node.privacyLevel, 'private')
      assert.ok(!/adam|urai:userId|@urai\./i.test(JSON.stringify(node)), 'synthetic fixture leaked user-identifying content')
    }
  }
})

test('deterministic dense fixture produces order-stable spatial coordinates', () => {
  const nodes = deterministicLifeMapNodes('dense')
  const baseline = Object.fromEntries(nodes.map((node, index) => [node.id, lifeMapLocalPoint(node, index)]))
  const reversed = [...nodes].reverse()
  for (const [index, node] of reversed.entries()) {
    assert.deepEqual(lifeMapLocalPoint(node, index), baseline[node.id], `${node.id} moved after deterministic fixture reorder`)
  }
})
