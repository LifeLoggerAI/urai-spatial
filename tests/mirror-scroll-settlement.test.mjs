import assert from 'node:assert/strict'
import test from 'node:test'
import { patternScrollRequest, armPatternScrollEnd, disarmPatternScrollEnd } from './lib/pattern-scroll-proof.mjs'

const nativeMetrics = { left: 285.28125, right: 413.28125, viewportLeft: 13, viewportRight: 377, scrollLeft: 6, scrollWidth: 632, clientWidth: 364 }

test('recorded clipped Recurrence targets its start within the actual scroll range', () => {
  assert.equal(patternScrollRequest(nativeMetrics), 262)
  assert.equal(nativeMetrics.scrollLeft, 6, 'the proof does not mutate product scroll state')
})
test('a tab already fully visible needs no wheel gesture', () => {
  assert.equal(patternScrollRequest({ ...nativeMetrics, left: 149, right: 277.28125 }), 0)
})
test('an already aligned tab at the maximum offset cannot wait for a nonexistent scroll event', () => {
  assert.equal(patternScrollRequest({ ...nativeMetrics, left: 13, right: 141, scrollLeft: 268 }), 0)
})
test('a clipped earlier tab scrolls backward to its start', () => {
  assert.equal(patternScrollRequest({ ...nativeMetrics, left: -167, right: -39, scrollLeft: 186 }), -180)
})
test('a clipped tab with no scroll range fails explicitly', () => {
  assert.throws(() => patternScrollRequest({ ...nativeMetrics, scrollLeft: 268 }), /no remaining horizontal scroll range/)
})
test('native scrollend, rather than a transient scroll change, completes the proof', () => {
  const handlers = new Map()
  const element = { onscrollend: null, addEventListener: (name, fn) => handlers.set(name, fn), removeEventListener: name => handlers.delete(name) }
  const key = Symbol.for('urai:mirror-proof-scrollend')
  armPatternScrollEnd(element)
  assert.equal(element[key].done, false)
  assert.equal(handlers.has('scroll'), false, 'transient motion cannot satisfy settled evidence')
  handlers.get('scrollend')({ target: {} })
  assert.equal(element[key].done, false, 'nested scrollers cannot complete this rail')
  handlers.get('scrollend')({ target: element })
  assert.equal(element[key].done, true)
  disarmPatternScrollEnd(element)
  assert.equal(handlers.size, 0)
  assert.equal(element[key], undefined)
})
test('unsupported native scrollend fails without inventing settled evidence', () => {
  assert.throws(() => armPatternScrollEnd({}), /must support native scrollend/)
})
