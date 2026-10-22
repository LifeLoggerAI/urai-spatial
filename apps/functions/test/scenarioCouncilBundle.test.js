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
  docs.set('users/' + ownerId, { deleted:false, accountStatus:'active' })
  const ref = location => ({ path:location, id:location.split('/').at(-1), get:async()=>snapshot(location), collection:name=>query(location+'/'+name) })
  const snapshot = location => { if (location.includes('/scenarios/')) reads.push(location); const value=docs.get(location);return { id:location.split('/').at(-1),exists:docs.has(location),data:()=>value,ref:ref(location),get:key=>key.split('.').reduce((row,part)=>row?.[part],value) } }
  const query = location => { let limit=Infinity;return { doc:id=>ref(location+'/'+id),limit(count){limit=count;limits.push(count);return this},get:async()=>({ docs:[...docs.keys()].filter(key=>key.startsWith(location+'/') && !key.slice(location.length+1).includes('/')).slice(0,limit).map(snapshot) }) } }
  const db = { doc:ref, runTransaction:async body=>body({get:target=>target.get()}) }
  const firestore = () => db
  firestore.FieldValue = { serverTimestamp:()=>({ synthetic:true }) }
  const imports = { 'firebase-functions/v1':{ https:{ onCall:handler=>handler,HttpsError } },'firebase-admin':{ apps:[{}],firestore },'node:crypto':crypto,'./scenarioProvider':{ scenarioProviderState:'provider-unavailable' },'./consentPolicyAuthority':require(path.resolve(__dirname,'../lib/apps/functions/src/consentPolicyAuthority.js')),'./scenarioOwnerAuthority':require(path.resolve(__dirname,'../lib/apps/functions/src/scenarioOwnerAuthority.js')),'./manualScenarioReceipt':require(path.resolve(__dirname,'../lib/apps/functions/src/manualScenarioReceipt.js')) }
  const module = { exports:{} }
  vm.runInNewContext(code,{ module,exports:module.exports,require:name=>{ assert.ok(name in imports,'Unexpected import '+name);return imports[name] } },{ filename:'actual-compiled-scenarioOperations.js' })
  docs.set(prefix,{ id:scenarioId,ownerId,question:'Synthetic what-if',status:'ready',branchIds:['br_a','br_b'],activeBranchId:'br_a' })
  docs.set(prefix+'/basis/current',{ ownerId,assumptionOnly:true,evidenceRefs:[] })
  docs.set(prefix+'/branches/br_a',{ id:'br_a',ownerId,label:'Branch A',summary:'Synthetic A',uncertainty:['Unknown A'] })
  docs.set(prefix+'/branches/br_b',{ id:'br_b',ownerId,label:'Branch B',summary:'Synthetic B',uncertainty:[] })
  return { docs,reads,limits,call:(data={},context={auth:{uid:ownerId}})=>module.exports.getPossibleFutureCouncilBundle({ scenarioId,...data },context) }
}
test('actual compiled bundle selects the exact requested branch and remains hypothetical',async()=>{
  const f=fixture(),result=await f.call({ branchId:'br_b' });assert.equal(result.branchId,'br_b');assert.equal(result.branchLabel,'Branch B');assert.equal(result.branchSummary,'Synthetic B');assert.equal(result.scenarioId,scenarioId);assert.equal(result.truthKind,'scenario');assert.match(result.disclosure,/Not a memory, prediction/);assert.deepEqual(f.limits,[]);assert.deepEqual(f.reads.filter(location=>location.includes('/branches/')).sort(),[prefix+'/branches/br_a',prefix+'/branches/br_b'])
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
test('actual compiled implicit branch fails closed when active branch is stale',async()=>{
  const f=fixture();f.docs.set(prefix,{ ...f.docs.get(prefix),activeBranchId:'br_stale' });await assert.rejects(f.call(),error=>error.code==='failed-precondition'&&error.message==='SCENARIO_ACTIVE_BRANCH_NOT_CURRENT')
})
test('actual compiled unauthenticated call cannot read a private Scenario',async()=>{
  const f=fixture();await assert.rejects(f.call({},{}),error=>error.code==='unauthenticated');assert.equal(f.reads.length,0)
})
test('actual compiled call reads only the authenticated owner namespace despite client owner fields',async()=>{
  const f=fixture();const result=await f.call({ branchId:'br_a',ownerId:'synthetic-other',tenant:'other-tenant' });assert.equal(result.branchId,'br_a');assert.ok(f.reads.every(path=>path.startsWith(prefix)))
})
test('actual compiled foreign-owner request returns not-found rather than another owners branch',async()=>{
  const f=fixture();await assert.rejects(f.call({branchId:'br_a'},{auth:{uid:'synthetic-other'}}),error=>error.code==='permission-denied'||error.code==='not-found');assert.equal(f.reads.some(path=>path.includes('/branches/')),false)
})
test('actual compiled missing Scenario basis fails closed',async()=>{
  const f=fixture();f.docs.delete(prefix+'/basis/current');await assert.rejects(f.call({branchId:'br_a'}),error=>error.code==='not-found')
})


test('actual compiled Council refuses an orphaned branch even if its document exists',async()=>{
  const f=fixture()
  f.docs.set(prefix+'/branches/br_orphan',{id:'br_orphan',ownerId,label:'Retired',summary:'MUST NOT LEAK'})
  await assert.rejects(f.call({branchId:'br_orphan'}),error=>error.code==='not-found')
  assert.equal(f.reads.includes(prefix+'/branches/br_orphan'),false)
})
test('actual compiled Council blocks discarded scenarios before exposing retained branches',async()=>{
  const f=fixture()
  f.docs.set(prefix,{...f.docs.get(prefix),status:'discarded'})
  await assert.rejects(f.call({branchId:'br_a'}),error=>error.code==='not-found')
  assert.equal(f.reads.some(location=>location.includes('/branches/')),false)
})
test('actual compiled Council blocks foreign owner recorded in an owner-namespace branch',async()=>{
  const f=fixture()
  f.docs.set(prefix+'/branches/br_b',{...f.docs.get(prefix+'/branches/br_b'),ownerId:'foreign-owner'})
  await assert.rejects(f.call({branchId:'br_b'}),error=>error.code==='failed-precondition')
})
test('actual compiled Council blocks a mismatched scenario owner',async()=>{
  const f=fixture()
  f.docs.set(prefix,{...f.docs.get(prefix),ownerId:'foreign-owner'})
  await assert.rejects(f.call({branchId:'br_b'}),error=>error.code==='not-found')
  assert.equal(f.reads.some(location=>location.includes('/branches/')),false)
})
