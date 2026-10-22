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
  assert.match(controller, /currentWorld\.destination === 'replay' \|\| currentWorld\.destination === 'focus' \|\| currentWorld\.destination === 'life-map'/)
  assert.match(replay, /if \(event\.key === 'Escape'\) \{[\s\S]*?if \(!shouldHandleRealmEscape\(event\)\) return[\s\S]*?pauseMemory\(\)[\s\S]*?unwind\(\)/)
  assert.match(proof, /cinematic-replay-client'\)\.waitFor\(\{ state: 'detached'/)
  assert.match(proof, /Escape completes one Replay return route transition/)
})


test('Replay always returns to Focus if stale previous realm is not nested Life Movie', () => {
  for (const previousDestination of [undefined, ...URAI_DESTINATIONS.filter(value => value !== 'life-movie')]) {
    assert.equal(previousDestinationForReturn({ destination: 'replay', previousDestination }), 'focus')
  }
})

test('nested Life Movie Replay returns to Life Movie rather than Focus', () => {
  assert.equal(previousDestinationForReturn({ destination: 'replay', previousDestination: 'life-movie' }), 'life-movie')
})
