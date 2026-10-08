import assert from 'node:assert/strict'
import { test } from 'node:test'
import fs from 'node:fs'
import * as THREE from 'three'
import { classifyRetainedHomeMesh } from '../src/spatial/layout/HomeSanctuaryAssetPolicy.ts'
import { stepEmbodiedMotion } from '../src/spatial/navigation/EmbodiedNavigation.tsx'
import {
  HOME_NAVIGATION_OBSTACLES, HOME_POND, HOME_POND_WATER_LEVEL,
  homeCourtyardFloorHeight, homeCourtyardPoint, homeTerrainHeight, homeWalkSurfaceHeight,
  makeHomeHorizonGeometry, makeHomePatchGeometry, makeHomeRibbonGeometry, makeHomeTerrainGeometry,
  projectHomeTerrainGeometry, resolveHomeSolidPenetration,
} from '../src/spatial/layout/HomeSanctuaryGeometry.ts'

const close = (actual, expected, tolerance = .00001) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} differs from ${expected}`)

test('the retained governed Home GLB admits terrain and excludes legacy growth and unnamed descendant props', () => {
  const bytes = fs.readFileSync(new URL('../public/assets/urai/generated/models/home-entry-chamber-v1.glb', import.meta.url))
  const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString())
  const objects = gltf.nodes.map((node) => Object.assign(new THREE.Object3D(), { name: node.name ?? '' }))
  gltf.nodes.forEach((node, index) => node.children?.forEach((child) => objects[index].add(objects[child])))
  const find = (name) => objects[gltf.nodes.findIndex((node) => node.name === name)]
  assert.equal(classifyRetainedHomeMesh(find('sanctuary-inner-earth')), 'ground', 'the flat cyan inner earth must share the terrain elevation and material')
  assert.equal(classifyRetainedHomeMesh(find('sanctuary-terrain')), 'ground')
  assert.equal(classifyRetainedHomeMesh(find('sanctuary-foreground-landing')), 'ground')
  const growth = gltf.nodes.flatMap((node, index) => /^sanctuary-growth-\d+$/.test(node.name ?? '') ? [objects[index]] : [])
  assert.equal(growth.length, 18, 'the governed fixture must still contain its original growth geometry')
  growth.forEach((object) => assert.equal(classifyRetainedHomeMesh(object), 'excluded'))
  for (const parent of ['sanctuary-heart-light', 'embodied-presence-face-light', 'embodied-presence-heart']) {
    const node = find(parent)
    assert.ok(node.children.length > 0, `${parent} must exercise the unnamed GLTFLoader child boundary`)
    node.children.forEach((child) => assert.equal(classifyRetainedHomeMesh(child), 'excluded', `${parent} leaked a generic child mesh`))
  }
  const fern = new THREE.Object3D(); fern.name = 'home-scanned-fern-1'
  assert.equal(classifyRetainedHomeMesh(fern), 'retained', 'the real fern authority must remain admitted')
})

test('retained ground is projected in world meters without mutating the loaded source', () => {
  const source = new THREE.PlaneGeometry(6, 5, 6, 5)
  source.rotateX(-Math.PI / 2)
  const original = Array.from(source.attributes.position.array)
  const world = new THREE.Matrix4().compose(new THREE.Vector3(0, .02, -1.15), new THREE.Quaternion(), new THREE.Vector3(.94, .94, .94))
  const projected = projectHomeTerrainGeometry(source, world)
  assert.deepEqual(Array.from(source.attributes.position.array), original)
  const point = new THREE.Vector3()
  for (let index = 0; index < projected.attributes.position.count; index += 1) {
    point.fromBufferAttribute(projected.attributes.position, index).applyMatrix4(world)
    close(point.y, homeTerrainHeight(point.x, point.z) + .003)
    assert.ok(projected.attributes.normal.getY(index) > .9)
  }
  assert.equal(projected.attributes.color.count, projected.attributes.position.count)
  projected.dispose(); source.dispose()
})

test('terrain extension removes its duplicate interior and retains the outside walkable ground', () => {
  const bounds = { minX: -9.4, maxX: 9.4, minZ: -10.55, maxZ: 8.25 }
  const whole = makeHomeTerrainGeometry()
  const extension = makeHomeTerrainGeometry(bounds)
  assert.ok(extension.index.count < whole.index.count)
  const p = extension.attributes.position
  let exterior = 0
  for (let triangle = 0; triangle < extension.index.count; triangle += 3) {
    const vertices = [0, 1, 2].map((offset) => extension.index.getX(triangle + offset))
    assert.equal(vertices.every((index) => p.getX(index) > -9.1 && p.getX(index) < 9.1 && p.getZ(index) > -10.25 && p.getZ(index) < 7.95), false)
    if (vertices.every((index) => Math.abs(p.getX(index)) > 15)) exterior += 1
  }
  assert.ok(exterior > 1000)
  extension.dispose(); whole.dispose()
})

test('path edges and interior rows follow the hillside rather than their center elevation', () => {
  const points = Array.from({ length: 30 }, (_, i) => [4 + Math.sin(i / 29 * Math.PI) * 1.2, 8 - i / 29 * 17])
  const geometry = makeHomeRibbonGeometry(points, 2)
  const p = geometry.attributes.position
  for (let index = 0; index < p.count; index += 1) close(p.getY(index) - homeTerrainHeight(p.getX(index), p.getZ(index)), .022)
  assert.ok(Math.abs(p.getY(0) - p.getY(4)) > .01, 'hill-side edges must have different elevations')
  for (let index = 0; index < p.count; index += 1) assert.ok(geometry.attributes.normal.getY(index) > .85, 'walking surface must face upward')
  geometry.dispose()
})

test('irregular clearing is tessellated and grounded throughout its interior', () => {
  const geometry = makeHomePatchGeometry(0, -4.25, 2.7, 1.85, 41)
  const p = geometry.attributes.position
  assert.ok(p.count > 200)
  for (let index = 0; index < p.count; index += 1) {
    close(p.getY(index), homeTerrainHeight(p.getX(index), p.getZ(index)) + .025)
    assert.ok(geometry.attributes.normal.getY(index) > .85)
  }
  geometry.dispose()
})

test('pond water stays level over a depressed bed and leaves the Life Map lookout dry', () => {
  const geometry = makeHomePatchGeometry(HOME_POND.x, HOME_POND.z, HOME_POND.radiusX * .9, HOME_POND.radiusZ * .9, 91, HOME_POND_WATER_LEVEL, 48, 1)
  for (const height of Array.from(geometry.attributes.position.array).filter((_, index) => index % 3 === 1)) close(height, HOME_POND_WATER_LEVEL)
  assert.ok(homeTerrainHeight(HOME_POND.x, HOME_POND.z) < HOME_POND_WATER_LEVEL - .2)
  assert.ok(Math.hypot((5.4 - HOME_POND.x) / HOME_POND.radiusX, (-10.8 - HOME_POND.z) / HOME_POND.radiusZ) > 1.3)
  assert.ok(HOME_NAVIGATION_OBSTACLES.every((obstacle) => Math.hypot(5.4 - obstacle.x, -10.8 - obstacle.z) > obstacle.radius))
  geometry.dispose()
})

test('graded courtyard footing sinks into every corner and its walking floor follows the actual platform', () => {
  for (const side of [-1, 1]) {
    const floor = homeCourtyardFloorHeight(side)
    for (const x of [-1.25, 1.25]) for (const z of [-2.08, 2.18]) {
      const point = homeCourtyardPoint(side, x, z)
      const ground = homeTerrainHeight(point.x, point.z)
      assert.ok(floor - ground < .12, 'entry must be a low step')
      assert.ok(floor - .25 < ground, 'footing must intersect the terrain')
    }
    const point = homeCourtyardPoint(side, -.55 * side, .7)
    close(homeWalkSurfaceHeight(point.x, point.z), floor)
  }
  close(homeWalkSurfaceHeight(-.85, 8.4), homeTerrainHeight(-.85, 8.4))
})

test('horizon landforms have physical depth and light-responsive slope normals', () => {
  const geometry = makeHomeHorizonGeometry(88, 2.45, .6)
  geometry.computeBoundingBox()
  assert.ok(geometry.boundingBox.max.z - geometry.boundingBox.min.z > 15, 'horizon must have depth rather than be a silhouette card')
  assert.ok(geometry.boundingBox.max.y - geometry.boundingBox.min.y > 3)
  let slopes = 0
  for (let index = 0; index < geometry.attributes.normal.count; index += 1) {
    const y = geometry.attributes.normal.getY(index)
    assert.ok(y > .7)
    if (y < .99) slopes += 1
  }
  assert.ok(slopes > 100, 'material must receive a range of real slope normals')
  geometry.dispose()
})

test('solid correction preserves outside points and recovers an exact-center restore', () => {
  const outside = new THREE.Vector3(-.85, 0, 8.4)
  const unchanged = outside.clone()
  resolveHomeSolidPenetration(outside)
  assert.deepEqual(outside, unchanged)
  for (const obstacle of HOME_NAVIGATION_OBSTACLES) {
    const position = new THREE.Vector3(obstacle.x, 0, obstacle.z)
    resolveHomeSolidPenetration(position)
    assert.ok(HOME_NAVIGATION_OBSTACLES.every((other) => Math.hypot(position.x - other.x, position.z - other.z) >= other.radius - .00002), `restore remained inside ${JSON.stringify(obstacle)}`)
  }
})

test('actual shared movement deflects around a bench, allows backoff, and keeps the central Orb approach open', () => {
  const position = new THREE.Vector3(4.45, 0, -.5)
  const velocity = new THREE.Vector3()
  const input = { keys: { current: new Set(['KeyW']) }, virtualX: { current: 0 }, virtualZ: { current: 0 } }
  const target = { current: null }
  const step = () => {
    stepEmbodiedMotion({ delta: .1, input, yaw: 0, position, velocity, target, bounds: { minX: -14, maxX: 14, minZ: -18, maxZ: 12 }, obstacles: HOME_NAVIGATION_OBSTACLES, speed: 3.15, acceleration: 9, deceleration: 12 })
    resolveHomeSolidPenetration(position)
    assert.ok(HOME_NAVIGATION_OBSTACLES.every((obstacle) => Math.hypot(position.x - obstacle.x, position.z - obstacle.z) >= obstacle.radius - .00002), 'movement must never enter a solid footprint')
  }
  for (let index = 0; index < 13; index += 1) step()
  assert.ok(position.x > 4.7, 'walking must deflect around the bench rather than continue through its center')
  const stoppedZ = position.z
  input.keys.current = new Set(['KeyS'])
  for (let index = 0; index < 10; index += 1) step()
  assert.ok(position.z > stoppedZ + 1, 'user must be able to back away from the collision')
  position.set(0, 0, 8.4); velocity.set(0, 0, 0); input.keys.current = new Set(['KeyW'])
  for (let index = 0; index < 40; index += 1) step()
  assert.ok(position.z < -3, 'the central Orb approach must remain reachable')
})

test('click-target movement still reaches Orb, Ground and Life Map through the solid-aware world', () => {
  for (const [x, z] of [[0, -4.25], [-5.4, -10.8], [5.4, -10.8]]) {
    const position = new THREE.Vector3(-.85, 0, 8.4)
    const velocity = new THREE.Vector3()
    const target = { current: new THREE.Vector3(x, 0, z) }
    const input = { keys: { current: new Set() }, virtualX: { current: 0 }, virtualZ: { current: 0 } }
    for (let frame = 0; frame < 300; frame += 1) {
      stepEmbodiedMotion({ delta: .05, input, yaw: 0, position, velocity, target, bounds: { minX: -14, maxX: 14, minZ: -18, maxZ: 12 }, obstacles: HOME_NAVIGATION_OBSTACLES, speed: 3.15, acceleration: 9, deceleration: 12 })
      resolveHomeSolidPenetration(position)
      assert.ok(HOME_NAVIGATION_OBSTACLES.every((obstacle) => Math.hypot(position.x - obstacle.x, position.z - obstacle.z) >= obstacle.radius - .00002))
    }
    assert.equal(target.current, null, 'target must settle without remaining stuck against a solid')
    assert.ok(Math.hypot(position.x - x, position.z - z) < .15, 'world destination must remain physically reachable')
  }
})
