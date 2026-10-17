import assert from 'node:assert/strict'
import test from 'node:test'
import { focusVisualReady } from '../scripts/focus-visual-readiness.mjs'

function fixture(overrides = {}) {
  const attrs = { 'data-memory-status': 'demo', 'data-memory-id': 'demo:quiet-reset', 'data-manifest-id': 'replay-recovery-thread', 'data-webgl-state': 'ready', ...overrides.attrs }
  const canvas = overrides.canvas === false ? null : { width: 1440, height: 900, getBoundingClientRect: () => ({ width: 1440, height: 900 }), ...overrides.canvas }
  const root = { getAttribute: key => attrs[key], querySelector: selector => selector === 'canvas' ? canvas : overrides.loading ? {} : null }
  globalThis.document = { querySelector: () => overrides.absent ? null : root }
  return focusVisualReady()
}

test('loading shell is rejected even when route, memory and WebGL state are ready', () => {
  assert.equal(fixture({ loading: true }), false)
  assert.equal(fixture({ canvas: false }), false)
  assert.equal(fixture({ absent: true }), false)
})
test('wrong memory and lost contexts cannot certify Focus pixels', () => {
  assert.equal(fixture({ attrs: { 'data-memory-id': 'private:other' } }), false)
  assert.equal(fixture({ attrs: { 'data-webgl-state': 'lost' } }), false)
  assert.equal(fixture({ attrs: { 'data-manifest-id': 'other' } }), false)
})
test('zero or clipped canvas cannot certify a rendered world', () => {
  assert.equal(fixture({ canvas: { width: 0 } }), false)
  assert.equal(fixture({ canvas: { getBoundingClientRect: () => ({ width: 0, height: 900 }) } }), false)
})
test('settled fixture with a visible nonzero canvas is admitted for capture', () => {
  assert.equal(fixture(), true)
})
