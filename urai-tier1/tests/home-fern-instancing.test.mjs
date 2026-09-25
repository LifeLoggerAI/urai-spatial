import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import vm from 'node:vm'
import * as THREE from 'three'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const helper = fs.readFileSync(new URL('../src/spatial/assets/batchStaticFernPlants.ts', import.meta.url), 'utf8')
const module = { exports: {} }
vm.runInNewContext(ts.transpileModule(helper, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,
  { exports: module.exports, require: name => name === 'three' ? THREE : require(name) })
const { batchStaticFernPlants } = module.exports

function authoredPlants() {
  const base = new URL('../public/assets/urai/home-production/cc0/polyhaven-v48/fern_02/', import.meta.url)
  const gltf = JSON.parse(fs.readFileSync(new URL('asset.gltf', base), 'utf8'))
  const buffers = gltf.buffers.map(buffer => fs.readFileSync(new URL(buffer.uri, base)))
  function attribute(index) {
    const accessor = gltf.accessors[index], view = gltf.bufferViews[accessor.bufferView]
    assert.equal(view.byteStride, undefined, 'Governed fern uses packed attributes')
    const Type = { 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array }[accessor.componentType]
    const itemSize = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[accessor.type]
    const buffer = buffers[view.buffer]
    const start = buffer.byteOffset + (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0)
    return new THREE.BufferAttribute(new Type(buffer.buffer.slice(start, start + accessor.count * itemSize * Type.BYTES_PER_ELEMENT)), itemSize)
  }
  const scene = new THREE.Group()
  gltf.nodes.forEach(node => {
    assert.equal(node.children, undefined)
    assert.equal(node.skin, undefined)
    const primitives = gltf.meshes[node.mesh].primitives
    assert.equal(primitives.length, 1)
    assert.equal(primitives[0].targets, undefined)
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', attribute(primitives[0].attributes.POSITION))
    geometry.setIndex(attribute(primitives[0].indices))
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial())
    mesh.name = node.name
    if (node.translation) mesh.position.fromArray(node.translation)
    if (node.rotation) mesh.quaternion.fromArray(node.rotation)
    if (node.scale) mesh.scale.fromArray(node.scale)
    scene.add(mesh)
  })

  // Execute the retained authored placement initializer, independently of batching.
  const source = fs.readFileSync(new URL('../src/spatial/layout/HomeWorldProductionV225PolishV3.tsx', import.meta.url), 'utf8')
  const ast = ts.createSourceFile('home.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const canopy = ast.statements.find(node => node.name?.text === 'RootedCanopy')
  let initializer
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'plants') initializer = node.initializer.getText(ast)
    ts.forEachChild(node, visit)
  }
  visit(canopy)
  assert.ok(initializer)
  const terrainSource = fs.readFileSync(new URL('../src/spatial/layout/HomeWorldProductionV223Geometry.tsx', import.meta.url), 'utf8')
  const terrainAst = ts.createSourceFile('terrain.tsx', terrainSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const terrain = terrainAst.statements.filter(node => ['height', 'centerline'].includes(node.name?.text)
    || ts.isVariableStatement(node) && node.declarationList.declarations.some(declaration => ['GROUND', 'LIFE_MAP'].includes(declaration.name.text)))
    .map(node => node.getText(terrainAst)).join('\n')
  const materials = ['#d4d9c0', '#b9cbb6', '#e0dcc6'].map(color => new THREE.MeshStandardMaterial({ color }))
  const context = { THREE, fern: { scene }, materials, useMemo: fn => fn(), result: null, exports: {} }
  const compiled = ts.transpileModule(`${terrain}\nresult = ${initializer}`, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
  vm.runInNewContext(compiled, context)
  return context.result
}

test('144 governed ferns become 102 local batches with identical geometry, materials, transforms and shadow membership', () => {
  const plants = authoredPlants()
  const batches = batchStaticFernPlants(plants)
  assert.equal(plants.length, 144)
  assert.equal(batches.length, 102)
  assert.ok(batches.every(batch => batch instanceof THREE.InstancedMesh))
  const original = new Map(plants.map(plant => [plant.name, plant]))
  const seen = new Set()
  const patchBatches = Array(8).fill(0)
  let triangles = 0, shadowInstances = 0
  const expectedBounds = new THREE.Box3(), actualBounds = new THREE.Box3()
  for (const plant of plants) expectedBounds.union(new THREE.Box3().setFromObject(plant, true))
  for (const batch of batches) {
    patchBatches[batch.userData.canopyPatch]++
    assert.ok(batch.boundingBox && batch.boundingSphere)
    if (batch.castShadow) shadowInstances += batch.count
    for (let index = 0; index < batch.count; index++) {
      const name = batch.userData.sourcePlantNames[index]
      assert.equal(seen.has(name), false)
      seen.add(name)
      const plant = original.get(name)
      assert.ok(plant)
      assert.equal(batch.userData.canopyPatch, plant.userData.canopyPatch, `${name}: authored culling partition`)
      assert.equal(batch.geometry, plant.geometry, `${name}: shared unchanged geometry`)
      assert.equal(batch.material, plant.material, `${name}: unchanged material identity`)
      for (const key of ['castShadow', 'receiveShadow', 'visible', 'frustumCulled', 'renderOrder']) assert.equal(batch[key], plant[key], `${name}: ${key}`)
      assert.equal(batch.layers.mask, plant.layers.mask)
      plant.updateMatrix()
      const actual = new THREE.Matrix4()
      batch.getMatrixAt(index, actual)
      assert.deepEqual(actual.elements, plant.matrix.elements.map(Math.fround), `${name}: identical GPU matrix`)
      const positions = batch.geometry.getAttribute('position')
      const point = new THREE.Vector3()
      for (let vertex = 0; vertex < positions.count; vertex++) actualBounds.expandByPoint(point.fromBufferAttribute(positions, vertex).applyMatrix4(actual))
      triangles += batch.geometry.index.count / 3
    }
  }
  assert.equal(seen.size, 144)
  assert.equal(shadowInstances, 28)
  assert.equal(batches.filter(batch => batch.castShadow).length, 22)
  assert.deepEqual(patchBatches, [12, 18, 12, 12, 12, 12, 12, 12])
  assert.equal(triangles, 224352)
  assert.ok(actualBounds.min.distanceTo(expectedBounds.min) < 0.00001)
  assert.ok(actualBounds.max.distanceTo(expectedBounds.max) < 0.00001)
  let geometryDisposals = 0, materialDisposals = 0
  for (const geometry of new Set(plants.map(plant => plant.geometry))) geometry.addEventListener('dispose', () => geometryDisposals++)
  for (const material of new Set(plants.map(plant => plant.material))) material.addEventListener('dispose', () => materialDisposals++)
  batches.forEach(batch => batch.dispose())
  assert.equal(geometryDisposals, 0, 'Instance cleanup preserves cached geometry')
  assert.equal(materialDisposals, 0, 'Instance cleanup preserves material owner')
})

test('unsupported future fern hierarchies retain their original objects', () => {
  const plant = new THREE.Group()
  plant.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial()))
  const result = batchStaticFernPlants([plant])
  assert.equal(result.length, 1)
  assert.equal(result[0], plant)
})
