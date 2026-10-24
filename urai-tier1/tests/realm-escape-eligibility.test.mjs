import test from 'node:test'
import assert from 'node:assert/strict'
import { shouldHandleRealmEscape } from '../src/spatial/world/realmEscapeEligibility.mjs'

const doc = (phase = 'idle', blocked = false) => ({
  querySelector(selector) {
    if (selector.includes('aria-modal')) return blocked ? {} : null
    if (selector.includes('data-phase')) return { getAttribute: () => phase }
    return null
  },
})
const event = (extras = {}) => ({ key: 'Escape', defaultPrevented: false, repeat: false, isComposing: false, target: null, ...extras })

test('allows a single deliberate Escape at an idle spatial realm', () => {
  assert.equal(shouldHandleRealmEscape(event(), doc()), true)
})
test('does not steal editing, modal, ADAM or nested owner Escape', () => {
  for (const selector of ['input', '[role="dialog"]', '[data-urai-adam-presence]', '[data-urai-escape-owner]']) {
    const target = { closest: () => ({ matches: selector }) }
    assert.equal(shouldHandleRealmEscape(event({ target }), doc()), false)
  }
  assert.equal(shouldHandleRealmEscape(event(), doc('idle', true)), false)
})
test('ignores repetition, composing, canceled, irrelevant and in-flight transitions', () => {
  assert.equal(shouldHandleRealmEscape(event({ repeat: true }), doc()), false)
  assert.equal(shouldHandleRealmEscape(event({ isComposing: true }), doc()), false)
  assert.equal(shouldHandleRealmEscape(event({ defaultPrevented: true }), doc()), false)
  assert.equal(shouldHandleRealmEscape(event({ key: 'Enter' }), doc()), false)
  assert.equal(shouldHandleRealmEscape(event(), doc('travelling')), false)
})

test('open ADAM panel owns Escape before window-capture world navigation', () => {
  const openAdam = { querySelector(selector) {
    return selector === '[data-urai-adam-presence]' ? { dataset: { uraiAdamPresence: 'runtime-v1' } } : null
  } }
  assert.equal(shouldHandleRealmEscape(event(), openAdam), false)
})

test('closed ADAM launcher leaves realm Escape available', () => {
  assert.equal(shouldHandleRealmEscape(event(), { querySelector: () => null }), true)
})
