import assert from 'node:assert/strict';
import test from 'node:test';
import { lifeMapHiddenEventMemoryIds, lifeMapEventCoverageComplete, lifeMapCoveredEventMemoryVisible } from '../src/components/lifemap/lifeMapPhysicalStarAction.mjs';
const memory = (memoryId, privacyLevel = 'private', extras = {}) => ({id: 'event:' + memoryId, type:'memory', memoryId, privacyLevel, ...extras});
const fallback = ({recentEvents=[], unorderedEvents=[], orderedCount=0, unorderedCount=0, orderedCache=false, unorderedCache=false, ownerMatch=true}, memoryIds=[]) => {
  if(!ownerMatch || !lifeMapEventCoverageComplete(orderedCount,orderedCache) || !lifeMapEventCoverageComplete(unorderedCount,unorderedCache))return [];
  const hidden = lifeMapHiddenEventMemoryIds([...recentEvents, ...unorderedEvents]);
  return memoryIds.filter(id => !hidden.has(id));
};
test('unordered event coverage recognizes legacy hidden event without occurredAt even if date-ordered query omits it',()=>{
  const legacy={...memory('private-legacy','shareable',{privacy:'hidden'})};
  assert.equal(Object.hasOwn(legacy,'occurredAt'),false);
  assert.deepEqual(fallback({recentEvents:[],unorderedEvents:[legacy],orderedCount:0,unorderedCount:1},['private-legacy']),[]);
});
test('normal owner memory with no associated event can still materialize after dual complete snapshots',()=>{
  assert.deepEqual(fallback({recentEvents:[],unorderedEvents:[],orderedCount:0,unorderedCount:0},['visible']),['visible']);
});
test('server-confirmed completeness requires below-limit documents from both sources',()=>{
  for(const count of [0,1,239])assert.equal(lifeMapEventCoverageComplete(count,false),true);
  for(const count of [240,241,-1,NaN,1.5,'0',null,undefined])assert.equal(lifeMapEventCoverageComplete(count,false),false);
  assert.equal(lifeMapEventCoverageComplete(0,true),false);
  assert.equal(lifeMapEventCoverageComplete(0,undefined),false);
  assert.equal(lifeMapEventCoverageComplete(2,false,2),false);
});
test('cache-only or capped unordered query blocks fallback even when ordered query has no events',()=>{
  for(const state of [{unorderedCache:true},{unorderedCount:240},{orderedCache:true},{orderedCount:240}]){
    assert.deepEqual(fallback({...state},['candidate']),[]);
  }
});
test('owner or consent revision mismatch blocks fallback while old snapshot remains',()=>{
  assert.deepEqual(fallback({ownerMatch:false},['candidate']),[]);
});
test('both hidden privacy aliases veto canonical stars without mutating event documents',()=>{
  const events=Object.freeze([Object.freeze(memory('secret1','hidden')),Object.freeze(memory('secret2','shareable',{privacy:'hidden'}))]);
  assert.deepEqual([...lifeMapHiddenEventMemoryIds(events)],['secret1','secret2']);
  assert.deepEqual(fallback({recentEvents:events,unorderedEvents:events,orderedCount:2,unorderedCount:2},['secret1','secret2','allowed']),['allowed']);
});
test('incomplete or malformed privacy input is never mistaken for complete evidence',()=>{
  assert.deepEqual([...lifeMapHiddenEventMemoryIds(null)],[]);
  for(const input of [null,undefined,'false',0])assert.equal(lifeMapEventCoverageComplete(0,input),false);
});

test('event-backed memory awaits complete coverage',()=>{const n=memory('ready');assert.equal(lifeMapCoveredEventMemoryVisible(n,false,new Set()),false);assert.equal(lifeMapCoveredEventMemoryVisible(n,true,new Set()),true)})
test('hidden undated event vetoes another visible event with same memory ID',()=>{const hidden=lifeMapHiddenEventMemoryIds([memory('secret','shareable',{privacy:'hidden'})]);assert.equal(lifeMapCoveredEventMemoryVisible(memory('secret'),true,hidden),false)})
test('malformed identity or missing veto evidence cannot authorize a star',()=>{for(const id of ['', ' ',null,undefined,3])assert.equal(lifeMapCoveredEventMemoryVisible(memory(id),true,new Set()),false);assert.equal(lifeMapCoveredEventMemoryVisible(memory('good'),true,null),false)})
test('contextual signals remain while hidden metadata vetoes every event type',()=>{const season={id:'s',type:'season',privacyLevel:'private'};assert.equal(lifeMapCoveredEventMemoryVisible(season,false,null),true);assert.equal(lifeMapCoveredEventMemoryVisible({...season,privacy:'hidden'},true,new Set()),false)})
test('production Life Map event projection checks coverage before rendering memory stars',async()=>{const {readFileSync}=await import('node:fs');const source=readFileSync(new URL('../src/components/lifemap/useLifeMapEvents.ts',import.meta.url),'utf8');assert.match(source,/if \(!lifeMapCoveredEventMemoryVisible\(node, eventCoverageCurrent, eventHiddenIds\)\) return \[\];/);assert.match(source,/unorderedEventCoverage\.authority === authorityKey && unorderedEventCoverage\.complete/);assert.match(source,/for \(const id of unorderedEventCoverage\.hiddenIds\) eventHiddenIds\.add\(id\)/)})
