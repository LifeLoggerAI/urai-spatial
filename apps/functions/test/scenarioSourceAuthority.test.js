'use strict'
const assert = require('node:assert/strict')
const { test } = require('node:test')
const { parseScenarioSourceRef, assertCurrentScenarioSourceRecord } = require('../lib/apps/functions/src/scenarioSourceAuthority.js')

const owner = 'fictional-owner'
const refs = [
  { sourceId: 'users/'+owner+'/memories/memory_a', truthKind:'autobiographical-memory', truthRecordId:'memory:memory_a', sourceRevision:3, purpose:'scenario.explore' },
  { sourceId: 'users/'+owner+'/lifeEntities/person_a', truthKind:'interpretation', truthRecordId:'life-entity:person_a', sourceRevision:3, sourceEntityKind:'person', purpose:'scenario.explore' },
  { sourceId: 'users/'+owner+'/lifeEntities/place_a', truthKind:'interpretation', truthRecordId:'life-entity:place_a', sourceRevision:3, sourceEntityKind:'place', purpose:'scenario.explore' },
]

test('three server-minted source references parse and admit current records',()=>{
  for (const [i, ref] of refs.entries()) {
    const parsed=parseScenarioSourceRef(owner,ref)
    const row=i===0
      ? {ownerId:owner,deleted:false,demo:false,synthetic:false,consentState:'granted'}
      : {ownerId:owner,kind:i===1?'person':'place',revoked:false,synthetic:false}
    assert.doesNotThrow(()=>assertCurrentScenarioSourceRecord(owner,parsed,row))
  }
})

for (const [label, patch] of Object.entries({
  foreign: {sourceId:'users/foreign-owner/memories/memory_a'},
  traversal: {sourceId:'users/'+owner+'/memories/../../foreign'},
  purpose: {purpose:'memory.retrieve'},
  kind: {truthKind:'SOURCE_CAPTURED'},
  record: {truthRecordId:'memory:another_id'},
  negativeRevision: {sourceRevision:-1},
  longId: {sourceId:'users/'+owner+'/memories/'+'a'.repeat(200)},
})) test('rejects invalid source reference '+label,()=>{
  assert.throws(()=>parseScenarioSourceRef(owner,{...refs[0],...patch}),/SCENARIO_SOURCE_REFERENCE_INVALID/)
})
for (const [label, patch] of Object.entries({
  foreign:{ownerId:'foreign-owner'}, deleted:{deleted:true}, demo:{demo:true},
  synthetic:{synthetic:true},pending:{consentState:'pending'},revoked:{consentState:'revoked'},
})) test('rejects unavailable memory '+label,()=>{
  assert.throws(()=>assertCurrentScenarioSourceRecord(owner,parseScenarioSourceRef(owner,refs[0]),{ownerId:owner,...patch}),/SCENARIO_SOURCE_UNAVAILABLE/)
})
for (const [label, patch] of Object.entries({
  foreign:{ownerId:'foreign-owner'},revoked:{revoked:true},synthetic:{synthetic:true},
  superseded:{status:'superseded'},wrongKind:{kind:'place'},
})) test('rejects unavailable person '+label,()=>{
  assert.throws(()=>assertCurrentScenarioSourceRecord(owner,parseScenarioSourceRef(owner,refs[1]),{ownerId:owner,kind:'person',...patch}),/SCENARIO_SOURCE_UNAVAILABLE/)
})
test('legacy entity source without kind can only name a person or a place',()=>{
  const legacy={...refs[1]}
  delete legacy.sourceEntityKind
  assert.doesNotThrow(()=>assertCurrentScenarioSourceRecord(owner,parseScenarioSourceRef(owner,legacy),{ownerId:owner,kind:'place'}))
  assert.throws(()=>assertCurrentScenarioSourceRecord(owner,parseScenarioSourceRef(owner,legacy),{ownerId:owner,kind:'organization'}),/SCENARIO_SOURCE_UNAVAILABLE/)
})
