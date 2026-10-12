import assert from 'node:assert/strict'
import test from 'node:test'
import { previousDestinationForReturn, URAI_DESTINATIONS } from '../src/spatial/world/worldTypes.ts'

test('Focus unwinds to Life Map after Replay and every other arrival', () => {
  for (const previousDestination of [undefined, ...URAI_DESTINATIONS]) {
    const world = { destination: 'focus', previousDestination }
    assert.equal(previousDestinationForReturn(world), 'life-map')
    assert.deepEqual(world, { destination: 'focus', previousDestination })
  }
})

test('other realms preserve their previous destination and fallback boundary', () => {
  for (const destination of URAI_DESTINATIONS.filter(value => value !== 'focus')) {
    for (const previousDestination of [undefined, ...URAI_DESTINATIONS]) {
      assert.equal(previousDestinationForReturn({ destination, previousDestination }), previousDestination)
    }
  }
})


test('Replay Escape is handled by the local playback owner once, not by the global travel handler as well', () => {
  const fs = require('node:fs')
  const path = require('node:path')
  const controller = fs.readFileSync(path.join(process.cwd(), 'urai-tier1/src/spatial/world/WorldTransitionController.tsx'), 'utf8')
  const replay = fs.readFileSync(path.join(process.cwd(), 'urai-tier1/src/app/replay/CinematicReplayClient.tsx'), 'utf8')
  const proof = fs.readFileSync(path.join(process.cwd(), 'tests/replay-tier5-lock.mjs'), 'utf8')
  assert.match(controller, /currentWorld\.destination === 'replay' \|\| currentWorld\.destination === 'life-map'/)
  assert.match(replay, /if \(event\.key === 'Escape'\) \{ pauseMemory\(\); event\.preventDefault\(\); unwind\(\); return \}/)
  assert.match(proof, /cinematic-replay-client'\)\.waitFor\(\{ state: 'detached'/)
  assert.match(proof, /page\.waitForURL\(\/\\\\\/\(focus\|unwind\)/)
})
