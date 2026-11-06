'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
const { makeFixture } = require('../scripts/first-memory-authenticated-emulator-journey.cjs')
const sha = value => crypto.createHash('sha256').update(value).digest('hex')
const uid = 'fictional-owner-for-functions-emulator'
const make = () => makeFixture(uid, 'fictional_first_memory')
test('prepared emulator first-memory source is deterministic and synthetic', () => {
  const a = make(), b = make()
  assert.deepEqual(a.packet,b.packet); assert.deepEqual(a.audio,b.audio)
  assert.equal(a.audio.length,112); assert.equal(a.audio.toString('ascii',0,4),'OggS')
  assert.equal(a.packet.recordedTruth.claimedReconstruction,false)
  assert.equal(a.packet.recordedTruth.claimedLifeMovieAcceptance,false)
})
test('prepared packet is owner-bound, hidden, and excludes public URLs and media bytes', () => {
  const f=make(),encoded=JSON.stringify(f.packet)
  assert.equal(f.packet.firestorePath,'users/'+uid+'/memories/'+f.memoryId)
  assert.equal(f.packet.memory.ownerId,uid); assert.equal(f.packet.memory.privacy,'hidden')
  assert.deepEqual(f.packet.memory.sourceMedia,[])
  assert.doesNotMatch(encoded,/https?:\/\/|gs:\/\/|signedUrl|downloadToken|"bytesBase64"\s*:/i)
  assert.ok(Buffer.byteLength(encoded)<16*1024)
})
test('prepared media fingerprint, byte length, kind, and operation ID are fixed', () => {
  const f=make(),source=f.packet.memory.sourceProvenance
  assert.equal(source.derivativeSha256,sha(f.audio))
  assert.equal(source.derivativeByteLength,f.audio.length)
  assert.equal(f.packet.upload.request.kind,'audio')
  assert.equal(f.packet.upload.request.contentType,'audio/ogg')
  assert.equal(f.packet.upload.sha256,sha(f.audio))
  assert.equal(f.packet.upload.fileByteLength,f.audio.length)
  assert.equal(f.operationId,'firstlife_'+sha(uid+'\n'+f.memoryId+'\n'+sha(f.audio)).slice(0,40))
})
test('owner acknowledgement is separate from offline preparation',()=>{
  const f=make()
  assert.deepEqual(f.ownerConfirmation,{authorize:true,memoryId:f.memoryId,
    derivativeSha256:sha(f.audio),visibility:'hidden'})
  assert.equal(f.packet.upload.offlinePreparationGrantsConsent,false)
  assert.equal(f.packet.upload.ownerIdentityVerifiedOffline,false)
})
test('four original Replay phases are present without invented story details',()=>{
  const m=make().packet.memory.replayManifest
  assert.deepEqual(m.segments.map(x=>x.id),['memory','emotion','pattern','return'])
  assert.deepEqual(m.segments.map(x=>x.startsAtMs),[0,1500,3000,4500])
  assert.ok(m.segments.every(x=>x.durationMs===1500))
  assert.equal(m.durationMs,6000)
})
test('current C1 and ready receipt are required before protected Replay',()=>{
  const f=make(),u=f.packet.upload
  assert.equal(u.requiredCanonicalConsent,'memory.granted + C1 memory.storage + fully-enforced + no deletion fences')
  assert.equal(u.requiredSelectedMemoryConsentState,'authorized')
  assert.equal(u.activateAfter,'ready owner-scoped receipt, actual playback and current consent checks')
  assert.equal(u.initialVisibility,'hidden')
  assert.equal(u.existingCallable,'registerMemoryMedia')
})
test('unsafe actors and malformed memory IDs are rejected by fixture builder',()=>{
  for(const actor of ['','has/slash','bad email','x'.repeat(129)])
    assert.throws(()=>makeFixture(actor),/AssertionError/)
  assert.throws(()=>makeFixture(uid,'a/b'),/AssertionError/)
})
test('the real existing four-emulator proof calls the lifecycle before Auth token revocation',()=>{
  const src=fs.readFileSync(path.join(__dirname,'../scripts/memory-media-playback-emulator-proof.cjs'),'utf8')
  const begin=src.indexOf('await proveFirstMemoryLifecycle({ admin, db, call, owner, foreign, cases })')
  const revoke=src.indexOf('await admin.auth().revokeRefreshTokens(uid)')
  assert.ok(begin>=0 && revoke>begin,'LIFECYCLE_NOT_ENROLLED_BEFORE_AUTH_REVOKE')
  assert.match(src,/firstMemoryLifecycle\.positivePrivatePlaybackAccepted, false/)
  assert.match(src,/firstMemoryLifecycle\.deletionCertified, false/)
})
