import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  createHomeSkyTapGate,
  isUpwardHomeSkyRay,
  homeJourneyHref,
} from '../src/spatial/navigation/homeSkyInteraction.ts'

const pointer = (clientX, clientY, timeStamp, overrides = {}) => ({
  pointerId: 3, isPrimary: true, button: 0, clientX, clientY, timeStamp, ...overrides,
})

function session(sky = (x) => x >= 10) {
  let ascent = 0
  let ready = true
  const gate = createHomeSkyTapGate({
    isReady: () => ready,
    isVisibleSkyAt: sky,
    onAscent: () => { ascent += 1 },
  })
  return { gate, get ascent() { return ascent }, setReady(value) { ready = value } }
}

test('a press on Orb/non-sky cannot turn into Ascent by releasing on adjacent sky', () => {
  const s = session()
  s.gate.down(pointer(9, 10, 1000))
  s.gate.up(pointer(10, 10, 1100))
  assert.equal(s.ascent, 0)
})

test('a primary stationary sky tap enters Ascent exactly once', () => {
  const s = session()
  s.gate.down(pointer(20, 20, 1000))
  s.gate.up(pointer(20, 20, 1150))
  s.gate.up(pointer(20, 20, 1160))
  assert.equal(s.ascent, 1)
})

test('sky origin does not override drag, nonprimary input, readiness or release hit gates', () => {
  const s = session()
  s.gate.down(pointer(20, 20, 1000))
  s.gate.move(pointer(31, 20, 1030))
  s.gate.move(pointer(20, 20, 1070))
  s.gate.up(pointer(20, 20, 1100))
  s.gate.down(pointer(20, 20, 1200, { isPrimary: false }))
  s.gate.up(pointer(20, 20, 1210, { isPrimary: false }))
  s.gate.down(pointer(20, 20, 1300))
  s.setReady(false)
  s.gate.up(pointer(20, 20, 1310))
  s.setReady(true)
  s.gate.down(pointer(20, 20, 1500))
  s.gate.up(pointer(9, 20, 1520))
  assert.equal(s.ascent, 0)
})

test('sky ray and deliberate demo link behavior remain unchanged', () => {
  assert.equal(isUpwardHomeSkyRay({ x: 0, y: 1, z: 0 }), true)
  assert.equal(isUpwardHomeSkyRay({ x: 0, y: -1, z: 0 }), false)
  assert.equal(homeJourneyHref('/life-map/?from=home-sky', '?demo=1'), '/life-map/?from=home-sky&demo=1')
  assert.equal(homeJourneyHref('/life-map/?from=home-sky', '?demo=1&demo=1'), '/life-map/?from=home-sky')
})
