import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const THREE = require('three')
const source = fs.readFileSync(new URL('../src/spatial/council/CouncilRealm.tsx', import.meta.url), 'utf8')
const ast = ts.createSourceFile('CouncilRealm.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const names = ['COUNCIL_FLOOR_Y', 'COUNCIL_ENTRY', 'COUNCIL_NARROW_ENTRY_X', 'COUNCIL_ENTRY_PITCH', 'COUNCIL_FOV', 'POSITIONS', 'ROTATIONS']
const declarations = ast.statements.filter(node => ts.isVariableStatement(node)
  && node.declarationList.declarations.some(decl => names.includes(decl.name.getText(ast))))
const settings = vm.runInNewContext(ts.transpileModule(declarations.map(node => node.getText(ast)).join('\n')
  + '\n;({' + names.join(',') + '})', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText)
const roles = ['guide', 'archivist', 'guardian', 'builder', 'mirror', 'trickster']
const models = roles.map(role => {
  const bytes = fs.readFileSync(new URL('../public/assets/urai/generated/human-makehuman-v4/council-' + role + '-human-makehuman-v4.glb', import.meta.url))
  const json = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)))
  const root = new THREE.Group(), nodes = json.nodes.map(node => {
    const object = new THREE.Object3D()
    if (node.translation) object.position.fromArray(node.translation)
    if (node.rotation) object.quaternion.fromArray(node.rotation)
    if (node.scale) object.scale.fromArray(node.scale)
    return object
  })
  json.nodes.forEach((node, index) => node.children?.forEach(child => nodes[index].add(nodes[child])))
  json.scenes[json.scene ?? 0].nodes.forEach(index => root.add(nodes[index]))
  root.updateMatrixWorld(true)
  return { json, head: nodes[json.nodes.findIndex(node => node.name === 'head')].getWorldPosition(new THREE.Vector3()) }
})

test('actual presence frame keeps the retained foot plane on the room floor in both motion modes', () => {
  const component = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'RiggedCouncilHuman')
  let callback
  const visit = node => {
    if (ts.isCallExpression(node) && node.expression.getText(ast) === 'useFrame') callback = node.arguments[0]
    ts.forEachChild(node, visit)
  }
  visit(component)
  assert.ok(callback)
  for (const reducedMotion of [false, true]) for (let index = 0; index < models.length; index += 1) {
    const root = { current: new THREE.Group() }
    const frame = vm.runInNewContext(ts.transpileModule('(' + callback.getText(ast) + ')', {
      compilerOptions: { target: ts.ScriptTarget.ES2022 },
    }).outputText, { ...settings, root, index, reducedMotion, ownerRef: { current: null } })
    for (const elapsedTime of [0, 1, 7, 100]) {
      frame({ clock: { elapsedTime } })
      assert.equal(root.current.position.y, settings.COUNCIL_FLOOR_Y)
    }
    const model = models[index].json
    const minY = Math.min(...model.meshes.flatMap(mesh => mesh.primitives.map(primitive => model.accessors[primitive.attributes.POSITION].min[1])))
    assert.ok(Math.abs(minY + root.current.position.y - settings.COUNCIL_FLOOR_Y) < 1e-5)
  }
})

test('default selected retained head projects clear of the conversation panel on desktop and narrow views', () => {
  for (const [width, height] of [[1440, 900], [390, 844], [320, 568]]) {
    const camera = new THREE.PerspectiveCamera(settings.COUNCIL_FOV, width / height, .1, 100)
    const x = width <= 900 ? settings.COUNCIL_NARROW_ENTRY_X : settings.COUNCIL_ENTRY[0]
    camera.position.set(x, settings.COUNCIL_ENTRY[1], settings.COUNCIL_ENTRY[2])
    camera.lookAt(x, camera.position.y + Math.sin(settings.COUNCIL_ENTRY_PITCH), camera.position.z - Math.cos(settings.COUNCIL_ENTRY_PITCH))
    camera.updateMatrixWorld()
    const head = models[0].head.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), settings.ROTATIONS[0][1]).add(new THREE.Vector3(...settings.POSITIONS[0])).project(camera)
    const screen = { x: (head.x + 1) * width / 2, y: (1 - head.y) * height / 2 }
    const panelRight = width > 900 ? 462 : width - 100
    assert.ok(screen.x > panelRight + 16 && screen.x < width - 16, JSON.stringify({ width, screen, panelRight }))
    assert.ok(screen.y > 64 && screen.y < height - 80)
  }
  assert.match(source, /size\.width <= 900 \? COUNCIL_NARROW_ENTRY_X : COUNCIL_ENTRY\[0\]/)
})

test('presences face the arrival side without near-side occluders or unsupported shoulder deformation', () => {
  for (let index = 0; index < settings.POSITIONS.length; index += 1) {
    const position = new THREE.Vector3(...settings.POSITIONS[index])
    assert.ok(position.z <= -1.4, 'A near-side presence would hide the far-side meeting')
    const toEntry = new THREE.Vector3(...settings.COUNCIL_ENTRY).sub(position).setY(0).normalize()
    const facing = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), settings.ROTATIONS[index][1])
    assert.ok(facing.dot(toEntry) > .6, 'The retained person must face the arrival side')
  }
  assert.doesNotMatch(source, /joint\.rotateZ|L_shoulder|R_shoulder/)
  assert.match(source, /playCouncilBodyIdle\(actions, reducedMotion\)/)
  assert.match(source, /playCouncilListening\(actions, selected, reducedMotion\)/)
})
