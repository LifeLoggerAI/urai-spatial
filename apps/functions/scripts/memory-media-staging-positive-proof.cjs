'use strict'
// Human-approved, external NONPRODUCTION Firebase/GCS positive media acceptance.
// Never automatically executed by CI. --preflight performs no network I/O.
// Run only with the exact staged source commit, explicitly provisioned IAM,
// a private test bucket, short-lived ADC/WIF credentials and explicit approval.
const assert = require('node:assert/strict')
const { createHash, randomBytes } = require('node:crypto')
const path = require('node:path')
const { readFileSync } = require('node:fs')
const { stripTypeScriptTypes } = require('node:module')
const { assertExactStagingCheckout } = require('./memory-media-staging-source-check.cjs')
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const project = process.env.URAI_MEDIA_STAGING_PROJECT || ''
const bucketName = process.env.URAI_MEDIA_STAGING_BUCKET || ''
const region = 'us-central1'
const allowedProject = /^urai-[a-z0-9-]+-(?:staging|sandbox|test)(?:-[a-z0-9]+)?$/.test(project)
  && !['urai-4dc1d', 'urai-web-prod', 'urai-communications-prod'].includes(project)
const isolatedBucket = bucketName === project + '.appspot.com' || bucketName === project + '.firebasestorage.app'
const gate = process.env.URAI_MEDIA_STAGING_WRITE_APPROVAL === 'EXPLICIT_DISPOSABLE_STAGING_RUN'
const sourceSha = process.env.URAI_EXACT_HEAD || ''
const execute = process.argv.length === 3 && process.argv[2] === '--execute'
const preflight = process.argv.length === 3 && process.argv[2] === '--preflight'
assert.ok(execute || preflight, 'Use exactly --preflight or --execute')
if (preflight) {
  console.log(JSON.stringify({ schema:'urai-staging-media-positive-v1',preflight:true,networkRequests:0,
    positiveAccepted:false,productionIamAccepted:false,requiresExternalApproval:true,
    requiresNonproductionProject:true,sourceBoundExecution:false,requiresExactHead:true }))
} else {
  assert.ok(allowedProject && isolatedBucket, 'STAGING_PROJECT_AND_BUCKET_REQUIRED')
  assert.ok(gate, 'HUMAN_STAGING_WRITE_APPROVAL_REQUIRED')
  assert.match(sourceSha, /^[a-f0-9]{40}$/, 'EXACT_SOURCE_COMMIT_REQUIRED')
  assert.ok(process.env.URAI_MEDIA_STAGING_WEB_API_KEY, 'STAGING_WEB_API_KEY_REQUIRED')
  assert.ok(!process.env.FIREBASE_AUTH_EMULATOR_HOST && !process.env.FIRESTORE_EMULATOR_HOST
    && !process.env.FIREBASE_STORAGE_EMULATOR_HOST && !process.env.FUNCTIONS_EMULATOR,
    'STAGING_ACCEPTANCE_MUST_USE_REAL_BUCKET')
  assertExactStagingCheckout(sourceSha)
  main().catch(error => { console.error('STAGING_MEDIA_ACCEPTANCE_FAILED:' + String(error.code || error.message).slice(0,90)); process.exitCode = 1 })
}
function fictionalWav() {
  const sampleRate = 8000, count = 8000, buffer = Buffer.alloc(44 + count * 2)
  buffer.write('RIFF',0); buffer.writeUInt32LE(buffer.length-8,4); buffer.write('WAVEfmt ',8)
  buffer.writeUInt32LE(16,16); buffer.writeUInt16LE(1,20); buffer.writeUInt16LE(1,22)
  buffer.writeUInt32LE(sampleRate,24); buffer.writeUInt32LE(sampleRate*2,28)
  buffer.writeUInt16LE(2,32); buffer.writeUInt16LE(16,34); buffer.write('data',36)
  buffer.writeUInt32LE(count*2,40)
  for(let i=0;i<count;i++) buffer.writeInt16LE(Math.round(1000*Math.sin(i*2*Math.PI*440/sampleRate)),44+i*2)
  return buffer
}
async function main(){
  // This optional, human-approved runner must obey the SAME checked-in staging
  // allowlist and exact deployed-runtime identity gate as the protected server.
  // A project name, API key and operator flag alone can NEVER authorize cloud
  // account creation or media upload. Keep this before Admin initialization.
  const boundaryFile=path.resolve(__dirname,'../src/memoryMediaProjectBoundary.ts')
  const boundarySource=readFileSync(boundaryFile,'utf8')
  const boundary=await import('data:text/javascript;charset=utf-8,'+
    encodeURIComponent(stripTypeScriptTypes(boundarySource,{mode:'strip'})))
  assert.equal(boundary.resolveMemoryMediaProject(process.env),project,
    'STAGING_SOURCE_AND_RUNTIME_APPROVAL_REQUIRED')
  const admin = require('firebase-admin')
  const app = admin.initializeApp({ credential:admin.credential.applicationDefault(),projectId:project,storageBucket:bucketName })
  const auth = admin.auth(), db = admin.firestore(), bucket = admin.storage().bucket()
  const cases = [], cleanupErrors = []; let owner, foreign, receipt, problem, stagedMemoryId
  const evidence = {schema:'urai-staging-media-positive-v1',sourceSha,environment:'nonproduction-only',
    actualCloudBucketMetadata:false,actualNoPublicIam:false,positiveProxyPlaybackAccepted:false,
    exactClientBlobAccepted:false,sourceCheckoutVerified:true,deployedSourceExactHeadVerified:false,
    privateFamilyDataUsed:false,runResult:'NOT_ACCEPTED'}
  const endpoint = 'https://' + region + '-' + project + '.cloudfunctions.net/'
  const userPath = uid => 'users/' + uid
  const idTokenFor = async user => {
    const response = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key='
      + encodeURIComponent(process.env.URAI_MEDIA_STAGING_WEB_API_KEY), {
      method:'POST',headers:{'content-type':'application/json'},
      body:JSON.stringify({email:user.email,password:user.password,returnSecureToken:true}),
      signal:AbortSignal.timeout(20000),redirect:'error'
    })
    assert.equal(response.status,200,'FRESH_STAGING_OWNER_AUTH_REQUIRED')
    const data=await response.json()
    assert.ok(typeof data.idToken==='string' && data.localId===user.uid, 'STAGING_AUTH_OWNER_MISMATCH')
    return data.idToken
  }
  const callable = async(name, token, data) => {
    const response = await fetch(endpoint+name,{ method:'POST',headers:{'content-type':'application/json',
      authorization:'Bearer '+token},body:JSON.stringify({data}),redirect:'error',
      signal:AbortSignal.timeout(120000) })
    const body=await response.json().catch(()=>null)
    return {status:response.status,body}
  }
  const selection = d => new URLSearchParams({memoryId:d.memoryId,receiptId:d.receiptId,
    authorityHash:d.authorityHash,expiresAt:String(d.expiresAt),storageGeneration:d.storageGeneration})
  const stream = async(d,token,headers={}) => fetch(endpoint+'streamMemoryMediaPlayback?'+selection(d),{
    method:headers.method || 'GET',headers:{...(token ? { authorization:'Bearer '+token } : {}),
      origin:'https://'+project+'.web.app',...(headers.range?{range:headers.range}:{}) ,
      ...(headers.ifRange?{'if-range':headers.ifRange}:{})},
    cache:'no-store',redirect:'error',signal:AbortSignal.timeout(65000)
  })
  const denied = async(resp,label,method='GET') => {
    assert.ok([401,403,404,409].includes(resp.status),label+': expected a current-authority denial')
    assert.equal(resp.headers.get('cache-control'),'private, no-store',label+': denied bytes cannot be cached')
    if(method==='HEAD') assert.equal((await resp.arrayBuffer()).byteLength,0,label+': HEAD denial sent body')
    else {
      const value=await resp.json()
      assert.deepEqual(value,{error:'memory_media_playback_unavailable'},label+': generic denial only')
    }
    cases.push(label)
  }
  try{
    assert.equal(bucket.name,bucketName,'STAGING_BUCKET_BINDING_MISMATCH')
    const [bucketMeta] = await bucket.getMetadata()
    assert.equal(bucketMeta.iamConfiguration?.uniformBucketLevelAccess?.enabled,true,'STAGING_UBLA_REQUIRED')
    assert.equal(bucketMeta.iamConfiguration?.publicAccessPrevention,'enforced','STAGING_PUBLIC_ACCESS_PREVENTION_REQUIRED')
    const [iam] = await bucket.iam.getPolicy({requestedPolicyVersion:3})
    assert.ok((iam.bindings||[]).every(binding => (binding.members||[]).every(member =>
      member!=='allUsers' && member!=='allAuthenticatedUsers')),'STAGING_PUBLIC_IAM_BINDING')
    evidence.actualCloudBucketMetadata=true; evidence.actualNoPublicIam=true
    cases.push('real nonproduction GCS UBLA, public access prevention and IAM checked')
    const nonce=randomBytes(9).toString('hex'),password=randomBytes(25).toString('base64url')+'Aa1!'
    owner=await auth.createUser({email:'urai-media-'+nonce+'@example.invalid',password})
    foreign=await auth.createUser({email:'urai-media-other-'+nonce+'@example.invalid',password})
    owner={uid:owner.uid,email:'urai-media-'+nonce+'@example.invalid',password}
    foreign={uid:foreign.uid,email:'urai-media-other-'+nonce+'@example.invalid',password}
    const memoryId='fictional_'+nonce, bytes=fictionalWav()
    stagedMemoryId=memoryId
    const userDoc=db.doc(userPath(owner.uid)),memoryDoc=db.doc(userPath(owner.uid)+'/memories/'+memoryId)
    const policyDoc=db.doc(userPath(owner.uid)+'/privacyPolicy/current')
    const consentDoc=db.doc('consentRecords/'+owner.uid+'_memory_storage')
    const domain=()=>({mode:'granted',retentionDays:365,precise:false,replayVisible:true,
      lifeMapVisible:true,modelContext:false,sharingEnabled:false,automationEnabled:false,likenessEnabled:false})
    const policy={ownerId:owner.uid,version:2,revision:1,
      domains:Object.fromEntries(['memory','location','models','exports','workforce','identity'].map(x=>[x,domain()])),
      enforcement:{state:'fully-enforced',jobId:null,affectedTargets:[],providerState:'not-applicable'}}
    const consent={uid:owner.uid,purpose:'memory.storage',consentTier:'C1',policyVersion:'1.0.0',
      status:'granted',receiptHash:sha(randomBytes(32)),expiresAt:new Date(Date.now()+3600000).toISOString()}
    const batch=db.batch()
    batch.set(userDoc,{accountStatus:'active'});batch.set(memoryDoc,{ownerId:owner.uid,privacy:'private',sourceMedia:[]})
    batch.set(policyDoc,policy);batch.set(consentDoc,consent);await batch.commit()
    const ownerToken=await idTokenFor(owner),foreignToken=await idTokenFor(foreign)
    const upload=await callable('registerMemoryMedia',ownerToken,{memoryId,operationId:'fictional_'+nonce,
      kind:'audio',contentType:'audio/wav',base64:bytes.toString('base64')})
    assert.equal(upload.status,200,'TRUSTED_STAGING_UPLOAD_REQUIRED')
    assert.equal(upload.body?.result?.state,'ready','UPLOAD_RECEIPT_NOT_READY')
    const receiptId=upload.body.result.receiptId
    receipt=(await db.doc(userPath(owner.uid)+'/memoryMediaReceipts/'+receiptId).get()).data()
    assert.equal(receipt?.state,'ready');assert.equal(receipt?.ownerUid,owner.uid)
    assert.equal(receipt?.bucketName,bucketName)
    assert.equal(receipt?.sha256,sha(bytes))
    assert.ok(String(receipt.objectPath).startsWith('private-memory-media/'+sha(owner.uid)+'/'))
    const object=bucket.file(receipt.objectPath,{generation:String(receipt.storageGeneration)})
    const [metadata]=await object.getMetadata(),[stored]=await object.download()
    assert.equal(String(metadata.generation),String(receipt.storageGeneration))
    assert.equal(metadata.contentType,'audio/wav');assert.equal(metadata.metadata?.ownerHash,sha(owner.uid))
    assert.ok(!metadata.metadata?.firebaseStorageDownloadTokens,'PORTABLE_PUBLIC_DOWNLOAD_TOKEN_FORBIDDEN')
    assert.deepEqual(stored,bytes);cases.push('actual trusted upload, exact generation and source bytes')
    const publicUrl='https://storage.googleapis.com/'+bucketName+'/'+
      receipt.objectPath.split('/').map(encodeURIComponent).join('/')
    const publicProbe=await fetch(publicUrl,{method:'GET',redirect:'manual',signal:AbortSignal.timeout(15000)})
    assert.ok([401,403,404].includes(publicProbe.status),'PUBLIC_GCS_MEDIA_READ_FORBIDDEN')
    cases.push('anonymous GCS object URL denied')
    const authority=await callable('getMemoryMediaPlaybackAuthority',ownerToken,{memoryId,receiptId})
    assert.equal(authority.status,200,'POSITIVE_DESCRIPTOR_REQUIRED')
    const descriptor=authority.body?.result
    assert.equal(descriptor?.ownerId,owner.uid)
    assert.equal(descriptor?.sha256,sha(bytes))
    assert.equal(String(descriptor?.storageGeneration),String(receipt.storageGeneration))
    assert.equal(descriptor?.requiresAuthorization,true)
    assert.ok(!JSON.stringify(descriptor).includes(receipt.objectPath),'SOURCE_OBJECT_PATH_MUST_NOT_LEAK')
    await denied(await stream(descriptor,undefined),'anonymous actor cannot reuse issued descriptor')
    const full=await stream(descriptor,ownerToken)
    assert.equal(full.status,200,'POSITIVE_AUTHENTICATED_STREAM_REQUIRED')
    assert.equal(full.headers.get('cache-control'),'private, no-store')
    assert.equal(full.headers.get('x-urai-checksum-sha256'),sha(bytes))
    assert.equal(full.headers.get('x-urai-storage-generation'),String(receipt.storageGeneration))
    assert.deepEqual(Buffer.from(await full.arrayBuffer()),bytes)
    cases.push('real owner full HTTP stream delivered exact private bytes')
    const part=await stream(descriptor,ownerToken,{range:'bytes=100-499',
      ifRange:'"'+sha(bytes)+'"'})
    assert.equal(part.status,206,'NATIVE_RANGE_DELIVERY_REQUIRED')
    assert.equal(part.headers.get('content-range'),'bytes 100-499/'+bytes.length)
    assert.deepEqual(Buffer.from(await part.arrayBuffer()),bytes.subarray(100,500))
    cases.push('real owner ranged HTTP stream delivered expected bytes')
    const head=await stream(descriptor,ownerToken,{method:'HEAD'})
    assert.equal(head.status,200);assert.equal((await head.arrayBuffer()).byteLength,0)
    cases.push('real owner HEAD response bounded')
    // Compile/use the actual React-owned transport; no synthetic HTTP adapter.
    const transportFile=path.resolve(__dirname,'../../../urai-tier1/src/spatial/memory/ownedMemoryMediaPlayback.ts')
    // Node 22 minor versions do not all load .ts files directly. Strip only
    // type syntax from the actual checked-in client module; never use a fake
    // transport implementation to claim positive browser-compatible playback.
    const clientSource=readFileSync(transportFile,'utf8')
    const client=await import('data:text/javascript;charset=utf-8,'+
      encodeURIComponent(stripTypeScriptTypes(clientSource,{mode:'strip'})))
    assert.ok(client.validateOwnedMemoryPlaybackDescriptor(descriptor,
      {ownerId:owner.uid,memoryId,receipt:{mediaReceiptId:receiptId,kind:'audio'}}))
    const lifetime=new AbortController()
    const blob=await client.fetchOwnedMemoryPlayback(descriptor,project,{
      signal:lifetime.signal,isCurrent:()=>!lifetime.signal.aborted,
      requestHeaders:async()=>({Authorization:'Bearer '+ownerToken,Origin:'https://'+project+'.web.app'})
    })
    assert.equal(blob.type,'audio/wav')
    assert.deepEqual(Buffer.from(await blob.arrayBuffer()),bytes)
    evidence.exactClientBlobAccepted=true
    cases.push('actual owned-memory client accepted fixed authenticated Blob')
    await denied(await stream(descriptor,foreignToken),'foreign account cannot reuse descriptor')
    await denied(await stream(descriptor,foreignToken,{range:'bytes=100-499'}),'foreign account ranged retry denied')
    await memoryDoc.delete()
    await denied(await stream(descriptor,ownerToken),'deleted source denies issued descriptor')
    await memoryDoc.set({ownerId:owner.uid,privacy:'private',sourceMedia:[{kind:'audio',mediaReceiptId:receiptId}]})
    await consentDoc.update({status:'revoked'})
    await denied(await stream(descriptor,ownerToken),'withdrawn C1 denies issued descriptor')
    await denied(await stream(descriptor,ownerToken,{range:'bytes=100-499'}),'withdrawn C1 denies issued ranged retry')
    await denied(await stream(descriptor,ownerToken,{method:'HEAD'}),'withdrawn C1 denies issued HEAD retry','HEAD')
    evidence.positiveProxyPlaybackAccepted=true
  } catch(error){ problem=error }
  finally {
    if(owner){
      try{
        const receipts=await db.collection(userPath(owner.uid)+'/memoryMediaReceipts').get()
        for(const doc of receipts.docs){
          const r=doc.data(),prefix='private-memory-media/'+sha(owner.uid)+'/'
          if(!stagedMemoryId || r.ownerUid!==owner.uid || r.memoryId!==stagedMemoryId
            || r.receiptId!==doc.id || typeof r.objectPath!=='string'
            || !r.objectPath.startsWith(prefix+sha(stagedMemoryId)+'/'+doc.id+'/'))
            throw Error('UNSAFE_STAGING_CLEANUP_TARGET')
          await bucket.file(r.objectPath,{generation:String(r.storageGeneration||'')}).delete({ignoreNotFound:true})
        }
        await db.recursiveDelete(db.doc(userPath(owner.uid)))
        await db.doc('consentRecords/'+owner.uid+'_memory_storage').delete()
        await auth.deleteUser(owner.uid)
      }catch(e){cleanupErrors.push(String(e.code||e.message).slice(0,80))}
    }
    if(foreign){try{await auth.deleteUser(foreign.uid)}catch(e){cleanupErrors.push(String(e.code||e.message).slice(0,80))}}
    await app.delete().catch(e=>cleanupErrors.push(String(e.code||e.message).slice(0,80)))
  }
  evidence.cases=cases
  evidence.cleanupComplete=cleanupErrors.length===0
  evidence.runResult=problem||cleanupErrors.length?'NOT_ACCEPTED':'STAGING_POSITIVE_ACCEPTED'
  evidence.productionReleaseCertified=false
  // Never report tokens, identity, passwords, object paths or direct URLs.
  console.log(JSON.stringify(evidence))
  if(problem||cleanupErrors.length) {
    if(problem)console.error('STAGING_MEDIA_EVIDENCE_BLOCKED:'+String(problem.code||problem.message).slice(0,110))
    if(cleanupErrors.length)console.error('STAGING_FIXTURE_CLEANUP_INCOMPLETE:'+cleanupErrors.join(','))
    process.exitCode=1
  }
}
