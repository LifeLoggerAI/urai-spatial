import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import * as THREE from 'three'
import test from 'node:test'
const exports = {}
vm.runInNewContext(ts.transpileModule(fs.readFileSync(new URL('../src/spatial/performance/prepareHomeScene.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports, setTimeout })
const { prepareHomeScene } = exports
function fixture() {
  const scene = new THREE.Scene()
  const visible = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial())
  const hidden = new THREE.Group(); hidden.visible = false
  hidden.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshPhysicalMaterial()))
  visible.add(hidden)
  scene.add(visible, new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial()), new THREE.AmbientLight())
  return { scene, visible, hidden }
}

test('visible objects compile in separate tasks with original scene lighting and shared materials', async () => {
  const { scene, visible, hidden } = fixture()
  const events = []
  await prepareHomeScene({ async compileAsync(object, camera, target) {
    events.push('compile')
    assert.equal(target, scene)
    assert.equal(object.children.length, 0)
    assert.notEqual(object, visible)
    if (object.isMesh) { assert.equal(object.material, visible.material); assert.equal(object.geometry, visible.geometry) }
  } }, scene, new THREE.PerspectiveCamera(), () => false, async () => { events.push('yield') })
  assert.deepEqual(events, ['yield','compile','yield','compile'])
  assert.equal(visible.children[0], hidden)
  assert.equal(hidden.visible, false)
  assert.equal(scene.children.length, 3)
})

test('cancellation after yielding prevents shader work', async () => {
  let cancelled = false
  await prepareHomeScene({ compileAsync() { assert.fail('cancelled compile') } }, fixture().scene, new THREE.PerspectiveCamera(), () => cancelled, async () => { cancelled = true })
})

test('shader failures remain rejected rather than advertising readiness', async () => {
  await assert.rejects(prepareHomeScene({ async compileAsync() { throw Error('compile failed') } }, fixture().scene, new THREE.PerspectiveCamera(), () => false, async () => {}), /compile failed/)
})
