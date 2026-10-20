import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { HOME_WORLD_CHECKPOINT_STORAGE_KEY, persistHomeWorldCheckpoint } from '../src/spatial/world/homeWorldCheckpointPersistence.ts'

const checkpoint = {
  destination: 'home',
  entryPortal: 'ground-gateway',
  cameraCheckpoint: 'home-threshold',
  savedAt: 123456,
}

test('Home departure persists the same non-sensitive camera checkpoint when storage works', () => {
  let savedKey = ''
  let savedValue = ''
  assert.equal(persistHomeWorldCheckpoint(checkpoint, () => ({
    setItem(key, value) {
      savedKey = key
      savedValue = value
    },
  })), true)
  assert.equal(savedKey, HOME_WORLD_CHECKPOINT_STORAGE_KEY)
  assert.deepEqual(JSON.parse(savedValue), checkpoint)
})

test('denied sessionStorage getter cannot abort a Home transition', () => {
  assert.doesNotThrow(() => {
    assert.equal(persistHomeWorldCheckpoint(checkpoint, () => {
      throw new DOMException('Storage is disabled', 'SecurityError')
    }), false)
  })
})

test('denied sessionStorage writes cannot abort a Home transition', () => {
  assert.doesNotThrow(() => {
    assert.equal(persistHomeWorldCheckpoint(checkpoint, () => ({
      setItem() { throw new Error('Quota exceeded or storage blocked') },
    })), false)
  })
})

test('world navigation consumes the guarded helper instead of writing storage directly', () => {
  const source = readFileSync(new URL('../src/spatial/world/WorldTransitionController.tsx', import.meta.url), 'utf8')
  assert.match(source, /persistHomeWorldCheckpoint\(\{/)
  assert.doesNotMatch(source, /window\.sessionStorage\.setItem\(/)
})
