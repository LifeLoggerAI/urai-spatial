'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const src = fs.readFileSync(path.join(__dirname, '../src/privatePreparedMediaAuthority.ts'), 'utf8')
const media = fs.readFileSync(path.join(__dirname, '../src/memoryMedia.ts'), 'utf8')
const output = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } })
const scope = { exports: {} }
vm.runInNewContext(output.outputText, { exports: scope.exports, require })
const guard = scope.exports.assertFirstPrivateMemoryPlaybackBinding
const sha = 'a'.repeat(64), receiptId = 'b'.repeat(64), consentHash = 'c'.repeat(64), uid = 'syntheticOwner', memoryId = 'syntheticMemory'
const active = { privacy: 'private', sourceProvenance: { authenticity: 'source-derivative-not-generated-autobiography', derivativeSha256: sha },
  firstPrivateMemoryActivation: { status: 'explicit-owner-private-replay', ownerId: uid, memoryId,
    mediaReceiptId: receiptId, derivativeSha256: sha, consentRevision: 4, consentReceiptHash: consentHash } }
const attempt = (value=active, actor=uid, selected=memoryId, receipt=receiptId, revision=4, consent=consentHash) =>
  guard(value, actor, selected, receipt, revision, consent)
test('valid owner-confirmed private first recording allows playback authorization', () => assert.doesNotThrow(() => attempt()))
test('hidden source denied even when another field claims activation', () => assert.throws(() => attempt({ ...active, privacy:'hidden' }), /FIRST_PRIVATE_MEMORY_REPLAY_NOT_ACTIVATED/))
test('an imported private recording without matching activation is denied', () => {
  assert.throws(() => attempt({ ...active, firstPrivateMemoryActivation: {} }), /FIRST_PRIVATE_MEMORY_REPLAY_NOT_ACTIVATED/)
  assert.throws(() => attempt({ ...active, firstPrivateMemoryActivation: { ...active.firstPrivateMemoryActivation, status:'not-confirmed' } }), /FIRST_PRIVATE_MEMORY_REPLAY_NOT_ACTIVATED/)
})
test('cross-account or selected-memory mismatch is denied', () => {
  assert.throws(() => attempt(active, 'foreignOwner'), /FIRST_PRIVATE_MEMORY_REPLAY_NOT_ACTIVATED/)
  assert.throws(() => attempt(active, uid, 'anotherMemory'), /FIRST_PRIVATE_MEMORY_REPLAY_NOT_ACTIVATED/)
})
test('media-receipt or derivative identity changes revoke playback authority', () => {
  assert.throws(() => attempt(active, uid, memoryId, 'd'.repeat(64)), /FIRST_PRIVATE_MEMORY_REPLAY_NOT_ACTIVATED/)
  assert.throws(() => attempt({ ...active, sourceProvenance: { ...active.sourceProvenance, derivativeSha256:'d'.repeat(64) } }), /FIRST_PRIVATE_MEMORY_REPLAY_NOT_ACTIVATED/)
})
test('consent revision or receipt renewal requires fresh explicit activation', () => {
  assert.throws(() => attempt(active, uid, memoryId, receiptId, 5), /FIRST_PRIVATE_MEMORY_REPLAY_NOT_ACTIVATED/)
  assert.throws(() => attempt(active, uid, memoryId, receiptId, 4, 'd'.repeat(64)), /FIRST_PRIVATE_MEMORY_REPLAY_NOT_ACTIVATED/)
})
test('malformed or unrecognized first-memory state denies', () => {
  assert.throws(() => attempt({ ...active, privacy:'public' }), /FIRST_PRIVATE_MEMORY_REPLAY_NOT_ACTIVATED/)
  assert.throws(() => attempt({ ...active, firstPrivateMemoryActivation: null }), /FIRST_PRIVATE_MEMORY_REPLAY_NOT_ACTIVATED/)
})
test('other authorized memory types retain existing playback behavior', () => {
  assert.doesNotThrow(() => attempt({ privacy:'private', sourceMedia:[{kind:'audio',mediaReceiptId:receiptId}] }))
})
test('both protected descriptor and byte-stream reuse the centralized authorization guard', () => {
  assert.match(media, /async function playbackReceipt/)
  assert.match(media, /assertFirstPrivateMemoryPlaybackBinding\(authority\.memory\.data\(\), uid, memoryId, receiptId/)
  assert.match(media, /getMemoryMediaPlaybackAuthority[^]*playbackReceipt\(transaction, uid, memoryId, receiptId\)/)
  assert.match(media, /streamMemoryMediaPlayback[^]*playbackReceipt\(transaction, token\.uid, memoryId, receiptId\)/)
})
