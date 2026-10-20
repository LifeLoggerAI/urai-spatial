import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { createHash } from 'node:crypto'
import test from 'node:test'
import ts from 'typescript'
import * as founderVoiceReceiptContract from '../src/adamFounderVoiceReceiptContract.mjs'

const uid='synthetic-adam-owner',answer='Synthetic private answer.'
const sourceRoot=process.env.URAI_ADAM_AUTHORITY_SOURCE_ROOT
if(process.env.GITHUB_ACTIONS&&sourceRoot)throw new Error('Native proof must exercise checked-out source')
function load(name,imports,globals={}){
 const file=sourceRoot?path.join(sourceRoot,name):new URL('../src/'+name,import.meta.url)
 const emitted=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText
 const module={exports:{}}
 vm.runInNewContext(emitted,{module,exports:module.exports,require:id=>{assert.ok(Object.hasOwn(imports,id),'Unexpected source dependency '+id);return imports[id]},Buffer,URL,AbortController,TextDecoder,TextEncoder,setTimeout,clearTimeout,...globals})
 return module.exports
}
const policyAuthority=load('consentPolicyAuthority.ts',{})
function policy(){return{version:2,revision:4,ownerId:uid,domains:Object.fromEntries(['memory','location','models','exports','workforce','identity'].map(domain=>[domain,{mode:domain==='models'?'granted':'denied',retentionDays:null,precise:false,replayVisible:false,lifeMapVisible:false,modelContext:domain==='models',sharingEnabled:false,automationEnabled:false,likenessEnabled:false}])),enforcement:{state:'fully-enforced',jobId:null,affectedTargets:[],providerState:'not-applicable'}}}
function fixture(lane,controls={}){
 const state={uid,policy:policy(),connection:{processingAllowed:true,revocationState:'not-required'},paid:[],authReads:0,policyReads:0,outputChecks:0,expired:false}
 class Timestamp{constructor(v){this.v=v}toMillis(){return this.v}static fromMillis(v){return new Timestamp(v)}}
 const snapshot=location=>({exists:location.includes('/privacyPolicy/')||location.includes('/providerConnections/'),data:()=>location.includes('/privacyPolicy/')?structuredClone(state.policy):location.includes('/providerConnections/')?structuredClone(state.connection):{}})
 const db={doc:location=>({path:location,async get(){const result=snapshot(location);if(location.includes('/privacyPolicy/')){state.policyReads++;await controls.onPolicyRead?.(state)}return result},async set(){}}),async runTransaction(run){const result=await run({get:async ref=>snapshot(ref.path),set(){}});await controls.afterRate?.(state);return result}}
 const firestore=Object.assign(()=>db,{Timestamp,FieldValue:{increment:v=>v,serverTimestamp:()=> 'synthetic-clock'}})
 class SpatialSpendError extends Error{constructor(){super('Synthetic exact output expired');this.status=503;this.code='PROTECTED_SPEND_REQUIRED'}}
 const paidSpatialFetch=async(_db,owner,leaf,provider,_model,input,url,init)=>{
  assert.equal(owner,uid);assert.equal(_db,db);assert.equal(init.method,'POST')
  state.paid.push({leaf,provider,url:String(url)});await controls.onPaid?.(state,leaf,init)
  if(leaf==='adam-moderation')return Response.json(controls.moderation??{results:[{flagged:false}]})
  let index=0
  const result={locale:'en-US',caption:answer,message:answer,suggestedActions:[],requiresHumanFounder:false,handoffReason:''}
  // Only reasoning can reach the paid mock: Founder voice issuance is denied before dispatch.
  const chunks=[Buffer.from('data: '+JSON.stringify({type:'response.output_text.delta',delta:JSON.stringify(result)})+'\n\n'),Buffer.from('data: {"type":"response.completed"}\n\n')]
  return{ok:true,status:200,headers:{get:()=>null},body:{getReader:()=>({async read(){await controls.onRead?.(state,index,init);return index<chunks.length?{done:false,value:chunks[index++]}:{done:true}},async cancel(){},releaseLock(){}})}}
 }
 const module=load('adamPresenceFunctions.ts',{
  'node:crypto':{createHash},'firebase-admin':{apps:[{}],firestore,initializeApp(){assert.fail('No SDK initialization')},auth:()=>({async verifyIdToken(_token,checkRevoked){assert.equal(checkRevoked,true);state.authReads++;if(controls.authRevoked)throw new Error('Synthetic revoked authentication');return{uid:controls.missingUid?'':state.uid}}})},
  'firebase-functions/params':{defineSecret:()=>({value:()=> 'synthetic-not-a-key'})},'firebase-functions/v2/https':{onRequest:(_options,handler)=>handler},
  '../../../packages/localization/src/contentLanguage':{contentLanguage:tag=>tag==='en-US'?{speechTag:'en-US'}:null,URAI_CONTENT_LANGUAGE_TAGS:['en-US']},
  './consentPolicyAuthority':policyAuthority,
  './adamFounderVoiceReceiptContract.mjs':founderVoiceReceiptContract,
  './protectedProviderSpend':{paidSpatialFetch,assertSpatialPaidOutputCurrent(upstream){assert.ok(upstream);state.outputChecks++;if(state.expired)throw new SpatialSpendError()},SpatialSpendError,SPATIAL_SPEND_WORKER_TOKENS_JSON:{}},
 },{process:{env:{ADAM_PRESENCE_ENABLED:controls.disabled?'false':'true',FOUNDER_VOICE_ENABLED:controls.voiceDisabled?'false':'true',FOUNDER_ELEVENLABS_VOICE_ID:'synthetic-voice'}},setTimeout:(fn,ms)=>setTimeout(fn,controls.timeoutMs??ms)})
 const response={statusCode:200,headersSent:false,writableEnded:false,chunks:[],body:null,headers:{},status(code){this.statusCode=code;return this},setHeader(key,value){this.headers[key]=value},on(){},write(value){this.headersSent=true;this.chunks.push(Buffer.from(value))},end(value){if(value)this.write(value);this.writableEnded=true},json(value){this.body=value;this.headersSent=true;this.writableEnded=true}}
 const run=async(overrides={})=>{
  const request={method:'POST',headers:{authorization:'Bearer synthetic-token'},body:{message:'Disclosed synthetic question',text:'Disclosed synthetic text',context:[],locale:'en-US',surface:'home',requestId:'a'.repeat(64),aiProcessingConsent:true,externalProcessingConsent:true}}
  request.method=overrides.method??request.method
  request.headers={...request.headers,...overrides.headers}
  request.body={...request.body,...overrides.body}
  await module[lane==='voice'?'adamFounderVoiceProvider':'adamPresenceProvider'](request,response)
  return response
 }
 const output=()=>Buffer.concat(response.chunks).toString()
 return{state,run,response,output}
}
for(const lane of ['reasoning']){
 test(`actual Adam ${lane} retains guarded private success`,async()=>{
  const f=fixture(lane),response=await f.run();assert.equal(response.statusCode,200);assert.ok(f.output().includes(answer))
  assert.ok(f.state.authReads>1);assert.ok(f.state.policyReads>1);assert.ok(f.state.outputChecks>0)
 })
 for(const reason of ['owner','consent'])test(`actual Adam ${lane} rate-write withdrawal denies provider dispatch: ${reason}`,async()=>{
  const f=fixture(lane,{afterRate(state){if(reason==='owner')state.uid='other-owner';else state.policy.domains.models.mode='denied'}})
  const response=await f.run();assert.notEqual(response.statusCode,200);assert.equal(f.state.paid.length,0);assert.equal(f.output(),'')
 })
 for(const reason of ['foreign-policy','partial-policy'])test(`actual Adam ${lane} rejects noncanonical consent before paid processing: ${reason}`,async()=>{
  const f=fixture(lane);if(reason==='foreign-policy')f.state.policy.ownerId='other-owner';else delete f.state.policy.domains.location
  const response=await f.run();assert.equal(response.statusCode,403);assert.equal(response.body.error,'CONSENT_POLICY_REQUIRED');assert.equal(f.state.paid.length,0)
 })
 for(const reason of ['owner','consent','provider','expiry'])test(`actual Adam ${lane} in-flight withdrawal suppresses private bytes: ${reason}`,async()=>{
  const f=fixture(lane,{onPaid(state,leaf){if(leaf==='adam-moderation')return;if(reason==='owner')state.uid='other-owner';else if(reason==='consent')state.policy.domains.models.mode='denied';else if(reason==='provider')state.connection.revocationState='complete';else state.expired=true}})
  const response=await f.run();assert.notEqual(response.statusCode,200);assert.equal(f.output(),'');assert.equal(f.state.paid.length,2)
 })
 test(`actual Adam ${lane} caller deadline stays active through body consumption`,async()=>{
  const f=fixture(lane,{timeoutMs:15,async onRead(){await new Promise(resolve=>setTimeout(resolve,35))}}),response=await f.run()
  assert.equal(f.output().includes(answer),false)
  assert.equal(response.body?.error==='PROVIDER_OUTPUT_CANCELLED'||f.output().includes('PROVIDER_OUTPUT_CANCELLED'),true)
 })
 test(`actual Adam ${lane} current policy is checked again after awaited body reads`,async()=>{
  const f=fixture(lane,{onRead(state,index){if(index===0)state.policy.domains.models.mode='denied'}}),response=await f.run()
  assert.equal(f.output().includes(answer),false)
  assert.equal(response.body?.error==='MODEL_PROCESSING_NOT_AUTHORIZED'||f.output().includes('MODEL_PROCESSING_NOT_AUTHORIZED'),true)
 })
 test(`actual Adam ${lane} hard-off preserves zero spend`,async()=>{
  const f=fixture(lane,{disabled:true}),response=await f.run();assert.equal(response.statusCode,503);assert.equal(f.state.paid.length,0)
 })
}
// The real Founder voice issuer is deliberately not admitted. These cases prove
// the current handler denies without dispatch; they do NOT claim downstream
// voice playback, consent-recheck or paid-provider success coverage.
const founderVoiceDenialChecks = [
 ['missing issuer blocks authenticated voice',{}, {},409,'FOUNDER_PLAYBACK_AUTHORITY_NOT_READY',1],
 ['global Adam hard-off precedes authentication',{disabled:true},{},503,'ADAM_PRESENCE_DISABLED',0],
 ['Founder voice hard-off precedes authentication',{voiceDisabled:true},{},409,'FOUNDER_VOICE_NOT_READY',0],
 ['GET method is rejected before authentication',{}, {method:'GET'},405,'METHOD_NOT_ALLOWED',0],
 ['missing bearer header is rejected',{}, {headers:{authorization:''}},401,'UNAUTHORIZED',0],
 ['basic authorization is rejected',{}, {headers:{authorization:'Basic synthetic-token'}},401,'UNAUTHORIZED',0],
 ['empty bearer token is rejected',{}, {headers:{authorization:'Bearer '}},401,'UNAUTHORIZED',0],
 ['Firebase result without UID is rejected',{missingUid:true},{},401,'UNAUTHORIZED',1],
 ['revoked Firebase authentication fails closed',{authRevoked:true},{},500,'ADAM_PROVIDER_BOUNDARY_FAILURE',1],
 ['invalid private payload cannot bypass missing issuer',{}, {body:{message:'',text:''}},409,'FOUNDER_PLAYBACK_AUTHORITY_NOT_READY',1],
 ['consent fields cannot bypass missing issuer',{}, {body:{aiProcessingConsent:false,externalProcessingConsent:false}},409,'FOUNDER_PLAYBACK_AUTHORITY_NOT_READY',1],
 ['untrusted receipt-shaped fields cannot bypass missing issuer',{}, {body:{receipt:{issuerId:'synthetic'},nonce:'synthetic'}},409,'FOUNDER_PLAYBACK_AUTHORITY_NOT_READY',1],
]
assert.equal(founderVoiceDenialChecks.length,12)
for(const [label,controls,overrides,status,error,reads] of founderVoiceDenialChecks){
 test('actual Adam Founder voice '+label,async()=>{
  const f=fixture('voice',controls),response=await f.run(overrides)
  if(error==='FOUNDER_PLAYBACK_AUTHORITY_NOT_READY')assert.equal(founderVoiceReceiptContract.founderVoiceIssuerReadiness().ready,false)
  assert.equal(response.statusCode,status)
  assert.equal(response.body?.error,error)
  assert.equal(f.state.authReads,reads)
  assert.equal(f.state.policyReads,0)
  assert.equal(f.state.paid.length,0)
  assert.equal(f.state.outputChecks,0)
  assert.equal(f.output(),'')
 })
}
for(const moderation of [{},{results:[]},{results:[{flagged:'false'}]}])test('actual Adam missing moderation decision cannot start reasoning: '+JSON.stringify(moderation),async()=>{
 const f=fixture('reasoning',{moderation}),response=await f.run();assert.equal(response.statusCode,503);assert.equal(response.body.error,'MODERATION_UNAVAILABLE')
 assert.equal(f.state.paid.length,1);assert.equal(f.output(),'')
})
