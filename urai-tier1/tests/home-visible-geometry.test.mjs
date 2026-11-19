import assert from 'node:assert/strict'
import test from 'node:test'
import { BoxGeometry, Group, Mesh, MeshBasicMaterial } from 'three'
import { hasVisibleHomeGeometry, missingHomeVisualGeometry, HOME_REQUIRED_VISUAL_GEOMETRY } from '../src/spatial/layout/homeVisibleGeometry.ts'

const mesh = (options = {}) => new Mesh(new BoxGeometry(), new MeshBasicMaterial(options))

test('an empty named group is not visual readiness', () => assert.equal(hasVisibleHomeGeometry(new Group()), false))
test('a visible drawable mesh is ready', () => assert.equal(hasVisibleHomeGeometry(mesh()), true))
test('hidden authored mesh is not ready', () => { const object = mesh(); object.visible = false; assert.equal(hasVisibleHomeGeometry(object), false) })
test('a hidden ancestor keeps visible descendants unready', () => {
  const group = new Group(), object = mesh()
  group.add(object); group.visible = false
  assert.equal(hasVisibleHomeGeometry(object), false)
})
for (const options of [{ visible: false }, { colorWrite: false }, { opacity: 0, transparent: true }]) {
  test('invisible material or navigation proxy is not visual readiness ' + JSON.stringify(options), () => assert.equal(hasVisibleHomeGeometry(mesh(options)), false))
}
test('only drawables within a visible subtree count', () => {
  const root = new Group(), hidden = new Group()
  hidden.visible = false; hidden.add(mesh()); root.add(hidden, mesh({ colorWrite: false }))
  assert.equal(hasVisibleHomeGeometry(root), false)
  root.add(mesh()); assert.equal(hasVisibleHomeGeometry(root), true)
})
test('every required world region must have real visible geometry', () => {
  const scene = new Group()
  for (const name of HOME_REQUIRED_VISUAL_GEOMETRY) { const group = new Group(); group.name = name; group.add(mesh()); scene.add(group) }
  assert.deepEqual(missingHomeVisualGeometry(scene), [])
  scene.getObjectByName('home-living-vegetation').visible = false
  assert.deepEqual(missingHomeVisualGeometry(scene), ['home-living-vegetation'])
})
