import assert from 'node:assert/strict'
import test from 'node:test'
import {readFileSync} from 'node:fs'
import { lifeMapFilterVisibleNodes, lifeMapHiddenEventMemoryIds } from '../src/components/lifemap/lifeMapPhysicalStarAction.mjs'
const star = (memoryId, privacyLevel = 'private', extra = {}) => Object.freeze({ id: 'event:' + memoryId, type: 'memory', memoryId, privacyLevel, ...extra })
const fallback = (events, canonicalIds) => {
 const visibleEvents=lifeMapFilterVisibleNodes(events)
 const visibleIds=new Set(visibleEvents.filter(n=>n.type==='memory').map(n=>n.memoryId))
 const hiddenIds=lifeMapHiddenEventMemoryIds(events)
 return canonicalIds.filter(id=>!visibleIds.has(id)&&!hiddenIds.has(id))
}
test('hidden event forbids canonical star fallback',()=>assert.deepEqual(fallback([star('private-memory','hidden')],['private-memory']),[]))
test('legacy hidden event forbids canonical star fallback',()=>assert.deepEqual(fallback([star('secret','shareable',{privacy:'hidden'})],['secret']),[]))
test('unrelated or missing event allows canonical star fallback',()=>{
 assert.deepEqual(fallback([],['ready']),['ready'])
 assert.deepEqual(fallback([star('other')],['ready']),['ready'])
})
test('only memory-type hidden events veto their memory ID',()=>{
 assert.deepEqual([...lifeMapHiddenEventMemoryIds([star('season','hidden',{type:'season'}),star('secret','hidden')])],['secret'])
})
test('malformed and frozen input fails closed without mutation',()=>{
 const input=Object.freeze([star('', 'hidden'),star('   ','hidden'),null,star('valid','hidden')])
 assert.deepEqual([...lifeMapHiddenEventMemoryIds(input)],['valid'])
 assert.deepEqual([...lifeMapHiddenEventMemoryIds(null)],[])
})
test('real production hook vetoes hidden events and requires complete server snapshot before canonical projection',()=>{
 const source=readFileSync(new URL('../src/components/lifemap/useLifeMapEvents.ts',import.meta.url),'utf8')
 assert.match(source,/const hiddenEventMemoryIds = lifeMapHiddenEventMemoryIds\(currentNodes\);/)
 assert.match(source,/hiddenEventMemoryIds\.has\(memory\.id\)/)
 assert.match(source,/if \(!eventsSnapshotComplete\) return fromEvents;/)
 assert.match(source,/setEventSnapshotComplete\(snapshot\.docs\.length < 240 && snapshot\.metadata\.fromCache === false\)/)
 assert.match(source,/onSnapshot\(eventsQuery, \{ includeMetadataChanges: true \}, \(snapshot\) => \{/)
})
