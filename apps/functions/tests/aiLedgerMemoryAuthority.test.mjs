import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ts = require('typescript')
function load(source, imports={}) {
  const out=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},reportDiagnostics:true})
  assert.equal(out.diagnostics.length,0)
  const module={exports:{}}
  new Function('require','module','exports',out.outputText)((name)=>imports[name]??require(name),module,module.exports)
  return module.exports
}
const root=new URL('../src/',import.meta.url)
const policy = load(fs.readFileSync(new URL('consentPolicyAuthority.ts',root),'utf8'))
const authority=load(fs.readFileSync(new URL('aiLedgerMemoryAuthority.ts',root),'utf8'),{'./consentPolicyAuthority':policy})
const {aiLedgerMemoryAuthorityDecision:decide}=authority
const permission=()=>({mode:'denied',retentionDays:null,precise:false,replayVisible:false,lifeMapVisible:false,modelContext:false,sharingEnabled:false,automationEnabled:false,likenessEnabled:false})
const currentPolicy=()=>{
  const domains=Object.fromEntries(policy.CONSENT_DOMAINS.map(name=>[name,permission()]))
  domains.memory.mode='granted';domains.memory.modelContext=true
  domains.models.mode='granted';domains.models.modelContext=true
  return {version:2,revision:5,ownerId:'unit-owner',domains,enforcement:{state:'fully-enforced',jobId:null,affectedTargets:[],providerState:'complete'}}
}
const baseline=()=>({uid:'unit-owner',ownerExists:true,ownerDeleted:false,accountStatus:'active',ownerPrivacyRevision:5,tombstoneExists:false,fenceExists:false,pendingDeletions:undefined,policy:currentPolicy()})

test('canonical active memory owner is permitted',()=>{assert.equal(decide(baseline()),'active')})
test('owner identity and deletion markers deny access',()=>{
  assert.equal(decide({...baseline(),ownerExists:false}),'inactive-owner')
  assert.equal(decide({...baseline(),ownerDeleted:true}),'inactive-owner')
  assert.equal(decide({...baseline(),tombstoneExists:true}),'inactive-owner')
  for(const accountStatus of ['deleting','deleted','disabled']) assert.equal(decide({...baseline(),accountStatus}),'inactive-owner')
})
test('paused, limited and denied memory permission deny access',()=>{
  for(const mode of ['paused','limited','denied']) {const a=baseline();a.policy.domains.memory.mode=mode;assert.equal(decide(a),'memory-not-granted')}
})
test('pending, failed or partial enforcement deny access',()=>{
  for(const state of ['pending','partially-enforced','failed','conflicted']) {const a=baseline();a.policy.enforcement.state=state;assert.equal(decide(a),'enforcement-pending')}
})
test('stale, non-integer, or forged privacy projection fails closed',()=>{
  for(const ownerPrivacyRevision of [4,6,'5',-1,NaN]) assert.equal(decide({...baseline(),ownerPrivacyRevision}),'privacy-revision-mismatch')
})
test('canonical policy must belong to owner and contain all required fields',()=>{
  for(const change of [a=>{a.policy.ownerId='other-owner'},a=>{delete a.policy.domains.workforce},a=>{a.policy.domains.memory.extra=true},a=>{a.policy=undefined}]) {const a=baseline();change(a);assert.equal(decide(a),'invalid-policy')}
})
test('pending deletion or malformed fence fails closed',()=>{
  for(const v of [null,[],{erase:'true'},{erase:1},'broken']) assert.equal(decide({...baseline(),fenceExists:true,pendingDeletions:v}),'deletion-fence-invalid')
  assert.equal(decide({...baseline(),fenceExists:true,pendingDeletions:{erase:true}}),'deletion-pending')
})
test('clean deletion fence and missing optional legacy projection remain authorized',()=>{
  assert.equal(decide({...baseline(),fenceExists:true,pendingDeletions:{erase:false}}),'active')
  assert.equal(decide({...baseline(),ownerPrivacyRevision:undefined}),'active')
})
