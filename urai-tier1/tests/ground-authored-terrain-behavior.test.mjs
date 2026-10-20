import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import vm from 'node:vm'
import test from 'node:test'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const THREE = require('three')
const root = new URL('../', import.meta.url)
const sourceSha = process.env.URAI_GROUND_BEHAVIOR_SOURCE_SHA
if (sourceSha && !/^[a-f0-9]{40}$/.test(sourceSha)) throw new Error('Ground baseline source must be an exact SHA')
const read = file => sourceSha
  ? execFileSync('git', ['show', `${sourceSha}:urai-tier1/${file}`], { encoding: 'utf8' })
  : readFileSync(new URL(file, root), 'utf8')
const jsx = (type, props) => ({ type, props })
const hooks = { useMemo: fn => fn(), useCallback: fn => fn, useRef: value => ({ current: value }), useEffect() {}, useState: value => [value, () => {}] }
function compile(source, modules) {
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
  const module = { exports: {} }
  vm.runInNewContext(`(function(require,module,exports){${output}\n})`, { console })(name => {
    if (!modules.has(name)) throw new Error(`Unexpected production import: ${name}`)
    return modules.get(name)
  }, module, module.exports)
  return module.exports
}
const model = compile(read('src/app/ground/GroundWorldModel.ts'), new Map())
let frame, activeDestination, observedLookAt
const camera = new THREE.PerspectiveCamera()
camera.lookAt = point => { observedLookAt = point.clone() }
const component = compile(read('src/app/GroundSpatialWorldClean.tsx') + '\nexports.__prepareModel = prepareModel; exports.__bounds = BOUNDS; exports.__Player = Player;', new Map([
  ['three', THREE], ['react', hooks], ['react/jsx-runtime', { jsx, jsxs: jsx, Fragment: 'fragment' }],
  ['next/navigation', {}], ['@react-three/fiber', { useThree: () => ({ camera, size: { width: 1440, height: 900 } }), useFrame: fn => { frame = fn } }], ['@react-three/drei', { useGLTF: Object.assign(() => ({}), { preload() {} }) }],
  ['@react-three/postprocessing', {}], ['./HomeSpatialCanvas', {}], ['./ground/GroundWorldModel', model],
  ['@/spatial/navigation/EmbodiedNavigation', { stepEmbodiedMotion: ({ position }) => position.set(activeDestination.camera[0], 0, activeDestination.camera[2]) }], ['@/spatial/world/worldEvents', {}], ['@/spatial/adam/AdamLauncherSlot', { default: 'adam-slot' }],
]))

// Read real position/index bytes and node transforms from the retained GLB.
// Texture decoding is intentionally outside this geometry-only regression;
// rendered screenshots exercise the retained textures separately.
const bytes = readFileSync(new URL('public/assets/urai/generated/models/ground-world-terrain-v1.glb', root))
const jsonLength = bytes.readUInt32LE(12)
const gltf = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString())
const binaryStart = 20 + jsonLength + 8
function attribute(index) {
  const accessor = gltf.accessors[index]
  const view = gltf.bufferViews[accessor.bufferView]
  const count = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[accessor.type]
  const readers = { 5126: ['readFloatLE', 4, Float32Array], 5125: ['readUInt32LE', 4, Uint32Array], 5123: ['readUInt16LE', 2, Uint16Array] }
  const [reader, size, ArrayType] = readers[accessor.componentType]
  const values = new ArrayType(accessor.count * count)
  const offset = binaryStart + (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0)
  for (let vertex = 0; vertex < accessor.count; vertex += 1) for (let lane = 0; lane < count; lane += 1) values[vertex * count + lane] = bytes[reader](offset + vertex * (view.byteStride ?? size * count) + lane * size)
  return new THREE.BufferAttribute(values, count)
}
function scene() {
  const nodes = gltf.nodes.map(node => {
    const object = new THREE.Group()
    object.name = node.name ?? ''
    if (node.translation) object.position.fromArray(node.translation)
    if (node.rotation) object.quaternion.fromArray(node.rotation)
    if (node.scale) object.scale.fromArray(node.scale)
    if (node.mesh !== undefined) {
      const primitives = gltf.meshes[node.mesh].primitives.map(primitive => {
        const geometry = new THREE.BufferGeometry()
        geometry.setAttribute('position', attribute(primitive.attributes.POSITION))
        if (primitive.indices !== undefined) geometry.setIndex(attribute(primitive.indices))
        return new THREE.Mesh(geometry, new THREE.MeshStandardMaterial())
      })
      if (primitives.length === 1) {
        const mesh = primitives[0]
        mesh.name = object.name; mesh.position.copy(object.position); mesh.quaternion.copy(object.quaternion); mesh.scale.copy(object.scale)
        return mesh
      }
      object.add(...primitives)
    }
    return object
  })
  gltf.nodes.forEach((node, index) => node.children?.forEach(child => nodes[index].add(nodes[child])))
  const result = new THREE.Group()
  gltf.scenes[gltf.scene ?? 0].nodes.forEach(index => result.add(nodes[index]))
  result.updateMatrixWorld(true)
  return result
}
function prepare() {
  const source = scene()
  const positions = []
  source.traverse(object => { if (object.isMesh) positions.push([object, Array.from(object.geometry.attributes.position.array)]) })
  component.__prepareModel(source)
  source.updateMatrixWorld(true)
  positions.forEach(([object, before]) => assert.deepEqual(Array.from(object.geometry.attributes.position.array), before, `${object.name} must preserve governed vertices`))
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'b5309b854729566efcc444db029458bd4193ed18e6c83199e164ca8cb3fb2b76')
  return source
}
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < .00001, `${actual} differs from ${expected}`)

test('actual retained Ground terrain covers the production walking bounds without changing asset vertices', () => {
  const terrain = prepare().getObjectByName('ground-sacred-black-glass')
  const box = new THREE.Box3().setFromObject(terrain)
  close(box.min.x, component.__bounds.minX); close(box.max.x, component.__bounds.maxX)
  close(box.min.z, component.__bounds.minZ); close(box.max.z, component.__bounds.maxZ)
})

test('every actual retained chamber foot meets its real terrain support and preserves its destination x/z', () => {
  const source = prepare()
  const terrain = source.getObjectByName('ground-sacred-black-glass')
  const ray = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, -1, 0))
  for (const destination of model.DESTINATIONS) {
    const chamber = source.getObjectByName(`ground-destination-${destination.id}`)
    close(chamber.position.x, destination.position[0]); close(chamber.position.z, destination.position[2])
    ray.ray.origin.set(chamber.position.x, 100, chamber.position.z)
    const support = ray.intersectObject(terrain, false)[0]
    assert.ok(support, `${destination.id} lacks retained terrain support`)
    close(new THREE.Box3().setFromObject(chamber).min.y, support.point.y)
    assert.equal(chamber.visible, true, `${destination.id} must retain physical route geometry`)
  }
})

test('legacy disc/lens and fan overlays no longer dominate the actual physical Ground owner', () => {
  const source = prepare()
  assert.equal(source.getObjectByName('ground-central-nexus').visible, false)
  assert.equal(source.getObjectByName('nexus-core').visible, false)
  const owner = read('src/app/GroundSpatialWorldClean.tsx')
  assert.doesNotMatch(owner, /ArchitecturalRouteLighting|actions\.Ground_Pulse|actions\.Nexus_Idle/)
  assert.doesNotMatch(owner, /obstacles:\s*\[\{ x: 0, z: -1, radius: 2\.15 \}\]/)
})

test('the real Player selected camera aims at the supported chamber rather than its legacy floating elevation', () => {
  const source = prepare()
  const terrain = source.getObjectByName('ground-sacred-black-glass')
  const terrainHeights = { current: {} }
  const ray = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, -1, 0))
  for (const destination of model.DESTINATIONS) {
    ray.ray.origin.set(destination.position[0], 100, destination.position[2])
    const support = ray.intersectObject(terrain, false)[0]
    assert.ok(support, `${destination.id} camera lacks actual terrain support`)
    terrainHeights.current[destination.id] = support.point.y
    activeDestination = destination
    component.__Player({ input: {}, yaw: { current: 0 }, pitch: { current: 0 }, target: { current: null }, activeId: destination.id, onNearby() {}, terrainHeights })
    frame({}, .016)
    close(observedLookAt.x, destination.lookAt[0]); close(observedLookAt.z, destination.lookAt[2])
    close(observedLookAt.y, terrainHeights.current[destination.id] + destination.lookAt[1] - destination.position[1])
  }
})

test('the actual world shell keeps Ground Orb-free without removing other realm companion ownership', () => {
  const shellSource = read('src/spatial/world/UraiWorldShell.tsx')
  for (const destination of ['infrastructure-hub', 'life-map', 'location-map', 'home', 'focus', 'replay']) {
    const modules = new Map([['react/jsx-runtime', { jsx, jsxs: jsx, Fragment: 'fragment' }], ['./WorldStateProvider', { useUraiWorldState: () => ({ world: { destination }, phase: 'idle' }) }]])
    for (const match of shellSource.matchAll(/import\s+[^\n]*?from\s+['"]([^'"]+)['"]/g)) if (!modules.has(match[1])) modules.set(match[1], new Proxy({}, { get: (_, name) => name }))
    for (const match of shellSource.matchAll(/import\s+['"]([^'"]+)['"]/g)) modules.set(match[1], {})
    const rendered = compile(shellSource, modules).UraiWorldShell({ children: 'actual-owned-realm' })
    const expected = !['infrastructure-hub', 'life-map', 'location-map'].includes(destination)
    assert.equal(rendered.props['data-companion-owned'], String(expected), `${destination} has incorrect companion ownership`)
    const mounted = rendered.props.children.flat(Infinity).some(child => child?.type === 'PersistentWorldCompanion')
    assert.equal(mounted, expected)
  }
})
