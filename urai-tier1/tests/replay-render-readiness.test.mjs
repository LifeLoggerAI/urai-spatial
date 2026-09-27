import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
const code = stripTypeScriptTypes(readFileSync(new URL('../src/spatial/runtime/replayRenderReadiness.ts', import.meta.url), 'utf8'))
const { createReplayRenderReadiness } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
function fixture() {
  const canvas = new EventTarget()
  let lost = false, ready = true
  const tracker = createReplayRenderReadiness(canvas, () => lost, value => { ready = value })
  const disconnect = tracker.connect()
  return { canvas, tracker, disconnect, lose: () => { lost = true }, restore: () => { lost = false }, ready: () => ready }
}
test('fresh renderer requires two distinct completed render frames', () => {
  const f = fixture(); assert.equal(f.ready(), false)
  f.tracker.frame(1); assert.equal(f.ready(), false)
  f.tracker.frame(1); assert.equal(f.ready(), false)
  f.tracker.frame(2); assert.equal(f.ready(), true)
})
test('loss clears readiness immediately even without another animation frame', () => {
  const f = fixture(); f.tracker.frame(1); f.tracker.frame(1)
  f.canvas.dispatchEvent(new Event('webglcontextlost')); assert.equal(f.ready(), false)
})
test('lost context cannot regain readiness from stale render epochs', () => {
  const f = fixture(); f.tracker.frame(10); f.tracker.frame(11); f.lose()
  f.tracker.frame(12); f.tracker.frame(13); assert.equal(f.ready(), false)
})
test('restoration requires fresh completed frames and zero epochs reset accumulation', () => {
  const f = fixture(); f.tracker.frame(1); f.tracker.frame(2); f.lose()
  f.canvas.dispatchEvent(new Event('webglcontextlost')); f.restore()
  f.canvas.dispatchEvent(new Event('webglcontextrestored'))
  f.tracker.frame(3); assert.equal(f.ready(), false)
  f.tracker.frame(0); f.tracker.frame(4); assert.equal(f.ready(), false)
  f.tracker.frame(5); assert.equal(f.ready(), true)
})
test('unmount clears readiness and detached callbacks cannot republish success', () => {
  const f = fixture(); f.tracker.frame(1); f.tracker.frame(2); f.disconnect()
  assert.equal(f.ready(), false); f.tracker.frame(3); f.tracker.frame(4); assert.equal(f.ready(), false)
})
test('texture replacement resets prior media readiness', () => {
  const f = fixture(); f.tracker.frame(1); f.tracker.frame(2); f.tracker.reset()
  f.tracker.frame(3); assert.equal(f.ready(), false)
  f.tracker.frame(4); assert.equal(f.ready(), true)
})
