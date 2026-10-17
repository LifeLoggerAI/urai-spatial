const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const crypto = require('node:crypto')
const { test } = require('node:test')

const code = fs.readFileSync(path.resolve(__dirname, '../lib/apps/functions/src/scenarioOperations.js'), 'utf8')
const ownerId = 'synthetic-owner', scenarioId = 'scn_synthetic_scenario_0001'
const prefix = 'users/' + ownerId + '/scenarios/' + scenarioId
class HttpsError extends Error { constructor(code, message) { super(message); this.code = code } }
function fixture() {
  const docs = new Map(), reads = [], limits = []
  const ref = location => ({ path:location, id:location.split('/').at(-1), get:async()=>snapshot(location), collection:name=>query(location+'/'+name) })
  const snapshot = location => { reads.push(location);return { id:location.split('/').at(-1),exists:docs.has(location),data:()=>docs.get(location),ref:ref(location) } }
  const query = location => { let limit=Infinity;return { doc:id=>ref(location+'/'+id),limit(count){limit=count;limits.push(count);return this},get:async()=>({ docs:[...docs.keys()].filter(key=>key.startsWith(location+'/') && !key.slice(location.length+1).includes('/')).slice(0,limit).map(snapshot) }) } }
  const db = { doc:ref }
  const firestore = () => db
  firestore.FieldValue = { serverTimestamp:()=>({ synthetic:true }) }
  const imports = { 'firebase-functions/v1':{ https:{ onCall:handler=>handler,HttpsError } },'firebase-admin':{ apps:[{}],firestore },'node:crypto':crypto,'./scenarioProvider':{ scenarioProviderState:'provider-unavailable' },'./consentPolicyAuthority':require(path.resolve(__dirname,'../lib/apps/functions/src/consentPolicyAuthority.js')) }
  const module = { exports:{} }
  vm.runInNewContext(code,{ module,exports:module.exports,require:name=>{ assert.ok(name in imports,'Unexpected import '+name);return imports[name] } },{ filename:'actual-compiled-scenarioOperations.js' })
  docs.set(prefix,{ id:scenarioId,ownerId,question:'Synthetic what-if',activeBranchId:'br_a' })
  docs.set(prefix+'/basis/current',{ ownerId,assumptionOnly:true,evidenceRefs:[] })
  docs.set(prefix+'/branches/br_a',{ id:'br_a',ownerId,label:'Branch A',summary:'Synthetic A',uncertainty:['Unknown A'] })
  docs.set(prefix+'/branches/br_b',{ id:'br_b',ownerId,label:'Branch B',summary:'Synthetic B',uncertainty:[] })
  return { docs,reads,limits,call:(data={},context={auth:{uid:ownerId}})=>module.exports.getPossibleFutureCouncilBundle({ scenarioId,...data },context) }
}
test('actual compiled bundle selects the exact requested branch and remains hypothetical',async()=>{
  const f=fixture(),result=await f.call({ branchId:'br_b' });assert.equal(result.branchId,'br_b');assert.equal(result.branchLabel,'Branch B');assert.equal(result.branchSummary,'Synthetic B');assert.equal(result.scenarioId,scenarioId);assert.equal(result.truthKind,'scenario');assert.match(result.disclosure,/Not a memory, prediction/);assert.deepEqual(f.limits,[3])
})
test('actual compiled bundle rejects a missing requested branch even when other branches exist',async()=>{
  const f=fixture();await assert.rejects(f.call({ branchId:'br_missing' }),error=>error.code==='not-found' && /branch not found/.test(error.message))
})
test('actual compiled bundle rejects a requested branch when the scenario has no branches',async()=>{
  const f=fixture();for(const key of f.docs.keys())if(key.includes('/branches/'))f.docs.delete(key);await assert.rejects(f.call({ branchId:'br_missing' }),error=>error.code==='not-found')
})
for(const value of ['', 'bad branch', null, 42, {id:'br_a'}]) test('actual compiled bundle refuses malformed explicit branch '+JSON.stringify(value),async()=>{
  const f=fixture();await assert.rejects(f.call({ branchId:value }),error=>error.code==='invalid-argument');assert.equal(f.reads.length,0)
})
test('actual compiled bundle uses server active branch when no branch was requested',async()=>{
  const f=fixture();f.docs.set(prefix,{ ...f.docs.get(prefix),activeBranchId:'br_b' });const result=await f.call();assert.equal(result.branchId,'br_b')
})
test('actual compiled implicit branch retains bounded fallback when active branch is stale',async()=>{
  const f=fixture();f.docs.set(prefix,{ ...f.docs.get(prefix),activeBranchId:'br_stale' });const result=await f.call();assert.equal(result.branchId,'br_a')
})
test('actual compiled unauthenticated call cannot read a private Scenario',async()=>{
  const f=fixture();await assert.rejects(f.call({},{}),error=>error.code==='unauthenticated');assert.equal(f.reads.length,0)
})
test('actual compiled call reads only the authenticated owner namespace despite client owner fields',async()=>{
  const f=fixture();const result=await f.call({ branchId:'br_a',ownerId:'synthetic-other',tenant:'other-tenant' });assert.equal(result.branchId,'br_a');assert.ok(f.reads.every(path=>path.startsWith(prefix)))
})
test('actual compiled foreign-owner request returns not-found rather than another owners branch',async()=>{
  const f=fixture();await assert.rejects(f.call({branchId:'br_a'},{auth:{uid:'synthetic-other'}}),error=>error.code==='not-found');assert.ok(f.reads.every(path=>path.startsWith('users/synthetic-other/')))
})
test('actual compiled missing Scenario basis fails closed',async()=>{
  const f=fixture();f.docs.delete(prefix+'/basis/current');await assert.rejects(f.call({branchId:'br_a'}),error=>error.code==='not-found')
})

