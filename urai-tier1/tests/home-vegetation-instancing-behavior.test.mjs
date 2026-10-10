import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
import ts from 'typescript'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import * as homeGpuSubmissionGate from '../src/spatial/performance/homeGpuSubmissionGate.ts'

// Execute production vegetation with explicit hook/GLTF adapters and real Three
// geometry. This tests scene construction, never browser/GPU timing or pixels.
const compile = source => ts.transpileModule(source, { compilerOptions: {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
  jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
} }).outputText
const geometrySource = fs.readFileSync(new URL('../src/spatial/layout/HomeSanctuaryGeometry.ts', import.meta.url), 'utf8')
const geometryModule = { exports: {} }
vm.runInNewContext(compile(geometrySource), { module: geometryModule, exports: geometryModule.exports,
  require: id => { assert.equal(id, 'three'); return THREE } })
const renderCostSource = fs.readFileSync(new URL('../src/spatial/performance/homeRenderCostPolicy.ts', import.meta.url), 'utf8')
const renderCostModule = { exports: {} }
vm.runInNewContext(compile(renderCostSource), { module: renderCostModule, exports: renderCostModule.exports,
  require: id => { assert.fail(`undeclared render cost policy dependency ${id}`) } })
const source = fs.readFileSync(new URL('../src/spatial/layout/HomeWorldProductionPolished.tsx', import.meta.url), 'utf8')
const palette = [
  { color: '#6f8d68', roughness: .96 }, { color: '#819b72', roughness: .94 }, { color: '#5f7c61', roughness: .97 },
]

function fernModel(nested = false) {
  const scene = new THREE.Group()
  const parent = new THREE.Group()
  if (nested) {
    scene.rotation.set(.12, .34, -.08)
    parent.position.set(.3, .2, -.4)
    parent.rotation.set(.1, -.28, .16)
    parent.scale.set(.7, 1.1, .8)
  }
  scene.add(parent)
  // Native fern_02's four local offsets, including its retained fractional values.
  const offsets = [[0, 0, 0], [1.0000009536743164, 0, 0],
    [0, 0, 1.0000001192092896], [1, 0, .9999995827674866]]
  offsets.forEach((position, index) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(.28 + index * .03, .9, .18), new THREE.MeshStandardMaterial())
    mesh.name = `retained-fern-part-${index}`
    mesh.position.fromArray(position)
    parent.add(mesh)
  })
  scene.updateMatrixWorld(true)
  return scene
}

function mountVegetation(scene) {
  const layout = [], effects = [], cleanup = []
  const react = {
    Component: class {}, useMemo: fn => fn(), useRef: initial => ({ current: initial }),
    useLayoutEffect: fn => layout.push(fn), useEffect: fn => effects.push(fn),
  }
  const runtime = { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) }
  const adapters = {
    react, 'react/jsx-runtime': runtime, three: THREE,
    '@react-three/fiber': {},
    '@react-three/drei': { useGLTF: Object.assign(() => ({ scene }), { preload() {} }) },
    'three/examples/jsm/geometries/RoundedBoxGeometry.js': { RoundedBoxGeometry },
    './HomeSanctuaryGeometry': geometryModule.exports,
    './HomeWorldProduction.module.css': {},
    './HomeSanctuaryMaterials': {}, './HomeSanctuaryAssetPolicy': {},
    '@/app/home/orbStateController': {}, '@/spatial/navigation/EmbodiedNavigation': {},
    '@/spatial/navigation/HomeSkyAscentInteraction': {}, '@/spatial/store/useSceneStore': {},
    '@/spatial/world/worldEvents': {}, '@/spatial/accessibility/SensorySafeRuntime': {},
    '@/spatial/performance/useAdaptiveSpatialQuality': {}, '@/lib/i18n/useUraiLocale': {},
    '@/spatial/performance/homeRenderCostPolicy': renderCostModule.exports,
    '@/spatial/performance/homeGpuSubmissionGate': homeGpuSubmissionGate,
    '@/spatial/home/HomeInterpretiveSplat': { resolveHomeInterpretiveSplatAsset: () => null },
  }
  const module = { exports: {} }
  vm.runInNewContext(compile(source) + '\nmodule.exports.fixture = { Vegetation, FERN_PLACEMENTS, seeded };', {
    module, exports: module.exports, process: { env: {} },
    require: id => { assert.ok(Object.hasOwn(adapters, id), `undeclared context adapter ${id}`); return adapters[id] },
  })
  const { Vegetation, FERN_PLACEMENTS, seeded } = module.exports.fixture
  const mount = node => {
    if (typeof node.type === 'function') return mount(node.type(node.props))
    const props = node.props ?? {}
    let object
    if (node.type === 'primitive') object = props.object
    else if (node.type === 'instancedMesh') object = new THREE.InstancedMesh(...props.args)
    else { assert.equal(node.type, 'group'); object = new THREE.Group() }
    for (const key of ['name', 'castShadow', 'receiveShadow', 'userData']) if (key in props) object[key] = props[key]
    if (props.ref) props.ref.current = object
    for (const child of [props.children].flat(Infinity)) if (child) object.add(mount(child))
    return object
  }
  const world = mount(Vegetation())
  for (const effect of [...layout, ...effects]) { const stop = effect(); if (typeof stop === 'function') cleanup.push(stop) }
  world.updateMatrixWorld(true)
  return { world, placements: FERN_PLACEMENTS, seeded, unmount: () => cleanup.reverse().forEach(stop => stop()) }
}

function records(world) {
  const rows = []
  world.traverse(mesh => {
    if (!(mesh instanceof THREE.Mesh)) return
    const add = matrix => rows.push({ geometry: mesh.geometry, material: mesh.material,
      castShadow: mesh.castShadow, receiveShadow: mesh.receiveShadow, matrix })
    if (mesh.isInstancedMesh) for (let index = 0; index < mesh.count; index++) {
      const matrix = new THREE.Matrix4()
      mesh.getMatrixAt(index, matrix)
      add(mesh.matrixWorld.clone().multiply(matrix))
    } else add(mesh.matrixWorld.clone())
  })
  return rows
}

function referenceRecords(model, mounted) {
  const rows = []
  mounted.placements.forEach(([x, z, scale, rotation], index) => {
    // Compare with the retained canonical placement law, independently of the
    // optimized geometry/material/shadow batch construction.
    const fern = model.clone(true)
    fern.position.set(x, geometryModule.exports.homeTerrainHeight(x, z) + .025, z)
    fern.rotation.y = rotation
    fern.scale.set(scale * (1 + mounted.seeded(index, 16) * .08),
      scale * (.9 + mounted.seeded(index, 22) * .18), scale * (1 + mounted.seeded(index, 29) * .08))
    fern.updateMatrixWorld(true)
    fern.traverse(mesh => { if (mesh instanceof THREE.Mesh) rows.push({ geometry: mesh.geometry,
      variant: index % 3, castShadow: index < 24, matrix: mesh.matrixWorld.clone() }) })
  })
  return rows
}

function assertPreserved(model, mounted) {
  const expected = referenceRecords(model, mounted)
  const actual = records(mounted.world)
  assert.equal(mounted.placements.length, 104)
  assert.equal(actual.length, 416)
  for (const row of actual) {
    const variant = palette.findIndex(entry => row.material.color.getHexString() === entry.color.slice(1))
    const match = expected.findIndex(want => want.geometry === row.geometry && want.variant === variant
      && want.castShadow === row.castShadow && want.matrix.elements.every((value, i) => Math.abs(value - row.matrix.elements[i]) < 2e-6))
    assert.ok(match >= 0, 'every rendered primitive must retain its canonical world matrix/material/shadow group')
    expected.splice(match, 1)
  }
  assert.equal(expected.length, 0)
}

test('all104 ferns share at most24 geometry/material/shadow submissions', () => {
  const mounted = mountVegetation(fernModel()), meshes = []
  mounted.world.traverse(mesh => { if (mesh instanceof THREE.Mesh) meshes.push(mesh) })
  assert.equal(records(mounted.world).length, 416)
  assert.ok(meshes.length <= 24, `unbatched scene creates ${meshes.length} mesh submissions`)
  assert.ok(meshes.every(mesh => mesh.isInstancedMesh))
  mounted.unmount()
})

test('all104 world matrices preserve the four retained native mesh offsets', () => {
  const model = fernModel(), mounted = mountVegetation(model)
  assertPreserved(model, mounted)
  mounted.unmount()
})

test('nested local transforms and original root x/z rotation survive batching', () => {
  const model = fernModel(true), mounted = mountVegetation(model)
  assertPreserved(model, mounted)
  mounted.unmount()
})

test('all three materials and the first24 shadow-casting ferns remain intact', () => {
  const mounted = mountVegetation(fernModel()), rows = records(mounted.world)
  const materials = [...new Set(rows.map(row => row.material))]
  assert.equal(materials.length, 3)
  for (const [index, material] of materials.entries()) {
    const entry = palette.find(item => item.color.slice(1) === material.color.getHexString())
    assert.ok(entry)
    assert.equal(material.roughness, entry.roughness)
    assert.equal(material.metalness, 0)
    assert.equal(material.side, THREE.DoubleSide)
    const variant = palette.indexOf(entry)
    assert.equal(rows.filter(row => row.material === material).length, (variant === 2 ? 34 : 35) * 4)
    assert.equal(rows.filter(row => row.material === material && row.castShadow).length, 32)
  }
  assert.equal(rows.filter(row => row.castShadow).length, 96)
  assert.ok(rows.every(row => row.receiveShadow))
  mounted.unmount()
})

test('instance bounds include every original geometry vertex', () => {
  const mounted = mountVegetation(fernModel(true))
  mounted.world.traverse(mesh => {
    if (!mesh.isInstancedMesh) return
    assert.ok(mesh.boundingSphere, 'batch must publish its complete culling bound before the first frame')
    for (let instance = 0; instance < mesh.count; instance++) {
      const matrix = new THREE.Matrix4(); mesh.getMatrixAt(instance, matrix)
      for (let vertex = 0; vertex < mesh.geometry.attributes.position.count; vertex++) {
        const point = new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position, vertex).applyMatrix4(matrix)
        assert.ok(point.distanceTo(mesh.boundingSphere.center) <= mesh.boundingSphere.radius + 1e-5)
      }
    }
  })
  mounted.unmount()
})

test('mount/unmount preserves the cached GLTF graph and its shared resources', () => {
  const model = fernModel(true), before = JSON.stringify(model.toJSON())
  let loadedDisposals = 0
  model.traverse(mesh => { if (mesh instanceof THREE.Mesh) {
    mesh.geometry.addEventListener('dispose', () => loadedDisposals++)
    mesh.material.addEventListener('dispose', () => loadedDisposals++)
  } })
  const mounted = mountVegetation(model), allocatedMaterials = new Set(), batches = []
  mounted.world.traverse(mesh => { if (mesh instanceof THREE.Mesh) {
    allocatedMaterials.add(mesh.material)
    if (mesh.isInstancedMesh) batches.push(mesh)
  } })
  let materialDisposals = 0, batchDisposals = 0
  allocatedMaterials.forEach(material => material.addEventListener('dispose', () => materialDisposals++))
  batches.forEach(mesh => mesh.addEventListener('dispose', () => batchDisposals++))
  assert.equal(JSON.stringify(model.toJSON()), before)
  mounted.unmount()
  assert.equal(JSON.stringify(model.toJSON()), before)
  assert.equal(loadedDisposals, 0)
  assert.equal(materialDisposals, 3)
  assert.equal(batchDisposals, batches.length)
})
