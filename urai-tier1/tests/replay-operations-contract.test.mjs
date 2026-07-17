import assert from 'node:assert/strict'
import test from 'node:test'
import {
  applyReplayOperation,
  executeReplayOperation,
  flushReplayOperationQueue,
  readReplayOperationState,
  rollbackReplayOperation,
  writeReplayOperationState,
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

const emptyState = () => ({ saved: false, hidden: false, pending: [], audit: [] })

test('applies Save optimistically and preserves an audit trail', () => {
  const state = applyReplayOperation(emptyState(), baseOperation)
  assert.equal(state.saved, true)
  assert.deepEqual(state.pending.map((entry) => entry.id), ['op-1'])
  assert.deepEqual(state.audit.map((entry) => entry.id), ['op-1'])
})

test('settles a persisted operation and removes it from the offline queue', async () => {
  const storage = memoryStorage()
  const result = await executeReplayOperation({ storage, operation: baseOperation, transport: { async persist() {} } })
  assert.equal(result.saved, true)
  assert.equal(result.pending.length, 0)
  assert.equal(result.audit.length, 1)
  assert.equal(readReplayOperationState(storage, 'owner-1', 'memory-1').saved, true)
})

test('rolls back a failed optimistic operation without erasing prior accepted history', async () => {
  const storage = memoryStorage()
  await executeReplayOperation({ storage, operation: baseOperation, transport: { async persist() {} } })
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

test('rollback preserves accepted state that is older than the bounded audit window', () => {
  const optimisticBase = { saved: true, hidden: false, pending: [], audit: [] }
  const hide = { ...baseOperation, id: 'op-2', kind: 'hide', createdAt: '2026-07-17T13:01:00.000Z' }
  const optimistic = applyReplayOperation(optimisticBase, hide)
  const result = rollbackReplayOperation(optimistic, hide, 'offline', optimisticBase)
  assert.equal(result.saved, true)
  assert.equal(result.hidden, false)
  assert.equal(result.error, 'offline')
})

test('settlement re-reads storage and preserves a concurrent queued operation', async () => {
  const storage = memoryStorage()
  const concurrent = { ...baseOperation, id: 'op-2', kind: 'hide', createdAt: '2026-07-17T13:01:00.000Z' }
  const result = await executeReplayOperation({
    storage,
    operation: baseOperation,
    transport: {
      async persist() {
        const latest = readReplayOperationState(storage, 'owner-1', 'memory-1')
        writeReplayOperationState(storage, 'owner-1', 'memory-1', applyReplayOperation(latest, concurrent))
      },
    },
  })
  assert.equal(result.saved, true)
  assert.equal(result.hidden, true)
  assert.deepEqual(result.pending.map((entry) => entry.id), ['op-2'])
  assert.deepEqual(result.audit.map((entry) => entry.id), ['op-1', 'op-2'])
})

test('preserves an accepted duplicate when a concurrent attempt later fails', async () => {
  const storage = memoryStorage()
  const result = await executeReplayOperation({
    storage,
    operation: baseOperation,
    transport: {
      async persist() {
        const latest = readReplayOperationState(storage, 'owner-1', 'memory-1')
        writeReplayOperationState(storage, 'owner-1', 'memory-1', {
          ...latest,
          pending: latest.pending.filter((entry) => entry.id !== baseOperation.id),
        })
        throw new Error('duplicate attempt failed')
      },
    },
  })
  assert.equal(result.saved, true)
  assert.equal(result.pending.length, 0)
  assert.equal(result.audit.length, 1)
  assert.equal(result.error, undefined)
})

test('queue flush preserves operations added while transport is awaiting', async () => {
  const storage = memoryStorage()
  const first = { ...baseOperation, id: 'op-3', kind: 'hide' }
  writeReplayOperationState(storage, 'owner-1', 'memory-1', applyReplayOperation(emptyState(), first))
  const later = { ...baseOperation, id: 'op-4', createdAt: '2026-07-17T13:02:00.000Z' }
  const result = await flushReplayOperationQueue({
    storage,
    ownerId: 'owner-1',
    memoryId: 'memory-1',
    transport: {
      async persist() {
        const latest = readReplayOperationState(storage, 'owner-1', 'memory-1')
        writeReplayOperationState(storage, 'owner-1', 'memory-1', applyReplayOperation(latest, later))
      },
    },
  })
  assert.deepEqual(result.pending.map((entry) => entry.id), ['op-4'])
  assert.equal(result.hidden, true)
  assert.equal(result.saved, true)
})

test('drops malformed corrections and operations from untrusted storage', () => {
  const storage = memoryStorage()
  storage.setItem('urai-replay-operations-v1:owner-1:memory-1', JSON.stringify({
    saved: true,
    correction: { field: 'bogus', nextValue: 'bad' },
    pending: [{ ...baseOperation, id: 'bad', kind: 'correct', correction: { field: 'bogus' } }],
    audit: [{ ...baseOperation, id: 'foreign', ownerId: 'someone-else' }],
  }))
  const state = readReplayOperationState(storage, 'owner-1', 'memory-1')
  assert.equal(state.saved, true)
  assert.equal(state.correction, undefined)
  assert.deepEqual(state.pending, [])
  assert.deepEqual(state.audit, [])
})

test('restricted or full storage does not crash replay operations or erase successful state', async () => {
  const storage = {
    getItem() { return null },
    setItem() { throw new Error('QuotaExceededError') },
    removeItem() {},
  }
  assert.equal(writeReplayOperationState(storage, 'owner-1', 'memory-1', emptyState()), false)
  const result = await executeReplayOperation({ storage, operation: baseOperation, transport: { async persist() {} } })
  assert.equal(result.saved, true)
  assert.equal(result.pending.length, 0)
  assert.equal(result.audit.length, 1)
})
