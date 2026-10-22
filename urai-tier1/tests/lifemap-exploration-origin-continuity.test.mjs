import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const source = readFileSync(new URL('../src/components/lifemap/ComposedLifeMapScene.tsx', import.meta.url), 'utf8')

class Vector3 {
  constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z }
  clone() { return new Vector3(this.x, this.y, this.z) }
  sub(v) { this.x -= v.x; this.y -= v.y; this.z -= v.z; return this }
  add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this }
  multiply(v) { this.x *= v.x; this.y *= v.y; this.z *= v.z; return this }
  addScaledVector(v, s) { this.x += v.x * s; this.y += v.y * s; this.z += v.z * s; return this }
  lengthSq() { return this.x ** 2 + this.y ** 2 + this.z ** 2 }
  normalize() { const d = Math.sqrt(this.lengthSq()) || 1; this.x /= d; this.y /= d; this.z /= d; return this }
  lerp(v, a) { this.x += (v.x - this.x) * a; this.y += (v.y - this.y) * a; this.z += (v.z - this.z) * a; return this }
  multiplyScalar(s) { this.x *= s; this.y *= s; this.z *= s; return this }
}
const fragment = source.match(/function tuple\([\s\S]*?\nfunction stepLifeMapFlight\(/)
assert.ok(fragment, 'camera goal implementation not found')
const body = fragment[0].replace(/\nfunction stepLifeMapFlight\($/, '')
const compiled = ts.transpileModule(`
const OVERVIEW_POSITION = [0, 1.55, 13.4]
const SELECTED_MEMORY_STANDOFF = 5.8
${body}
export { goalForNode }
`, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const exports = {}
new Function('exports', 'THREE', compiled)(exports, { Vector3 })
const { goalForNode } = exports
const selected = { position: [4, 1, -7], id: 'memory-star' }
const travelOrigin = new Vector3(9, 3, 18)

test('departure begins at actual explored position and not fixed overview', () => {
  const departure = goalForNode(selected, 'departure', false, travelOrigin)
  assert.deepEqual(departure.position, [9, 3, 18])
  assert.deepEqual([travelOrigin.x, travelOrigin.y, travelOrigin.z], [9, 3, 18])
  assert.notDeepEqual(departure.position, goalForNode(selected, 'departure', false).position)
})

test('travel trajectory is anchored to explored position', () => {
  const fromExploration = goalForNode(selected, 'travel', false, travelOrigin)
  const fromOverview = goalForNode(selected, 'travel', false)
  assert.notDeepEqual(fromExploration.position, fromOverview.position)
  assert.deepEqual(fromExploration.target, fromOverview.target)
})

test('flight offset is not double-added after star selection', () => {
  assert.match(source, /const flightWeight = phase === "overview" \? 1 : 0/)
  assert.match(source, /departureOrigin\.current = camera\.position\.clone\(\)/)
  assert.match(source, /departureNodeId\.current !== selected\.id/)
  assert.match(source, /goalForNode\(selected, phase, portrait, departureOrigin\.current \?\? undefined\)/)
})

test('existing exploration, reduced motion and focus route remain wired', () => {
  assert.match(source, /stepLifeMapFlight\(/)
  assert.match(source, /if \(reducedMotion\)/)
  assert.match(source, /destinationHref\("focus"\)/)
  assert.match(source, /destinationHref\("replay"\)/)
})

test('departure origin is captured before resolving the first rendered camera goal', () => {
  const frame = source.indexOf('useFrame(({ pointer }, delta) => {')
  const capture = source.indexOf('departureOrigin.current = camera.position.clone()', frame)
  const resolve = source.indexOf('const portrait = resolve();', frame)
  assert.ok(frame >= 0 && capture > frame && resolve > capture)
  assert.match(source.slice(frame, resolve), /phase === "departure" && selected && departureNodeId.current !== selected.id/)
})
