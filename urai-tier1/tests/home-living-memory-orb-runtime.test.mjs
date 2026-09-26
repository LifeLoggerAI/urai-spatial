import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'
import * as THREE from 'three'
import { applyProps } from '@react-three/fiber'

const read = path => fs.readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8')
function declarations(path, names) {
  const ast = ts.createSourceFile(path, read(path), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  return ast.statements.filter(node => names.includes(node.name?.text)
    || (ts.isVariableStatement(node) && node.declarationList.declarations.some(d => names.includes(d.name.text))))
    .map(node => node.getText(ast).replace(/^export\s+/, '')).join('\n')
}
const source = declarations('spatial/layout/HomeWorldProductionV223.tsx', [
  'ORB_MODEL', 'ORB_POSITION', 'ORB_FIELD_RADIUS', 'ORB_FIELD_Y_SCALE', 'ORB_GROUND_CLEARANCE', 'ORB_REST_OFFSET',
  'ORB_CLIPS', 'ORB_STATE_MOTION', 'ORB_EFFECT_BUDGET', 'cloneAuthoredModel', 'prepareAuthoredOrbModel', 'OrbCompanion',
]) + '\n' + declarations('spatial/layout/HomeVisualAuthority.tsx', ['HomeVisualAuthority'])
const placement = declarations('spatial/home/homeOrbPlacement.ts', ['HOME_ORB_GROUND_ANCHOR'])
const terrain = declarations('spatial/layout/HomeWorldProductionV223Geometry.tsx', ['ORB', 'GROUND', 'LIFE_MAP', 'centerline', 'height'])
const camera = declarations('spatial/home/homeExperienceState.ts', ['DEFAULT_HOME_FIRST_PERSON_CAMERA'])
const compiled = ts.transpileModule([placement, terrain, camera, source,
  'module.exports = { OrbCompanion, HomeVisualAuthority, height, HOME_ORB_GROUND_ANCHOR, DEFAULT_HOME_FIRST_PERSON_CAMERA }',
].join('\n'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText

// Execute actual JSX, material values and frame callbacks with real Three objects.
// React scheduling is bounded here; literal browser pixels remain a separate gate.
function fixture(state = 'idle', reducedMotion = false) {
  const effects = [], frames = [], listeners = new Map(), handlers = new Map()
  let activations = 0
  const sourceModel = new THREE.Group(), texture = new THREE.Texture()
  const authored = new THREE.Mesh(new THREE.SphereGeometry(.45, 16, 16), new THREE.MeshPhysicalMaterial({ map: texture, normalMap: texture, roughnessMap: texture, metalnessMap: texture, aoMap: texture, emissiveMap: texture }))
  authored.name = 'orb-memory-fold-1'
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.3, .01), new THREE.MeshStandardMaterial())
  ring.name = 'orb-equatorial-ring'; sourceModel.add(authored, ring)
  const constructors = { group: THREE.Group, mesh: THREE.Mesh, points: THREE.Points, pointLight: THREE.PointLight,
    sphereGeometry: THREE.SphereGeometry, meshPhysicalMaterial: THREE.MeshPhysicalMaterial,
    meshStandardMaterial: THREE.MeshStandardMaterial, pointsMaterial: THREE.PointsMaterial }
  function jsx(type, props = {}) {
    if (typeof type === 'function') return type(props)
    const object = type === 'primitive' ? props.object : new constructors[type](...(props.args ?? []))
    const { children, ref, args, onClick, object: primitive, ...rest } = props
    applyProps(object, rest)
    if (ref) ref.current = object
    if (onClick) handlers.set(object, onClick)
    for (const child of [children].flat(Infinity).filter(Boolean)) {
      if (child instanceof THREE.BufferGeometry) object.geometry = child
      else if (child instanceof THREE.Material) object.material = child
      else object.add(child)
    }
    return object
  }
  const scope = { THREE, module: { exports: {} }, exports: {},
    useRef: current => ({ current }), useMemo: fn => fn(), useEffect: fn => effects.push(fn), useFrame: fn => frames.push(fn),
    useGLTF: () => ({ scene: sourceModel, animations: [] }), useAnimations: () => ({ actions: {} }),
    useAdaptiveSpatialQuality: () => ({ tier: 'medium' }),
    resolveOrbSensoryOutput: () => ({ animation: 'fixture', light: { intensity: 1 } }), ORB_SPEECH_CLOCK_EVENT: 'speech',
    window: { addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: name => listeners.delete(name) },
    require: name => { if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx }; throw new Error(name) } }
  vm.runInNewContext(compiled, scope)
  const api = scope.module.exports, orb = api.OrbCompanion({ state, reducedMotion, onOrb: () => activations++ })
  const boundary = api.HomeVisualAuthority({ children: orb }), cleanup = effects.map(fn => fn()).filter(Boolean)
  return { ...api, orb, boundary, authored, ring, handlers,
    speech: detail => listeners.get('speech')?.({ detail }),
    frame(t = 0) { frames.forEach(fn => fn({ clock: { elapsedTime: t } }, 1 / 60)); boundary.updateMatrixWorld(true) },
    activate() { handlers.get(orb)({ stopPropagation() {} }) }, activations: () => activations,
    dispose() { cleanup.forEach(fn => fn()); boundary.traverse(object => { object.geometry?.dispose() }); texture.dispose() } }
}

test('actual Home Orb JSX has one semantic click owner and visible translucent layers inside a one-metre shell', () => {
  const f = fixture(); f.frame()
  assert.equal(f.boundary.name, 'home-orb-living-memory-visible-authority')
  assert.equal(f.boundary.children.length, 1); assert.equal(f.boundary.children[0], f.orb)
  assert.equal(f.handlers.size, 1, 'A click must not invoke both shell and ancestor owners')
  f.activate(); assert.equal(f.activations(), 1)
  assert.equal(f.orb.userData.interactionOwner, true); assert.equal(f.orb.userData.visualOwner, true)
  assert.equal(f.orb.userData.visualAuthority, 'living-memory-translucent-heart'); assert.equal(f.orb.userData.certified, false)
  const shell = f.orb.getObjectByName('home-orb-reference-glass-shell')
  assert.ok(shell.material instanceof THREE.MeshPhysicalMaterial)
  assert.equal(shell.material.colorWrite, true); assert.equal(shell.material.transparent, true)
  assert.ok(shell.material.opacity > 0 && shell.material.opacity <= .2); assert.ok(shell.material.transmission >= .7)
  assert.equal(shell.material.depthWrite, false); assert.equal(shell.castShadow, false)
  const size = new THREE.Box3().setFromObject(shell, true).getSize(new THREE.Vector3())
  assert.ok(Math.abs(size.x - 1) < .002); assert.ok(Math.abs(size.y - 1.04) < .002)
  for (const name of ['home-orb-luminous-inner-volume','home-orb-memory-motes','home-orb-memory-bloom-core']) {
    const layer = f.orb.getObjectByName(name); assert.ok(layer?.visible, name)
    assert.equal(layer.material.colorWrite, true); assert.ok(layer.material.opacity > 0)
  }
  assert.ok(f.orb.children.find(object => object instanceof THREE.PointLight)?.visible)
  assert.equal(f.boundary.getObjectByName('home-v288-grounded-biomorphic-memory-reliquary'), undefined)
  f.dispose()
})

test('cloned interior materials lose stone texture/depth occlusion without mutating cached source assets', () => {
  const f = fixture(), inner = f.orb.getObjectByName('orb-memory-fold-1')
  assert.notEqual(inner.material, f.authored.material)
  for (const map of ['map','normalMap','roughnessMap','metalnessMap','aoMap','emissiveMap']) {
    assert.equal(inner.material[map], null); assert.ok(f.authored.material[map] instanceof THREE.Texture)
  }
  assert.equal(inner.material.transparent, true); assert.equal(inner.material.depthWrite, false)
  assert.ok(inner.material.opacity < .4); assert.equal(inner.castShadow, false)
  assert.equal(f.orb.getObjectByName('orb-equatorial-ring').visible, false); assert.equal(f.ring.visible, true)
  f.dispose()
})

test('all states preserve terrain clearance and the arrival corridor, including maximum speech expansion', () => {
  for (const state of ['dormant','idle','attention','listening','thinking','speaking','guiding','reflecting','calming','privacy','warning','transition']) {
    for (const reducedMotion of [false, true]) {
      const f = fixture(state, reducedMotion)
      f.speech({ phase: 'start', source: 'natural' }); f.speech({ phase: 'frame', source: 'natural', amplitude: 1 })
      for (const time of [0, 8, 32, 60]) {
        f.frame(time)
        const shell = f.orb.getObjectByName('home-orb-reference-glass-shell'), bounds = new THREE.Box3().setFromObject(shell, true)
        const groundY = f.height(f.HOME_ORB_GROUND_ANCHOR.x, f.HOME_ORB_GROUND_ANCHOR.z)
        assert.ok(bounds.min.y - groundY >= .0149, `${state}: shell penetrates terrain clearance`)
        const c = f.DEFAULT_HOME_FIRST_PERSON_CAMERA
        const ray = new THREE.Raycaster(new THREE.Vector3(...c.position), new THREE.Vector3(0, Math.sin(c.pitch), -Math.cos(c.pitch)))
        assert.equal(ray.intersectObject(shell, true).length, 0, `${state}: arrival sightline blocked`)
        const corridor = new THREE.Box3(new THREE.Vector3(-.4, -1, -8), new THREE.Vector3(.4, 1.8, c.position[2]))
        assert.equal(bounds.clone().expandByScalar(.05).intersectsBox(corridor), false)
      }
      f.dispose()
    }
  }
})

test('reduced-motion speech preserves shell transform while privacy state remains visibly translucent', () => {
  const f = fixture('privacy', true); f.frame()
  const shell = f.orb.getObjectByName('home-orb-reference-glass-shell'), before = shell.matrixWorld.toArray()
  f.speech({ phase: 'start', source: 'natural' }); f.speech({ phase: 'frame', source: 'natural', amplitude: 1 }); f.frame(60)
  assert.deepEqual(shell.matrixWorld.toArray(), before)
  assert.ok(shell.material.opacity > .1 && shell.material.opacity < .2); assert.equal(shell.material.colorWrite, true)
  f.dispose()
})
