import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import test from 'node:test'

// These are source-bound readiness-contract checks, not real browser pixels.
const source = readFileSync(new URL('../src/components/lifemap/LifeMapProductionWorld.tsx', import.meta.url), 'utf8')
const expression = source.match(/const ready = ([\s\S]*?);\s*const signature =/)
assert.ok(expression, 'expected original Life Map readiness expression')
const ready = (frames, lost, calls, triangles, objects, anchors) => Boolean(runInNewContext(expression[1], {
  frames: { current: frames },
  gl: { getContext: () => ({ isContextLost: () => lost }) },
  calls, triangles, objects, anchors,
}, { timeout: 1000 }))

test('stale counters cannot claim ready before four new frames', () => {
  assert.equal(ready(0, false, 8, 128, 44, 10), false)
  assert.equal(ready(3, false, 8, 128, 44, 10), false)
})
test('WebGL context loss denies readiness despite previous draw counters', () => {
  assert.equal(ready(5, true, 8, 128, 44, 10), false)
})
test('draw calls without rendered triangles are not sufficient', () => {
  assert.equal(ready(5, false, 8, 0, 44, 10), false)
})
test('new frame and real populated scene counters qualify for source readiness', () => {
  assert.equal(ready(4, false, 8, 128, 44, 10), true)
})
test('existing draw call, object and anchor thresholds remain strict', () => {
  assert.equal(ready(6, false, 0, 128, 44, 10), false)
  assert.equal(ready(6, false, 8, 128, 19, 10), false)
  assert.equal(ready(6, false, 8, 128, 44, 7), false)
})
test('context invalidation resets fresh-frame count and sets readiness false', () => {
  assert.match(source, /frames\.current = 0/)
  assert.match(source, /element\.dataset\.lifeMapRenderReady = "false"/)
  assert.match(source, /canvas\.addEventListener\("webglcontextlost", markInvalid/)
})

test('authored 3D curves preserve visible opacity rather than collapsing to a nearly invisible cap', () => {
  const section = source.slice(source.indexOf('function Current('), source.indexOf('function FieldParticles('))
  assert.match(section, /opacity=\{THREE\.MathUtils\.clamp\(opacity, 0, 1\)\}/)
  assert.doesNotMatch(section, /Math\.min\(opacity, 0\.015\)/)
  const expected = (opacity) => Math.max(0, Math.min(1, opacity))
  assert.equal(expected(0.75), 0.75)
  assert.equal(expected(0.008), 0.008)
})

test('world republishes proof after canvas ownership invalidates the parent flag', () => {
  assert.match(source, /element\.dataset\.lifeMapRenderReady !== \(ready \? "true" : "false"\)/)
})
