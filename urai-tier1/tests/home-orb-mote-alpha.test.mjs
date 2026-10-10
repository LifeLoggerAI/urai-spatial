import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const source = fs.readFileSync(new URL('../src/spatial/layout/HomeWorldProductionPolished.tsx', import.meta.url), 'utf8')
const body = source.match(/float homeOrbMoteAlpha\(vec2 point\)\s*\{([\s\S]*?)\}/)?.[1]
assert.ok(body, 'extract actual Orb mote alpha shader')
const centered = body.match(/vec2 centered\s*=\s*point\s*\*\s*([^;]+);/)?.[1]
const expression = body.match(/return ([^;]+);/)?.[1]
assert.ok(centered && expression)
const scalar = new Function('point', `return point * ${centered}`)
const smoothstep = (low, high, value) => {
  const t = Math.min(1, Math.max(0, (value - low) / (high - low)))
  return t * t * (3 - 2 * t)
}
const dot = (a, b) => a[0] * b[0] + a[1] * b[1]
const evaluate = new Function('centered', 'smoothstep', 'dot', `return ${expression}`)
const alpha = (x, y) => evaluate([scalar(x), scalar(y)], smoothstep, dot)

test('actual circular point shader preserves center and removes square corners', () => {
  assert.equal(alpha(.5, .5), 1)
  for (const [x, y] of [[0, 0], [1, 0], [0, 1], [1, 1], [0, .5], [1, .5], [.5, 0], [.5, 1]]) assert.equal(alpha(x, y), 0)
  assert.ok(alpha(.95, .5) > 0 && alpha(.95, .5) < 1, 'soft circle shoulder')
  for (let x = 0; x <= 1; x += .025) for (let y = 0; y <= 1; y += .025) {
    const value = alpha(x, y)
    assert.ok(Number.isFinite(value) && value >= 0 && value <= 1)
    assert.ok(Math.abs(value - alpha(1 - x, y)) < 1e-12)
    assert.ok(Math.abs(value - alpha(y, x)) < 1e-12)
  }
})

test('alpha mask is attached to the actual points fragment without changing point dimensions', () => {
  assert.match(source, /replace\('#include <map_particle_fragment>', '#include <map_particle_fragment>\\ndiffuseColor\.a \*= homeOrbMoteAlpha\(gl_PointCoord\);'\)/)
  assert.match(source, /size=\{\.024\} transparent opacity=\{\.38\}[^\n]*onBeforeCompile=\{compileOrbMoteCircle\}/)
})
