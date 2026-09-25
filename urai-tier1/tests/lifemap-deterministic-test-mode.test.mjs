import assert from 'node:assert/strict'
import test from 'node:test'
import {
  deterministicLifeMapNodes,
  readLifeMapDeterministicTestConfig,
} from '../src/components/lifemap/lifeMapDeterministicTestMode.ts'
import fs from 'node:fs'

const cosmic = fs.readFileSync(new URL('../src/components/lifemap/CosmicComposedLifeMapScene.tsx', import.meta.url), 'utf8')

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

test('deterministic fixtures feed an order-independent cosmic placement authority', () => {
  const nodes = deterministicLifeMapNodes('dense')
  assert.ok(nodes.length > 0)
  const placement = cosmic.slice(cosmic.indexOf('function cosmicPoint('), cosmic.indexOf('\n}\n\nfunction truthLabel', cosmic.indexOf('function cosmicPoint(')) + 2)
  assert.match(placement, /function cosmicPoint\(node: LifeMapNode\)/)
  assert.match(placement, /node\.id/)
  assert.match(placement, /node\.eraId/)
  assert.match(placement, /node\.clusterId \|\| node\.type/)
  assert.doesNotMatch(placement, /\bindex\b/)
})
