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
  repeatedPersonInsteadOfPlace:{entities:[{id:'person_1'},{id:'person_1'}]},
  repeatedPlaceInsteadOfPerson:{entities:[{id:'place_2'},{id:'place_2'}]},
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

test('shared world loads source-checked graph only through existing protected callable',async()=>{
  const fs=await import('node:fs')
  const world=fs.readFileSync(new URL('../src/spatial/world/WorldStateProvider.tsx',import.meta.url),'utf8')
  const council=fs.readFileSync(new URL('../src/spatial/council/CouncilConversationPanel.tsx',import.meta.url),'utf8')
  assert.match(world,/getCouncilLifeGraphEvidence/)
  assert.match(world,/projectLifeGraphEvidence\(response\.data, snapshotId, entityIds\)/)
  assert.match(world,/auth\.currentUser !== owner/)
  assert.match(world,/CLEAR_GRAPH_VIEW/)
  assert.match(world,/onAuthStateChanged/)
  assert.match(world,/graphReadGeneration\.current \+= 1/)
  assert.match(world,/generation !== graphReadGeneration\.current/)
  assert.match(world,/LIFE_GRAPH_WORLD_CONTEXT_CHANGED/)
  assert.match(world,/unsubscribe\(\)/)
  assert.match(council,/loadGraphView\(snapshotId, entityIds\)/)
  assert.match(council,/No external provider was contacted/)
})
