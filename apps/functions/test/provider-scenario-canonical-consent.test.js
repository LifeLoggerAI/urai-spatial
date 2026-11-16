'use strict'
const assert=require('node:assert/strict')
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto')
const {test}=require('node:test')
const root=process.env.CANONICAL_PROVIDER_SCENARIO_COMPILED_DIR||path.resolve(__dirname,'../lib/apps/functions/src')
const candidateRoot=path.resolve(__dirname,'../lib/apps/functions/src')
const policyAuthority=require(path.join(candidateRoot,'consentPolicyAuthority.js'))
const providerCode=fs.readFileSync(path.join(root,'providerFunctions.js'),'utf8')
const scenarioCode=fs.readFileSync(path.join(root,'scenarioOperations.js'),'utf8')
const owner='synthetic-owner',policyPath='users/'+owner+'/privacyPolicy/current'
const hash=v=>crypto.createHash('sha256').update(v).digest('hex')
const domain=(mode='denied',permissions={})=>({mode,retentionDays:null,precise:false,replayVisible:false,lifeMapVisible:false,modelContext:false,sharingEnabled:false,automationEnabled:false,likenessEnabled:false,...permissions})
function policy(){return{version:2,revision:4,ownerId:owner,domains:{memory:domain('granted',{modelContext:true}),models:domain('granted',{modelContext:true}),identity:domain(),location:domain(),exports:domain(),workforce:domain()},enforcement:{state:'fully-enforced',jobId:null,affectedTargets:[],providerState:'not-applicable'}}}
const clone=v=>v===undefined?undefined:JSON.parse(JSON.stringify(v))
class Timestamp{constructor(value){this.value=value}toMillis(){return this.value}static fromMillis(value){return new Timestamp(value)}}
function database(options={}){
 const records=new Map([[policyPath,policy()],['users/'+owner+'/providerConnections/openai',{processingAllowed:true,revocationState:'not-required'}],['users/'+owner+'/providerConnections/elevenlabs',{processingAllowed:true,revocationState:'not-required'}],['users/'+owner+'/memories/memory-fixture',{synthetic:true}],['users/'+owner+'/lifeEntities/person-fixture',{synthetic:true}],['users/'+owner+'/lifeEntities/place-fixture',{synthetic:true}]])
 const stats={reads:[],transactionReads:[],committed:[],attempts:0,stagedBeforeRetry:[],paidCalls:[],outputChecks:0,authChecks:0,bytes:0,chunks:[],status:null,body:null,ended:false,destroyed:false,cancelled:0}
 const snapshot=ref=>({exists:records.has(ref.path),id:ref.path.split('/').at(-1),ref,data:()=>clone(records.get(ref.path))})
 const doc=location=>({path:location,id:location.split('/').at(-1),collection:name=>({doc:id=>doc(location+'/'+name+'/'+id)}),
  async get(){stats.reads.push(location);return snapshot(this)},
  async set(value,settings){records.set(location,settings?.merge?{...records.get(location),...value}:value);stats.committed.push({path:location,value})},
  async update(value){assert.ok(records.has(location));records.set(location,{...records.get(location),...value});stats.committed.push({path:location,value})}})
 const db={doc,async runTransaction(run){
  for(let attempt=0;attempt<2;attempt++){
   const staged=[],tx={async get(ref){stats.transactionReads.push(ref.path);return snapshot(ref)},create(ref,value){staged.push({ref,value,create:true})},set(ref,value,settings){staged.push({ref,value,settings})}}
   const result=await run(tx);stats.attempts++
   if(attempt===0&&options.onRetry){stats.stagedBeforeRetry.push(...staged.map(s=>s.ref.path));options.onRetry(records);continue}
   for(const write of staged){if(write.create)assert.equal(records.has(write.ref.path),false);await write.ref.set(write.value,write.settings)}
   await options.afterTransaction?.(records);return result
  }
  assert.fail('Synthetic transaction did not settle')
 }}
 const firestore=Object.assign(()=>db,{Timestamp,FieldValue:{serverTimestamp:()=>({synthetic:true}),increment:value=>value}})
 return{records,stats,db,firestore}
}
function providerFixture(options={}){
 const f=database(options),state={uid:owner}
 const admin={apps:[{}],firestore:f.firestore,initializeApp(){assert.fail('No SDK initialization')},auth:()=>({async verifyIdToken(token,checkRevoked){assert.equal(token,'synthetic-current-token');assert.equal(checkRevoked,true);f.stats.authChecks++;if(state.uid==='revoked')throw Error('Synthetic token revoked');return{uid:state.uid}}})}
 const paidSpatialFetch=async(_db,uid,lane,provider)=>{
  assert.equal(uid,owner);f.stats.paidCalls.push({lane,provider});await options.onPaid?.(f,state,lane)
  if(lane==='orb-moderation')return{ok:true,status:200,json:async()=>({results:[{flagged:false}]})}
  let index=0
  const output={message:'Synthetic response',caption:'Synthetic response',disclosure:'OpenAI processed the response.',suggestedActions:[],locale:'en-US'}
  const text='data: '+JSON.stringify({type:'response.output_text.delta',delta:JSON.stringify(output)})+'\n\n'+'data: '+JSON.stringify({type:'response.completed'})+'\n\n'
  const chunks=lane==='narrator-voice'?[Buffer.alloc(16),Buffer.alloc(16)]:[Buffer.from(text)]
  return{ok:true,status:200,headers:{get:()=>null},body:{getReader:()=>({async read(){await options.onRead?.(f,state,lane,index);return index<chunks.length?{done:false,value:chunks[index++]}:{done:true}},async cancel(){f.stats.cancelled++},releaseLock(){}})}}
 }
 const imports={'node:crypto':crypto,'firebase-admin':admin,'firebase-functions/params':{defineSecret:()=>({value:()=> 'synthetic-key'})},'firebase-functions/v2/https':{onRequest:(_options,handler)=>handler},'../../../packages/localization/src/contentLanguage':{contentLanguage:value=>value==='en-US'?{speechTag:'en-US'}:null,URAI_CONTENT_LANGUAGE_TAGS:['en-US']},'./consentPolicyAuthority':policyAuthority,'./protectedProviderSpend':{paidSpatialFetch,assertSpatialPaidOutputCurrent(){f.stats.outputChecks++},SpatialSpendError:class extends Error{},SPATIAL_SPEND_WORKER_TOKENS_JSON:{}}}
 const module={exports:{}}
 vm.runInNewContext(providerCode,{module,exports:module.exports,require:name=>{assert.ok(name in imports,'Unexpected actual provider import '+name);return imports[name]},Buffer,URL,AbortController,TextDecoder,TextEncoder,console:{warn(){}},setTimeout,clearTimeout,process:{env:{ELEVENLABS_ALLOWED_VOICE_IDS:'synthetic',ELEVENLABS_DEFAULT_VOICE_ID:'synthetic',ELEVENLABS_MAX_RESPONSE_BYTES:'32'}}},{filename:'actual-compiled-providerFunctions.js'})
 const response={headersSent:false,headers:{},status(value){f.stats.status=value;return this},json(value){f.stats.body=value;this.headersSent=true},setHeader(key,value){this.headers[key]=value},write(value){this.headersSent=true;f.stats.bytes+=Buffer.byteLength(value);f.stats.chunks.push(String(value))},end(value){if(value)this.write(value);f.stats.ended=true},destroy(){f.stats.destroyed=true},on(){}}
 return{...f,state,async call(provider='elevenlabs',extra={}){
  const message='Synthetic source',context=[],locale='en-US'
  const body=provider==='openai'?{message,context,locale,requestId:hash(JSON.stringify({message,context,locale})),aiProcessingConsent:true}:{text:message,externalProcessingConsent:true}
  const handler=provider==='openai'?module.exports.openAiOrbProvider:module.exports.elevenLabsVoiceProvider
  await handler({method:'POST',headers:{authorization:'Bearer synthetic-current-token'},body:{...body,...extra},on(){},off(){}},response)
  return f.stats
 }}
}
function scenarioFixture(options={}){
 const f=database(options),functions={https:{onCall:handler=>handler,HttpsError:class extends Error{constructor(code,message,details){super(message);this.code=code;this.details=details}}}}
 const imports={'firebase-functions/v1':functions,'firebase-admin':{apps:[{}],firestore:f.firestore,initializeApp(){assert.fail('No SDK initialization')}},'node:crypto':crypto,'./scenarioProvider':{scenarioProviderState:'provider-unavailable'},'./consentPolicyAuthority':policyAuthority}
 const module={exports:{}}
 vm.runInNewContext(scenarioCode,{module,exports:module.exports,require:name=>{assert.ok(name in imports,'Unexpected actual Scenario import '+name);return imports[name]}},{filename:'actual-compiled-scenarioOperations.js'})
 return{...f,async call(extra={},context={auth:{uid:owner}}){return module.exports.createPossibleFuture({operationId:'synthetic-operation-fixture',question:'Synthetic what-if?',originRealm:'home',sourceContext:{memoryId:'memory-fixture',personId:'person-fixture',placeId:'place-fixture'},...extra},context)},basis(){return f.stats.committed.find(row=>row.path.includes('/basis/current'))?.value}}
}
const malformed=[
 ['missing-policy',(records,p)=>records.delete(policyPath)],['null-policy',(records,p)=>records.set(policyPath,null)],['array-policy',(records,p)=>records.set(policyPath,[])],
 ['partial-grants',(records,p)=>records.set(policyPath,{domains:{memory:{mode:'granted',modelContext:true},models:{mode:'granted',modelContext:true}},enforcement:{state:'fully-enforced'}})],
 ['foreign-owner',(records,p)=>p.ownerId='foreign-owner'],['missing-owner',(records,p)=>delete p.ownerId],['old-version',(records,p)=>p.version=1],['missing-revision',(records,p)=>delete p.revision],['string-revision',(records,p)=>p.revision='4'],['negative-revision',(records,p)=>p.revision=-1],['fractional-revision',(records,p)=>p.revision=4.5],['unsafe-revision',(records,p)=>p.revision=Number.MAX_SAFE_INTEGER+1],
 ['missing-other-domain',(records,p)=>delete p.domains.location],['extra-domain',(records,p)=>p.domains.extra=clone(p.domains.memory)],['missing-unrelated-permission',(records,p)=>delete p.domains.memory.replayVisible],['string-unrelated-permission',(records,p)=>p.domains.memory.replayVisible='false'],['string-retention',(records,p)=>p.domains.memory.retentionDays='365'],['unsupported-retention',(records,p)=>p.domains.memory.retentionDays=999],['unknown-mode',(records,p)=>p.domains.workforce.mode='approved'],
 ['missing-enforcement-job',(records,p)=>delete p.enforcement.jobId],['missing-enforcement-targets',(records,p)=>delete p.enforcement.affectedTargets],['missing-provider-state',(records,p)=>delete p.enforcement.providerState],['unknown-provider-state',(records,p)=>p.enforcement.providerState='approved'],['duplicate-targets',(records,p)=>p.enforcement.affectedTargets=['same','same']],['extra-authority',(records,p)=>p.approved=true]
]
for(const[label,mutate]of malformed){
 for(const provider of ['openai','elevenlabs'])test('actual '+provider+' rejects malformed owner consent before paid admission: '+label,async()=>{
  const f=providerFixture();mutate(f.records,f.records.get(policyPath));assert.equal(policyAuthority.isCanonicalStoredPolicy(f.records.get(policyPath),owner),false)
  await f.call(provider);assert.equal(f.stats.status,403);assert.equal(f.stats.body.error,'CONSENT_POLICY_REQUIRED');assert.equal(f.stats.paidCalls.length,0);assert.equal(f.stats.bytes,0);assert.equal(f.stats.committed.some(row=>/providerRequestReservations|providerRateLimits/.test(row.path)),false)
 })
 test('actual Scenario refuses malformed private evidence without explicit assumption-only: '+label,async()=>{
  const f=scenarioFixture();mutate(f.records,f.records.get(policyPath));await assert.rejects(f.call(),error=>error.code==='failed-precondition');assert.equal(f.stats.committed.length,0);assert.equal([...f.stats.reads,...f.stats.transactionReads].some(location=>/\/memories\/|\/lifeEntities\//.test(location)),false)
 })
 test('actual Scenario retains explicit assumption-only fallback without reading private evidence: '+label,async()=>{
  const f=scenarioFixture();mutate(f.records,f.records.get(policyPath));const result=await f.call({assumptionOnly:true});assert.equal(result.assumptionOnly,true);assert.equal(f.basis().assumptionOnly,true);assert.equal(f.basis().evidenceRefs.length,0);assert.equal(f.basis().permissionReceiptIds.length,0);assert.equal([...f.stats.reads,...f.stats.transactionReads].some(location=>/\/memories\/|\/lifeEntities\//.test(location)),false)
 })
}
for(const provider of ['openai','elevenlabs'])for(const revision of [0,4])test('actual '+provider+' retains canonical granted processing at revision '+revision,async()=>{
 const f=providerFixture();f.records.get(policyPath).revision=revision;assert.equal(policyAuthority.isCanonicalStoredPolicy(f.records.get(policyPath),owner),true);await f.call(provider);assert.equal(f.stats.status,200);assert.equal(f.stats.ended,true);assert.equal(f.stats.paidCalls.length,provider==='openai'?2:1);assert.ok(f.stats.bytes>0)
})
for(const memoryMode of ['granted','limited'])for(const modelMode of ['granted','limited'])test('actual Scenario retains bounded canonical '+memoryMode+'/'+modelMode+' evidence in the creation transaction',async()=>{
 const f=scenarioFixture();f.records.get(policyPath).domains.memory.mode=memoryMode;f.records.get(policyPath).domains.models.mode=modelMode;const result=await f.call();assert.equal(result.assumptionOnly,false);assert.equal(f.basis().evidenceRefs.length,3);assert.ok(f.basis().evidenceRefs.every(row=>row.sourceRevision===4&&row.purpose==='scenario.explore'));assert.equal(f.basis().permissionReceiptIds.length,0);assert.equal(f.stats.reads.length,0);assert.ok(f.stats.transactionReads.includes(policyPath))
})
for(const mode of ['limited','paused','denied'])for(const provider of ['openai','elevenlabs'])test('actual '+provider+' keeps its existing stricter granted-only model mode: '+mode,async()=>{
 const f=providerFixture();f.records.get(policyPath).domains.models.mode=mode;await f.call(provider);assert.equal(f.stats.status,403);assert.equal(f.stats.body.error,'MODEL_PROCESSING_NOT_AUTHORIZED');assert.equal(f.stats.paidCalls.length,0)
})
for(const reason of ['pending','partially-enforced','failed','conflicted'])for(const provider of ['openai','elevenlabs'])test('actual '+provider+' keeps pending enforcement fail-closed: '+reason,async()=>{
 const f=providerFixture();f.records.get(policyPath).enforcement.state=reason;await f.call(provider);assert.equal(f.stats.status,409);assert.equal(f.stats.body.error,'CONSENT_ENFORCEMENT_PENDING');assert.equal(f.stats.paidCalls.length,0)
})
for(const provider of ['openai','elevenlabs'])test('actual '+provider+' retains explicit consent and provider withdrawal barriers',async()=>{
 const explicit=providerFixture();await explicit.call(provider,provider==='openai'?{aiProcessingConsent:false}:{externalProcessingConsent:false});assert.equal(explicit.stats.body.error,'EXPLICIT_CONSENT_REQUIRED');assert.equal(explicit.stats.paidCalls.length,0)
 for(const revocationState of ['requested','pending','complete']){const f=providerFixture();f.records.get('users/'+owner+'/providerConnections/'+provider).revocationState=revocationState;await f.call(provider);assert.equal(f.stats.body.error,'PROVIDER_PROCESSING_REVOKED');assert.equal(f.stats.paidCalls.length,0)}
})
for(const[label,mutate]of [['malformed-policy',(records)=>delete records.get(policyPath).domains.location],['foreign-policy-owner',(records)=>records.get(policyPath).ownerId='foreign-owner'],['models-revoked',(records)=>records.get(policyPath).domains.models.mode='denied']]){
 test('actual OpenAI transaction retry rechecks '+label+' before paid processing',async()=>{const f=providerFixture({onRetry:mutate});await f.call('openai');assert.notEqual(f.stats.status,200);assert.equal(f.stats.paidCalls.length,0);assert.equal(f.stats.committed.some(row=>/providerRequestReservations|providerRateLimits/.test(row.path)),false)})
 test('actual Scenario transaction retry withholds stale private basis after '+label,async()=>{const f=scenarioFixture({onRetry:mutate});if(label==='models-revoked'){const result=await f.call();assert.equal(result.assumptionOnly,false);assert.equal(f.basis().evidenceRefs.length,1);assert.equal(f.basis().evidenceRefs[0].truthKind,'autobiographical-memory')}else{await assert.rejects(f.call());assert.equal(f.stats.committed.length,0)}})
}
for(const phase of ['provider-await','stream-read'])for(const reason of ['malformed-policy','foreign-policy-owner'])test('actual voice '+phase+' suppresses bytes after '+reason,async()=>{
 const mutate=f=>{if(reason==='malformed-policy')delete f.records.get(policyPath).domains.location;else f.records.get(policyPath).ownerId='foreign-owner'}
 const options=phase==='provider-await'?{onPaid:f=>mutate(f)}:{onRead:(f,_state,_lane,index)=>{if(index===1)mutate(f)}}
 const f=providerFixture(options);await f.call();assert.equal(f.stats.bytes,phase==='provider-await'?0:16);assert.equal(f.stats.cancelled,1);assert.equal(f.stats.ended,false);if(phase==='stream-read')assert.equal(f.stats.destroyed,true)
})
for(const phase of ['provider-await','completion-write'])test('actual OpenAI suppresses output after canonical policy withdrawal at '+phase,async()=>{
 const mutate=records=>delete records.get(policyPath).domains.location
 const options=phase==='provider-await'?{onPaid:(f,_state,lane)=>{if(lane==='orb-reasoning')mutate(f.records)}}:{}
 const f=providerFixture(options)
 if(phase==='completion-write'){const originalDoc=f.db.doc;f.db.doc=location=>{const ref=originalDoc(location);const update=ref.update;ref.update=async value=>{await update.call(ref,value);if(value.state==='completed')mutate(f.records)};return ref}}
 await f.call('openai');assert.equal(f.stats.bytes,0);assert.notEqual(f.stats.status,200);assert.equal(f.stats.body.error,'PROVIDER_ATTEMPT_UNCERTAIN')
})
test('actual Scenario excludes only the denied domain and does not manufacture permission receipts',async()=>{
 const f=scenarioFixture();f.records.get(policyPath).domains.memory.mode='denied';await f.call();assert.equal(f.basis().evidenceRefs.length,2);assert.ok(f.basis().evidenceRefs.every(row=>row.truthKind==='interpretation'));assert.equal(f.basis().permissionReceiptIds.length,0);assert.equal(f.stats.transactionReads.some(location=>location.includes('/memories/')),false)
})
test('actual Scenario explicit assumption-only without source context reads no policy or private source',async()=>{
 const f=scenarioFixture();f.records.delete(policyPath);const result=await f.call({sourceContext:undefined,assumptionOnly:true});assert.equal(result.assumptionOnly,true);assert.equal(f.basis().evidenceRefs.length,0);assert.equal(f.stats.transactionReads.includes(policyPath),false)
})
test('actual Scenario canonical revision zero keeps exact source revision zero',async()=>{
 const f=scenarioFixture();f.records.get(policyPath).revision=0;await f.call();assert.ok(f.basis().evidenceRefs.every(row=>row.sourceRevision===0))
})
test('actual Scenario existing receipt prevents repeated private source reads',async()=>{
 const f=scenarioFixture();const id=hash('scenario-create:'+owner+':synthetic-operation-fixture').slice(0,40);f.records.set('users/'+owner+'/privacyReceipts/'+id,{ownerId:owner});await assert.rejects(f.call(),error=>error.code==='already-exists');assert.equal(f.stats.transactionReads.includes(policyPath),false);assert.equal(f.stats.committed.length,0)
})
test('actual Scenario preserves authentication and client evidence/permission receipt denials',async()=>{
 for(const [data,context,code]of [[{}, {},'unauthenticated'],[{evidenceRefs:[{id:'forged'}]},{auth:{uid:owner}},'permission-denied'],[{permissionReceiptIds:['forged']},{auth:{uid:owner}},'permission-denied']]){
  const f=scenarioFixture();await assert.rejects(f.call(data,context),error=>error.code===code);assert.equal(f.stats.committed.length,0)
 }
})
