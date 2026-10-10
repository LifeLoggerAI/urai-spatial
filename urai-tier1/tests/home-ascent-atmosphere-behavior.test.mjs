import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
import ts from 'typescript'
import { jsx, jsxs, Fragment } from 'react/jsx-runtime'
import * as THREE from 'three'

const source = fs.readFileSync(new URL('../src/spatial/layout/HomeWorldProductionPolished.tsx', import.meta.url), 'utf8')
const compile = value => ts.transpileModule(value, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
const jsxRuntime = { jsx, jsxs, Fragment }
const flatten = tree => tree ? [tree, ...[tree.props?.children].flat().flatMap(flatten)] : []

function sceneFixture() {
  const cells = []; let cursor = 0, phase = 'HOME'
  const sceneSource = source.slice(source.indexOf('function Scene(props:'), source.indexOf('\nexport function HomeWorldProductionPolished('))
  const types = ['HomeAscentAtmosphere', 'HomeSkyGradient', 'Stars', 'Environment', 'Lightformer', 'HomeInterpretiveSplatEnvironment', 'Terrain', 'SanctuaryPath', 'Horizon', 'Vegetation', 'GroundDetail', 'SanctuaryPavilion', 'Water', 'ContactShadows', 'OrbPlatform', 'OrbGroundGlow', 'Orb', 'EmbodiedPresence', 'HomeSkyInteraction', 'Thresholds', 'PlayerRig', 'SceneReady']
  const sandbox = { THREE, exports: {}, HOME_INTERPRETIVE_SPLAT_ASSET: null, terrainHeight: () => 0, useRef: initial => { const index = cursor++; cells[index] ??= { current: initial }; return cells[index] }, useSceneStore: select => select({ phase }), require: id => { if (id === 'react/jsx-runtime') return jsxRuntime; throw new Error(id) } }
  sandbox.useMemo = (operation, deps) => {
    const index = cursor++, previous = cells[index]
    if (!previous || deps.some((value, i) => !Object.is(value, previous.deps[i]))) cells[index] = { deps, value: operation() }
    return cells[index].value
  }
  for (const type of types) sandbox[type] = type
  vm.createContext(sandbox); vm.runInContext(compile(sceneSource), sandbox)
  return {
    render(next) { phase = next; cursor = 0; return sandbox.Scene({ reducedMotion: false, orbState: 'idle' }) },
  }
}

test('the active Home Scene retains the same sky, stars, lighting and environment through Ascent and ESC', () => {
  const f = sceneFixture()
  const before = flatten(f.render('HOME')), during = flatten(f.render('ASCENT')), after = flatten(f.render('HOME'))
  const signature = nodes => nodes.map(node => `${String(node.type)}:${node.key ?? ''}`)
  assert.deepEqual(signature(during), signature(before), 'Ascent phase remounted the Home atmosphere before any lift')
  assert.deepEqual(signature(after), signature(before))
  const starsBefore = before.find(node => node.type === 'Stars'), starsDuring = during.find(node => node.type === 'Stars')
  if (starsBefore) assert.deepEqual(starsDuring.props, starsBefore.props, 'Stars regenerated random positions/sizes when phase changed')
  const rig = during.find(node => node.type === 'PlayerRig')
  const atmosphere = during.find(node => node.type === 'HomeAscentAtmosphere')
  assert.ok(atmosphere, 'the atmosphere must use actual camera progress')
  assert.equal(rig.props.ascentProgress, atmosphere.props.ascentProgress, 'camera and environment have different progress owners')
  assert.equal(atmosphere, before.find(node => node.type === 'HomeAscentAtmosphere'), 'store progress rerenders recaptured frames=1 lighting or shadows')
  assert.equal(atmosphere, after.find(node => node.type === 'HomeAscentAtmosphere'))
})

function atmosphereFixture() {
  const start = source.indexOf('function HomeAscentAtmosphere('), end = source.indexOf('\nfunction Scene(props:', start)
  assert.ok(start >= 0 && end > start, 'the active continuous atmosphere component is required')
  const progress = { current: 0 }, scene = new THREE.Scene(), owner = { dataset: {} }
  const cells = [], layouts = []; let cursor = 0, frame
  const skySource = fs.readFileSync(new URL('../src/spatial/layout/HomeSanctuaryMaterials.tsx', import.meta.url), 'utf8')
  const skySandbox = { THREE, exports: {}, require: () => jsxRuntime }
  vm.createContext(skySandbox); vm.runInContext(compile(skySource.slice(skySource.indexOf('export function HomeSkyGradient(')).replace('export function', 'function')), skySandbox)
  const dreiSource = fs.readFileSync(new URL('../../node_modules/@react-three/drei/core/Stars.js', import.meta.url), 'utf8')
  const starSandbox = { ShaderMaterial: THREE.ShaderMaterial, version: Number(THREE.REVISION) }
  vm.createContext(starSandbox); vm.runInContext(dreiSource.slice(dreiSource.indexOf('class StarfieldMaterial'), dreiSource.indexOf('\nconst genStar')), starSandbox)
  const sandbox = { THREE, exports: {}, HomeSkyGradient: 'HomeSkyGradient', Stars: 'Stars', Environment: 'Environment', Lightformer: 'Lightformer', ContactShadows: 'ContactShadows', terrainHeight: () => 0,
    useThree: () => ({ scene, gl: { domElement: { closest: () => owner } } }),
    useRef: initial => { const index = cursor++; cells[index] ??= { current: initial }; return cells[index] },
    useLayoutEffect: operation => layouts.push(operation), useFrame: callback => { frame = callback },
    require: id => { if (id === 'react/jsx-runtime') return jsxRuntime; throw new Error(id) },
  }
  vm.createContext(sandbox); vm.runInContext(compile(source.slice(start, end)), sandbox)
  const tree = sandbox.HomeAscentAtmosphere({ ascentProgress: progress, reducedMotion: false })
  const nodes = flatten(tree), objects = new Map()
  for (const node of nodes) {
    let object
    if (node.type === 'primitive') { object = node.props.object; if (node.props.attach) scene[node.props.attach] = object }
    if (node.type === 'ambientLight') object = new THREE.AmbientLight(node.props.color, node.props.intensity)
    if (node.type === 'hemisphereLight') object = new THREE.HemisphereLight(...node.props.args)
    if (node.type === 'directionalLight') object = new THREE.DirectionalLight(node.props.color, node.props.intensity)
    if (node.type === 'pointLight') object = new THREE.PointLight(node.props.color, node.props.intensity)
    if (node.type === 'Stars') {
      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(node.props.count * 3), 3))
      geometry.setAttribute('size', new THREE.BufferAttribute(new Float32Array(node.props.count).fill(node.props.factor), 1))
      object = new THREE.Points(geometry, vm.runInContext('new StarfieldMaterial()', starSandbox))
    }
    if (node.type === 'ContactShadows') { object = new THREE.Group(); object.add(new THREE.Mesh(new THREE.PlaneGeometry(), new THREE.MeshBasicMaterial({ transparent: true, opacity: node.props.opacity }))) }
    if (node.type === 'HomeSkyGradient') {
      const skyTree = skySandbox.HomeSkyGradient(node.props), material = flatten(skyTree).find(child => child.type === 'shaderMaterial')
      object = new THREE.Mesh(new THREE.SphereGeometry(), new THREE.ShaderMaterial(material.props))
      object.name = skyTree.props.name
    }
    if (object) {
      if (node.props.ref) node.props.ref.current = object
      objects.set(node.props.name ?? String(node.type), object)
      if (object instanceof THREE.Object3D) scene.add(object)
    }
  }
  for (const operation of layouts) operation()
  return { progress, scene, owner, objects, nodes, remountEffects() { for (const operation of layouts) operation() }, step(value) { progress.current = value; frame({}, 1 / 60) } }
}

test('mounted Home atmosphere preserves authored endpoints and reverses with the same objects and star buffers', () => {
  const f = atmosphereFixture()
  const stars = f.objects.get('Stars'), sky = f.objects.get('HomeSkyGradient')
  const geometry = stars.geometry, positions = geometry.getAttribute('position'), sizes = geometry.getAttribute('size')
  const background = f.scene.background, fog = f.scene.fog
  f.step(0)
  assert.equal(background.getHexString(), '101d30')
  assert.equal(fog.color.getHexString(), '172a38')
  assert.equal(fog.density, .006)
  assert.equal(f.objects.get('home-ascent-ambient').intensity, .26)
  assert.equal(f.objects.get('home-ascent-key-light').intensity, 1.12)
  assert.equal(f.scene.environmentIntensity, 1)
  assert.equal(f.objects.get('ContactShadows').children[0].material.opacity, .32)
  assert.equal(sky.material.uniforms.uHomeAscent.value, 0)
  assert.equal(stars.material.uniforms.uHomeAscent.value, 0)
  const reveal = stars.geometry.getAttribute('homeAscentStar')
  assert.equal(reveal.count, 2200)
  assert.equal(Array.from(reveal.array).filter(value => value === 0).length, 700)
  for (const value of [.2, .5, .8, 1, .8, .5, .2, 0]) {
    f.step(value)
    assert.equal(f.scene.background, background)
    assert.equal(f.scene.fog, fog)
    assert.equal(stars.geometry, geometry)
    assert.equal(stars.geometry.getAttribute('position'), positions)
    assert.equal(stars.geometry.getAttribute('size'), sizes)
    assert.equal(sky.material.uniforms.uHomeAscent.value, value)
    assert.equal(stars.material.uniforms.uHomeAscent.value, value)
    assert.equal(f.owner.dataset.homeAtmosphereProgress, value.toFixed(6))
    if (value === 1) {
      assert.equal(background.getHexString(), '01050b')
      assert.equal(fog.color.getHexString(), '050b14')
      assert.ok(Math.abs(fog.density - .0017) < 1e-9)
      assert.equal(f.objects.get('home-ascent-ambient').intensity, .13)
      assert.ok(Math.abs(f.objects.get('home-ascent-key-light').intensity - .34) < 1e-9)
      assert.equal(f.scene.environmentIntensity, 0)
      assert.equal(f.objects.get('home-ascent-warm-light').intensity, 0)
      assert.equal(f.objects.get('home-ascent-cool-light').intensity, 0)
      assert.equal(f.objects.get('ContactShadows').children[0].material.opacity, 0)
    }
  }
  assert.equal(background.getHexString(), '101d30')
  assert.equal(f.scene.environmentIntensity, 1)
  assert.match(sky.material.fragmentShader, /1\.0 - uHomeAscent/)
  assert.match(stars.material.fragmentShader, /opacity \* vHomeStarVisibility/)
})

test('atmospheric effect replay retains star buffers and shader declarations without invalid progress poisoning the scene', () => {
  const f = atmosphereFixture(), stars = f.objects.get('Stars')
  const reveal = stars.geometry.getAttribute('homeAscentStar')
  const vertex = stars.material.vertexShader, fragment = stars.material.fragmentShader
  f.remountEffects()
  assert.equal(stars.geometry.getAttribute('homeAscentStar'), reveal)
  assert.equal(stars.material.vertexShader, vertex)
  assert.equal(stars.material.fragmentShader, fragment)
  for (const value of [NaN, Infinity, -1]) {
    f.step(value)
    assert.equal(f.scene.background.getHexString(), '101d30')
    assert.equal(stars.material.uniforms.uHomeAscent.value, 0)
  }
  f.step(2)
  assert.equal(stars.material.uniforms.uHomeAscent.value, 1)
  assert.equal(f.scene.background.getHexString(), '01050b')
})
