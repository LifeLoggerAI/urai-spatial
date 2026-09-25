import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import * as THREE from 'three'
import ts from 'typescript'

const source = fs.readFileSync(new URL('../src/spatial/assets/HomeOrbGroundedV288.tsx', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText

function fixture() {
  const scene = new THREE.Scene()
  const visualRoot = new THREE.Group()
  const reliquary = new THREE.Group()
  reliquary.name = 'home-v286-biomorphic-memory-reliquary'
  visualRoot.add(reliquary)
  scene.add(visualRoot)
  const earth = new THREE.Mesh(new THREE.SphereGeometry(.42), new THREE.MeshBasicMaterial({ color: '#163a52' }))
  earth.name = 'home-global-emotional-field-earth'
  earth.userData.semanticOwner = 'global-emotional-field-earth'
  scene.add(earth)
  const timers = []
  const effects = []
  let refIndex = 0, frame, cleanup, searches = 0
  const find = scene.getObjectByName.bind(scene)
  scene.getObjectByName = (...args) => { searches++; return find(...args) }
  const exports = {}
  vm.runInNewContext(compiled, {
    exports,
    window: { setTimeout: (callback, time) => { timers.push({ callback, time }); return timers.length }, clearTimeout: () => {} },
    require: name => {
      if (name === 'three') return THREE
      if (name === 'react') return { useLayoutEffect: callback => effects.push(callback), useRef: value => ({ current: refIndex++ === 0 ? visualRoot : value }) }
      if (name === '@react-three/fiber') return { useThree: () => ({ scene }), useFrame: callback => { frame = callback } }
      if (name === 'react/jsx-runtime') return { jsx: () => null, jsxs: () => null }
      if (name.endsWith('HomeOrbReliquaryV286')) return { HomeOrbReliquaryV286: () => null }
      if (name.endsWith('HomeWorldProductionV223Geometry')) return { ORB: new THREE.Vector3(-.45, 1.03, -7.45), height: () => -.6 }
      if (name.endsWith('homeOrbPlacement')) return { HOME_ORB_GROUND_ANCHOR: { x: 2.65, z: -4.2 } }
      throw new Error(`Unexpected import: ${name}`)
    },
  })
  exports.HomeOrbGroundedV288()
  return {
    scene, earth, visualRoot, reliquary,
    mount() { effects.forEach(effect => { cleanup = effect() }) },
    advance(ms) { timers.filter(timer => timer.time <= ms).forEach(timer => timer.callback()); frame?.({ clock: { elapsedTime: ms / 1000 } }, 1 / 60) },
    frame() { frame?.({}, 1 / 60) },
    cleanup() { cleanup() },
    searches: () => searches,
  }
}

function owner() {
  const group = new THREE.Group()
  group.name = 'home-living-memory-orb'
  group.userData.semanticOwner = 'orb'
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(.4), new THREE.MeshBasicMaterial({ transparent: true, opacity: .16, depthWrite: false }))
  const motes = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ opacity: .42, transparent: true, depthWrite: false }))
  const line = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial())
  const light = new THREE.PointLight()
  group.add(mesh, motes, line, light)
  return { group, mesh, motes, line, light }
}

function hidden(material) {
  assert.equal(material.colorWrite, false)
  assert.equal(material.depthWrite, false)
  assert.equal(material.transparent, true)
  assert.equal(material.opacity, 0)
}

test('late Orb mount is hidden after 40 seconds; motes and lines are suppressed while interaction and Earth remain intact', () => {
  const f = fixture()
  const otherReliquary = new THREE.Group()
  otherReliquary.name = 'home-v286-biomorphic-memory-reliquary'
  f.scene.add(otherReliquary)
  f.mount()
  f.advance(40000)
  const o = owner(), raycast = o.mesh.raycast
  f.scene.add(o.group)
  hidden(o.mesh.material)
  hidden(o.motes.material)
  hidden(o.line.material)
  assert.equal(o.light.visible, false)
  assert.equal(o.group.visible, true)
  assert.equal(o.mesh.raycast, raycast)
  assert.equal(o.group.userData.interactionOwner, true)
  assert.equal(f.earth.material.colorWrite, true)
  assert.equal(f.earth.visible, true)
  assert.equal(otherReliquary.name, 'home-v286-biomorphic-memory-reliquary')
  assert.deepEqual(otherReliquary.position.toArray(), [0, 0, 0])
  const searches = f.searches()
  for (let frame = 0; frame < 120; frame++) f.frame()
  assert.equal(f.searches(), searches, 'Rendering frames never rescan the full Scene')
  f.cleanup()
  assert.equal(o.mesh.material.colorWrite, true)
  assert.equal(o.mesh.material.opacity, .16)
  assert.equal(o.motes.material.opacity, .42)
  assert.equal(o.light.visible, true)
  assert.equal(f.reliquary.name, 'home-v286-biomorphic-memory-reliquary')
})

test('late replacement material and remounted owner are suppressed, unchanged material state is not rewritten, and cleanup detaches reconciliation', () => {
  const f = fixture(), o = owner()
  f.scene.add(o.group)
  f.mount()
  let writes = 0, colorWrite = o.motes.material.colorWrite
  Object.defineProperty(o.motes.material, 'colorWrite', { get: () => colorWrite, set: value => { writes++; colorWrite = value }, configurable: true })
  f.advance(40000)
  assert.equal(writes, 0)
  const replacement = new THREE.MeshBasicMaterial({ opacity: .8 })
  o.mesh.material = replacement
  f.frame()
  hidden(replacement)
  o.mesh.material.opacity = .5
  f.frame()
  hidden(replacement)
  f.scene.remove(o.group)
  const next = owner()
  f.scene.add(next.group)
  hidden(next.mesh.material)
  f.cleanup()
  assert.equal(replacement.opacity, .8)
  assert.equal(next.mesh.material.opacity, .16)
  const afterCleanup = owner()
  f.scene.add(afterCleanup.group)
  f.frame()
  assert.equal(afterCleanup.mesh.material.colorWrite, true)
})
