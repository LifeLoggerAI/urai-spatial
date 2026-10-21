const test = require('node:test')
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const source = fs.readFileSync(path.join(__dirname, '../src/privatePreparedMediaAuthority.ts'), 'utf8')
const result = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } })
const scope = { exports: {} }
vm.runInNewContext(result.outputText, { exports: scope.exports, require })
const check = scope.exports.assertPreparedPrivateMediaFirstUpload
const owner = 'syntheticOwner', memoryId = 'syntheticMemory', digest = 'b'.repeat(64)
const operationId = 'firstlife_' + crypto.createHash('sha256').update(owner+'\n'+memoryId+'\n'+digest).digest('hex').slice(0,40)
const prepared = { ownerId: owner, consentState: 'authorized', privacy: 'hidden', sourceMedia: [], sourceProvenance: {
  authenticity: 'source-derivative-not-generated-autobiography',
  originalSha256: 'a'.repeat(64), derivativeSha256: digest, derivativeByteLength: 112, derivedContentType: 'audio/ogg'
} }
const run = (memory=prepared, op=operationId, kind='audio', mime='audio/ogg', sum=digest, len=112) =>
  check(memory,owner,memoryId,op,kind,mime,sum,len)
test('valid prepared source with deterministic operation allowed',()=>assert.doesNotThrow(()=>run()))
test('modified source digest or byte length rejected',()=>{
  assert.throws(()=>run(prepared,operationId,'audio','audio/ogg','c'.repeat(64)),/FIRST_PRIVATE_MEDIA_BINDING_INVALID/)
  assert.throws(()=>run(prepared,operationId,'audio','audio/ogg',digest,113),/FIRST_PRIVATE_MEDIA_BINDING_INVALID/)
})
test('owner and selected memory identity remain bound',()=>{
  assert.throws(()=>check(prepared,'other',memoryId,operationId,'audio','audio/ogg',digest,112),/FIRST_PRIVATE_MEDIA_BINDING_INVALID/)
  assert.throws(()=>check(prepared,owner,'other',operationId,'audio','audio/ogg',digest,112),/FIRST_PRIVATE_MEDIA_BINDING_INVALID/)
})
test('invalid media kind, MIME or operation cannot bypass first recording',()=>{
  assert.throws(()=>run(prepared,operationId,'image','image/png'),/FIRST_PRIVATE_MEDIA_BINDING_INVALID/)
  assert.throws(()=>run(prepared,operationId,'audio','audio/mpeg'),/FIRST_PRIVATE_MEDIA_BINDING_INVALID/)
  assert.throws(()=>run(prepared,'memory-media-random'),/FIRST_PRIVATE_MEDIA_BINDING_INVALID/)
})
test('missing or malformed provenance rejected before first recording',()=>{
  assert.throws(()=>run({...prepared,sourceProvenance:{ derivativeSha256:digest }}),/FIRST_PRIVATE_MEDIA_BINDING_INVALID/)
  assert.throws(()=>run({...prepared,sourceProvenance:{...prepared.sourceProvenance, originalSha256:'bad'}}),/FIRST_PRIVATE_MEDIA_BINDING_INVALID/)
})
test('ordinary later attachments and non-prepared memories still allowed',()=>{
  assert.doesNotThrow(()=>run({ownerId:owner,sourceMedia:[]},'memory-media-id','image','image/png'))
  assert.doesNotThrow(()=>run({...prepared,sourceMedia:[{kind:'audio',mediaReceiptId:'c'.repeat(64)}]},'memory-media-next','image','image/png'))
  assert.throws(()=>run({ownerId:owner,sourceMedia:[]}),/FIRST_PRIVATE_MEDIA_BINDING_INVALID/)
})
test('idempotent original retry stays immutable and invalid media array denies',()=>{
  const m={...prepared,sourceMedia:[{kind:'audio',mediaReceiptId:'c'.repeat(64)}]}
  assert.doesNotThrow(()=>run(m))
  assert.throws(()=>run(m,operationId,'audio','audio/ogg','d'.repeat(64)),/FIRST_PRIVATE_MEDIA_BINDING_INVALID/)
  assert.throws(()=>run({...prepared,sourceMedia:'bad'}),/FIRST_PRIVATE_MEDIA_BINDING_INVALID/)
})
