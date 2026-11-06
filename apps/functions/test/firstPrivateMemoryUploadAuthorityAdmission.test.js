'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const source = fs.readFileSync(path.join(__dirname,'../src/privatePreparedMediaAuthority.ts'),'utf8')
const js = ts.transpileModule(source, { compilerOptions:{ module:ts.ModuleKind.CommonJS, target:ts.ScriptTarget.ES2022 } })
const mod = {exports:{}}
vm.runInNewContext(js.outputText,{module:mod,exports:mod.exports,require})
const {assertPreparedPrivateMediaUploadAuthority: admission,
 assertPreparedPrivateMediaFirstUpload: firstUpload,
 assertFirstPrivateMemoryPlaybackBinding: playback} = mod.exports
const uid='syntheticOwner', memoryId='syntheticMemory', digest='a'.repeat(64), receipt='b'.repeat(64), consent='c'.repeat(64)
const op='firstlife_'+crypto.createHash('sha256').update(uid+'\n'+memoryId+'\n'+digest).digest('hex').slice(0,40)
const prepared={
  ownerId:uid, privacy:'hidden', consentState:'authorized', sourceMedia:[],
  sourceProvenance:{authenticity:'source-derivative-not-generated-autobiography',originalSha256:'d'.repeat(64),
    derivativeSha256:digest, derivativeByteLength:112, derivedContentType:'audio/ogg'},
  firstPrivateMemoryConsent:{status:'explicit-owner-confirmation'}
}
const approve=(value)=>admission(value)
test('new upload-authority guard exported from actual prepared-media source',()=>{
  assert.equal(typeof admission,'function','Upload authority must use selected prepared-memory consent authority')
})
test('authorized hidden prepared memory remains eligible for an upload authority response',()=>{
  assert.doesNotThrow(()=>approve(prepared))
  assert.doesNotThrow(()=>firstUpload(prepared,uid,memoryId,op,'audio','audio/ogg',digest,112))
})
test('missing, malformed, limited, paused, denied and revoked selected consent fail closed',()=>{
  for (const state of [undefined,null,'limited','paused','denied','revoked','pending','unknown',true]) {
    assert.throws(()=>approve({...prepared,consentState:state}),/FIRST_PRIVATE_MEDIA_BINDING_INVALID/,String(state))
  }
})
test('prepared markers cannot evade the new guard by losing provenance',()=>{
  assert.throws(()=>approve({ownerId:uid, privacy:'hidden',firstPrivateMemoryConsent:{},consentState:'pending'}),/FIRST_PRIVATE_MEDIA_BINDING_INVALID/)
  assert.throws(()=>approve({ownerId:uid, privacy:'private',firstPrivateMemoryActivation:{},consentState:undefined}),/FIRST_PRIVATE_MEDIA_BINDING_INVALID/)
  assert.throws(()=>approve({ownerId:uid, privacy:'hidden',sourceProvenance:{derivativeSha256:digest},consentState:'limited'}),/FIRST_PRIVATE_MEDIA_BINDING_INVALID/)
})
test('malformed prepared sourceMedia denies upload authority without changing legacy behavior',()=>{
  assert.throws(()=>approve({...prepared,sourceMedia:{malformed:true}}),/FIRST_PRIVATE_MEDIA_BINDING_INVALID/)
  assert.doesNotThrow(()=>approve({privacy:'private',sourceMedia:[{kind:'video',mediaReceiptId:receipt}]}))
  assert.doesNotThrow(()=>approve({privacy:'private',consentState:'limited',sourceMedia:[]}))
})
test('existing first-media and protected Replay guards retain independent selected consent checks',()=>{
  assert.throws(()=>firstUpload({...prepared,consentState:'limited'},uid,memoryId,op,'audio','audio/ogg',digest,112),/FIRST_PRIVATE_MEDIA_BINDING_INVALID/)
  assert.throws(()=>playback({...prepared,privacy:'private'},uid,memoryId,receipt,4,consent),/FIRST_PRIVATE_MEMORY_REPLAY_NOT_ACTIVATED/)
})
