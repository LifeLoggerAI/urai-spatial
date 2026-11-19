import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveWorldReturnDestination } from '../src/spatial/world/worldReturnDestination.ts'

test('Replay entered from Life Map returns to Focus, not Life Map', () => {
  assert.equal(resolveWorldReturnDestination({ destination: 'replay', previousDestination: 'life-map' }), 'focus')
})
test('Replay entered from Focus returns to Focus', () => {
  assert.equal(resolveWorldReturnDestination({ destination: 'replay', previousDestination: 'focus' }), 'focus')
})
test('Replay from direct URL or unrelated previous realm returns to Focus', () => {
  assert.equal(resolveWorldReturnDestination({ destination: 'replay' }), 'focus')
  assert.equal(resolveWorldReturnDestination({ destination: 'replay', previousDestination: 'home' }), 'focus')
})
test('Replay from Life Movie preserves explicit Life Movie return', () => {
  assert.equal(resolveWorldReturnDestination({ destination: 'replay', previousDestination: 'life-movie' }), 'life-movie')
})
test('Focus and Life Movie retain fallback sequence', () => {
  assert.equal(resolveWorldReturnDestination({ destination: 'focus' }), 'life-map')
  assert.equal(resolveWorldReturnDestination({ destination: 'life-movie' }), 'replay')
})
test('Possible Futures and infrastructure return contracts unaffected', () => {
  assert.equal(resolveWorldReturnDestination({ destination: 'possible-futures', scenarioOrigin: 'ground' }), 'infrastructure-hub')
  assert.equal(resolveWorldReturnDestination({ destination: 'possible-futures', scenarioOrigin: 'mirror' }), 'mirror')
  assert.equal(resolveWorldReturnDestination({ destination: 'infrastructure-hub' }), 'home')
})
