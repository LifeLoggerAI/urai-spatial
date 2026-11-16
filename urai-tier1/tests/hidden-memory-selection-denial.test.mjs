import test from 'node:test'
import assert from 'node:assert/strict'
import { buildExplicitDemoMemory, parseSelectedMemory } from '../src/spatial/memory/selectedMemoryContract.ts'

const owner = 'synthetic-owner'
const id = 'synthetic-hidden-memory'
const baseline = () => ({ ...buildExplicitDemoMemory(id), ownerId: owner, demo: false, privacy: 'private', consentState: 'authorized' })

test('hidden canonical memory cannot disclose its metadata through direct owner selection', () => {
  const hidden = { ...baseline(), privacy: 'hidden', title: 'SYNTHETIC RESTRICTED TITLE',
    summary: 'SYNTHETIC RESTRICTED SUMMARY', narrator: { focus: 'SYNTHETIC RESTRICTED NARRATION', replay: 'SYNTHETIC RESTRICTED NARRATION' } }
  for (const sourceMedia of [[], [{ kind: 'audio', mediaReceiptId: 'a'.repeat(64) }],
    [{ kind: 'image', url: 'https://storage.googleapis.com/governed-bucket/private.jpg' }]]) {
    const result = parseSelectedMemory({ ...hidden, sourceMedia }, owner, id, 'governed-bucket')
    assert.equal(result.status, 'unauthorized')
    assert.equal(result.memory, null)
    assert.doesNotMatch(JSON.stringify(result), /SYNTHETIC RESTRICTED|private\.jpg|a{64}/)
  }
})

test('ordinary owner-private metadata remains selectable under the existing contract', () => {
  const result = parseSelectedMemory(baseline(), owner, id, null)
  assert.equal(result.status, 'ready')
  assert.equal(result.memory.ownerId, owner)
  assert.equal(result.memory.privacy, 'private')
})

test('hidden selection preserves existing deleted and incorrect-owner denial precedence', () => {
  assert.equal(parseSelectedMemory({ ...baseline(), privacy: 'hidden', deleted: true }, owner, id, null).status, 'deleted')
  assert.equal(parseSelectedMemory({ ...baseline(), privacy: 'hidden', ownerId: 'another-owner' }, owner, id, null).status, 'unauthorized')
})
