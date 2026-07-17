import assert from 'node:assert/strict'
import test from 'node:test'

import {
  clearWorldNavigationStack,
  popWorldNavigationCheckpoint,
  pushWorldNavigationCheckpoint,
  readWorldNavigationStack,
} from '../src/spatial/world/worldNavigationStack.ts'

function createStorage() {
  const values = new Map()
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null
    },
    setItem(key, value) {
      values.set(key, String(value))
    },
  }
}

test('navigation checkpoints unwind in strict last-in first-out order', () => {
  const storage = createStorage()
  pushWorldNavigationCheckpoint(storage, {
    destination: 'home',
    href: '/home',
    entryPortal: 'home-threshold',
    cameraCheckpoint: 'home-threshold',
    savedAt: 1,
  })
  pushWorldNavigationCheckpoint(storage, {
    destination: 'life-map',
    href: '/life-map?node=quiet-reset',
    entryPortal: 'sky-ascent',
    cameraCheckpoint: 'selected-memory',
    savedAt: 2,
  })
  pushWorldNavigationCheckpoint(storage, {
    destination: 'focus',
    href: '/focus?memoryId=quiet-reset',
    entryPortal: 'selected-memory',
    cameraCheckpoint: 'focus-chamber',
    savedAt: 3,
  })

  assert.equal(popWorldNavigationCheckpoint(storage)?.destination, 'focus')
  assert.equal(popWorldNavigationCheckpoint(storage)?.destination, 'life-map')
  assert.equal(popWorldNavigationCheckpoint(storage)?.destination, 'home')
  assert.equal(popWorldNavigationCheckpoint(storage), undefined)
})

test('duplicate consecutive checkpoints do not corrupt unwind history', () => {
  const storage = createStorage()
  const checkpoint = {
    destination: 'focus',
    href: '/focus?memoryId=quiet-reset',
    savedAt: 1,
  }

  pushWorldNavigationCheckpoint(storage, checkpoint)
  pushWorldNavigationCheckpoint(storage, { ...checkpoint, savedAt: 2 })

  assert.equal(readWorldNavigationStack(storage).length, 1)
})

test('malformed storage fails closed and clear removes history', () => {
  const storage = createStorage()
  storage.setItem('urai-world-navigation-stack-v1', '{broken')
  assert.deepEqual(readWorldNavigationStack(storage), [])

  pushWorldNavigationCheckpoint(storage, {
    destination: 'replay',
    href: '/replay?memoryId=quiet-reset',
    savedAt: 1,
  })
  clearWorldNavigationStack(storage)
  assert.deepEqual(readWorldNavigationStack(storage), [])
})
