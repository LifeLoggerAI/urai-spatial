import assert from 'node:assert/strict'
import test from 'node:test'
import * as THREE from 'three'
import { cameraDampingAlpha } from '../src/spatial/canon/cameraMotion.ts'
import { replayCameraFrame, replayEntryCameraFrame } from '../src/app/replay/replayMotion.ts'
import { createReplayNarrativeClock } from '../src/app/replay/replayNarrativeClock.ts'

const entry = (overrides = {}) => new URLSearchParams({ cameraCheckpoint: 'focus:synthetic-star', entryCamera: '0,1.45,8.2', entryTarget: '0,0.45,-1.3', entryFov: '48', ...overrides })

test('Replay accepts only the selected Focus checkpoint, including legal orbit poses', () => {
  assert.deepEqual(replayEntryCameraFrame(entry(), 'synthetic-star'), { position: [0, 1.45, 8.2], target: [0, 0.45, -1.3], fov: 48 })
  assert.equal(replayEntryCameraFrame(entry(), 'different-star'), null)
  assert.ok(replayEntryCameraFrame(entry({ entryCamera: '-11,12,-4' }), 'synthetic-star'))
  for (const invalid of [
    { entryCamera: '0,NaN,8.2' }, { entryCamera: '0,,8.2' }, { entryCamera: '0,0,1e300' },
    { entryTarget: '0,0,-99' }, { entryFov: '' }, { entryFov: 'Infinity' }, { entryFov: '90' },
    { entryCamera: '0,0.45,-1.3' }, { cameraCheckpoint: 'focus-return:synthetic-star' },
  ]) assert.equal(replayEntryCameraFrame(entry(invalid), 'synthetic-star'), null, JSON.stringify(invalid))
})

test('Replay reduced-motion camera stays fixed across playback and seeks; paused memory time cannot breathe', () => {
  const stationary = replayCameraFrame(0, 15000, true)
  for (const time of [0, 1000, 7500, 15000, 1e9]) assert.deepEqual(replayCameraFrame(time, 15000, true), stationary)
  for (const time of [NaN, Infinity, -3000]) assert.ok(replayCameraFrame(time, 15000, false).position.every(Number.isFinite))
})

test('Replay entry convergence is equal at 30, 60 and 120 Hz with no first-frame transform reset', () => {
  const incoming = replayEntryCameraFrame(entry(), 'synthetic-star')
  const destination = replayCameraFrame(0, 15000, false)
  const simulate = (fps) => {
    const camera = new THREE.PerspectiveCamera(incoming.fov)
    camera.position.set(...incoming.position)
    const target = new THREE.Vector3(...incoming.target)
    const desired = new THREE.Vector3(...destination.position)
    const desiredTarget = new THREE.Vector3(...destination.target)
    camera.lookAt(target)
    const first = camera.position.toArray()
    for (let index = 0; index < fps * 2; index++) {
      const alpha = cameraDampingAlpha(2.4, 1 / fps)
      camera.position.lerp(desired, alpha)
      target.lerp(desiredTarget, alpha)
      camera.fov += (destination.fov - camera.fov) * alpha
      camera.lookAt(target)
    }
    assert.deepEqual(first, incoming.position)
    return [...camera.position.toArray(), ...camera.quaternion.toArray(), camera.fov]
  }
  const sixty = simulate(60)
  for (const fps of [30, 120]) simulate(fps).forEach((value, index) => assert.ok(Math.abs(value - sixty[index]) < 1e-10))
})

function clockFixture(durationMs = 3000) {
  let time = 0, nextId = 0
  const timers = new Map(), snapshots = []
  const clock = createReplayNarrativeClock({ durationMs, now: () => time, onSnapshot: (snapshot) => snapshots.push(snapshot),
    schedule: (tick) => { const id = ++nextId; timers.set(id, tick); return id }, cancel: (id) => timers.delete(id) })
  return { clock, timers, snapshots, advance(ms) { time += ms; for (const tick of [...timers.values()]) tick() }, latest: () => snapshots.at(-1) }
}

test('Delayed narrative ticks use elapsed time and pause/resume never consumes hidden time', () => {
  const f = clockFixture()
  f.clock.toggle()
  f.advance(740)
  assert.deepEqual(f.latest(), { currentTimeMs: 740, playing: true })
  f.clock.pause()
  assert.equal(f.timers.size, 0)
  f.advance(5000)
  f.clock.toggle()
  f.advance(260)
  assert.deepEqual(f.latest(), { currentTimeMs: 1000, playing: true })
  f.clock.dispose()
})

test('Seek, repeated toggles, end and disposal cancel obsolete narrative callbacks', () => {
  const f = clockFixture(1000)
  f.clock.toggle()
  const staleTick = [...f.timers.values()][0]
  f.advance(100)
  f.clock.seek(600)
  f.advance(100)
  assert.deepEqual(f.latest(), { currentTimeMs: 700, playing: true })
  f.clock.pause(); f.clock.pause(); f.clock.toggle()
  const count = f.snapshots.length
  staleTick()
  assert.equal(f.snapshots.length, count)
  assert.equal(f.timers.size, 1)
  f.advance(500)
  assert.deepEqual(f.latest(), { currentTimeMs: 1000, playing: false })
  assert.equal(f.timers.size, 0)
  f.clock.toggle()
  assert.deepEqual(f.latest(), { currentTimeMs: 0, playing: true })
  const finalTick = [...f.timers.values()][0]
  f.clock.dispose()
  const disposedCount = f.snapshots.length
  finalTick(); f.clock.toggle(); f.clock.seek(200); f.clock.pause()
  assert.equal(f.snapshots.length, disposedCount)
  assert.equal(f.timers.size, 0)
})
