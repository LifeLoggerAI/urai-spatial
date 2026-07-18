import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import {
  buildNamedExplicitDemoMemory,
  isKnownExplicitDemoMemoryId,
} from '../src/spatial/memory/explicitDemoMemory.ts'

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const hook = read('src/spatial/memory/useSelectedMemory.ts')
const focus = read('src/app/focus/FocusChamberClient.tsx')


test('known Life Map sample identities resolve to disclosed canonical demo memories', () => {
  assert.equal(isKnownExplicitDemoMemoryId('memory-thread'), true)
  assert.equal(isKnownExplicitDemoMemoryId('demo:memory-thread'), true)
  assert.equal(isKnownExplicitDemoMemoryId('private-user-memory'), false)

  const memory = buildNamedExplicitDemoMemory('memory-thread')
  assert.equal(memory.id, 'demo:memory-thread')
  assert.equal(memory.star.id, 'memory-thread')
  assert.equal(memory.replayManifest.id, 'replay-recovery-thread')
  assert.equal(memory.title, 'Memory Thread')
  assert.equal(memory.demo, true)
  assert.equal(memory.ownerId, 'explicit-demo')
})

test('the canonical Quiet Reset fixture keeps exact Focus and Replay identity', () => {
  const memory = buildNamedExplicitDemoMemory('demo:quiet-reset')
  assert.equal(memory.id, 'demo:quiet-reset')
  assert.equal(memory.star.id, 'quiet-reset')
  assert.equal(memory.replayManifest.id, 'replay-recovery-thread')
  assert.equal(memory.title, 'The Quiet Reset')
  assert.equal(memory.replayManifest.segments.length, 4)
})

test('Focus resolves only explicit demo prefixes or an already-enabled sample constellation', () => {
  assert.match(hook, /isExplicitDemoRequest\(params\)/)
  assert.match(hook, /memoryId\.startsWith\('demo:'\)/)
  assert.match(hook, /explicitDemoModeEnabled\(\) && isKnownExplicitDemoMemoryId\(memoryId\)/)
  assert.match(hook, /getDoc\(doc\(getFirebaseDb\(\), 'users', user\.uid, 'memories', memoryId\)\)/)
})

test('Focus carries exact identity into Replay and raw star identity back to Life Map', () => {
  assert.match(focus, /memoryId: memory\.id/)
  assert.match(focus, /manifestId: memory\.replayManifest\.id/)
  assert.match(focus, /node: memory\.star\.id/)
  assert.match(focus, /new URLSearchParams\(\{ node: memory\.star\.id, from: 'focus-return' \}\)/)
  assert.match(focus, /destination: 'life-map'/)
  assert.match(focus, /destination: 'replay'/)
})
