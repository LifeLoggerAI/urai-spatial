import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
import { installDoorwayEventTrace } from './native-doorway-event-trace.mjs'

const proof = await readFile(new URL('./native-doorway-proof.mjs', import.meta.url), 'utf8')

test('keyboard doorway activation bypasses moving-target geometric stability', () => {
  assert.match(proof, /await target\.focus\(\)/)
  assert.match(proof, /target\.press\('Enter'\)/)
  assert.match(proof, /node === document\.activeElement/)
  assert.doesNotMatch(proof, /page\.keyboard\.press\('Enter'\)/)
})

test('pointer and touch use deterministic browser scrolling before hit proof', () => {
  assert.match(proof, /node\.scrollIntoView\(\{ block: 'nearest', inline: 'nearest', behavior: 'auto' \}\)/)
  assert.match(proof, /requestAnimationFrame\(resolve\)/)
  assert.match(proof, /semantic target geometry is still moving/)
})

test('pointer and touch retain real browser-coordinate hit ownership', () => {
  assert.match(proof, /page\.mouse\.click\(hitPoint\.center\.x, hitPoint\.center\.y\)/)
  assert.match(proof, /page\.touchscreen\.tap\(hitPoint\.center\.x, hitPoint\.center\.y\)/)
  assert.match(proof, /targetOwnsHitPoint/)
  assert.match(proof, /box\.width < 44 \|\| box\.height < 44/)
})


test('doorway activation waits for the React click handler to hydrate', () => {
  assert.match(proof, /page\.waitForFunction/)
  assert.match(proof, /key\.startsWith\('__reactProps'\)/)
  assert.match(proof, /typeof node\[key\]\?\.onClick === 'function'/)
})

function traceHarness() {
  const listeners = new Map()
  const records = []
  class Target {
    closest() { return this }
    getAttribute() { return 'home-semantic-ground' }
  }
  const target = new Target()
  runInNewContext(`(${installDoorwayEventTrace.toString()})()`, {
    window: {
      addEventListener: (type, listener) => listeners.set(type, listener),
      __uraiRecordDoorwayEvent: async (record) => { records.push(record) },
    },
    Element: Target, document: { activeElement: target }, location: { pathname: '/home/' },
    queueMicrotask, setTimeout,
  })
  return { listeners, records, target }
}

test('trace observes late cancellation after a microtask checkpoint between event listeners', async () => {
  for (const type of ['keydown', 'click']) {
    const { listeners, records, target } = traceHarness()
    const event = new Event(type, { cancelable: true })
    Object.defineProperties(event, { target: { value: target }, key: { value: 'Enter' } })
    listeners.get(type)(event)
    // Native input may checkpoint microtasks before React's target/bubble listener.
    await Promise.resolve()
    assert.equal(records.length, 0, 'capture must not finalize cancellation before propagation')
    event.preventDefault()
    await new Promise((resolve) => setTimeout(resolve, 0))
    assert.equal(records.length, 1)
    assert.equal(records[0].defaultPrevented, true)
    assert.equal(records[0].testId, 'home-semantic-ground')
  }
})

test('trace preserves uncancelled input and observes travel without intercepting it', async () => {
  const { listeners, records, target } = traceHarness()
  const event = new Event('click', { cancelable: true })
  Object.defineProperty(event, 'target', { value: target })
  listeners.get('click')(event)
  listeners.get('urai:world-travel')({ detail: { destination: '/ground' } })
  await new Promise((resolve) => setTimeout(resolve, 0))
  assert.equal(event.defaultPrevented, false)
  assert.equal(records.find((record) => record.type === 'click').defaultPrevented, false)
  assert.equal(records.find((record) => record.type === 'world-travel').destination, '/ground')
})
