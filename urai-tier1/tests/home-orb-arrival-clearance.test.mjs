import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'
import * as THREE from 'three'

const read = (file) => fs.readFileSync(new URL(`../src/spatial/${file}`, import.meta.url), 'utf8')
function declarations(file, names) {
  const ast = ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  return ast.statements.filter((node) => names.includes(node.name?.text)
    || (ts.isVariableStatement(node) && node.declarationList.declarations.some((declaration) => names.includes(declaration.name.text))))
    .map((node) => node.getText(ast).replace(/^export\s+/, '')).join('\n')
}
const selected = declarations('layout/HomeWorldProductionV223Geometry.tsx', ['ORB', 'GROUND', 'LIFE_MAP', 'centerline', 'height'])
  + '\n' + declarations('assets/HomeOrbReliquaryV286.tsx', ['plateSpecsV286', 'seededWave', 'reliquaryPlateGeometryV286'])
  + '\n' + declarations('home/homeOrbPlacement.ts', ['HOME_ORB_GROUND_ANCHOR'])
  + '\n' + declarations('home/homeExperienceState.ts', ['DEFAULT_HOME_FIRST_PERSON_CAMERA'])
const scope = { THREE, module: { exports: {} } }
const program = selected + '\nmodule.exports = { ORB, height, plateSpecsV286, reliquaryPlateGeometryV286, HOME_ORB_GROUND_ANCHOR, DEFAULT_HOME_FIRST_PERSON_CAMERA }'
vm.runInNewContext(ts.transpileModule(program, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, scope)
const source = scope.module.exports
const orbSource = read('assets/HomeOrbReliquaryV286.tsx')
const ast = ts.createSourceFile('orb.tsx', orbSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
let shellAttributes
function visit(node) {
  if (ts.isJsxOpeningElement(node) && node.attributes.properties.some((attribute) => attribute.name?.text === 'ref' && attribute.initializer?.expression?.getText(ast) === 'shellRoot')) {
    shellAttributes = Object.fromEntries(node.attributes.properties.filter((attribute) => ['position', 'rotation', 'scale'].includes(attribute.name?.text))
      .map((attribute) => [attribute.name.text, attribute.initializer.expression.getText(ast)]))
  }
  ts.forEachChild(node, visit)
}
visit(ast)
assert.ok(shellAttributes, 'Use the actual visible shell transform')

function shellAt(anchor, portrait) {
  const root = new THREE.Group()
  root.position.set(anchor.x - source.ORB.x, source.height(anchor.x, anchor.z) - source.height(source.ORB.x, source.ORB.z), anchor.z - source.ORB.z)
  const shell = new THREE.Group()
  const context = { portrait, ORB: source.ORB, y: source.height(source.ORB.x, source.ORB.z) }
  const expression = (name) => vm.runInNewContext(`(${shellAttributes[name]})`, context)
  shell.position.fromArray(expression('position'))
  shell.rotation.fromArray(expression('rotation'))
  shell.scale.fromArray(expression('scale'))
  root.add(shell)
  for (const spec of source.plateSpecsV286) {
    const plate = new THREE.Mesh(source.reliquaryPlateGeometryV286(spec.seed), new THREE.MeshBasicMaterial())
    plate.position.fromArray(spec.position)
    plate.rotation.fromArray(spec.rotation)
    plate.scale.fromArray(spec.scale)
    shell.add(plate)
  }
  root.updateMatrixWorld(true)
  return root
}

test('historical relocated desktop and portrait reliquary fixtures clear the arrival corridor', () => {
  const camera = source.DEFAULT_HOME_FIRST_PERSON_CAMERA
  const ray = new THREE.Raycaster(new THREE.Vector3(...camera.position), new THREE.Vector3(0, Math.sin(camera.pitch), -Math.cos(camera.pitch)))
  const corridor = new THREE.Box3(new THREE.Vector3(-.4, -1, -8), new THREE.Vector3(.4, 1.8, camera.position[2]))
  for (const portrait of [false, true]) {
    const current = shellAt(source.HOME_ORB_GROUND_ANCHOR, portrait)
    const former = shellAt({ x: 1.02, z: .72 }, portrait)
    assert.equal(ray.intersectObject(current, true).length, 0, 'Current shell blocks the initial view')
    assert.equal(new THREE.Box3().setFromObject(current, true).expandByScalar(.05).intersectsBox(corridor), false, 'Shell and motion margin enter the central path')
    assert.ok(ray.intersectObject(former, true).length > 0, 'Regression fixture must detect the retained-pixel obstruction')
    for (const object of [current, former]) object.traverse((node) => { if (node instanceof THREE.Mesh) { node.geometry.dispose(); node.material.dispose() } })
  }
})

test('the current Orb visual and semantic owner use one shared ground anchor', () => {
  const runtime = read('layout/HomeWorldProductionV223.tsx')
  const visual = read('layout/HomeVisualAuthority.tsx')
  assert.match(runtime, /new THREE\.Vector3\(HOME_ORB_GROUND_ANCHOR\.x, 0, HOME_ORB_GROUND_ANCHOR\.z\)/)
  assert.match(runtime, /<HomeVisualAuthority>\s*<OrbCompanion/)
  assert.doesNotMatch(visual, /HomeOrbGroundedV288|HomeOrbReliquaryV286|position=/)
})

test('Home mounts exactly one visible Orb and the sky owns no duplicate presence', () => {
  const runtime = read('layout/HomeWorldProductionV223.tsx')
  const sky = read('assets/HomeAtmosphericSky.tsx')
  assert.equal((runtime.match(/<HomeVisualAuthority>/g) ?? []).length, 1)
  assert.equal((runtime.match(/<OrbCompanion /g) ?? []).length, 1)
  assert.doesNotMatch(sky, /HomeVisualAuthority|HomeOrbGroundedV288|HomeOrbReliquaryV286/)
})
