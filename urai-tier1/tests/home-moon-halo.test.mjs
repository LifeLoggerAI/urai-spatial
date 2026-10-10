import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const source = fs.readFileSync(new URL('../src/spatial/layout/HomeWorldProductionPolished.tsx', import.meta.url), 'utf8')
const functionSource = source.match(/float homeMoonHaloAlpha\(float facing\)\s*\{\s*return ([^;]+);\s*\}/)?.[1]
assert.ok(functionSource, 'extract actual moon halo shader falloff')
const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value))
const alpha = new Function('facing', 'clamp', `return ${functionSource.replaceAll('pow(', 'Math.pow(')}`)
const sample = facing => alpha(facing, clamp)

test('actual halo shader is finite, bounded, continuous and fades to zero at silhouette', () => {
  let previous = 0
  for (let index = -100; index <= 1100; index++) {
    const facing = index / 1000, value = sample(facing)
    assert.ok(Number.isFinite(value))
    assert.ok(value >= 0 && value <= .065)
    assert.ok(value >= previous)
    assert.ok(value - previous < .0002)
    if (facing <= 0) assert.equal(value, 0)
    previous = value
  }
  assert.equal(sample(1), .065)
  assert.equal(sample(2), .065)
  assert.ok(sample(.01) < .000001, 'edge alpha removes hard outer disk')
  assert.ok(sample(Math.sqrt(1 - (1 / 1.7) ** 2)) > .03, 'soft halo remains visible beyond unchanged moon core')
})
