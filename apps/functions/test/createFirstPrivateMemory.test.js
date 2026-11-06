'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const origin = path.join(__dirname, '../src/createFirstPrivateMemory.ts')
const transpiled = ts.transpileModule(fs.readFileSync(origin, 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText
const uid = 'syntheticOwner', memoryId = 'syntheticMemory', digest = 'b'.repeat(64)

const derivative = digest, original = 'a'.repeat(64)
const operationId = 'firstlife_' + crypto.createHash('sha256').update(uid+'\n'+memoryId+'\n'+derivative).digest('hex').slice(0,40)
const parsedSource = fs.readFileSync(path.join(__dirname,'../src/firstPrivateMemoryPacket.ts'),'utf8')
const parsedJs = ts.transpileModule(parsedSource,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText
const parserModule={exports:{}}
vm.runInNewContext(parsedJs,{module:parserModule,exports:parserModule.exports,require,Buffer,Date})
const actualParse = parserModule.exports.parsePreparedFirstPrivateMemory
const policySource=fs.readFileSync(path.join(__dirname,'../src/consentPolicyAuthority.ts'),'utf8')
const policyJs=ts.transpileModule(policySource,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText
const policyModule={exports:{}}
vm.runInNewContext(policyJs,{module:policyModule,exports:policyModule.exports,require,Buffer,Date,Set,Object,Reflect,Number})
const actualPolicy=policyModule.exports.isCanonicalStoredPolicy
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

function fixture(realPacket=false) {
  let deniedProject = false, readCount = 0, verified = 0, createCount = 0, beforeVerify = null
  const now = Math.floor(Date.now()/1000)
  const documents = new Map()
  const user = {deleted:false,accountStatus:'active'}
  const mode={mode:'granted',retentionDays:365,precise:false,replayVisible:true,lifeMapVisible:true,
    modelContext:false,sharingEnabled:false,automationEnabled:false,likenessEnabled:false}
  const policy = realPacket ? {version:2,revision:2,ownerId:uid,
    domains:Object.fromEntries(['memory','location','models','exports','workforce','identity'].map(d=>[d,{...mode}])),
    enforcement:{state:'fully-enforced',jobId:null,affectedTargets:[],providerState:'not-applicable'}}
    : {revision:2, domains:{memory:{mode:'granted'}}, enforcement:{state:'fully-enforced'}}
  const consent = {uid,purpose:'memory.storage',consentTier:'C1',policyVersion:'1.0.0',status:'granted',receiptHash:'a'.repeat(64),expiresAt:new Date(Date.now()+900000).toISOString()}
  documents.set(`users/${uid}`,user)
  documents.set(`users/${uid}/privacyPolicy/current`,policy)
  documents.set(`consentRecords/${uid}_memory_storage`,consent)
  const queries = { deletions: false }
  const parsed = {memoryId,memory:{ownerId:uid,title:'Synthetic',privacy:'hidden',sourceMedia:[],consentState:'authorized',sourceProvenance:{derivativeSha256:digest}}}
  let token = {uid,auth_time:now}
  let throwParse = false
  const writes=[]
  const ref = path=>({path})
  // A small transactional fake: staging a write does not commit it if the
  // callback fails; create-only writes are rejected if the ID exists.
  // This models single-threaded atomicity, NOT Firebase concurrency/retries.
  const db={doc:ref,collection:p=>({where:()=>({limit:()=>({__query:p})})}),runTransaction:async f=>{
    const staged=[]
    const result=await f({
      get:async item=>{
        readCount++
        if(item.__query)return {empty:!queries.deletions}
        const value=documents.get(item.path)
        return {exists:value!==undefined,data:()=>value,get:key=>value?.[key]}
      },
      create:(target,data)=>{staged.push({path:target.path,data})}
    })
    if(staged.some(x=>documents.has(x.path)))throw Error('ALREADY_EXISTS_TRANSACTION')
    for(const w of staged){documents.set(w.path,w.data);writes.push(w);createCount++}
    return result
  }}
  const admin={apps:[{}],firestore:()=>db,auth:()=>({verifyIdToken:async()=>{verified++;if(beforeVerify)await beforeVerify(verified);return token}})}
  class FakeTimestamp {}
  class HttpsError extends Error {constructor(code,message){super(message);this.code=code}}
  const func={https:{onCall:f=>f,HttpsError}}
  const deps={
    'firebase-admin':admin,
    'firebase-admin/firestore':{FieldValue:{serverTimestamp:()=>({__serverTime:true})},Timestamp:FakeTimestamp},
    'firebase-functions/v1':func,
    'node:crypto':crypto,
    './consentPolicyAuthority':{isCanonicalStoredPolicy:(p,id)=>realPacket ? actualPolicy(p,id) : (id===uid && p===policy)},
    './firstPrivateMemoryPacket':{parsePreparedFirstPrivateMemory:(_packet,id)=>{if(throwParse||id!==uid)throw Error('INVALID_PACKET');return realPacket ? actualParse(_packet,id) : parsed}},
    './memoryMediaProjectBoundary':{resolveMemoryMediaProject:()=>{if(deniedProject)throw Error('DENY_PROJECT');return 'demo-urai'}}
  }
  const module={exports:{}}
  vm.runInNewContext(transpiled,{module,exports:module.exports,require:name=>{
    assert.ok(name in deps,'unexpected import '+name);return deps[name]
  },process:{env:{FUNCTIONS_EMULATOR:'true',GCLOUD_PROJECT:'demo-urai'}},Date,Buffer,Set,Object,Number,Math},{filename:'createFirstPrivateMemory.ts'})
  const context={auth:{uid},rawRequest:{get:k=>k==='authorization'?'Bearer fictional-jwt':undefined}}
  const data={packet:realPacket?packet():{fake:'only'},ownerConfirmation:{authorize:true,memoryId,derivativeSha256:digest,visibility:'hidden'}}
  const run=()=>module.exports.createFirstPrivateMemory(data,context)
  return {run,context,data,documents,queries,policy,consent,writes,uid,memoryId,digest,
    stats:()=>({readCount,verified,createCount}),token:val=>{token=val},onVerify:cb=>{beforeVerify=cb},project:()=>{deniedProject=true},parse:()=>{throwParse=true}}
}
const reject=async (f,pattern)=>{await assert.rejects(f.run(),x=>{assert.equal(x.code,'failed-precondition');assert.match(x.message,pattern);return true});assert.equal(f.writes.length,0)}
test('valid explicit owner confirmation and live C1 create one hidden memory without private bytes', async()=>{
  const f=fixture();const r=await f.run()
  assert.equal(r.state,'created-without-media');assert.equal(r.memoryId,memoryId)
  assert.equal(f.writes.length,1)
  const w=f.writes[0]
  assert.equal(w.path,`users/${uid}/memories/${memoryId}`)
  assert.equal(w.data.privacy,'hidden');assert.equal(w.data.consentState,'authorized')
  assert.equal(w.data.firstPrivateMemoryConsent.status,'explicit-owner-confirmation')
  assert.equal(w.data.firstPrivateMemoryConsent.canonicalConsentReceiptHash,'a'.repeat(64))
  assert.equal(JSON.stringify(w.data).includes('base64'),false)
  assert.ok(f.stats().verified>=3)
})
test('requires separate deliberate owner confirmation', async()=>{
  const f=fixture();f.data.ownerConfirmation.authorize=false
  await reject(f,/OWNER_CONFIRMATION_REQUIRED/);assert.equal(f.stats().readCount,0)
})
test('rejects owner confirmation bound to different source digest',async()=>{
  const f=fixture();f.data.ownerConfirmation.derivativeSha256='c'.repeat(64)
  await reject(f,/OWNER_CONFIRMATION_REQUIRED/)
})
test('rejects untrusted packet and does not grant consent',async()=>{const f=fixture();f.parse();await reject(f,/PACKET_INVALID/)})
test('does not read Firestore without fresh bearer authentication',async()=>{
  const f=fixture();f.context.rawRequest.get=()=>''
  await assert.rejects(f.run(),x=>x.code==='unauthenticated')
  assert.equal(f.stats().readCount,0);assert.equal(f.writes.length,0)
})
test('rejects identity switch between callable context and signed token',async()=>{
  const f=fixture();f.token({uid:'someoneElse',auth_time:Math.floor(Date.now()/1000)})
  await assert.rejects(f.run(),x=>x.code==='unauthenticated')
  assert.equal(f.writes.length,0)
})
test('rejects stale owner auth',async()=>{
  const f=fixture();f.token({uid,auth_time:Math.floor(Date.now()/1000)-600})
  await assert.rejects(f.run(),x=>x.code==='unauthenticated');assert.equal(f.writes.length,0)
})
test('rejects revoked C1 grant',async()=>{const f=fixture();f.consent.status='revoked';await reject(f,/CURRENT_AUTHORITY_REQUIRED/)})
test('rejects policy memory access paused even if old C1 exists',async()=>{const f=fixture();f.policy.domains.memory.mode='paused';await reject(f,/CURRENT_AUTHORITY_REQUIRED/)})
test('rejects C1 expiration even when record hash remains valid',async()=>{const f=fixture();f.consent.expiresAt=new Date(Date.now()-10000).toISOString();await reject(f,/CURRENT_AUTHORITY_REQUIRED/)})
test('rejects pending owner deletions',async()=>{const f=fixture();f.queries.deletions=true;await reject(f,/CURRENT_AUTHORITY_REQUIRED/)})
test('rejects central privacy tombstone',async()=>{const f=fixture();f.documents.set(`privacyDeletionTombstones/${uid}`,{uid,active:true});await reject(f,/CURRENT_AUTHORITY_REQUIRED/)})
test('rejects unreleased permanent deletion fence',async()=>{const f=fixture();f.documents.set(`uraiPrivateLifeModelOwnerFences/${crypto.createHash('sha256').update(uid).digest('hex')}`,{ownerHash:'invalid',deleted:true,deletionEpoch:3});await reject(f,/CURRENT_AUTHORITY_REQUIRED/)})
test('rejects jobs-level C1 consent block',async()=>{const f=fixture();f.documents.set(`jobConsentBlocks/${crypto.createHash('sha256').update(uid+'\n'+'memory.storage').digest('hex')}`,{ownerUid:uid,purpose:'memory.storage',active:true});await reject(f,/CURRENT_AUTHORITY_REQUIRED/)})
test('rejects duplicate canonical ID without overwriting source',async()=>{const f=fixture();f.documents.set(`users/${uid}/memories/${memoryId}`,{ownerId:uid});await reject(f,/ALREADY_EXISTS/)})
test('refuses unreviewed project binding before auth or Firestore',async()=>{const f=fixture();f.project();await reject(f,/PROJECT_UNBOUND/);assert.equal(f.stats().readCount,0)})
test('rejects callback payload with unknown injection field',async()=>{const f=fixture();f.data.legacyConsentState='authorized';await reject(f,/OWNER_CONFIRMATION_REQUIRED/)})

// Post-RFINAL45 heldout negative controls. All identities and documents are fictional.
test('does not authorize missing Firebase callable context identity', async()=>{
  const f=fixture();f.context.auth=undefined
  await assert.rejects(f.run(),x=>x.code==='unauthenticated')
  assert.equal(f.stats().readCount,0);assert.equal(f.writes.length,0)
})
test('rejects a token with future or missing auth_time',async()=>{
  for(const auth_time of [Math.floor(Date.now()/1000)+90,undefined,'recent']) {
    const f=fixture();f.token({uid,auth_time})
    await assert.rejects(f.run(),x=>x.code==='unauthenticated')
    assert.equal(f.stats().readCount,0);assert.equal(f.writes.length,0)
  }
})
test('rejects a deleted or disabled owner account',async()=>{
  for(const patch of [{deleted:true},{accountStatus:'disabled'},{accountStatus:'deleting'}]) {
    const f=fixture();Object.assign(f.documents.get(`users/${uid}`),patch)
    await reject(f,/CURRENT_AUTHORITY_REQUIRED/)
  }
})
test('rejects missing consent or malformed C1 receipt',async()=>{
  const absent=fixture();absent.documents.delete(`consentRecords/${uid}_memory_storage`)
  await reject(absent,/CURRENT_AUTHORITY_REQUIRED/)
  const bad=fixture();bad.consent.receiptHash='not-a-current-receipt'
  await reject(bad,/CURRENT_AUTHORITY_REQUIRED/)
})
test('rejects missing stored policy or incomplete provider enforcement',async()=>{
  const absent=fixture();absent.documents.delete(`users/${uid}/privacyPolicy/current`)
  await reject(absent,/CURRENT_AUTHORITY_REQUIRED/)
  const partial=fixture();partial.policy.enforcement.state='partially-enforced'
  await reject(partial,/CURRENT_AUTHORITY_REQUIRED/)
})
test('rejects paused barrier and local runtime pending deletions',async()=>{
  const barrier=fixture();barrier.documents.set(`privateLifeModelOwnerBarriers/${crypto.createHash('sha256').update(uid).digest('hex')}`,{blocked:true})
  await reject(barrier,/CURRENT_AUTHORITY_REQUIRED/)
  const pending=fixture();pending.documents.set(`users/${uid}/privacyRuntime/exportAuthority`,{generation:0,pendingDeletions:{a:'queued'}})
  await reject(pending,/CURRENT_AUTHORITY_REQUIRED/)
})
test('rejects foreign central tombstone even when not active',async()=>{
  const f=fixture();f.documents.set(`privacyDeletionTombstones/${uid}`,{uid:'other',active:false})
  await reject(f,/CURRENT_AUTHORITY_REQUIRED/)
})
test('create-only transaction persists original owner memory and refuses a later duplicate',async()=>{
  const f=fixture();await f.run()
  const original=f.documents.get(`users/${uid}/memories/${memoryId}`)
  assert.ok(original)
  await assert.rejects(f.run(),x=>x.code==='failed-precondition'&&x.message==='FIRST_PRIVATE_MEMORY_ALREADY_EXISTS')
  assert.equal(f.documents.get(`users/${uid}/memories/${memoryId}`),original)
  assert.equal(f.writes.length,1)
})
test('owner consent withdrawal before Firestore transaction prevents writes',async()=>{
  const f=fixture();f.onVerify(async count=>{if(count===2)f.consent.status='revoked'})
  await reject(f,/CURRENT_AUTHORITY_REQUIRED/)
})
test('changing to a new signed actor between checks aborts without write',async()=>{
  const f=fixture();f.onVerify(async count=>{if(count===2)f.token({uid:'new_actor',auth_time:Math.floor(Date.now()/1000)})})
  await assert.rejects(f.run(),x=>x.code==='unauthenticated')
  assert.equal(f.writes.length,0)
})
test('unknown ownerConfirmation field rejects before Firestore',async()=>{
  const f=fixture();f.data.ownerConfirmation.externalVisibility='public'
  await reject(f,/OWNER_CONFIRMATION_REQUIRED/)
  assert.equal(f.stats().readCount,0)
})

// These cases integrate actual server packet parsing and the canonical C1 policy
// validator into the original callable. Firestore/Auth stay explicitly mocked.
test('real prepared source packet and actual canonical policy create a hidden first memory',async()=>{
  const f=fixture(true);const result=await f.run()
  const stored=f.documents.get(`users/${uid}/memories/${memoryId}`)
  assert.equal(result.state,'created-without-media')
  assert.equal(stored.privacy,'hidden')
  assert.equal(stored.replayManifest.segments.length,4)
  assert.equal(stored.sourceProvenance.derivativeSha256,digest)
  assert.equal(stored.firstPrivateMemoryConsent.canonicalConsentReceiptHash,'a'.repeat(64))
  assert.equal(stored.firstPrivateMemoryConsent.consentRevision,2)
  assert.equal(stored.sourceMedia.length,0)
  assert.equal(stored.firstPrivateMemoryActivation,undefined)
})
test('forged prepared source provenance is denied before an owner document write',async()=>{
  const f=fixture(true);f.data.packet.memory.sourceProvenance.derivativeSha256='c'.repeat(64)
  await reject(f,/FIRST_PRIVATE_MEMORY_PACKET_INVALID/)
})
test('a malformed real stored owner policy rejects a genuine prepared source',async()=>{
  const f=fixture(true);delete f.policy.domains.identity
  await reject(f,/FIRST_PRIVATE_MEMORY_CURRENT_AUTHORITY_REQUIRED/)
})
test('signed principal rotation during a real prepared source create prevents canonical commit',async()=>{
  const f=fixture(true);f.onVerify(async count=>{if(count===2)f.token({uid:'foreign',auth_time:Math.floor(Date.now()/1000)})})
  await assert.rejects(f.run(),x=>x.code==='unauthenticated')
  assert.equal(f.writes.length,0)
})
test('individual owner confirmation cannot be replaced by valid packet and C1 alone',async()=>{
  const f=fixture(true);f.data.ownerConfirmation.authorize=false
  await reject(f,/FIRST_PRIVATE_MEMORY_OWNER_CONFIRMATION_REQUIRED/)
  assert.equal(f.stats().readCount,0)
})
