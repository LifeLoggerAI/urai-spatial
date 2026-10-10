import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createHomeGpuSubmissionGate } from '../src/spatial/performance/homeGpuSubmissionGate.ts'

function driver() {
  const calls = [], live = new Set()
  let ready = false, lost = false, next = 0
  const context = {
    SYNC_GPU_COMMANDS_COMPLETE: 1, TIMEOUT_EXPIRED: 2, CONDITION_SATISFIED: 3, ALREADY_SIGNALED: 4, WAIT_FAILED: 5,
    isContextLost: () => lost,
    fenceSync(condition, flags) { assert.equal(condition, 1); assert.equal(flags, 0); const fence = { id: ++next }; live.add(fence); calls.push(['fence', fence.id]); return fence },
    clientWaitSync(fence, flags, timeout) { assert.ok(live.has(fence)); assert.equal(flags, 0); assert.equal(timeout, 0, 'GPU polling must never block'); calls.push(['poll', fence.id]); return ready ? 3 : 2 },
    deleteSync(fence) { assert.ok(live.delete(fence)); calls.push(['delete', fence.id]) },
    flush() { calls.push(['flush']) },
  }
  return { context, calls, live, complete() { ready = true }, busy() { ready = false },
    lose() { lost = true; live.clear() }, restore() { lost = false; ready = false } }
}

test('one unfinished submission bounds the GPU queue and the next draw uses the latest camera state', () => {
  const gpu = driver(), gate = createHomeGpuSubmissionGate(gpu.context)
  const camera = { x: 0 }, rendered = []
  const draw = () => rendered.push(camera.x)
  assert.deepEqual(gate.submit(draw), { submitted: true, completionObserved: false, cadenceObserved: false })
  for (let i = 1; i <= 100; i++) { camera.x = i; assert.equal(gate.submit(draw).submitted, false) }
  assert.deepEqual(rendered, [0])
  assert.equal(gpu.live.size, 1)
  gpu.complete()
  assert.deepEqual(gate.submit(draw), { submitted: true, completionObserved: true, cadenceObserved: true })
  assert.deepEqual(rendered, [0, 100], 'do not replay stale queued camera/input snapshots')
  assert.equal(gpu.live.size, 1, 'completed fence must be deleted before the next one is inserted')
  gate.dispose(); assert.equal(gpu.live.size, 0)
})

test('hidden rendering keeps its pending fence and cannot submit or poll extra work', () => {
  const gpu = driver(), gate = createHomeGpuSubmissionGate(gpu.context)
  let draws = 0
  gate.submit(() => draws++)
  const before = gpu.calls.length
  for (let i = 0; i < 20; i++) assert.equal(gate.submit(() => draws++, false).submitted, false)
  assert.equal(gpu.calls.length, before)
  assert.equal(gpu.live.size, 1)
  assert.equal(gate.submit(() => draws++).submitted, false, 'resume must still respect the unfinished draw')
  gpu.complete(); gate.submit(() => draws++)
  assert.equal(draws, 2)
  gate.dispose()
})

test('context loss and disposal release ownership without polling stale sync objects', () => {
  const gpu = driver(), gate = createHomeGpuSubmissionGate(gpu.context)
  let draws = 0
  gate.submit(() => draws++)
  gpu.lose(); gate.contextLost()
  assert.equal(gate.mode, 'context-lost')
  assert.equal(gate.submit(() => draws++).submitted, false)
  gpu.restore(); gate.contextRestored()
  assert.equal(gate.submit(() => draws++).submitted, true)
  gate.dispose(); assert.equal(gpu.live.size, 0)
  assert.equal(gate.submit(() => draws++).submitted, false)
  gate.activate() // React reconnects effects in development without a world reset.
  assert.equal(gate.submit(() => draws++).submitted, true)
  assert.equal(draws, 3)
  gate.dispose()
})

test('missing, failed and null fences retain the actual renderer path without blocking or manufacturing completion', () => {
  const unsupported = createHomeGpuSubmissionGate({ isContextLost: () => false })
  let draws = 0
  assert.deepEqual(unsupported.submit(() => draws++), { submitted: true, completionObserved: false, cadenceObserved: true })
  assert.equal(unsupported.mode, 'unavailable')
  const gpu = driver(), gate = createHomeGpuSubmissionGate(gpu.context)
  gate.submit(() => draws++)
  gpu.context.clientWaitSync = () => gpu.context.WAIT_FAILED
  assert.equal(gate.submit(() => draws++).submitted, true)
  assert.equal(gate.mode, 'unavailable')
  assert.equal(gpu.live.size, 0)
  const nullable = driver(); nullable.context.fenceSync = () => null
  const nullGate = createHomeGpuSubmissionGate(nullable.context)
  assert.equal(nullGate.submit(() => draws++).submitted, true)
  assert.equal(nullGate.mode, 'unavailable')
  const throwing = driver(); throwing.context.clientWaitSync = () => { throw new Error('driver sync unavailable') }
  const throwingGate = createHomeGpuSubmissionGate(throwing.context)
  throwingGate.submit(() => draws++)
  assert.equal(throwingGate.submit(() => draws++).submitted, true)
  assert.equal(throwing.live.size, 0)
  gate.dispose(); nullGate.dispose(); throwingGate.dispose()
})
