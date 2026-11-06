'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

const file = path.join(__dirname, '../src/privatePreparedMediaAuthority.ts')
const source = fs.readFileSync(file, 'utf8')
const output = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
})
const scope = { exports: {} }
vm.runInNewContext(output.outputText, { exports: scope.exports, require })
const { assertPreparedPrivateMediaFirstUpload: upload, assertFirstPrivateMemoryPlaybackBinding: playback } = scope.exports
const uid = 'syntheticOwner', memoryId = 'syntheticMemory', derivative = 'b'.repeat(64)
const receipt = 'c'.repeat(64), consentHash = 'd'.repeat(64)
const operation = 'firstlife_' + crypto.createHash('sha256').update(uid+'\n'+memoryId+'\n'+derivative).digest('hex').slice(0,40)
const prepared = {
  privacy: 'private', consentState: 'authorized', sourceMedia: [{kind:'audio',mediaReceiptId:receipt}],
  sourceProvenance: { authenticity: 'source-derivative-not-generated-autobiography',
    originalSha256:'a'.repeat(64), derivativeSha256: derivative, derivativeByteLength:112, derivedContentType:'audio/ogg' },
  firstPrivateMemoryActivation: { status:'explicit-owner-private-replay', ownerId:uid, memoryId,
    mediaReceiptId:receipt, derivativeSha256:derivative, consentRevision:4, consentReceiptHash:consentHash },
}
const runUpload = (memory, op=operation, kind='audio', mime='audio/ogg', digest=derivative, len=112) =>
  upload(memory,uid,memoryId,op,kind,mime,digest,len)
const runPlayback = memory => playback(memory,uid,memoryId,receipt,4,consentHash)

test('authorized prepared first recording retains upload and current-epoch playback', () => {
  assert.doesNotThrow(()=>runUpload({...prepared,privacy:'hidden',sourceMedia:[]}))
  assert.doesNotThrow(()=>runUpload(prepared,'next-ordinary-upload','image','image/png',derivative,112))
  assert.doesNotThrow(()=>runPlayback(prepared))
})
test('malformed, missing or withdrawn prepared-memory consent denies first upload and private playback', () => {
  for (const state of ['denied','limited','paused','unexpected',null,undefined]) {
    const memory={...prepared,consentState:state,privacy:'hidden',sourceMedia:[]}
    assert.throws(()=>runUpload(memory),/FIRST_PRIVATE_MEDIA_BINDING_INVALID/,String(state)+' first upload')
    assert.throws(()=>runPlayback({...memory,privacy:'private'}),/FIRST_PRIVATE_MEMORY_REPLAY_NOT_ACTIVATED/,String(state)+' playback')
  }
})
test('post-activation abnormal consent state cannot authorize a later prepared attachment', () => {
  for (const state of ['denied','limited','paused',undefined]) {
    assert.throws(()=>runUpload({...prepared,consentState:state},'later-ordinary','image','image/png',derivative,112),
      /FIRST_PRIVATE_MEDIA_BINDING_INVALID/,String(state))
  }
})
test('ordinary legacy memories without first-private markers preserve preexisting behavior', () => {
  const ordinary={ privacy:'private',sourceMedia:[{kind:'video',mediaReceiptId:receipt}] }
  assert.doesNotThrow(()=>runUpload(ordinary,'ordinary-upload','image','image/png',derivative,112))
  assert.doesNotThrow(()=>runPlayback(ordinary))
})
test('hidden prepared recording remains unplayable even while selected consent is authorized', () => {
  assert.throws(()=>runPlayback({...prepared,privacy:'hidden'}),/FIRST_PRIVATE_MEMORY_REPLAY_NOT_ACTIVATED/)
})
