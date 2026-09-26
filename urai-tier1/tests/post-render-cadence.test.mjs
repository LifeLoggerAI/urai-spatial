import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { createPostRenderCadence } from '../src/spatial/performance/postRenderCadence.ts'

function fixture(intervalMs = 100) {
  let now = 0
  let sequence = 0
  const timers = new Map()
  const invalidations = []
  const cadence = createPostRenderCadence({
    intervalMs,
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
