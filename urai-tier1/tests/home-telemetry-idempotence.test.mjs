import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'
import * as THREE from 'three'
import { stepEmbodiedMotion } from '../src/spatial/navigation/EmbodiedNavigation.tsx'

const read = path => fs.readFileSync(new URL('../src/' + path, import.meta.url), 'utf8')
const landmarks = { HOME_SPAWN: { x: -.85, z: 8.4 }, HOME_ORB: { x: 1.8, z: -9.5 }, HOME_GROUND: { x: -5.4, z: -10.8 }, HOME_LIFE_MAP: { x: 5.4, z: -10.8 } }
function trackedDataset(initial) {
  const writes = []
  const dataset = new Proxy({ ...initial }, { set(target, key, value) { writes.push([key, value]); target[key] = value; return true } })
  return { dataset, writes }
}
function withHome(run) {
  const owner = trackedDataset({ homeAssetsReady: 'true' })
  const previousDocument = globalThis.document
  globalThis.document = { querySelector: () => owner }
  const position = new THREE.Vector3(-.85, 0, 8.4)
  const tick = () => stepEmbodiedMotion({ position, velocity: new THREE.Vector3(), input: { keys: { current: new Set() }, virtualX: { current: 0 }, virtualZ: { current: 0 } }, target: { current: null }, yaw: 0, delta: 0, speed: 3.15, acceleration: 9, deceleration: 12, bounds: { minX: -14, maxX: 14, minZ: -18, maxZ: 12 } })
  try { run(owner, tick, position) } finally { globalThis.document = previousDocument }
}
function declaration(source, name) {
  const ast = ts.createSourceFile('owner.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  let found
  function visit(node) {
    if ((ts.isFunctionDeclaration(node) || ts.isVariableDeclaration(node)) && node.name?.getText(ast) === name) found = node
    ts.forEachChild(node, visit)
  }
  visit(ast)
  assert.ok(found, 'missing actual source declaration ' + name)
  const code = ts.isVariableDeclaration(found) ? 'const ' + found.getText(ast) : found.getText(ast)
  return ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
}

test('stationary Home publishes only its advancing frame counter after readiness settles', () => {
  withHome((owner, tick, position) => {
    tick(); tick(); tick()
    owner.writes.length = 0
    tick()
    assert.deepEqual(owner.writes, [['homeRenderedFrames', '4']])
    assert.deepEqual(position.toArray(), [-.85, 0, 8.4])
    assert.equal(owner.dataset.homePlayerX, '-0.8500')
    assert.equal(owner.dataset.homePlayerZ, '8.4000')
    assert.equal(owner.dataset.homeDistance, '0.000')
  })
})

test('Home readiness retains three actual frames and responds to late assets and withdrawal', () => {
  withHome((owner, tick) => {
    owner.dataset.homeAssetsReady = 'false'
    tick(); assert.equal(owner.dataset.homeReady, 'false')
    tick(); assert.equal(owner.dataset.homeReady, 'false')
    tick(); assert.equal(owner.dataset.homeReady, 'false')
    owner.dataset.homeAssetsReady = 'true'
    owner.writes.length = 0
    tick(); assert.equal(owner.dataset.homeReady, 'true')
    assert.deepEqual(owner.writes.filter(([key]) => key === 'homeReady'), [['homeReady', 'true']])
    owner.dataset.homeAssetsReady = 'false'
    tick(); assert.equal(owner.dataset.homeReady, 'false')
    assert.equal(owner.dataset.homeInteractionReady, 'false')
  })
})

test('canonical distance synchronization is idempotent while preserving three-decimal distances', () => {
  const world = trackedDataset({ homePlayerX: '-0.8500', homePlayerZ: '8.4000' })
  const context = vm.createContext({ world, ...landmarks })
  vm.runInContext(declaration(read('app/AssetDrivenHomeWorld.tsx'), 'synchronizeCanonicalHomeTelemetry'), context)
  vm.runInContext('synchronizeCanonicalHomeTelemetry(world)', context)
  assert.equal(world.dataset.homeDistance, '0.000')
  assert.equal(world.dataset.homeDistanceOrb, Math.hypot(-.85 - 1.8, 8.4 + 9.5).toFixed(3))
  world.writes.length = 0
  vm.runInContext('synchronizeCanonicalHomeTelemetry(world)', context)
  assert.deepEqual(world.writes, [])
})

test('asset-owner hardening does not rewrite unchanged canvas attributes or world readiness', () => {
  const world = trackedDataset({ homePlayerX: '-0.8500', homePlayerZ: '8.4000', homeAssetsReady: 'true', homeInputReady: 'true', homeRenderedFrames: '3' })
  const dataKey = key => key.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
  world.getAttribute = key => world.dataset[dataKey(key)] ?? null
  world.setAttribute = (key, value) => { world.dataset[dataKey(key)] = value }
  const attributes = new Map(), canvasWrites = []
  const canvas = { getAttribute: key => attributes.get(key) ?? null, setAttribute(key, value) { canvasWrites.push([key, value]); attributes.set(key, value) } }
  const context = vm.createContext({ owner: { querySelectorAll: () => [canvas], querySelector: () => world }, window: { location: { search: '' } }, URLSearchParams, lastReportedAssetsReady: { current: null }, onAssetsReadyChange() {}, appliedReviewOrbState: null, publishOrbState() {}, REVIEW_ORB_STATES: new Set(), ...landmarks })
  const source = read('app/AssetDrivenHomeWorld.tsx')
  vm.runInContext(declaration(source, 'synchronizeCanonicalHomeTelemetry') + declaration(source, 'hardenHomeOwnership'), context)
  vm.runInContext('hardenHomeOwnership()', context)
  assert.equal(world.dataset.homeReady, 'true')
  assert.equal(world.dataset.homeInteractionReady, 'true')
  assert.deepEqual(canvasWrites, [['aria-hidden', 'true'], ['role', 'presentation'], ['tabindex', '-1']])
  canvasWrites.length = 0; world.writes.length = 0
  vm.runInContext('hardenHomeOwnership()', context)
  assert.deepEqual(canvasWrites, [])
  assert.deepEqual(world.writes, [])
  world.dataset.homeInputReady = 'false'
  vm.runInContext('hardenHomeOwnership()', context)
  assert.equal(world.dataset.homeReady, 'false')
  assert.equal(world.dataset.homeInteractionReady, 'false')
})

test('runtime parallax preserves its values and leaves unchanged styles alone', () => {
  const properties = new Map(), writes = []
  const home = { dataset: { homePlayerX: '-0.8500', homePlayerZ: '8.4000', homeDistance: '0.000' }, style: { getPropertyValue: key => properties.get(key) ?? '', setProperty(key, value) { writes.push([key, value]); properties.set(key, value) } } }
  const context = vm.createContext({ home })
  vm.runInContext(declaration(read('app/HomeSpatialRuntimeLayer.tsx'), 'synchronizeHome'), context)
  vm.runInContext('synchronizeHome(home)', context)
  assert.equal(properties.get('--home-parallax-x'), '2.7px')
  assert.equal(properties.get('--home-parallax-y'), '0.0px')
  writes.length = 0
  vm.runInContext('synchronizeHome(home)', context)
  assert.deepEqual(writes, [])
  home.dataset.homePlayerZ = '7.4000'
  vm.runInContext('synchronizeHome(home)', context)
  assert.equal(properties.get('--home-parallax-y'), '-1.4px')
})

test('rounding boundaries retain settled four-decimal Home coordinates and canonical distances', () => {
  for (const [x, z] of [[1.80149, -9.5], [-.84851, 8.4], [-.85049, 8.40049], [-5.4, -10.79851], [5.40149, -10.8], [-.00001, 0]]) {
    withHome((owner, tick, position) => {
      position.set(x, 0, z)
      tick()
      assert.deepEqual(position.toArray(), [x, 0, z], 'telemetry must not quantize physics vectors')
      assert.equal(owner.dataset.homePlayerX, x.toFixed(4))
      assert.equal(owner.dataset.homePlayerZ, z.toFixed(4))
      const canonicalX = Number(x.toFixed(4)), canonicalZ = Number(z.toFixed(4))
      for (const [key, landmark] of [['homeDistance', landmarks.HOME_SPAWN], ['homeDistanceOrb', landmarks.HOME_ORB], ['homeDistanceGround', landmarks.HOME_GROUND], ['homeDistanceLifeMap', landmarks.HOME_LIFE_MAP]]) {
        assert.equal(owner.dataset[key], Math.hypot(canonicalX - landmark.x, canonicalZ - landmark.z).toFixed(3), key)
      }
      if (x === 1.80149 && z === -9.5) {
        assert.equal(Math.hypot(x - 1.8, z + 9.5).toFixed(3), '0.001')
        assert.equal(owner.dataset.homeDistanceOrb, '0.002', 'preserve the existing settled Home result at the rounding boundary')
      }
      const context = vm.createContext({ world: owner, ...landmarks })
      vm.runInContext(declaration(read('app/AssetDrivenHomeWorld.tsx'), 'synchronizeCanonicalHomeTelemetry'), context)
      owner.writes.length = 0
      vm.runInContext('synchronizeCanonicalHomeTelemetry(world)', context)
      assert.deepEqual(owner.writes, [], 'the asset owner must agree with the shared kernel')
      tick(); tick(); owner.writes.length = 0
      tick()
      assert.deepEqual(owner.writes, [['homeRenderedFrames', '4']])
    })
  }
})

test('other realms without the Home owner retain full-precision movement and no Home telemetry', () => {
  const previousDocument = globalThis.document
  const otherRealm = trackedDataset({ groundPlayerX: 'kept', groundPlayerZ: 'kept' })
  const evolve = () => {
    const position = new THREE.Vector3(.123456789, 0, .987654321), velocity = new THREE.Vector3()
    const result = stepEmbodiedMotion({ position, velocity, input: { keys: { current: new Set(['KeyW']) }, virtualX: { current: 0 }, virtualZ: { current: 0 } }, target: { current: null }, yaw: .17, delta: .1, speed: 3.15, acceleration: 9, deceleration: 12, bounds: { minX: -14, maxX: 14, minZ: -18, maxZ: 12 } })
    return { position: position.toArray(), velocity: velocity.toArray(), result }
  }
  try {
    globalThis.document = undefined
    const expected = evolve()
    globalThis.document = { querySelector(selector) { assert.equal(selector, '.urai-asset-home-world[data-home-primary-owner="asset-driven"]'); return null } }
    assert.deepEqual(evolve(), expected)
    assert.notEqual(expected.position[0], Number(expected.position[0].toFixed(4)))
    assert.deepEqual(otherRealm.writes, [])
    assert.deepEqual(otherRealm.dataset, { groundPlayerX: 'kept', groundPlayerZ: 'kept' })
  } finally { globalThis.document = previousDocument }
})

test('the native compact runner executes this behavioral suite without removing existing suites', () => {
  const runner = fs.readFileSync(new URL('../scripts/run-unit-contract-tests-compact.mjs', import.meta.url), 'utf8')
  assert.ok(runner.includes("'tests/home-telemetry-idempotence.test.mjs'"))
  assert.ok(runner.includes("'tests/home-sanctuary-geometry-behavior.test.mjs'"))
  assert.ok(runner.includes("'tests/home-ascent-camera-clock.test.mjs'"))
})
