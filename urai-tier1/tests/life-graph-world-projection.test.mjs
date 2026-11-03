import assert from 'node:assert/strict'
import test from 'node:test'
import { projectLifeGraphEvidence } from '../src/spatial/world/lifeGraphWorldProjection.ts'

const snapshotId = 'snapshot_1'
const entityIds = ['person_1','place_2']
const verified = { snapshotId, graphHash:'a'.repeat(64),
  entities:entityIds.map(id=>({id})), sourceChecked:true, providerDispatchAuthorized:false }
test('authorized graph projection retains only a bounded identity and hash, not raw evidence',()=>{
  const result=projectLifeGraphEvidence(verified,snapshotId,entityIds)
  assert.deepEqual([...result.entityIds],entityIds)
  assert.equal(result.graphHash,'a'.repeat(64))
  assert.equal('claims' in result,false)
  assert.equal('edges' in result,false)
})
for(const [label,patch] of Object.entries({
  forgedHash:{graphHash:'not-a-real-digest'},
  unchecked:{sourceChecked:false},
  providerFlag:{providerDispatchAuthorized:true},
  anotherSnapshot:{snapshotId:'another'},
  mismatchedEntities:{entities:[{id:'different'},{id:'place_2'}]},
  tooManyEntities:{entities:[...verified.entities,{id:'extra'}]},
})) test('graph projection rejects '+label,()=>assert.throws(
  ()=>projectLifeGraphEvidence({...verified,...patch},snapshotId,entityIds),
  /LIFE_GRAPH_WORLD_PROJECTION_UNAVAILABLE/,
))
test('graph projection rejects empty selection',()=>assert.throws(
  ()=>projectLifeGraphEvidence(verified,snapshotId,[]),/LIFE_GRAPH_WORLD_PROJECTION_UNAVAILABLE/))
test('graph projection rejects duplicate selection',()=>assert.throws(
  ()=>projectLifeGraphEvidence(verified,snapshotId,['person_1','person_1']),/LIFE_GRAPH_WORLD_PROJECTION_UNAVAILABLE/))
test('graph projection rejects an invalid snapshot token',()=>assert.throws(
  ()=>projectLifeGraphEvidence(verified,'../owner',entityIds),/LIFE_GRAPH_WORLD_PROJECTION_UNAVAILABLE/))
