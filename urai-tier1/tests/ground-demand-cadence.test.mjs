import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'
import * as THREE from 'three'
import * as canon from '../src/spatial/ground/groundCanon.ts'
import { createPostRenderCadence } from '../src/spatial/performance/postRenderCadence.ts'

// Exercise production player and motion callbacks with a simulated renderer.
// Browser captures remain a separate gate.
function fixture(reducedMotion = false) {
  const ground = fs.readFileSync(new URL('../src/app/GroundSpatialWorldClean.tsx', import.meta.url), 'utf8')
  const nav = fs.readFileSync(new URL('../src/spatial/navigation/EmbodiedNavigation.tsx', import.meta.url), 'utf8')
  const player = ground.slice(ground.indexOf('function FirstPersonPlayer('), ground.indexOf('function AtmosphericGroundSky('))
  const kernel = nav.slice(nav.indexOf('export function stepEmbodiedMotion('), nav.indexOf('export function MovementHelp(')).replace('export function', 'function')
  const timers = new Map(), effects = [], cleanups = []
  let frame, after, timerId = 0, draws = 0
  const camera = new THREE.PerspectiveCamera(58, 1, .08, 800)
  camera.position.set(0, canon.GROUND_EYE_HEIGHT_M, 6)
  const input = { keys: { current: new Set() }, virtualX: { current: 0 }, virtualZ: { current: 0 }, revision: 0 }
  const props = { input, yaw: { current: 0 }, pitch: { current: 0 }, target: { current: null }, profile: { id: 'temperate' }, obstacles: [], playerPosition: { current: new THREE.Vector3(0, 0, 6) }, isCoarse: false, onReady() {}, dragging: false, documentVisible: true, constrained: true, activityRevision: 0 }
  const context = {
    THREE, ...canon, props, createPostRenderCadence,
    BOUNDS: { minX: -100, maxX: 100, minZ: -100, maxZ: 100 }, groundHeight: () => 0,
    MOTION_REQUESTED: new THREE.Vector3(), MOTION_FORWARD: new THREE.Vector3(), MOTION_RIGHT: new THREE.Vector3(), MOTION_NEXT: new THREE.Vector3(),
    useThree: () => ({ camera, size: { width: 390, height: 844 }, invalidate: () => draws++ }),
    useReducedMotion: () => reducedMotion, useRef: (current) => ({ current }),
    useEffect: (effect) => effects.push(effect), useFrame: (callback) => { frame = callback },
    addAfterEffect: (callback) => { after = callback; return () => { after = null } },
    window: { setTimeout: (callback) => { timers.set(++timerId, callback); return timerId }, clearTimeout: (id) => timers.delete(id) },
  }
  const script = ts.transpileModule(`${kernel}\n${player}\nFirstPersonPlayer(props)`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  vm.runInNewContext(script, context)
  for (const effect of effects) { const cleanup = effect(); if (cleanup) cleanups.push(cleanup) }
  return {
    props, camera, timers,
    draw(delta = .1) { frame({}, delta); after?.() },
    tick() { for (const [id, callback] of [...timers]) { timers.delete(id); callback() } },
    dispose() { for (const cleanup of cleanups) cleanup() },
    get draws() { return draws },
  }
}

for (const reducedMotion of [false, true]) {
  test(`Ground sleeps, moves on held input, brakes and sleeps again (reduced=${reducedMotion})`, () => {
    const f = fixture(reducedMotion)
    f.draw()
    assert.equal(f.timers.size, 0)
    assert.equal(f.camera.fov, 66)
    f.props.input.keys.current.add('KeyW')
    for (let i = 0; i < 10; i++) { f.draw(); f.tick() }
    assert.ok(f.props.playerPosition.current.z < 4.5)
    f.props.input.keys.current.clear()
    for (let i = 0; i < 30; i++) { f.draw(); f.tick() }
    f.draw()
    assert.equal(f.timers.size, 0)
    assert.ok(f.camera.position.distanceTo(new THREE.Vector3(0, canon.GROUND_EYE_HEIGHT_M, f.props.playerPosition.current.z)) < .001)
    f.dispose()
  })
}

test('Ground click-to-walk reaches arrival and exit cancels pending work', () => {
  const f = fixture()
  f.props.target.current = new THREE.Vector3(0, 0, 4)
  f.draw()
  assert.equal(f.timers.size, 1)
  for (let i = 0; i < 50; i++) { f.tick(); f.draw() }
  assert.equal(f.props.target.current, null)
  assert.equal(f.timers.size, 0)
  f.props.input.virtualX.current = 1
  f.draw()
  const queued = [...f.timers.values()][0]
  assert.equal(f.timers.size, 1)
  f.dispose()
  const count = f.draws
  queued()
  assert.equal(f.timers.size, 0)
  assert.equal(f.draws, count)
})
