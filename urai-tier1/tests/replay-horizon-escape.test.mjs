import test from 'node:test'
import assert from 'node:assert/strict'
import { bindReplayHorizonEscape } from '../src/spatial/world/replayHorizonEscape.mjs'

function subject() {
  const listeners = new Set()
  const host = {
    addEventListener(type, fn, capture) { assert.equal(type, 'keydown'); assert.equal(capture, true); listeners.add(fn) },
    removeEventListener(type, fn, capture) { assert.equal(type, 'keydown'); assert.equal(capture, true); listeners.delete(fn) },
  }
  const pressed = (overrides = {}) => {
    const event = { key: 'Escape', defaultPrevented: false, repeat: false, isComposing: false,
      target: null, preventDefault() { this.defaultPrevented = true }, stopped: 0, stopPropagation() { this.stopped++ }, ...overrides }
    for (const listener of listeners) listener(event)
    return event
  }
  return { host, pressed, listeners }
}
test('neutral Replay Escape asks its canonical owner to return once and cleans up', () => {
  const x = subject()
  let returns = 0
  const dispose = bindReplayHorizonEscape(x.host, () => returns++, () => true)
  const e = x.pressed()
  assert.equal(returns, 1)
  assert.equal(e.defaultPrevented, true)
  assert.equal(e.stopped, 1)
  dispose()
  x.pressed()
  assert.equal(returns, 1)
  assert.equal(x.listeners.size, 0)
})
test('a denied Escape is not intercepted and cannot navigate', () => {
  const x = subject()
  let returns = 0
  const dispose = bindReplayHorizonEscape(x.host, () => returns++, () => false)
  const e = x.pressed()
  assert.equal(returns, 0)
  assert.equal(e.defaultPrevented, false)
  dispose()
})
