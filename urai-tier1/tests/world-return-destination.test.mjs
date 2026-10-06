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
