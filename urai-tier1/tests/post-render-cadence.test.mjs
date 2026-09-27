import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import * as THREE from 'three'
import { createPostRenderCadence } from '../src/spatial/performance/postRenderCadence.ts'

function fixture(intervalMs = 100, shouldContinue) {
  let now = 0
  let sequence = 0
  const timers = new Map()
  const invalidations = []
  const cadence = createPostRenderCadence({
    intervalMs,
    shouldContinue,
    invalidate: () => invalidations.push(now),
    schedule(callback, delay) {
      const id = ++sequence
      timers.set(id, { callback, due: now + delay })
      return id
    },
    cancel: (id) => timers.delete(id),
  })
  return {
    cadence, timers, invalidations,
    // Simulate a blocking CPU render separately from processing due tasks.
    block(ms) { now += ms },
    tick(ms) {
      now += ms
      for (const [id, timer] of [...timers]) {
        if (timer.due <= now) {
          timers.delete(id)
          timer.callback()
        }
      }
    },
  }
}

test('a reduced-motion scene sleeps at rest and resumes through input-driven frames', () => {
  let moving = false
  const f = fixture(280, () => moving)
  f.cadence.start()
  f.cadence.beforeRender()
  f.cadence.afterRender()
  f.tick(30_000)
  assert.deepEqual(f.invalidations, [0], 'idle scene must not submit repeated expensive draws')
  assert.equal(f.timers.size, 0)
  moving = true
  // The input owner invalidates a new draw; held movement needs continuation.
  f.cadence.beforeRender()
  f.cadence.afterRender()
  f.tick(280)
  assert.equal(f.invalidations.length, 2)
  f.cadence.beforeRender()
  moving = false
  f.cadence.afterRender()
  f.tick(30_000)
  assert.equal(f.invalidations.length, 2, 'settled movement returns to sleep')
  assert.equal(f.timers.size, 0)
})

test('a slow render receives a full idle interval after completion without timer backlog', () => {
  const f = fixture()
  f.cadence.start()
  f.cadence.start()
  assert.deepEqual(f.invalidations, [0])
  assert.equal(f.timers.size, 0, 'no recurrent timer before the requested frame renders')
  f.cadence.beforeRender()
  f.block(2_000)
  f.cadence.afterRender()
  f.tick(99)
  assert.deepEqual(f.invalidations, [0], 'slow draw must not consume its idle budget')
  f.tick(1)
  assert.deepEqual(f.invalidations, [0, 2_100])
  assert.equal(f.timers.size, 0)
  f.tick(5_000)
  assert.equal(f.invalidations.length, 2, 'a pending frame must not accumulate invalidations')
})

test('unrelated canvas after-effects cannot schedule this canvas or duplicate its timer', () => {
  const f = fixture()
  f.cadence.start()
  f.cadence.afterRender()
  f.tick(500)
  assert.equal(f.timers.size, 0)
  assert.equal(f.invalidations.length, 1)
  f.cadence.beforeRender()
  f.cadence.afterRender()
  f.cadence.afterRender()
  assert.equal(f.timers.size, 1)
})

test('an early input-driven draw replaces the old timer with a fresh post-render delay', () => {
  const f = fixture()
  f.cadence.start()
  f.cadence.beforeRender()
  f.cadence.afterRender()
  f.tick(40)
  f.cadence.beforeRender()
  assert.equal(f.timers.size, 0)
  f.block(500)
  f.cadence.afterRender()
  f.tick(99)
  assert.equal(f.invalidations.length, 1)
  f.tick(1)
  assert.deepEqual(f.invalidations, [0, 640])
})

test('reduced-motion cadence preserves its longer quiet interval after each completed draw', () => {
  const f = fixture(280)
  f.cadence.start()
  f.cadence.beforeRender()
  f.block(300)
  f.cadence.afterRender()
  f.tick(279)
  assert.equal(f.invalidations.length, 1)
  f.tick(1)
  assert.deepEqual(f.invalidations, [0, 580])
})

test('disposing cancels pending timers and ignores a callback already taken by the event loop', () => {
  const f = fixture()
  f.cadence.start()
  f.cadence.beforeRender()
  f.cadence.afterRender()
  const queued = [...f.timers.values()][0].callback
  f.cadence.dispose()
  f.cadence.dispose()
  assert.equal(f.timers.size, 0)
  queued()
  f.cadence.start()
  f.cadence.beforeRender()
  f.cadence.afterRender()
  f.tick(1_000)
  assert.deepEqual(f.invalidations, [0])
  assert.equal(f.timers.size, 0)
})

test('unmounting while a requested frame is pending cannot restart the cadence', () => {
  const f = fixture()
  f.cadence.start()
  f.cadence.beforeRender()
  f.cadence.dispose()
  f.cadence.afterRender()
  f.tick(1_000)
  assert.deepEqual(f.invalidations, [0])
  assert.equal(f.timers.size, 0)
})

test('Home wires the after-render lifecycle and retains software demand mode on Canvas updates', () => {
  const source = fs.readFileSync(new URL('../src/spatial/layout/HomeWorldProductionV223.tsx', import.meta.url), 'utf8')
  assert.match(source, /useFrame\(\(\) => cadenceRef\.current\?\.beforeRender\(\)\)/)
  assert.match(source, /gl\.compileAsync\(scene, camera\)\.then/)
  assert.match(source, /if \(!cancelled\) onReady\(\)/)
  assert.match(source, /addAfterEffect\(cadence\.afterRender\)/)
  assert.match(source, /stopAfterRender\(\)/)
  assert.match(source, /frameloop=\{!sceneReady \? 'never' : reducedMotion \|\| softwareRenderer \? 'demand' : 'always'\}/)
  assert.match(source, /if \(!ready\) \{ setFrameloop\('never'\); return \}/)
  assert.doesNotMatch(source, /setTimeout\(renderNext|const bootstrap = \[/)
})

function atmosphereFrame(reducedMotion) {
  const source = fs.readFileSync(new URL('../src/spatial/assets/HomeAtmosphericSky.tsx', import.meta.url), 'utf8')
  const body = source.match(/useFrame\((\(\{ camera, clock \}, delta\) => \{[\s\S]*?)\n  \}\)\n\n  const validSkyRay/)
  assert.ok(body, 'exercise the actual atmosphere frame callback')
  const material = () => ({ uniforms: new Proxy({}, { get: (target, key) => target[key] ??= { value: 0 } }) })
  const weather = { clarity: .2, cloudCover: .8, aerosolDensity: .7, windCoherence: .4, horizonTransmission: .3, celestialVisibility: .1 }
  const time = { luminance: .3, temperatureBias: .2, celestialMultiplier: .8 }
  const zero = (object) => Object.fromEntries(Object.keys(object).map(key => [key, 0]))
  const state = {
    THREE, reducedMotion, active: false, focused: true,
    atmosphere: { current: null },
    weatherTarget: { current: weather }, weatherCurrent: { current: zero(weather) },
    blueHourTarget: { current: time }, blueHourCurrent: { current: zero(time) },
    atmosphereMaterial: material(), starMaterial: material(), cloudMaterials: [material()],
    scene: { fog: new THREE.FogExp2('#ffffff', .01) }, fogTargetColor: new THREE.Color(),
    gl: { getPixelRatio: () => 1 },
  }
  const frame = vm.runInNewContext(`(${body[1]}\n})`, state)
  frame({ camera: { position: new THREE.Vector3() }, clock: { elapsedTime: 0 } }, 0)
  return state
}

test('one reduced-motion frame applies weather, time, focus and fog without continuation', () => {
  const s = atmosphereFrame(true)
  assert.equal(s.atmosphereMaterial.uniforms.uClarity.value, .2)
  assert.equal(s.atmosphereMaterial.uniforms.uTimeLuminance.value, .3)
  assert.equal(s.cloudMaterials[0].uniforms.uCloudCover.value, .8)
  assert.equal(s.atmosphereMaterial.uniforms.uFocus.value, .55)
  assert.equal(s.starMaterial.uniforms.uTimeStars.value, .8)
  assert.equal(s.scene.fog.density, .01 + .7 * .009 - .2 * .0025)
})

test('normal-motion atmosphere retains interpolation instead of jumping to targets', () => {
  const s = atmosphereFrame(false)
  assert.equal(s.atmosphereMaterial.uniforms.uClarity.value, 0)
  assert.equal(s.atmosphereMaterial.uniforms.uTimeLuminance.value, 0)
  assert.equal(s.cloudMaterials[0].uniforms.uCloudCover.value, 0)
  assert.equal(s.atmosphereMaterial.uniforms.uFocus.value, 0)
  assert.equal(s.scene.fog.density, .01)
})
