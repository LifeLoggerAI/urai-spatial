'use strict'
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { createHash } = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const source = fs.readFileSync(path.join(__dirname, '../src/firstPrivateMemoryPacket.ts'), 'utf8')
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS,
  target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText
const mod = { exports: {} }
vm.runInNewContext(js, { module: mod, exports: mod.exports, require, Buffer, Date },
  { filename: 'firstPrivateMemoryPacket.ts' })
const parse = mod.exports.parsePreparedFirstPrivateMemory
const uid = 'syntheticOwner', memoryId = 'syntheticMemory', derivative = 'b'.repeat(64), original = 'a'.repeat(64)
const operationId = 'firstlife_' + createHash('sha256').update(uid+'\n'+memoryId+'\n'+derivative).digest('hex').slice(0,40)
function packet() {
  const total = 6000, cuts = [0,1500,3000,4500,6000], ids = ['memory','emotion','pattern','return']
  const provenance = { originalSourceRef:'offline:synthetic-proof', originalSha256:original, derivativeSha256:derivative,
    originalByteLength:8000, derivativeByteLength:112, derivedContentType:'audio/ogg',
    occurredAtBasis:'archive-time-proxy-not-capture-date', speakerDiarization:'not-verified',
    transcriptSync:'not-verified', authenticity:'source-derivative-not-generated-autobiography' }
  return { schemaVersion:'urai-first-private-memory-preflight-v1', status:'PREPARED_NOT_IMPORTED_NOT_PLAYBACK_PROVEN',
    firestorePath:'users/'+uid+'/memories/'+memoryId,
    memory:{ ownerId:uid, title:'Synthetic source recording', occurredAt:'2026-10-21T00:00:00.000Z',
      summary:'Synthetic media only. No personal recording is processed.', emotionalState:'unknown',
      emotionalArc:[], people:[], privacy:'hidden', deleted:false, sourceMedia:[], sourceProvenance:provenance,
      replayManifest:{ id:'source-'+memoryId,version:1,durationMs:total,
        segments: ids.map((id,i)=>({id,label:'Test',caption:'Synthetic',narratorLine:'Synthetic',startsAtMs:cuts[i],durationMs:cuts[i+1]-cuts[i]})) },
      narrator:{focus:'original',replay:'recording'},star:{id:memoryId,position:[0,0,-6],scale:.9,aura:'#8adfff',material:'glass'},
      visuals:{sky:'#061526',ground:'#132b2b',fog:.35,particles:.5,reflection:.45,light:'#dffbff',accent:'#8adfff'} },
    upload:{ requiresExistingServerAuthoredMemory:true,requiredSelectedMemoryConsentState:'authorized',
      offlinePreparationGrantsConsent:false,ownerIdentityVerifiedOffline:false,requiredOwnerAuthFreshnessSeconds:300,
      requiredCanonicalConsent:'memory.granted + C1 memory.storage + fully-enforced + no deletion fences', initialVisibility:'hidden',
      existingCallable:'registerMemoryMedia',existingAuthorityCallable:'getMemoryMediaUploadAuthority',
      request:{memoryId,operationId,kind:'audio',contentType:'audio/ogg'},fileByteLength:112,sha256:derivative,
      filePathNotEmbedded:true,base64NotEmbedded:true,activateAfter:'ready owner-scoped receipt, actual playback and current consent checks' },
    recordedTruth:{originalSha256:original,derivativeSha256:derivative,contentType:'audio/ogg',byteLength:112,
      originalByteLength:8000,occurredAtBasis:'archive-time-proxy-not-capture-date',claimedReconstruction:false,claimedLifeMovieAcceptance:false} }
}
const denies=(mutate, label)=>test(label,()=>{const p=packet();mutate(p);assert.throws(()=>parse(p,uid),/FIRST_PRIVATE_MEMORY_PACKET_INVALID/)})
test('owner packet creates hidden, authorized, provenance-bound canonical metadata without media bytes or URLs',()=>{
  const p=packet(), out=parse(p,uid)
  assert.equal(out.memoryId,memoryId)
  assert.equal(out.memory.ownerId,uid)
  assert.equal(out.memory.consentState,'authorized')
  assert.equal(out.memory.privacy,'hidden')
  assert.equal(out.memory.sourceProvenance.sourceAdmissionStatus,'owner-asserted-pending-media-verification')
  assert.equal(out.memory.sourceProvenance.derivativeSha256,derivative)
  assert.equal(out.memory.replayManifest.durationMs,6000)
  assert.equal(out.memory.replayManifest.segments.length,4)
  assert.equal(out.memory.sourceMedia.length,0)
  assert.equal(JSON.stringify(out).includes('base64'),false)
  assert.equal(JSON.stringify(out).includes('filePath'),false)
  assert.equal(JSON.stringify(out).includes('synthetic owner recording'),false)
  assert.equal(out.memory.narrator.focus.includes('source'),true)
})
test('output ignores owner-authored narrator, position and visual claims',()=>{
 const p=packet();p.memory.narrator={focus:'false identity',replay:'false spoken text'}
 p.memory.visuals={sky:'BAD'};p.memory.star={id:memoryId,position:[99,99,99]}
 const o=parse(p,uid)
 assert.equal(o.memory.narrator.focus.includes('false identity'),false)
 assert.equal(o.memory.star.position[0],0)
 assert.equal(o.memory.visuals.sky,'#061526')
})
denies(p=>{p.memory.ownerId='foreignActor'},'forged owner is rejected')
denies(p=>{p.firestorePath='users/other/memories/'+memoryId},'foreign Firestore path is rejected')
denies(p=>{p.memory.consentState='authorized'},'offline packet cannot grant individual memory consent')
denies(p=>{p.memory.privacy='shareable'},'first memory cannot be published as shared')
denies(p=>{p.memory.sourceMedia=[{url:'https://example.com/private'}]},'pre-attached media rejected')
denies(p=>{p.memory.people=[{id:'fictional',label:'not verified'}]},'unverified person attribution rejected')
denies(p=>{p.memory.deleted=true},'deleted owner packet cannot be admitted')
denies(p=>{p.memory.sourceProvenance.derivativeSha256='c'.repeat(64)},'mismatched derivative provenance rejected')
denies(p=>{p.recordedTruth.originalSha256='c'.repeat(64)},'mismatched original provenance rejected')
denies(p=>{p.upload.request.operationId='firstlife_'+'a'.repeat(40)},'wrong operation id rejected')
denies(p=>{p.upload.fileByteLength=300},'inconsistent derivative size rejected')
denies(p=>{p.upload.request.contentType='video/mp4'},'incorrect audio media type rejected')
denies(p=>{p.upload.offlinePreparationGrantsConsent=true},'offline consent promotion rejected')
denies(p=>{p.upload.requiredSelectedMemoryConsentState='pending'},'pending selected memory state rejected')
denies(p=>{p.memory.sourceProvenance.transcriptSync='verified'},'unverified transcript may not be upgraded')
denies(p=>{p.memory.replayManifest.segments[2].startsAtMs=3001},'invalid Replay segment continuity rejected')
denies(p=>{p.memory.replayManifest.durationMs=3000},'too-short Replay manifest rejected')
denies(p=>{p.memory.title='x'},'invalid title rejected')
denies(p=>{p.memory.foo='rogue'},'unknown memory field rejected')
denies(p=>{p.upload.request.base64='AA=='},'embedded owner media bytes rejected')
denies(p=>{p.recordedTruth.claimedLifeMovieAcceptance=true},'unverified Life Movie claim rejected')
denies(p=>{p.memory.sourceProvenance.derivativeByteLength=4*1024*1024+1},'overlimit derivative rejected')
denies(p=>{p.memory.summary='\u0000secret'},'control characters in owner text rejected')
