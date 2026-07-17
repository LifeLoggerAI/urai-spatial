import assert from 'node:assert/strict'
import test from 'node:test'
import {
  applyReplayOperation,
  executeReplayOperation,
  flushReplayOperationQueue,
  readReplayOperationState,
} from '../src/spatial/replay/replayOperations.ts'

function memoryStorage() {
  const values = new Map()
  return {
    getItem(key) { return values.get(key) ?? null },
    setItem(key, value) { values.set(key, value) },
    removeItem(key) { values.delete(key) },
  }
}

const baseOperation = {
  id: 'op-1',
  memoryId: 'memory-1',
  manifestId: 'manifest-1',
  ownerId: 'owner-1',
  kind: 'save',
  createdAt: '2026-07-17T13:00:00.000Z',
}

test('applies Save optimistically and preserves an audit trail', () => {
  const state = applyReplayOperation({ saved: false, hidden: false, pending: [], audit: [] }, baseOperation)
  assert.equal(state.saved, true)
  assert.deepEqual(state.pending.map((entry) => entry.id), ['op-1'])
  assert.deepEqual(state.audit.map((entry) => entry.id), ['op-1'])
})

test('settles a persisted operation and removes it from the offline queue', async () => {
  const storage = memoryStorage()
  const result = await executeReplayOperation({
    storage,
    operation: baseOperation,
    transport: { async persist() {} },
  })
  assert.equal(result.saved, true)
  assert.equal(result.pending.length, 0)
  assert.equal(result.audit.length, 1)
  assert.equal(readReplayOperationState(storage, 'owner-1', 'memory-1').saved, true)
})

test('rolls back a failed optimistic operation without erasing prior accepted history', async () => {
  const storage = memoryStorage()
  await executeReplayOperation({
    storage,
    operation: baseOperation,
    transport: { async persist() {} },
  })
  const hide = { ...baseOperation, id: 'op-2', kind: 'hide', createdAt: '2026-07-17T13:01:00.000Z' }
  const result = await executeReplayOperation({
    storage,
    operation: hide,
    transport: { async persist() { throw new Error('offline') } },
  })
  assert.equal(result.saved, true)
  assert.equal(result.hidden, false)
  assert.equal(result.audit.length, 1)
  assert.equal(result.error, 'offline')
})

test('retains pending operations and flushes them in order when transport recovers', async () => {
  const storage = memoryStorage()
  const pending = applyReplayOperation(
    { saved: false, hidden: false, pending: [], audit: [] },
    { ...baseOperation, id: 'op-3', kind: 'hide' },
  )
  storage.setItem('urai-replay-operations-v1:owner-1:memory-1', JSON.stringify(pending))
  const persisted = []
  const result = await flushReplayOperationQueue({
    storage,
    ownerId: 'owner-1',
    memoryId: 'memory-1',
    transport: { async persist(operation) { persisted.push(operation.id) } },
  })
  assert.deepEqual(persisted, ['op-3'])
  assert.equal(result.pending.length, 0)
  assert.equal(result.hidden, true)
})
