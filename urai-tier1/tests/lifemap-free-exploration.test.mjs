import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const ts = require('typescript')
const source = readFileSync(new URL('../src/components/lifemap/ComposedLifeMapScene.tsx', import.meta.url), 'utf8')
const found = source.match(/type LifeMapFlightVector =[\s\S]*?\nfunction stepLifeMapFlight\([\s\S]*?\n\}\n/)
assert.ok(found, 'Production Life Map flight model not found')
const compiled = ts.transpileModule(found[0] + '\nexport { stepLifeMapFlight };', {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
const module = { exports: {} }
new Function('module', 'exports', compiled)(module, module.exports)
const step = module.exports.stepLifeMapFlight
const zero = () => ({ x: 0, y: 0, z: 0 })
const run = (keys, dt = 0.04, reduced = true) => step(zero(), zero(), new Set(keys), dt, reduced)

test('WASD and Q/E move independently in bounded 3D space', () => {
  assert.ok(run(['KeyW']).offset.z < 0)
  assert.ok(run(['KeyS']).offset.z > 0)
  assert.ok(run(['KeyA']).offset.x < 0)
  assert.ok(run(['KeyD']).offset.x > 0)
  assert.ok(run(['KeyQ']).offset.y < 0)
  assert.ok(run(['KeyE']).offset.y > 0)
})
test('diagonals normalize speed and opposite keys cancel', () => {
  assert.equal(run(['KeyW', 'KeyS']).offset.z, 0)
  assert.ok(Math.abs(Math.hypot(run(['KeyW', 'KeyD']).offset.x, run(['KeyW', 'KeyD']).offset.z)
    - Math.abs(run(['KeyW']).offset.z)) < 1e-8)
})
test('shift increases requested speed while preserving no-input idle', () => {
  assert.ok(Math.abs(run(['ShiftLeft','KeyW']).offset.z) > Math.abs(run(['KeyW']).offset.z))
  assert.equal(run(['ShiftRight']).offset.z, 0)
})
test('camera travel clamps delta and spatial boundaries', () => {
  assert.ok(Math.abs(run(['KeyW'], 100).offset.z) <= 0.45)
  let o=zero(), v=zero()
  for(let i=0;i<5000;i++) { const n=step(o,v,new Set(['KeyD','KeyW','KeyE']),0.04,false);o=n.offset;v=n.velocity }
  assert.ok(Math.abs(o.x)<=28 && Math.abs(o.y)<=11 && Math.abs(o.z)<=28)
})
test('reduced motion stops immediately, normal motion settles smoothly', () => {
  let a=run(['KeyW']);const before=a.offset.z
  a=step(a.offset,a.velocity,new Set(),0.04,true)
  assert.equal(a.offset.z,before)
  assert.equal(a.velocity.z,0)
  let o=zero(),v=zero()
  for(let i=0;i<30;i++){const n=step(o,v,new Set(['KeyD']),0.016,false);o=n.offset;v=n.velocity}
  const start=o.x
  for(let i=0;i<150;i++){const n=step(o,v,new Set(),0.016,false);o=n.offset;v=n.velocity}
  assert.ok(o.x>start && o.x-start<1 && Math.abs(v.x)<1e-8)
})
test('flight key listeners are released, text inputs and modal dialogs guarded', () => {
  assert.match(source, /window\.addEventListener\('keydown', keyDown\)/)
  assert.match(source, /window\.removeEventListener\('keydown', keyDown\)/)
  assert.match(source, /window\.addEventListener\('blur', release\)/)
  assert.match(source, /target\.isContentEditable/)
  assert.match(source, /\[role="dialog"\]/)
  assert.match(source, /flightWeight = phase === "overview" \? 1 : 0/)
})
