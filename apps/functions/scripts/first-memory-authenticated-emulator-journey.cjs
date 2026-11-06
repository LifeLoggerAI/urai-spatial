'use strict'
// Synthetic four-Firebase-emulator lifecycle extension. No live users or IAM-positive byte acceptance.
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const sha = value => crypto.createHash('sha256').update(value).digest('hex')
const phases = ['memory','emotion','pattern','return']

function makeFixture(uid, memoryId = 'fictional_first_memory') {
  assert.match(uid, /^[A-Za-z0-9_-]{1,128}$/)
  assert.match(memoryId, /^[A-Za-z0-9_-]{1,128}$/)
  const original = Buffer.from('Fictional offline source for Firebase emulator only. No private memories.\n')
  const audio = Buffer.alloc(112)
  audio.write('OggS', 0, 'ascii')
  for (let i = 4; i < audio.length; i++) audio[i] = (i * 17) % 251
  const originalSha256 = sha(original), derivativeSha256 = sha(audio)
  const operationId = 'firstlife_' + sha(uid+'\n'+memoryId+'\n'+derivativeSha256).slice(0, 40)
  const occurredAtBasis = 'archive-time-proxy-not-capture-date'
  const provenance = { originalSourceRef:'offline:fictional-emulator-source',
    originalSha256, derivativeSha256, originalByteLength:original.length,
    derivativeByteLength:audio.length, derivedContentType:'audio/ogg', occurredAtBasis,
    speakerDiarization:'not-verified', transcriptSync:'not-verified',
    authenticity:'source-derivative-not-generated-autobiography' }
  const packet = {
    schemaVersion:'urai-first-private-memory-preflight-v1',
    status:'PREPARED_NOT_IMPORTED_NOT_PLAYBACK_PROVEN',
    firestorePath:'users/'+uid+'/memories/'+memoryId,
    memory: { ownerId:uid, title:'Fictional local owner source',
      occurredAt:'2026-11-06T00:00:00.000Z',
      summary:'Only deterministic synthetic source media; no real person or remembered event.',
      emotionalState:'unknown', emotionalArc:[], people:[], privacy:'hidden',
      deleted:false, sourceMedia:[], sourceProvenance:provenance,
      replayManifest: { id:'source-'+memoryId, version:1, durationMs:6000,
        segments:phases.map((id,index)=>({id,startsAtMs:index*1500,durationMs:1500})) },
      narrator:{focus:'Fictional',replay:'Fictional'},
      star:{id:memoryId,position:[0,0,-6],scale:0.9,aura:'#8adfff',material:'glass'},
      visuals:{sky:'#061526',ground:'#132b2b',fog:0.35,particles:0.5,
        reflection:0.45,light:'#dffbff',accent:'#8adfff'} },
    upload:{ requiresExistingServerAuthoredMemory:true,
      requiredSelectedMemoryConsentState:'authorized', offlinePreparationGrantsConsent:false,
      ownerIdentityVerifiedOffline:false, requiredOwnerAuthFreshnessSeconds:300,
      requiredCanonicalConsent:'memory.granted + C1 memory.storage + fully-enforced + no deletion fences',
      initialVisibility:'hidden', existingCallable:'registerMemoryMedia',
      existingAuthorityCallable:'getMemoryMediaUploadAuthority',
      request:{memoryId,operationId,kind:'audio',contentType:'audio/ogg'},
      fileByteLength:audio.length,sha256:derivativeSha256,
      filePathNotEmbedded:true,base64NotEmbedded:true,
      activateAfter:'ready owner-scoped receipt, actual playback and current consent checks' },
    recordedTruth:{originalSha256,derivativeSha256,contentType:'audio/ogg',
      byteLength:audio.length,originalByteLength:original.length,occurredAtBasis,
      claimedReconstruction:false,claimedLifeMovieAcceptance:false}
  }
  return { packet,audio,memoryId,operationId,derivativeSha256,
    ownerConfirmation:{authorize:true,memoryId,derivativeSha256,visibility:'hidden'} }
}

async function proveFirstMemoryLifecycle({admin,db,call,owner,foreign,cases}) {
  const project = 'demo-memory-media-playback', uid = owner.localId
  assert.equal(process.env.GCLOUD_PROJECT, project)
  assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST,'127.0.0.1:9549')
  assert.equal(process.env.FIRESTORE_EMULATOR_HOST,'127.0.0.1:8249')
  assert.equal(process.env.STORAGE_EMULATOR_HOST,'http://127.0.0.1:9249')
  const f = makeFixture(uid), start = cases.length
  const memoryPath = 'users/'+uid+'/memories/'+f.memoryId
  const receiptPath = id => 'users/'+uid+'/memoryMediaReceipts/'+id
  const consentPath = 'consentRecords/'+uid+'_memory_storage'
  const policyPath = 'users/'+uid+'/privacyPolicy/current'
  const invoke = (name,data,token=owner.idToken) => call(name,data,token)
  const deny = (result,status,label) => {
    assert.ok(result.response.status>=400,label)
    assert.equal(result.body.error?.status,status,label)
    cases.push(label)
  }
  let receipt
  const creation = {packet:f.packet,ownerConfirmation:f.ownerConfirmation}
  try {
    deny(await invoke('createFirstPrivateMemory',creation,null),'UNAUTHENTICATED',
      'real first-memory callable denies anonymous creation')
    deny(await invoke('createFirstPrivateMemory',creation,foreign.idToken),'FAILED_PRECONDITION',
      'real first-memory callable denies foreign actor')
    deny(await invoke('createFirstPrivateMemory',{...creation,
      ownerConfirmation:{...f.ownerConfirmation,authorize:false}}),'FAILED_PRECONDITION',
      'real first-memory callable denies missing owner confirmation')
    const created = await invoke('createFirstPrivateMemory',creation)
    assert.equal(created.response.status,200)
    assert.equal(created.body.result?.state,'created-without-media')
    const hidden = (await db.doc(memoryPath).get()).data()
    assert.equal(hidden?.ownerId,uid)
    assert.equal(hidden?.privacy,'hidden')
    assert.equal(hidden?.consentState,'authorized')
    assert.deepEqual(hidden?.sourceMedia,[])
    assert.equal(hidden?.firstPrivateMemoryActivation,undefined)
    cases.push('real callable created hidden first memory with current C1')
    deny(await invoke('createFirstPrivateMemory',creation),'FAILED_PRECONDITION',
      'duplicate first memory cannot overwrite canonical source')
    deny(await invoke('activateFirstPrivateMemory',{memoryId:f.memoryId,
      receiptId:'f'.repeat(64),derivativeSha256:f.derivativeSha256,
      confirmPrivateReplay:true}),'FAILED_PRECONDITION',
      'first-memory activation before ready receipt denied')
    await db.doc(consentPath).update({status:'revoked'})
    deny(await invoke('getMemoryMediaUploadAuthority',{memoryId:f.memoryId}),
      'FAILED_PRECONDITION','withdrawn C1 denies protected first-memory upload admission')
    await db.doc(consentPath).update({status:'granted'})
    const uploaded = await invoke('registerMemoryMedia',
      {...f.packet.upload.request,base64:f.audio.toString('base64')})
    assert.equal(uploaded.response.status,200)
    assert.equal(uploaded.body.result?.state,'ready')
    const receiptId = uploaded.body.result.receiptId
    receipt = (await db.doc(receiptPath(receiptId)).get()).data()
    assert.equal(receipt?.state,'ready')
    assert.equal(receipt?.ownerUid,uid)
    assert.equal(receipt?.sha256,f.derivativeSha256)
    assert.equal(receipt?.bucketName,project+'.appspot.com')
    const storedMemory = (await db.doc(memoryPath).get()).data()
    assert.equal(storedMemory?.privacy,'hidden')
    assert.deepEqual(storedMemory?.sourceMedia,[{kind:'audio',mediaReceiptId:receiptId}])
    const [storedBytes] = await admin.storage().bucket(receipt.bucketName)
      .file(receipt.objectPath).download()
    assert.equal(sha(storedBytes),f.derivativeSha256)
    assert.deepEqual(storedBytes,f.audio)
    cases.push('real protected callable upload and exact stored synthetic audio bytes')
    deny(await invoke('getMemoryMediaPlaybackAuthority',{memoryId:f.memoryId,receiptId}),
      'FAILED_PRECONDITION','ready hidden first-memory private Replay denied')
    deny(await invoke('getMemoryMediaPlaybackAuthority',
      {memoryId:f.memoryId,receiptId},foreign.idToken),'FAILED_PRECONDITION',
      'foreign owner private Replay denied')
    deny(await invoke('activateFirstPrivateMemory',{memoryId:f.memoryId,receiptId,
      derivativeSha256:f.derivativeSha256,confirmPrivateReplay:false}),
      'FAILED_PRECONDITION','implicit private Replay activation denied')
    const activated = await invoke('activateFirstPrivateMemory',{memoryId:f.memoryId,receiptId,
      derivativeSha256:f.derivativeSha256,confirmPrivateReplay:true})
    assert.equal(activated.response.status,200)
    assert.equal(activated.body.result?.state,'owner-confirmed-ready-receipt')
    const active = (await db.doc(memoryPath).get()).data()
    assert.equal(active.privacy,'private')
    assert.equal(active.firstPrivateMemoryActivation?.consentRevision,4)
    assert.equal(active.firstPrivateMemoryActivation?.mediaReceiptId,receiptId)
    assert.equal(active.firstPrivateMemoryActivation?.derivativeSha256,f.derivativeSha256)
    cases.push('explicit owner callable activation binds exact current source')
    const iamClosed = await invoke('getMemoryMediaPlaybackAuthority',{memoryId:f.memoryId,receiptId})
    assert.ok(iamClosed.response.status>=400)
    assert.ok(['INTERNAL','FAILED_PRECONDITION'].includes(iamClosed.body.error?.status))
    assert.equal(iamClosed.body.result,undefined)
    cases.push('emulator cannot certify IAM-positive private playback')
    await db.doc(policyPath).update({revision:5})
    deny(await invoke('getMemoryMediaPlaybackAuthority',{memoryId:f.memoryId,receiptId}),
      'FAILED_PRECONDITION','changed consent revision invalidates activation')
    await db.doc(policyPath).update({revision:4})
    await db.doc(consentPath).update({status:'revoked'})
    deny(await invoke('getMemoryMediaPlaybackAuthority',{memoryId:f.memoryId,receiptId}),
      'FAILED_PRECONDITION','withdrawn C1 denies activated private Replay')
    await db.doc(consentPath).update({status:'granted'})
    return {stages:cases.length-start,positivePrivatePlaybackAccepted:false,deletionCertified:false}
  } finally {
    if(receipt?.objectPath && receipt?.bucketName)
      await admin.storage().bucket(receipt.bucketName).file(receipt.objectPath)
        .delete({ignoreNotFound:true})
    await db.doc(memoryPath).delete()
    if(receipt?.receiptId) await db.doc(receiptPath(receipt.receiptId)).delete()
  }
}
module.exports = {makeFixture,proveFirstMemoryLifecycle}
