'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const original = fs.readFileSync(path.join(__dirname, '../src/privatePreparedMediaAuthority.ts'), 'utf8')
const compiled = ts.transpileModule(original, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const scope = { exports: {} }
vm.runInNewContext(compiled, { exports: scope.exports, require }, { filename: 'privatePreparedMediaAuthority.ts' })
const upload = scope.exports.assertPreparedPrivateMediaFirstUpload
const playback = scope.exports.assertFirstPrivateMemoryPlaybackBinding
const uid = 'syntheticOwner', memoryId = 'syntheticMemory'
const receiptId = 'b'.repeat(64), derivative = 'a'.repeat(64), consent = 'c'.repeat(64)
const first = {
  privacy: 'private', sourceMedia: [{ kind: 'audio', mediaReceiptId: receiptId }],
  sourceProvenance: { authenticity: 'source-derivative-not-generated-autobiography', derivativeSha256: derivative },
  firstPrivateMemoryConsent: { status: 'explicit-owner-confirmation', ownerId: uid, memoryId },
  firstPrivateMemoryActivation: { status: 'explicit-owner-private-replay', ownerId: uid, memoryId,
    mediaReceiptId: receiptId, derivativeSha256: derivative, consentRevision: 4, consentReceiptHash: consent },
}
const check = value => playback(value, uid, memoryId, receiptId, 4, consent)
const unmarkedUpload = value => upload(value, uid, memoryId, 'ordinary-upload', 'video', 'video/mp4', 'd'.repeat(64), 123)

test('valid owner-confirmed prepared memory retains playback binding', () => {
  assert.doesNotThrow(() => check(first))
})
test('a first-memory consent marker cannot be downgraded to ordinary upload by erasing provenance', () => {
  assert.throws(() => unmarkedUpload({ ...first, sourceMedia: [], sourceProvenance: {} }), /FIRST_PRIVATE_MEDIA_BINDING_INVALID/)
})
test('an existing first-memory receipt cannot bypass a stripped source during subsequent upload', () => {
  assert.throws(() => unmarkedUpload({ ...first, sourceProvenance: {} }), /FIRST_PRIVATE_MEDIA_BINDING_INVALID/)
})
test('a first-memory consent marker cannot permit playback after provenance is erased', () => {
  assert.throws(() => check({ ...first, sourceProvenance: {} }), /FIRST_PRIVATE_MEMORY_REPLAY_NOT_ACTIVATED/)
})
test('orphaned first-memory activation metadata cannot bypass playback provenance check', () => {
  const orphan = { privacy: 'private', firstPrivateMemoryActivation: first.firstPrivateMemoryActivation }
  assert.throws(() => check(orphan), /FIRST_PRIVATE_MEMORY_REPLAY_NOT_ACTIVATED/)
})
test('ordinary private memory without first-memory markers retains its existing behavior', () => {
  const normal = { privacy: 'private', sourceMedia: [{ kind: 'video', mediaReceiptId: receiptId }] }
  assert.doesNotThrow(() => check(normal))
  assert.doesNotThrow(() => unmarkedUpload(normal))
})
