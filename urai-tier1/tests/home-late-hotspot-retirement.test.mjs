import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import * as THREE from 'three'

const source = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionV223.tsx', import.meta.url), 'utf8')
const retirement = source.slice(source.indexOf('const legacyHotspotPatterns ='), source.indexOf('function OrbCompanion('))

test('assets inserted after loading retire obsolete hotspots while preserving current Orb and scenery', () => {
  const scene = new THREE.Scene()
  const microtasks = []
  let cleanup
  const context = vm.createContext({
    THREE,
    useThree: () => ({ scene }),
    useEffect: (effect) => { cleanup = effect() },
    queueMicrotask: (callback) => microtasks.push(callback),
  })
  vm.runInContext(ts.transpileModule(retirement + '\nRetireLegacyHomeHotspots()', { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText, context)
  const late = new THREE.Group()
  const oldOrb = new THREE.Group(); oldOrb.name = 'home-v226-rooted-single-living-memory-presence'
  const oldGround = new THREE.Group(); oldGround.name = 'home-v226-ground-inhabited-hearth'
  const oldRaycast = oldOrb.raycast
  const terrain = new THREE.Group(); terrain.name = 'home-terrain'
  const current = new THREE.Group(); current.name = 'home-orb-living-memory-visible-authority'
  const currentShell = new THREE.Group(); currentShell.name = 'home-orb-reference-glass-shell'
  current.add(currentShell)
  late.add(oldOrb, oldGround, terrain, current)
  scene.add(late)
  // React's suspense unhide can happen later in the same commit.
  oldOrb.visible = true; oldGround.visible = true
  microtasks.splice(0).forEach((callback) => callback())
  assert.equal(oldOrb.visible, false)
  assert.equal(oldGround.visible, false)
  assert.notEqual(oldOrb.raycast, oldRaycast)
  assert.equal(terrain.visible, true)
  assert.equal(currentShell.visible, true)
  cleanup()
  assert.equal(oldOrb.visible, true)
  assert.equal(oldOrb.raycast, oldRaycast)
  const later = new THREE.Group(); later.name = oldOrb.name
  scene.add(later)
  assert.equal(microtasks.length, 0, 'unmounted retirement must detach its listener')
})

test('late scanned Life Map gateways retire while the broad sky and other lights remain', () => {
  const sky = readFileSync(new URL('../src/spatial/assets/HomeAtmosphericSky.tsx', import.meta.url), 'utf8')
  const names = sky.slice(sky.indexOf('const retiredLifeMapNames ='), sky.indexOf('const CLOUD_LAYERS ='))
  const component = sky.slice(sky.indexOf('function RetireLocalizedLifeMapGateways()'), sky.indexOf('const fract ='))
  const scene = new THREE.Scene()
  const microtasks = []
  let cleanup
  const context = vm.createContext({ THREE, useThree: () => ({ scene }), useEffect: (effect) => { cleanup = effect() }, queueMicrotask: (callback) => microtasks.push(callback) })
  vm.runInContext(ts.transpileModule(names + component + '\nRetireLocalizedLifeMapGateways()', { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText, context)
  const late = new THREE.Group(); late.name = 'home-v282-scanned-destination-geology'
  const gateway = new THREE.Group(); gateway.name = 'home-v226-life-map-lineage-observatory'
  const localized = new THREE.PointLight(); localized.position.x = 4
  const ground = new THREE.PointLight(); ground.position.x = -4
  const broadSky = new THREE.Group(); broadSky.name = 'home-sky-broad-ascent'
  late.add(gateway, localized, ground, broadSky)
  scene.add(late)
  microtasks.splice(0).forEach((callback) => callback())
  assert.equal(gateway.visible, false)
  assert.equal(localized.visible, false)
  assert.equal(ground.visible, true)
  assert.equal(broadSky.visible, true)
  cleanup()
  assert.equal(gateway.visible, true)
  assert.equal(localized.visible, true)
  scene.add(new THREE.Group())
  assert.equal(microtasks.length, 0)
})
