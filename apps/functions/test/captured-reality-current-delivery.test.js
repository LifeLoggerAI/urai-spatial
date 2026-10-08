const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { createHash } = require('node:crypto')
const { Readable, Writable } = require('node:stream')
const { createRequire } = require('node:module')
const http = require('node:http')
const { once } = require('node:events')
const uid = 'synthetic-owner', assetId = 'crp_synthetic_001'
const sha = value => createHash('sha256').update(value).digest('hex')
class HttpsError extends Error { constructor(code, message) { super(message); this.code = code } }
class Timestamp { constructor(n) { this.n=n } toMillis() { return this.n } }
function fixture() {
  const bytes=Buffer.alloc(131072), docs=new Map(), sources=[]
  for(let offset=0;offset<bytes.length;offset+=32){for(let axis=0;axis<3;axis++)bytes.writeFloatLE(1,offset+12+axis*4);bytes[offset+27]=255;bytes[offset+28]=255;bytes[offset+29]=128;bytes[offset+30]=128;bytes[offset+31]=128}
  const binding={sourceReceiptRef:'psr_synthetic_capture_000001',sourceRevision:1,sourceSha256:'a'.repeat(64),sourceByteLength:1234,sourceFixityRef:'private:synthetic/fixity',
    sourceConsentSha256:sha(JSON.stringify(['memory.storage','location.context'].map(purpose=>({purpose,policyVersion:'synthetic-v1',decisionReceiptId:'synthetic-'+purpose}))))}
  const asset={ownerId:uid,state:'ready',reviewState:'accepted',releaseState:'private-pilot',truthClass:'spatially-reconstructable',browserCertified:true,mobileCertified:true,
    storageBucket:'synthetic-private-bucket',runtimeObject:`private-captured-reality/${uid}/${assetId}/runtime/${sha(bytes)}.splat`,runtimeSha256:sha(bytes),runtimeBytes:bytes.length,
    reviewApprovedRuntimeSha256:sha(bytes),reviewApprovedStorageGeneration:'123',sourceManifestSha256:'b'.repeat(64),reviewApprovedSourceManifestSha256:'b'.repeat(64),sourceBindings:[binding]}
  const modes={mode:'granted',retentionDays:null,precise:false,replayVisible:false,lifeMapVisible:false,modelContext:false,sharingEnabled:false,automationEnabled:false,likenessEnabled:false}
  const policy={version:2,revision:1,ownerId:uid,domains:Object.fromEntries(['memory','location','models','exports','workforce','identity'].map(d=>[d,{...modes}])),enforcement:{state:'fully-enforced',jobId:null,affectedTargets:[],providerState:'not-applicable'}}
  const put=(key,value)=>docs.set(key,value)
  put(`users/${uid}`,{accountStatus:'active'})
  put(`users/${uid}/privacyPolicy/current`,policy)
  put(`users/${uid}/privacyRuntime/location-collection`,{enabled:true})
  put(`users/${uid}/capturedRealityAssets/${assetId}`,asset)
  put(`uraiPrivateSourceReceipts/${sha(binding.sourceReceiptRef)}`,{...binding,schemaVersion:'urai-private-source-receipt-v2',ownerUid:uid,status:'ACTIVE',synthetic:false,purposes:['reconstruct-place'],
    consents:['memory.storage','location.context'].map(purpose=>({purpose,policyVersion:'synthetic-v1',decisionReceiptId:'synthetic-'+purpose}))})
  const ref=location=>({path:location,id:location.split('/').at(-1),get:async()=>snapshot(location)})
  const snapshot=location=>({id:location.split('/').at(-1),exists:docs.has(location),ref:ref(location),data:()=>docs.get(location),get:key=>key.split('.').reduce((value,part)=>value?.[part],docs.get(location)),updateTime:new Timestamp(123)})
  const db={doc:ref,collection:location=>({add:async value=>{put(location+'/synthetic-audit',value)}}),runTransaction:async fn=>fn({get:async target=>snapshot(target.path),create:(target,value)=>{assert.ok(!docs.has(target.path));put(target.path,value)}})}
  let disabled=false,authDenied=false,creationTime='synthetic-created',currentUid=uid,afterMetadata,afterWrite,streamDestroyed=false,metadataReads=0
  const account=()=>({uid:currentUid,disabled,metadata:{creationTime}})
  const metadata={generation:'123',size:String(bytes.length),contentType:'application/octet-stream',metadata:{uraiRuntimeSha256:sha(bytes)}}
  const bucketMetadata={iamConfiguration:{uniformBucketLevelAccess:{enabled:true},publicAccessPrevention:'enforced'}}
  const object={getMetadata:async()=>{metadataReads++;await afterMetadata?.();return [metadata]},getSignedUrl:async()=>['https://storage.googleapis.com/synthetic-signed-capability'],createReadStream:()=>{
    const stream=Readable.from([bytes]);stream.on('close',()=>{streamDestroyed=true});sources.push(stream);return stream}}
  const auth={verifyIdToken:async (bearer,checkRevoked)=>{assert.equal(checkRevoked,true);if(authDenied||bearer!=='synthetic-token')throw Error('synthetic-revoked');return {uid:currentUid,exp:Math.floor(Date.now()/1000)+3600}},getUser:async()=>account()}
  const admin={apps:['synthetic'],firestore:Object.assign(()=>db,{Timestamp,FieldValue:{serverTimestamp:()=>new Timestamp(Date.now())}}),storage:()=>({bucket:()=>({file:()=>object,getMetadata:async()=>[bucketMetadata]})}),auth:()=>auth}
  const region={https:{onCall:fn=>fn,onRequest:fn=>fn},runWith:()=>region}
  const module={exports:{}}, filename=process.env.CR_CAPTURED_COMPILED_SOURCE||path.resolve(__dirname,'../lib/apps/functions/src/capturedReality.js'),nativeRequire=createRequire(path.resolve(__dirname,'../lib/apps/functions/src/capturedReality.js'))
  vm.runInNewContext(fs.readFileSync(filename,'utf8'),{module,exports:module.exports,require:name=>name==='firebase-admin'?admin:name==='firebase-functions/v1'?{region:()=>region,https:{HttpsError}}:nativeRequire(name),Buffer,URLSearchParams,URL,Date,console,
    process:{env:{URAI_ENABLE_CAPTURED_REALITY:'true',URAI_ENABLE_CAPTURED_REALITY_PROOF:'true',GCLOUD_PROJECT:'urai-4dc1d',FIREBASE_STORAGE_BUCKET:'synthetic-private-bucket'}}})
  const context={auth:{uid,token:{auth_time:Math.floor(Date.now()/1000)}},rawRequest:{get:name=>name==='authorization'?'Bearer synthetic-token':name==='host'?'unused.invalid':undefined}}
  const selection={assetId,deviceTier:'desktop',accessMode:'runtime'}
  async function descriptor(){return module.exports.getCapturedRealityRuntimeUrl(selection,context)}
  async function deliver(descriptor,{authorization='Bearer synthetic-token',queryPatch={},origin}={}){
    const chunks=[],query={...Object.fromEntries(new URL(descriptor.url).searchParams),...queryPatch}
    const request={method:'GET',query,get:name=>name==='authorization'?authorization:name==='origin'?origin:undefined,aborted:false}
    const response=new Writable({write(chunk,_encoding,done){this.headersSent=true;chunks.push(Buffer.from(chunk));afterWrite?.(chunks.length);done()}})
    response.statusCode=200;response.headers={};response.headersSent=false;response.set=value=>{Object.assign(response.headers,value);return response};response.status=value=>{response.statusCode=value;return response};response.json=value=>response.end(JSON.stringify(value));response.once('error',()=>{})
    assert.equal(typeof module.exports.streamCapturedRealityRuntime,'function','private source must expose authenticated current-authority streaming')
    await module.exports.streamCapturedRealityRuntime(request,response)
    return {response,chunks,bytes:Buffer.concat(chunks)}
  }
  return {docs,asset,policy,binding,bytes,metadata,bucketMetadata,context,selection,handler:module.exports,descriptor,deliver,put,
    disable:()=>{disabled=true},denyAuth:()=>{authDenied=true},foreign:()=>{currentUid='synthetic-foreign'},replaceAccount:()=>{creationTime='synthetic-recreated'},afterMetadata:fn=>{afterMetadata=fn},afterWrite:fn=>{afterWrite=fn},getMetadataReads:()=>metadataReads,getStreamDestroyed:()=>streamDestroyed}
}

test('private descriptor binds exact source/runtime and requires current token; authenticated bytes match SHA256',async()=>{
  const f=fixture(),d=await f.descriptor();assert.equal(d.requiresAuthorization,true);assert.equal(d.runtimeSha256,sha(f.bytes));assert.equal(d.runtimeByteLength,f.bytes.length);assert.equal(d.storageGeneration,'123')
  assert.equal(new URL(d.url).pathname,'/streamCapturedRealityRuntime');assert.ok(!JSON.stringify(d).includes('synthetic-private-bucket'));assert.ok(!JSON.stringify(d).includes(f.binding.sourceReceiptRef))
  const out=await f.deliver(d);assert.equal(out.response.statusCode,200);assert.deepEqual(out.bytes,f.bytes);assert.equal(out.chunks.length,2)
})
for(const [label,mutate] of [
  ['disabled Auth account',f=>f.disable()],['revoked token',f=>f.denyAuth()],['foreign current token',f=>f.foreign()],
  ['missing owner profile',f=>f.docs.delete(`users/${uid}`)],['deleted owner profile',f=>f.docs.get(`users/${uid}`).deleted=true],
  ['memory withdrawal',f=>f.policy.domains.memory.mode='denied'],['location withdrawal',f=>f.policy.domains.location.mode='denied'],
  ['pending policy enforcement',f=>f.policy.enforcement.state='pending'],['foreign consent policy',f=>f.policy.ownerId='synthetic-foreign'],
  ['active deletion fence',f=>f.put(`privacyDeletionTombstones/${uid}`,{uid,active:true})],
  ['permanent deletion fence',f=>f.put(`uraiPrivateLifeModelOwnerFences/${sha(uid)}`,{ownerHash:sha(uid),deleted:true,deletionEpoch:1})],
  ['malformed permanent fence',f=>f.put(`uraiPrivateLifeModelOwnerFences/${sha(uid)}`,{deleted:false})],
  ['deletion planning lease',f=>f.put(`privacyDeletionTombstones/${uid}`,{uid,active:false,deletionPlanningLeaseToken:'synthetic'})],
  ['local deletion pending',f=>f.put(`users/${uid}/privacyRuntime/exportAuthority`,{generation:1,pendingDeletions:{synthetic:true}})],
  ['removed source',f=>f.docs.delete(`uraiPrivateSourceReceipts/${sha(f.binding.sourceReceiptRef)}`)],
  ['withdrawn source',f=>f.docs.get(`uraiPrivateSourceReceipts/${sha(f.binding.sourceReceiptRef)}`).status='WITHDRAWN'],
  ['source revision changed',f=>f.docs.get(`uraiPrivateSourceReceipts/${sha(f.binding.sourceReceiptRef)}`).sourceRevision++],
  ['source bytes changed',f=>f.docs.get(`uraiPrivateSourceReceipts/${sha(f.binding.sourceReceiptRef)}`).sourceSha256='f'.repeat(64)],
  ['source consent receipt changed',f=>f.docs.get(`uraiPrivateSourceReceipts/${sha(f.binding.sourceReceiptRef)}`).consents[0].decisionReceiptId='synthetic-replaced'],
  ['missing source bindings',f=>delete f.asset.sourceBindings],['unapproved source manifest',f=>f.asset.sourceManifestSha256='f'.repeat(64)],
  ['revoked asset',f=>f.asset.revocationState='revoked'],['uncertified browser',f=>f.asset.browserCertified=false],
]) test(label+' denies descriptor before private storage access',async()=>{const f=fixture();mutate(f);await assert.rejects(f.descriptor());assert.equal(f.getMetadataReads(),0)})

test('anonymous descriptor and anonymous stream are denied',async()=>{const f=fixture();await assert.rejects(f.handler.getCapturedRealityRuntimeUrl(f.selection,{}));const d=await f.descriptor(),out=await f.deliver(d,{authorization:''});assert.equal(out.response.statusCode,401);assert.ok(!out.bytes.equals(f.bytes))})
test('foreign user cannot reuse issued private descriptor',async()=>{const f=fixture(),d=await f.descriptor();f.foreign();const out=await f.deliver(d);assert.equal(out.response.statusCode,403);assert.ok(out.bytes.length<1024)})
test('expired descriptor denies before runtime bytes',async()=>{const f=fixture(),d=await f.descriptor();for(const [key,row] of f.docs)if(key.includes('capturedRealityRuntimeDeliveries'))row.expiresAt=Date.now()-1;const out=await f.deliver(d);assert.equal(out.response.statusCode,409);assert.ok(out.bytes.length<1024)})
test('same-UID Auth recreation cannot reuse an earlier descriptor',async()=>{const f=fixture(),d=await f.descriptor();f.replaceAccount();const out=await f.deliver(d);assert.equal(out.response.statusCode,403);assert.ok(out.bytes.length<1024)})
test('source correction during metadata await prevents issuance',async()=>{const f=fixture();f.afterMetadata(()=>{f.docs.get(`uraiPrivateSourceReceipts/${sha(f.binding.sourceReceiptRef)}`).sourceRevision++});await assert.rejects(f.descriptor());assert.equal([...f.docs.keys()].filter(key=>key.includes('capturedRealityRuntimeDeliveries')).length,0)})
test('disabled owner during metadata await prevents issuance',async()=>{const f=fixture();f.afterMetadata(()=>f.disable());await assert.rejects(f.descriptor());assert.equal([...f.docs.keys()].filter(key=>key.includes('capturedRealityRuntimeDeliveries')).length,0)})
for(const [label,mutate] of [['consent withdrawal',f=>f.policy.domains.memory.mode='denied'],['deletion',f=>f.put(`privacyDeletionTombstones/${uid}`,{uid,active:true})],['source revision correction',f=>f.docs.get(`uraiPrivateSourceReceipts/${sha(f.binding.sourceReceiptRef)}`).sourceRevision++],['token revocation',f=>f.denyAuth()],['account disabled',f=>f.disable()]])
  test(label+' after first 64 KiB terminates the actual Node pipeline',async()=>{const f=fixture(),d=await f.descriptor();f.afterWrite(count=>{if(count===1)mutate(f)});const out=await f.deliver(d);assert.equal(out.bytes.length,65536);assert.equal(out.response.destroyed,true);assert.equal(f.getStreamDestroyed(),true)})
test('Storage generation replacement denies issued stream',async()=>{const f=fixture(),d=await f.descriptor();f.metadata.generation='124';const out=await f.deliver(d);assert.equal(out.response.statusCode,409);assert.ok(out.bytes.length<1024)})
test('foreign browser origin denies source delivery',async()=>{const f=fixture(),d=await f.descriptor(),out=await f.deliver(d,{origin:'https://synthetic-foreign.invalid'});assert.equal(out.response.statusCode,403);assert.ok(out.bytes.length<1024)})
test('bucket without enforced public prevention denies private descriptor',async()=>{const f=fixture();f.bucketMetadata.iamConfiguration.publicAccessPrevention='inherited';await assert.rejects(f.descriptor(),/PRIVATE_BUCKET_REQUIRED/)})
test('long-lived Firebase download token denies private descriptor',async()=>{const f=fixture();f.metadata.metadata.firebaseStorageDownloadTokens='synthetic-prohibited';await assert.rejects(f.descriptor(),/ARTIFACT_CHANGED/)})

test('actual current backend HTTP handler and actual client stream agree on token, descriptor, length, Gaussian records and SHA256',async()=>{
  const f=fixture(),d=await f.descriptor(),ts=require('typescript'),clientRoot=path.resolve(__dirname,'../../../urai-tier1/src/spatial/captured-reality')
  assert.equal(typeof f.handler.streamCapturedRealityRuntime,'function','paired delivery requires the actual private stream handler')
  function loadClient(name,dependencies={}){
    const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(clientRoot,name+'.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,
      {exports,require:name=>{assert.ok(dependencies[name],name);return dependencies[name]},Uint8Array,Uint32Array,DataView,Number,Error,fetch,TextEncoder});return exports
  }
  const hashModule=loadClient('capturedRealitySha256'),client=loadClient('capturedRealitySplatStream',{'./capturedRealitySha256':hashModule})
  const server=http.createServer(async(request,response)=>{
    request.query=Object.fromEntries(new URL(request.url,'http://127.0.0.1').searchParams);request.get=name=>request.headers[name.toLowerCase()]
    response.set=headers=>{for(const [key,value] of Object.entries(headers))response.setHeader(key,value);return response}
    response.status=value=>{response.statusCode=value;return response};response.json=value=>response.end(JSON.stringify(value))
    await f.handler.streamCapturedRealityRuntime(request,response)
  })
  server.listen(0,'127.0.0.1');await once(server,'listening')
  try{
    const chunks=[],receivedHeaders=[]
    const fetcher=async(url,options)=>{assert.equal(url,d.url);assert.equal(options.redirect,'error');assert.equal(options.credentials,'omit');assert.equal(options.headers.Authorization,'Bearer synthetic-token')
      const response=await fetch(`http://127.0.0.1:${server.address().port}/streamCapturedRealityRuntime${new URL(url).search}`,options);receivedHeaders.push(response.headers);return response}
    const args={url:d.url,maxBytes:160*1024*1024,chunkSize:1000,signal:new AbortController().signal,onHeader:bytes=>assert.equal(bytes,d.runtimeByteLength),onChunk:bytes=>chunks.push(Buffer.from(bytes)),
      authority:{expectedByteLength:d.runtimeByteLength,expectedSha256:d.runtimeSha256,requestHeaders:async()=>({Authorization:'Bearer synthetic-token'})},fetcher}
    const result=await client.streamCapturedRealitySplat(args)
    assert.equal(result.sha256,d.runtimeSha256);assert.equal(result.pointCount,f.bytes.length/32);assert.deepEqual(Buffer.concat(chunks),f.bytes)
    assert.equal(receivedHeaders[0].get('x-urai-checksum-sha256'),d.runtimeSha256);assert.equal(receivedHeaders[0].get('x-urai-storage-generation'),d.storageGeneration)
    for(const [key,row] of f.docs)if(key.includes('capturedRealityRuntimeDeliveries'))row.expiresAt=Date.now()-1
    const before=chunks.length;await assert.rejects(client.streamCapturedRealitySplat(args),/INVALID_SPLAT_RESPONSE/);assert.equal(chunks.length,before)
  }finally{server.closeAllConnections();await new Promise(done=>server.close(done))}
})
