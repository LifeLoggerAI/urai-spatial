import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { previousDestinationForReturn, URAI_DESTINATIONS } from '../src/spatial/world/worldTypes.ts'

test('Focus unwinds to Life Map after Replay and every other arrival', () => {
  for (const previousDestination of [undefined, ...URAI_DESTINATIONS]) {
    const world = { destination: 'focus', previousDestination }
    assert.equal(previousDestinationForReturn(world), 'life-map')
    assert.deepEqual(world, { destination: 'focus', previousDestination })
  }
})

test('other realms preserve their previous destination and fallback boundary', () => {
  for (const destination of URAI_DESTINATIONS.filter(value => value !== 'focus' && value !== 'replay')) {
    for (const previousDestination of [undefined, ...URAI_DESTINATIONS]) {
      assert.equal(previousDestinationForReturn({ destination, previousDestination }), previousDestination)
    }
  }
})


test('Replay Escape is handled by the local playback owner once, not by the global travel handler as well', () => {
  const controller = readFileSync(new URL('../src/spatial/world/WorldTransitionController.tsx', import.meta.url), 'utf8')
  const replay = readFileSync(new URL('../src/app/replay/CinematicReplayClient.tsx', import.meta.url), 'utf8')
  const proof = readFileSync(new URL('../../tests/replay-tier5-lock.mjs', import.meta.url), 'utf8')
  assert.match(controller, /currentWorld\.destination === 'replay' \|\| currentWorld\.destination === 'life-map'/)
  assert.match(replay, /if \(event\.key === 'Escape'\) \{ pauseMemory\(\); event\.preventDefault\(\); unwind\(\); return \}/)
  assert.match(proof, /cinematic-replay-client'\)\.waitFor\(\{ state: 'detached'/)
  assert.match(proof, /Escape completes one Replay return route transition/)
})

test('Replay always returns to Focus despite an unrelated stale prior destination', () => {
  for (const previousDestination of [undefined, ...URAI_DESTINATIONS.filter(value => value !== 'life-movie')]) {
    assert.equal(previousDestinationForReturn({ destination: 'replay', previousDestination }), 'focus')
  }
})

test('Replay retains an explicit Life Movie nested return', () => {
  assert.equal(previousDestinationForReturn({ destination: 'replay', previousDestination: 'life-movie' }), 'life-movie')
})

test('the Focus -> Life Map -> Home reverse journey has no automatic second hop', () => {
  const focusBridge = readFileSync(new URL('../src/app/focus/FocusEscapeBridge.tsx', import.meta.url), 'utf8')
  const lifeMapBridge = readFileSync(new URL('../src/app/life-map/LifeMapEscapeBridge.tsx', import.meta.url), 'utf8')
  assert.match(focusBridge, /router\.push\('\/life-map'\)/)
  assert.doesNotMatch(lifeMapBridge, /window\.setTimeout\(/)
  assert.match(lifeMapBridge, /if \(event\.key !== 'Escape'\) return/)
})

test('Focus return does not arm a legacy automatic Home handoff', () => {
  const focus = readFileSync(new URL('../src/app/focus/FocusEscapeBridge.tsx', import.meta.url), 'utf8')
  assert.doesNotMatch(focus, /sessionStorage\.setItem\('urai-spatial-escape-stack-return-home'/)
})

test('unknown-location Memory World is visibly nonreconstructed, not a gray enclosed hallway', () => {
  const runtime = readFileSync(new URL('../src/spatial/memory-world/MemoryWorldRuntime.tsx', import.meta.url), 'utf8')
  assert.match(runtime, /if \(!preset\) \{/)
  assert.match(runtime, /memory-world-unreconstructed-threshold/)
  assert.match(runtime, /neutral-threshold-no-reconstruction/)
  assert.match(runtime, /No verified location geometry is available/)
})
