import assert from 'node:assert/strict'
import { createRequire, stripTypeScriptTypes } from 'node:module'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { test } from 'node:test'

const requireTierOne = createRequire(new URL('../urai-tier1/package.json', import.meta.url))
const threeUrl = pathToFileURL(path.join(path.dirname(requireTierOne.resolve('three')), 'three.module.js')).href
const THREE = await import(threeUrl)
async function sourceModule(file) {
  const source = stripTypeScriptTypes(await readFile(new URL(file, import.meta.url), 'utf8'), { mode: 'strip' }).replace("from 'three'", `from '${threeUrl}'`)
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
}
const { projectHomeTerrainGeometry, homeTerrainHeight } = await sourceModule('../urai-tier1/src/spatial/layout/HomeSanctuaryGeometry.ts')
const { playCouncilBodyIdle, playCouncilListening } = await sourceModule('../urai-tier1/src/spatial/council/CouncilAnimationLayers.ts')

function verifyProjectedSurface(geometry, world) {
  const position = geometry.getAttribute('position'), normal = geometry.getAttribute('normal')
  assert.equal(position.array.constructor, Float32Array)
  assert.equal(normal.array.constructor, Float32Array)
  const references = new Set(geometry.index.array)
  assert.ok(references.size)
  const normalMatrix = new THREE.Matrix3().getNormalMatrix(world)
  for (const id of references) {
    assert.ok(Number.isInteger(id) && id >= 0 && id < position.count)
    const point = new THREE.Vector3().fromBufferAttribute(position, id).applyMatrix4(world)
    assert.ok(Math.abs(point.y - homeTerrainHeight(point.x, point.z) - .003) < 1e-6)
    const direction = new THREE.Vector3().fromBufferAttribute(normal, id).applyMatrix3(normalMatrix).normalize()
    assert.ok(direction.y > 0)
    assert.ok(Math.abs(Math.hypot(normal.getX(id), normal.getY(id), normal.getZ(id)) - 1) < 1e-6)
  }
}

for (const quantized of [false, true]) test(`closed ${quantized ? 'normalized quantized' : 'float'} ground becomes one valid upward surface without mutating source`, () => {
  const source = new THREE.BoxGeometry(2, 2, 2)
  if (quantized) for (const name of ['position', 'normal']) {
    const prior = source.getAttribute(name)
    source.setAttribute(name, new THREE.Int16BufferAttribute(Array.from(prior.array, value => Math.round(value * 32767)), 3, true))
  }
  const before = Buffer.from(source.getAttribute('position').array.buffer).toString('base64')
  const priorIndex = Array.from(source.index.array)
  const world = new THREE.Matrix4().compose(new THREE.Vector3(3, .2, -4), new THREE.Quaternion(), new THREE.Vector3(2, .5, 1))
  const result = projectHomeTerrainGeometry(source, world)
  assert.equal(result.index.count, 6)
  verifyProjectedSurface(result, world)
  assert.equal(Buffer.from(source.getAttribute('position').array.buffer).toString('base64'), before)
  assert.deepEqual(Array.from(source.index.array), priorIndex)
  result.dispose(); source.dispose()
})

test('existing open ground grid preserves its triangle count under reflection and singular transforms fail', () => {
  const source = new THREE.PlaneGeometry(4, 4, 3, 3).rotateX(-Math.PI / 2)
  const world = new THREE.Matrix4().makeScale(-1, 1, 1)
  const result = projectHomeTerrainGeometry(source, world)
  assert.equal(result.index.count, source.index.count)
  verifyProjectedSurface(result, world)
  assert.throws(() => projectHomeTerrainGeometry(source, new THREE.Matrix4().makeScale(0, 1, 1)), /invertible/)
  result.dispose(); source.dispose()
})

test('exact retained Home decodes with the consumer loader and projects its five visible ground meshes', async () => {
  const stdlib = path.dirname(requireTierOne.resolve('three-stdlib'))
  const { GLTFLoader } = await import(pathToFileURL(path.join(stdlib, 'loaders/GLTFLoader.js')).href)
  const { MeshoptDecoder } = await import(pathToFileURL(path.join(stdlib, 'libs/MeshoptDecoder.js')).href)
  const bytes = await readFile(new URL('../urai-tier1/public/assets/urai/generated/models/home-entry-chamber-v1.glb', import.meta.url))
  assert.equal(bytes.length, 184160)
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'b7bdced5a721598a9dfe592ee19da04d754d5b8b1d48b23cc44403a89b1ee529')
  globalThis.self = globalThis
  const decoder = typeof MeshoptDecoder === 'function' ? MeshoptDecoder() : MeshoptDecoder
  await decoder.ready
  const model = await new GLTFLoader().setMeshoptDecoder(decoder).parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '')
  model.scene.position.set(0, .02, -1.15); model.scene.scale.setScalar(.94); model.scene.updateWorldMatrix(true, true)
  for (const [name, triangles] of [['sanctuary-terrain', 96], ['sanctuary-foreground-landing', 2], ['ground-descent-path', 6], ['life-map-ascent-path', 6], ['memory-garden-path', 6]]) {
    const mesh = model.scene.getObjectByName(name)
    assert.ok(mesh?.isMesh, name)
    const prior = Buffer.from(mesh.geometry.getAttribute('position').array.buffer).toString('base64')
    const projected = projectHomeTerrainGeometry(mesh.geometry, mesh.matrixWorld)
    assert.equal(projected.index.count / 3, triangles, name)
    verifyProjectedSurface(projected, mesh.matrixWorld)
    assert.equal(Buffer.from(mesh.geometry.getAttribute('position').array.buffer).toString('base64'), prior)
    projected.dispose()
  }
})

function animationFixture() {
  const root = new THREE.Group(), hips = new THREE.Bone(), chest = new THREE.Bone(), head = new THREE.Bone()
  hips.name = 'hips'; hips.position.y = 1; chest.name = 'chest'; head.name = 'head'
  root.add(hips); hips.add(chest); chest.add(head)
  const idle = new THREE.AnimationClip('idle_breath', 2, [new THREE.VectorKeyframeTrack('hips.position', [0, 1, 2], [0, 1, 0, 0, 1.1, 0, 0, 1, 0])])
  const listen = new THREE.AnimationClip('listen_acknowledge', 2, [new THREE.QuaternionKeyframeTrack('head.quaternion', [0, 1, 2], [0, 0, 0, 1, -.05, 0, 0, Math.sqrt(1 - .05 ** 2), 0, 0, 0, 1])])
  const mixer = new THREE.AnimationMixer(root)
  return { hips, head, mixer, actions: { idle_breath: mixer.clipAction(idle), listen_acknowledge: mixer.clipAction(listen) } }
}

test('selected head listening preserves the real mixer body-idle action and phase', () => {
  const { hips, head, mixer, actions } = animationFixture()
  const stopIdle = playCouncilBodyIdle(actions, false)
  mixer.update(.5)
  const phase = actions.idle_breath.time
  const stopListen = playCouncilListening(actions, true, false)
  mixer.update(.5)
  assert.equal(actions.idle_breath.isRunning(), true)
  assert.equal(actions.listen_acknowledge.isRunning(), true)
  assert.ok(Math.abs(actions.idle_breath.time - phase - .5) < 1e-8)
  assert.ok(hips.position.y > 1.04)
  assert.ok(Math.abs(head.quaternion.x) > .01)
  stopListen(); mixer.update(.2)
  assert.equal(actions.idle_breath.isRunning(), true)
  assert.equal(actions.listen_acknowledge.isRunning(), false)
  assert.ok(hips.position.y > 1)
  stopIdle()
})

test('reduced motion and missing head clips leave actions inactive without replacing idle', () => {
  const { mixer, actions } = animationFixture()
  playCouncilBodyIdle(actions, true); playCouncilListening(actions, true, true); mixer.update(.5)
  assert.equal(actions.idle_breath.isRunning(), false)
  assert.equal(actions.listen_acknowledge.isRunning(), false)
  const stopIdle = playCouncilBodyIdle(actions, false)
  const stopListen = playCouncilListening({ idle_breath: actions.idle_breath }, true, false)
  mixer.update(.5); stopListen()
  assert.equal(actions.idle_breath.isRunning(), true)
  stopIdle()
})
