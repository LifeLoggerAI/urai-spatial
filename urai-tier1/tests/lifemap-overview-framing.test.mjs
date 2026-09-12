import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import ts from 'typescript'
import * as THREE from 'three'

const base = path.resolve('src/components/lifemap')
const modules = new Map()
function load(file) {
  if (modules.has(file)) return modules.get(file)
  const exports = {}
  modules.set(file, exports)
  new Function('exports', 'require', ts.transpile(fs.readFileSync(file, 'utf8'), { module: ts.ModuleKind.CommonJS }))(exports, id => load(path.resolve(path.dirname(file), `${id}.ts`)))
  return exports
}
const layout = load(path.join(base, 'lifeMapSpatialLayout.ts'))
const display = load(path.join(base, 'lifeMapLayout.ts'))
const nodes = load(path.join(base, 'canonicalLifeMapDemoNodes.ts')).canonicalLifeMapDemoNodes.map(node => ({ ...node, position: display.lifeMapDisplayPosition(node) }))

for (const [width, height] of [[320, 900], [390, 844], [430, 932], [1280, 800], [1440, 900]]) {
  test(`overview fits every sample chapter and its artifact envelope at ${width}×${height}`, () => {
    const portrait = height > width, stage = layout.lifeMapStage(false, portrait)
    const goal = layout.lifeMapOverviewCamera(nodes, portrait, width / height)
    const camera = new THREE.PerspectiveCamera(portrait ? 50 : 52, width / height, .08, 180)
    camera.position.set(...goal.position); camera.lookAt(...goal.target); camera.updateMatrixWorld()
    nodes.forEach((node, index) => {
      const center = layout.lifeMapLocalPoint(node, index).map((value, axis) => value * stage.scale[axis] + stage.position[axis])
      for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) {
        const point = new THREE.Vector3(...center.map((value, axis) => value + [x, y, z][axis] * 2.2 * stage.scale[axis])).project(camera)
        assert.ok(Math.abs(point.x) <= .880001, `${node.id}: horizontal crop`)
        assert.ok(Math.abs(point.y) <= .720001, `${node.id}: header/footer clearance`)
        assert.ok(point.z > -1 && point.z < 1, `${node.id}: depth clipping`)
      }
    })
  })
}
test('empty or invalid nodes cannot produce an invalid overview camera', () => {
  for (const data of [[], [{ ...nodes[0], position: [NaN, 0, 0] }]]) {
    const goal = layout.lifeMapOverviewCamera(data, true, 390 / 844)
    assert.ok([...goal.position, ...goal.target].every(Number.isFinite))
  }
})
