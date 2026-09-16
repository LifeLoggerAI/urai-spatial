import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'
import * as THREE from 'three'

const source = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionV225PolishV3.tsx', import.meta.url), 'utf8')
const orbBaseScale = Number(source.match(/const ORB_BASE_SCALE = ([\d.]+)/)?.[1])
assert.ok(Number.isFinite(orbBaseScale))
const thresholdSource = source.slice(source.indexOf('function grownThresholdGeometry('), source.indexOf('function hearthStoneGeometry('))
const makeThreshold = new Function('THREE', `${ts.transpile(thresholdSource)}; return grownThresholdGeometry;`)(THREE)

test('Ground threshold has structural depth while its entrance remains open', () => {
  const geometry = makeThreshold()
  geometry.computeBoundingBox()
  const size = geometry.boundingBox.getSize(new THREE.Vector3())
  assert.ok(size.z >= 1.9 && size.x > 4)
  assert.ok(geometry.getAttribute('position').count / 3 < 40000)
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }))
  mesh.updateMatrixWorld(true)
  const ray = new THREE.Raycaster(new THREE.Vector3(0, 1, 4), new THREE.Vector3(0, 0, -1))
  assert.equal(ray.intersectObject(mesh).length, 0, 'the entrance cannot be a sealed facade')
  ray.set(new THREE.Vector3(1.55, 1, 4), new THREE.Vector3(0, 0, -1))
  assert.ok(ray.intersectObject(mesh).length > 0, 'the entrance needs a solid supporting shoulder')
  geometry.dispose(); mesh.material.dispose()
})

const frameStart = source.indexOf('  useFrame(({ clock }, delta)', source.indexOf('function LivingMemoryPresence('))
const frameEnd = source.indexOf('  useFrame(({ clock })', frameStart)
assert.ok(frameStart >= 0 && frameEnd > frameStart)
const frameSource = source.slice(frameStart, frameEnd)
function simulate(fps, reducedMotion = false) {
  const root = { current: new THREE.Group() }
  const pose = { s: [1.1, .9, 1], r: [.2, -.3, .1], speed: 1 }
  let update
  new Function('THREE', 'root', 'pose', 'reducedMotion', 'useFrame', 'ORB_BASE_SCALE', frameSource)(THREE, root, pose, reducedMotion, fn => { update = fn }, orbBaseScale)
  const clock = { elapsedTime: 0 }
  update({ clock }, 1 / fps)
  const first = root.current.scale.x
  for (let i = 1; i < fps; i++) update({ clock }, 1 / fps)
  return { first, scale: root.current.scale.x, rotation: root.current.rotation.y, target: 1.1 * orbBaseScale }
}
test('Orb pose transitions ease consistently across frame rates', () => {
  const a = simulate(30), b = simulate(60)
  assert.ok(a.first > 1 && a.first < a.target)
  assert.ok(Math.abs(a.scale - b.scale) < 1e-12)
  assert.ok(Math.abs(a.rotation - b.rotation) < 1e-12)
  assert.ok(Math.abs(a.scale - a.target) < .003)
})
test('Reduced motion reaches the Orb state without a pose tween', () => {
  const result = simulate(60, true)
  assert.equal(result.first, result.target)
  assert.equal(result.rotation, -.3)
})
