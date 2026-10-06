import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ADAM_OPEN_EVENT, requestAdamOpen, consumeAdamOpenRequest } from '../src/spatial/adam/adamPresenceEvents.ts'

test('an early launcher click is consumed once when the runtime mounts', () => {
  globalThis.window = new EventTarget()
  try {
    assert.equal(consumeAdamOpenRequest(), false)
    requestAdamOpen()
    assert.equal(consumeAdamOpenRequest(), true)
    assert.equal(consumeAdamOpenRequest(), false)
  } finally { delete globalThis.window }
})

test('a mounted runtime receives and consumes each local open intent', () => {
  globalThis.window = new EventTarget()
  let opened = 0
  window.addEventListener(ADAM_OPEN_EVENT, () => {
    if (consumeAdamOpenRequest()) opened++
  })
  try {
    requestAdamOpen()
    requestAdamOpen()
    assert.equal(opened, 2)
    assert.equal(consumeAdamOpenRequest(), false)
  } finally { delete globalThis.window }
})
