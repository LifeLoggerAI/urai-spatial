import assert from 'node:assert/strict'
import { test } from 'node:test'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import * as THREE from 'three'
import { classifyRetainedHomeMesh } from '../src/spatial/layout/HomeSanctuaryAssetPolicy.ts'
import { stepEmbodiedMotion } from '../src/spatial/navigation/EmbodiedNavigation.tsx'
import {
  HOME_NAVIGATION_OBSTACLES, HOME_POND, HOME_POND_WATER_LEVEL,
  homeCourtyardFloorHeight, homeCourtyardPoint, homeTerrainHeight, homeWalkSurfaceHeight,
  makeHomeHorizonGeometry, makeHomePatchGeometry, makeHomeRibbonGeometry, makeHomeTerrainGeometry,
  projectHomeTerrainGeometry, resolveHomeSolidPenetration,
} from '../src/spatial/layout/HomeSanctuaryGeometry.ts'

const homeSource = fs.readFileSync(new URL('../src/spatial/layout/HomeWorldProductionPolished.tsx', import.meta.url), 'utf8')
const sourceVector = (name) => {
  const args = homeSource.match(new RegExp(`const ${name} = new THREE\\.Vector3\\(([^)]+)\\)`))?.[1]
  assert.ok(args, `missing actual Home landmark ${name}`)
  return new THREE.Vector3(...args.split(',').map(Number))
}
const actualOrb = sourceVector('ORB')

test('actual Home boulders have outward faces rather than hollow inverted shells', () => {
  const start = homeSource.indexOf('function makeAuthoredBoulderGeometry(')
  const end = homeSource.indexOf('const SANCTUARY_BOULDER_LEFT', start)
  assert.ok(start >= 0 && end > start)
  const compiled = ts.transpileModule(homeSource.slice(start, end), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  const context = vm.createContext({ THREE })
  vm.runInContext(compiled, context)
  for (const salt of [131, 173, 211]) {
    const geometry = vm.runInContext(`makeAuthoredBoulderGeometry(${salt})`, context)
    const p = geometry.getAttribute('position'), indices = geometry.index.array
    let faces = 0
    for (let i = 0; i < indices.length; i += 3) {
      const a = new THREE.Vector3().fromBufferAttribute(p, indices[i])
      const b = new THREE.Vector3().fromBufferAttribute(p, indices[i + 1])
      const c = new THREE.Vector3().fromBufferAttribute(p, indices[i + 2])
      const normal = b.clone().sub(a).cross(c.clone().sub(a))
      if (normal.lengthSq() < 1e-14) continue
      assert.ok(normal.dot(a.clone().add(b).add(c)) > 0, `rock ${salt} face ${i / 3} points inward`)
      faces += 1
    }
    assert.ok(faces > 1000)
    geometry.dispose()
  }
})

function retainedOrbGeometry() {
  // Geometry and authored animation measurement only. No texture surrogate,
  // image rendering or visual acceptance is supplied by this loader.
  const bytes = fs.readFileSync(new URL('../public/assets/urai/generated/models/urai-orb-avatar-v1.glb', import.meta.url))
  const jsonLength = bytes.readUInt32LE(12)
  const gltf = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString())
  const binaryStart = 20 + jsonLength + 8
  const accessor = (index) => {
    const entry = gltf.accessors[index]
    const view = gltf.bufferViews[entry.bufferView]
    assert.equal(entry.componentType, 5126)
    assert.equal(view.byteStride, undefined, 'a changed retained asset must be measured deliberately')
    const width = { SCALAR: 1, VEC3: 3, VEC4: 4 }[entry.type]
    assert.ok(width, `unhandled retained accessor ${entry.type}`)
    const start = binaryStart + (view.byteOffset ?? 0) + (entry.byteOffset ?? 0)
    return new Float32Array(bytes.buffer, bytes.byteOffset + start, entry.count * width).slice()
  }
  const nodes = gltf.nodes.map(node => {
    const object = new THREE.Group()
    object.name = node.name ?? ''
    if (node.translation) object.position.fromArray(node.translation)
    if (node.rotation) object.quaternion.fromArray(node.rotation)
    if (node.scale) object.scale.fromArray(node.scale)
    if (node.mesh != null) for (const primitive of gltf.meshes[node.mesh].primitives) {
      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.BufferAttribute(accessor(primitive.attributes.POSITION), 3))
      object.add(new THREE.Mesh(geometry))
    }
    return object
  })
  gltf.nodes.forEach((node, index) => node.children?.forEach(child => nodes[index].add(nodes[child])))
  const scene = new THREE.Group()
  gltf.scenes[gltf.scene ?? 0].nodes.forEach(index => scene.add(nodes[index]))
  const clips = gltf.animations.map(animation => new THREE.AnimationClip(animation.name, -1, animation.channels.map(channel => {
    const sampler = animation.samplers[channel.sampler]
    assert.equal(sampler.interpolation, 'LINEAR')
    const times = accessor(sampler.input), values = accessor(sampler.output)
    const property = { rotation: 'quaternion', translation: 'position', scale: 'scale' }[channel.target.path]
    assert.ok(property, `unhandled retained animation ${channel.target.path}`)
    const Track = property === 'quaternion' ? THREE.QuaternionKeyframeTrack : THREE.VectorKeyframeTrack
    return new Track(`${nodes[channel.target.node].uuid}.${property}`, times, values)
  })))
  return { scene, clips }
}

function maximumRetainedOrbRadius() {
  const { scene, clips } = retainedOrbGeometry()
  assert.equal(clips.length, 12)
  const coreScale = homeSource.match(/state === 'speaking' \? ([\d.]+) : state === 'listening'/)?.[1]
  const shell = homeSource.match(/<sphereGeometry args=\{\[([\d.]+),48,32\]\}/)?.[1]
  assert.ok(coreScale && shell, 'the actual retained Orb scale and physical shell must be measured')
  scene.scale.setScalar(Number(coreScale))
  const mixer = new THREE.AnimationMixer(scene)
  const point = new THREE.Vector3()
  let maximum = Number(shell)
  for (const clip of clips) {
    mixer.stopAllAction()
    mixer.clipAction(clip).reset().play()
    for (let index = 0; index <= 64; ++index) {
      mixer.setTime(clip.duration * index / 64)
      scene.updateWorldMatrix(true, true)
      scene.traverse(object => {
        if (!(object instanceof THREE.Mesh)) return
        const positions = object.geometry.attributes.position
        for (let vertex = 0; vertex < positions.count; ++vertex) {
          point.fromBufferAttribute(positions, vertex).applyMatrix4(object.matrixWorld)
          maximum = Math.max(maximum, point.length())
        }
      })
    }
  }
  mixer.stopAllAction()
  scene.traverse(object => { if (object instanceof THREE.Mesh) object.geometry.dispose() })
  return maximum
}

test('the physical retained Orb clears every actual Home walking ribbon without resizing the governed asset', (testContext) => {
  const envelope = maximumRetainedOrbRadius()
  const makePathStart = homeSource.indexOf('function makePathPoints(')
  const makePathEnd = homeSource.indexOf('\nfunction makeRibbonGeometry(', makePathStart)
  assert.ok(makePathStart > 0 && makePathEnd > makePathStart)
  const compiled = ts.transpileModule(homeSource.slice(makePathStart, makePathEnd), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  const context = { THREE, SPAWN: sourceVector('SPAWN'), GROUND_THRESHOLD: sourceVector('GROUND_THRESHOLD'), LIFE_MAP_LOOKOUT: sourceVector('LIFE_MAP_LOOKOUT'), makeRibbonGeometry: makeHomeRibbonGeometry }
  vm.createContext(context)
  vm.runInContext(compiled, context)
  const point = new THREE.Vector3(actualOrb.x, 0, actualOrb.z)
  for (const name of ['MAIN_PATH_GEOMETRY', 'GROUND_PATH_GEOMETRY', 'LIFE_MAP_PATH_GEOMETRY']) {
    const expression = homeSource.match(new RegExp(`^const ${name} = (.+)$`, 'm'))?.[1]
    assert.ok(expression, `missing actual ${name}`)
    const geometry = vm.runInContext(expression, context)
    const vertices = geometry.attributes.position
    let clearance = Infinity
    for (let triangle = 0; triangle < geometry.index.count; triangle += 3) {
      const corners = [0, 1, 2].map(offset => new THREE.Vector3().fromBufferAttribute(vertices, geometry.index.getX(triangle + offset)).setY(0))
      clearance = Math.min(clearance, new THREE.Triangle(...corners).closestPointToPoint(point, new THREE.Vector3()).distanceTo(point))
    }
    assert.ok(clearance > envelope, `${name} is blocked by the retained Orb: ${clearance}m < ${envelope}m`)
    testContext.diagnostic(JSON.stringify({ path: name, clearanceMeters: clearance, retainedOrbEnvelopeMeters: envelope }))
    geometry.dispose()
  }
})

test('the unchanged Orb fits the actual first-person arrival framing on desktop, portrait and landscape', (context) => {
  const envelope = maximumRetainedOrbRadius()
  const spawn = sourceVector('SPAWN')
  const projection = homeSource.match(/camera=\{\{[^}]+fov:([\d.]+), near:([\d.]+), far:([\d.]+)/)
  assert.ok(projection, 'the actual camera projection must be measured')
  const initialLook = homeSource.match(/const yaw = useRef\(([^)]+)\), pitch = useRef\(([^)]+)\)/)
  assert.ok(initialLook, 'the actual initial look must be measured')
  const placeStart = homeSource.indexOf('  const place = useCallback(() => {')
  const placeEnd = homeSource.indexOf('\n  }, [camera, pitch, size.height, size.width, yaw])', placeStart)
  assert.ok(placeStart > 0 && placeEnd > placeStart)
  const placeBody = homeSource.slice(placeStart + '  const place = useCallback(() => {'.length, placeEnd)
  for (const [width, height] of [[1440, 900], [390, 844], [320, 700], [844, 390]]) {
    const camera = new THREE.PerspectiveCamera(Number(projection[1]), width / height, Number(projection[2]), Number(projection[3]))
    const sandbox = { THREE, camera, homeWalkSurfaceHeight, size: { width, height }, position: { current: spawn.clone() }, yaw: { current: Number(initialLook[1]) }, pitch: { current: Number(initialLook[2]) }, forward: { current: new THREE.Vector3() }, look: { current: new THREE.Vector3() } }
    vm.runInNewContext(`(() => {${placeBody}\n})()`, sandbox)
    camera.updateMatrixWorld()
    let maximumX = 0, maximumY = 0
    for (const x of [-envelope, envelope]) for (const y of [-envelope - .028, envelope + .028]) for (const z of [-envelope, envelope]) {
      const point = actualOrb.clone().add(new THREE.Vector3(x, y, z)).project(camera)
      assert.ok(Math.abs(point.x) < 1 && Math.abs(point.y) < 1 && point.z > -1 && point.z < 1, `${width}x${height} clips the actual retained Orb`)
      maximumX = Math.max(maximumX, Math.abs(point.x))
      maximumY = Math.max(maximumY, Math.abs(point.y))
    }
    context.diagnostic(JSON.stringify({ width, height, maximumAbsNdcX: maximumX, maximumAbsNdcY: maximumY }))
  }
})

test('actual first-person look reaches the open sky and the ground while preserving arrival composition', () => {
  const start = homeSource.indexOf('  const place = useCallback(() => {')
  const end = homeSource.indexOf('\n  }, [camera, pitch, size.height, size.width, yaw])', start)
  assert.ok(start > 0 && end > start)
  const body = homeSource.slice(start + '  const place = useCallback(() => {'.length, end)
  const spawn = sourceVector('SPAWN')
  const initial = homeSource.match(/const yaw = useRef\(([^)]+)\), pitch = useRef\(([^)]+)\)/)
  assert.ok(initial)
  for (const [width, height] of [[1440, 900], [390, 844], [844, 390]]) {
    const camera = new THREE.PerspectiveCamera(50, width / height, .05, 300)
    const sandbox = { THREE, camera, homeWalkSurfaceHeight, size: { width, height }, position: { current: spawn.clone() }, yaw: { current: Number(initial[1]) }, pitch: { current: -.04 }, forward: { current: new THREE.Vector3() }, look: { current: new THREE.Vector3() } }
    const place = () => vm.runInNewContext(`(() => {${body}\n})()`, sandbox)
    place()
    const arrival = camera.getWorldDirection(new THREE.Vector3())
    const floor = homeWalkSurfaceHeight(spawn.x, spawn.z)
    const oldTarget = spawn.clone().setY(floor + 1.18).addScaledVector(sandbox.forward.current, height > width ? 6 : 8)
    const expected = oldTarget.sub(camera.position).normalize()
    assert.ok(arrival.distanceTo(expected) < 1e-10, `${width}x${height} changed the established resting composition`)
    const eye = camera.position.clone()
    sandbox.pitch.current = 1.2; place()
    const upwardAngle = Math.asin(camera.getWorldDirection(new THREE.Vector3()).y) * 180 / Math.PI
    assert.ok(upwardAngle > 60, `${width}x${height} cannot look into the open sky: ${upwardAngle} degrees`)
    assert.ok(camera.position.distanceTo(eye) < 1e-10, 'looking up must not move the physical eye')
    sandbox.pitch.current = -.85; place()
    const downwardAngle = Math.asin(camera.getWorldDirection(new THREE.Vector3()).y) * 180 / Math.PI
    assert.ok(downwardAngle < -45, `${width}x${height} cannot inspect the ground: ${downwardAngle} degrees`)
    assert.ok(camera.position.distanceTo(eye) < 1e-10, 'looking down must not move the physical eye')
  }
})

test('Orb physical footprint, native telemetry and current proof agree while the 2.4m interaction radius stays intact', () => {
  const envelope = maximumRetainedOrbRadius()
  const footprint = HOME_NAVIGATION_OBSTACLES.find(obstacle => obstacle.x === actualOrb.x && obstacle.z === actualOrb.z)
  assert.ok(footprint, 'the rendered physical Orb must not be walk-through')
  assert.ok(footprint.radius >= envelope, 'footprint must contain every retained clip without shrinking the asset')
  assert.ok(footprint.radius < 2.4, 'physical protection must retain the actual interaction zone')
  const owner = { dataset: { homeAssetsReady: 'true' } }
  const previousDocument = globalThis.document
  globalThis.document = { querySelector: () => owner }
  try {
    const position = actualOrb.clone().add(new THREE.Vector3(-1.5, 0, 1))
    const input = { keys: { current: new Set() }, virtualX: { current: 0 }, virtualZ: { current: 0 } }
    stepEmbodiedMotion({ position, velocity: new THREE.Vector3(), input, target: { current: null }, yaw: 0, delta: 0, speed: 3.15, acceleration: 9, deceleration: 12, bounds: { minX: -14, maxX: 14, minZ: -18, maxZ: 12 }, obstacles: HOME_NAVIGATION_OBSTACLES })
    const distance = Math.hypot(position.x - actualOrb.x, position.z - actualOrb.z).toFixed(3)
    assert.equal(owner.dataset.homeDistanceOrb, distance, 'native movement telemetry drifted from the drawn Orb')
    const assetHome = fs.readFileSync(new URL('../src/app/AssetDrivenHomeWorld.tsx', import.meta.url), 'utf8')
    const helper = assetHome.slice(assetHome.indexOf('function synchronizeCanonicalHomeTelemetry('), assetHome.indexOf('\nexport default function '))
    const value = assetHome.match(/const HOME_ORB = (\{[^\n]+\}) as const/)?.[1]
    const output = ts.transpileModule(helper, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
    const sandbox = { HOME_ORB: vm.runInNewContext(`(${value})`), HOME_SPAWN: sourceVector('SPAWN'), HOME_GROUND: sourceVector('GROUND_THRESHOLD'), HOME_LIFE_MAP: sourceVector('LIFE_MAP_LOOKOUT'), world: owner }
    vm.runInNewContext(`${output}\nsynchronizeCanonicalHomeTelemetry(world)`, sandbox)
    assert.equal(owner.dataset.homeDistanceOrb, distance, 'runtime boundary telemetry drifted from native movement')
    const proof = fs.readFileSync(new URL('../../scripts/capture-continuous-spatial-proof-v18.mjs', import.meta.url), 'utf8')
    const target = proof.match(/orb:\s*(\{[^\n]+\})/)?.[1]
    const expected = vm.runInNewContext(`(${target})`)
    assert.equal(expected.x, actualOrb.x)
    assert.equal(expected.z, actualOrb.z)
    assert.equal(expected.radius, 2.4)
    assert.equal(expected.attribute, 'data-home-distance-orb')
    const restored = actualOrb.clone()
    resolveHomeSolidPenetration(restored)
    assert.ok(Math.hypot(restored.x - actualOrb.x, restored.z - actualOrb.z) >= footprint.radius, 'restoring at its center must leave the body')
    for (const mode of ['keyboard', 'touch']) {
      const moving = actualOrb.clone().add(new THREE.Vector3(0, 0, 1.6))
      const velocity = new THREE.Vector3()
      const target = { current: null }
      input.keys.current = new Set(mode === 'keyboard' ? ['ArrowUp'] : [])
      input.virtualZ.current = mode === 'touch' ? -1 : 0
      for (let i = 0; i < 120; ++i) {
        stepEmbodiedMotion({ position: moving, velocity, input, target, yaw: 0, delta: 1 / 20, speed: 3.15, acceleration: 9, deceleration: 12, bounds: { minX: -14, maxX: 14, minZ: -18, maxZ: 12 }, obstacles: HOME_NAVIGATION_OBSTACLES })
        resolveHomeSolidPenetration(moving)
        assert.ok(Math.hypot(moving.x - actualOrb.x, moving.z - actualOrb.z) >= footprint.radius - .00001, `native ${mode} movement entered the Orb body`)
      }
      assert.ok(Math.hypot(moving.x - actualOrb.x, moving.z - actualOrb.z) < 2.4, `native ${mode} approach lost the unchanged Orb interaction zone`)
    }
  } finally {
    if (previousDocument === undefined) delete globalThis.document
    else globalThis.document = previousDocument
  }
})

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

test('split retained ground vertices share smooth normals across different triangle neighborhoods', () => {
  const source = new THREE.BufferGeometry()
  source.setAttribute('position', new THREE.Float32BufferAttribute([
    0, 0, 0, -4, 0, 0, 0, 0, 4,
    0, 0, 0, 4, 0, 0, 0, 0, -4,
  ], 3))
  const world = new THREE.Matrix4().compose(
    new THREE.Vector3(2, .2, -3),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(.05, .3, 0)),
    new THREE.Vector3(1.2, .9, .7),
  )
  const projected = projectHomeTerrainGeometry(source, world)
  const normals = projected.getAttribute('normal')
  const first = new THREE.Vector3().fromBufferAttribute(normals, 0)
  const duplicate = new THREE.Vector3().fromBufferAttribute(normals, 3)
  assert.ok(first.distanceTo(duplicate) < 1e-6, 'split vertices must not expose a triangle seam in the lighting')
  const worldNormal = first.applyMatrix3(new THREE.Matrix3().getNormalMatrix(world)).normalize()
  const point = new THREE.Vector3().fromBufferAttribute(projected.attributes.position, 0).applyMatrix4(world)
  const tangent = new THREE.Vector3(.002, homeTerrainHeight(point.x + .001, point.z) - homeTerrainHeight(point.x - .001, point.z), 0).normalize()
  assert.ok(Math.abs(worldNormal.dot(tangent)) < .0001, 'lighting normal must follow the actual world height field under nonuniform scale')
  assert.equal(projected.attributes.position.count, source.attributes.position.count, 'retained vertex topology must be preserved')
  assert.deepEqual(Array.from(source.attributes.position.array).slice(0, 3), [0, 0, 0])
  projected.dispose(); source.dispose()
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

test('actual shared movement deflects around a bench, allows backoff, and keeps the central environmental path open', () => {
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
  assert.ok(position.z < -3, 'the central environmental path must remain reachable')
})

test('click-target movement reaches the actual Orb approach, Ground and Life Map through the solid-aware world', () => {
  // The Orb body is a clickable object, not a floor destination. Approach its
  // actual clearing outside the physical footprint and inside the existing zone.
  for (const [name, x, z] of [['orb', actualOrb.x, actualOrb.z + 1], ['ground', -5.4, -10.8], ['life-map', 5.4, -10.8]]) {
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
    if (name === 'orb') assert.ok(Math.hypot(position.x - actualOrb.x, position.z - actualOrb.z) < 2.4, 'the actual Orb must retain its interaction zone after click-target approach')
  }
})

test('one complete terrain grid owns ground without intersecting coarse retained overlays', () => {
  const start = homeSource.indexOf('function prepareNaturalSanctuary(')
  const end = homeSource.indexOf('\nfunction terrainHeight', start)
  assert.ok(start >= 0 && end > start)
  const compiled = ts.transpileModule(homeSource.slice(start, end), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  const source = new THREE.Group()
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.MeshStandardMaterial())
  ground.name = 'sanctuary-terrain'
  const earth = ground.clone(); earth.name = 'sanctuary-inner-earth'
  const stone = ground.clone(); stone.name = 'admitted-wall'
  source.add(ground, earth, stone)
  const context = vm.createContext({ THREE, classifyRetainedHomeMesh, cloneNaturalSanctuaryMaterial: material => material.clone() })
  vm.runInContext(compiled, context)
  context.source = source
  const prepared = vm.runInContext('prepareNaturalSanctuary(source)', context)
  assert.equal(prepared.getObjectByName(ground.name).visible, false)
  assert.equal(prepared.getObjectByName(earth.name).visible, false)
  assert.equal(prepared.getObjectByName(stone.name).visible, true)
  assert.equal(source.getObjectByName(ground.name).visible, true, 'cached source visibility stays intact')
  assert.equal(source.getObjectByName(earth.name).geometry, earth.geometry, 'cached source geometry stays intact')
  assert.match(homeSource, /makeHomeTerrainGeometry\(\)/, 'terrain must have no retained-ground cutout')
  assert.doesNotMatch(homeSource, /makeHomeTerrainGeometry\(authored\.userData\.groundBounds\)/)
  const geometry = makeHomeTerrainGeometry()
  assert.equal(geometry.index.count / 3, 180 * 180 * 2, 'complete existing terrain grid has no holes')
  const pos = geometry.getAttribute('position')
  for (let i = 0; i < pos.count; i++) assert.ok(Math.abs(pos.getY(i) - homeTerrainHeight(pos.getX(i), pos.getZ(i))) < 1e-6)
  geometry.dispose()
})
