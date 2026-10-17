import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { makeGalacticSpiralPoints } from '../src/components/lifemap/galacticSpiralPointDistribution.ts'

const composition = readFileSync(new URL('../src/components/lifemap/LifeMapProductionWorld.tsx', import.meta.url), 'utf8')
const renderer = readFileSync(new URL('../src/components/lifemap/GalacticSpiralStructure.tsx', import.meta.url), 'utf8')

function bounds(samples) {
  const x = [], y = [], z = []
  for (let i = 0; i < samples.positions.length; i += 3) {
    x.push(samples.positions[i])
    y.push(samples.positions[i + 1])
    z.push(samples.positions[i + 2])
  }
  return { x: Math.max(...x) - Math.min(...x), y: Math.max(...y) - Math.min(...y),
    z: Math.max(...z) - Math.min(...z), avgZ: z.reduce((a, b) => a + b, 0) / z.length }
}

test('three physical galactic volume bands have independent parallax depths and bounded costs', () => {
  const depths = {}
  for (const tier of ['low', 'medium', 'high']) {
    let previous = 0
    for (const band of ['foreground', 'middle', 'far']) {
      const points = makeGalacticSpiralPoints(band, tier)
      const again = makeGalacticSpiralPoints(band, tier)
      assert.deepEqual(points.positions, again.positions)
      assert.deepEqual(points.colors, again.colors)
      assert.equal(points.positions.length, points.count * 3)
      assert.equal(points.pointSizes.length, points.count)
      assert.ok(points.count >= 300 && points.count <= 4000)
      assert.ok(Array.from(points.positions).every(Number.isFinite))
      assert.ok(Array.from(points.pointSizes).every(n => n > 0 && n < 1))
      assert.ok(Array.from(points.colors).every(n => n > 0 && n < 1))
      const box = bounds(points)
      assert.ok(box.x > 7 && box.y > 3 && box.z > 3, band + ' must occupy actual 3D volume')
      if (tier === 'high') depths[band] = box.avgZ
      assert.ok(points.count >= previous || band === 'foreground')
      previous = points.count
    }
  }
  assert.ok(depths.foreground > depths.middle && depths.middle > depths.far)
  assert.ok(depths.foreground - depths.far > 35)
})

test('the actual canonical Life Map mounts 3D spiral fields without manufacturing memory identities', () => {
  assert.match(composition, /<GalacticSpiralStructure tier=\{tier\} \/>/)
  assert.match(composition, /life-map-memory-artifact-families/)
  assert.match(renderer, /band="foreground"/)
  assert.match(renderer, /band="middle"/)
  assert.match(renderer, /band="far"/)
  assert.match(renderer, /depthTest: true, depthWrite: false/)
  assert.match(renderer, /raycast=\{\(\) => null\}/)
  assert.match(renderer, /truthClass: 'environment-only'/)
  assert.doesNotMatch(renderer, /ownerId|memoryId|sessionStorage|localStorage|requestCouncilProvider|setInterval|useFrame/)
})
