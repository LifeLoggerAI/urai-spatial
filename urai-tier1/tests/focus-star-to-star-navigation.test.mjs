import assert from 'node:assert/strict'
import test from 'node:test'
import { existsSync, readFileSync } from 'node:fs'
import { focusStarTravel, focusReplayReturnNode, verifiedFocusEventNodeId } from '../src/app/focus/focusStarTravel.ts'

const owner = { id: 'mem_a', ownerId: 'owner-a', demo: false, privacy: 'private', authorization: 'owner', star: { id: 'canonical-memory:mem_a' }, replayManifest: { id: 'manifest_a' } }
const a = { id: 'canonical-memory:mem_a', type: 'memory', memoryId: 'mem_a', replayManifestId: 'manifest_a', authorizedMemory: true, replayAvailable: true, privacyLevel: 'private' }
const b = { id: 'canonical-memory:mem_b', type: 'memory', memoryId: 'mem_b', replayManifestId: 'manifest_b', authorizedMemory: true, replayAvailable: true, privacyLevel: 'private' }
const c = { id: 'canonical-memory:mem_c', type: 'memory', memoryId: 'mem_c', replayManifestId: 'manifest_c', authorizedMemory: true, replayAvailable: true, privacyLevel: 'private' }
const nodes = [a,b,c]

function zero(result) { assert.equal(result.total, 0); assert.equal(result.previous, null); assert.equal(result.next, null); assert.equal(result.currentNodeId, null) }

test('authorized current memory stays inside Focus and offers precise neighbor identity', () => {
  const result = focusStarTravel(nodes, owner, 'private', false)
  assert.equal(result.position, 1)
  assert.equal(result.total, 3)
  assert.equal(result.currentNodeId, a.id)
  assert.equal(result.previous, null)
  const u = new URL(result.next.href, 'https://example.invalid')
  assert.equal(u.pathname, '/focus')
  assert.equal(u.searchParams.get('memoryId'), 'mem_b')
  assert.equal(u.searchParams.get('manifestId'), 'manifest_b')
  assert.equal(u.searchParams.get('node'), b.id)
  assert.equal(u.searchParams.get('returnNode'), b.id)
  assert.equal(u.searchParams.get('from'), 'focus-star-step')
  for (const field of ['ownerId', 'planId', 'movieId', 'authorization', 'sourceDigest', 'consent', 'token']) assert.equal(u.searchParams.has(field), false)
})

test('middle star steps both directions; last star never wraps to first', () => {
  const mid = focusStarTravel(nodes, { ...owner, id: 'mem_b', replayManifest: { id: 'manifest_b' } }, 'private', false)
  assert.equal(mid.previous.nodeId, a.id)
  assert.equal(mid.next.nodeId, c.id)
  const last = focusStarTravel(nodes, { ...owner, id: 'mem_c', replayManifest: { id: 'manifest_c' } }, 'private', false)
  assert.equal(last.next, null)
  assert.equal(last.previous.nodeId, b.id)
})

test('signed-out, wrong source mode, loading, and absent current star fail closed', () => {
  zero(focusStarTravel(nodes, owner, 'signed-out', false))
  zero(focusStarTravel(nodes, owner, 'unavailable', false))
  zero(focusStarTravel(nodes, owner, 'private', true))
  zero(focusStarTravel(nodes, null, 'private', false))
  zero(focusStarTravel(nodes, { ...owner, id: 'missing' }, 'private', false))
  zero(focusStarTravel(nodes, { ...owner, authorization: 'none' }, 'private', false))
  zero(focusStarTravel(nodes, { ...owner, privacy: 'hidden' }, 'private', false))
})

test('private candidates require verified canonical memory, exact manifest, and visible rights', () => {
  const forged = { ...b, authorizedMemory: false }
  const hidden = { ...b, privacyLevel: 'hidden' }
  const locked = { ...b, locked: true }
  const contextual = { ...b, type: 'relationship' }
  const noManifest = { ...b, replayManifestId: undefined }
  const rawDemo = { ...b, memoryId: 'demo:mem_b' }
  for (const candidate of [forged,hidden,locked,contextual,noManifest,rawDemo]) {
    const result = focusStarTravel([a,candidate], owner, 'private', false)
    assert.equal(result.total, 1)
    assert.equal(result.next, null)
  }
})

test('duplicated event projections cannot repeat a memory or create a cycle', () => {
  const duplicate = { ...b, id: 'other-event-for-mem-b' }
  const result = focusStarTravel([a,b,duplicate,c], owner, 'private', false)
  assert.equal(result.total, 3)
  assert.equal(result.next.nodeId, b.id)
})

test('disclosed sample only: may step to another visible fictional star without private manifest', () => {
  const fixture = { ...owner, id: 'demo:quiet-reset', demo: true, star: { id:'quiet-reset' } }
  const sample = [
    { id:'quiet-reset', type:'recovery', replayAvailable:true, privacyLevel:'private' },
    { id:'voice-note-home', type:'memory', replayAvailable:true, privacyLevel:'private' },
    { id:'sealed-private-chapter', type:'legacy', replayAvailable:false, locked:true, privacyLevel:'hidden' },
  ]
  const result = focusStarTravel(sample, fixture, 'explicit-demo', false)
  assert.equal(result.total, 2)
  const u = new URL(result.next.href, 'https://example.invalid')
  assert.equal(u.pathname,'/focus')
  assert.equal(u.searchParams.get('demo'),'1')
  assert.equal(u.searchParams.get('memoryId'),'demo:voice-note-home')
  assert.equal(u.searchParams.has('manifestId'),false)
  zero(focusStarTravel(sample, fixture, 'private', false))
  zero(focusStarTravel(sample, owner, 'explicit-demo', false))
})

test('demo Focus star identity survives Replay and Escape without alias changes', () => {
  const samples = [
    { id:'quiet-reset', type:'recovery', replayAvailable:true, privacyLevel:'private' },
    { id:'voice-note-home', type:'memory', replayAvailable:true, privacyLevel:'private' },
  ]
  const first = { ...owner, id:'demo:quiet-reset', demo:true, star:{ id:'quiet-reset' } }
  const firstStep = focusStarTravel(samples, first, 'explicit-demo', false)
  const selectedId = new URL(firstStep.next.href, 'https://example.invalid').searchParams.get('memoryId')
  assert.equal(selectedId, 'demo:voice-note-home')
  // This is the selected identity passed to Replay and back by the world controller.
  const returned = { ...first, id:selectedId, star:{ id:'voice-note-home' } }
  const afterReturn = focusStarTravel(samples, returned, 'explicit-demo', false)
  assert.equal(afterReturn.position, 2)
  assert.equal(afterReturn.total, 2)
  assert.equal(afterReturn.next, null)
  assert.equal(new URL(afterReturn.previous.href, 'https://example.invalid').searchParams.get('memoryId'), 'demo:quiet-reset')
})

test('real owner event-backed star preserves verified constellation event through Replay', () => {
  const event = { ...b, id: 'event:b' }
  const selected = { ...owner, id: 'mem_b', star: { id: 'physical-star-b' }, replayManifest: { id: 'manifest_b' } }
  const travel = focusStarTravel([a,event,c], selected, 'private', false)
  assert.equal(travel.currentNodeId, 'event:b')
  const incoming = new URLSearchParams({ memoryId:'mem_b', manifestId:'manifest_b', node:'event:b', returnNode:'event:b', from:'focus-star-step' })
  assert.equal(focusReplayReturnNode(selected, incoming, travel.currentNodeId), 'event:b')
})

test('unverified or mismatched event node is not carried from Focus through Replay', () => {
  const selected = { ...owner, id:'mem_b', star:{id:'physical-star-b'}, replayManifest:{id:'manifest_b'} }
  const base = { memoryId:'mem_b', manifestId:'manifest_b', node:'event:b', returnNode:'event:b', from:'focus-star-step' }
  const route = extra => new URLSearchParams({...base,...extra})
  for (const [override, trusted] of [
    [{},null], [{},'event:other'], [{memoryId:'mem_c'},'event:b'],
    [{manifestId:'stale-manifest'},'event:b'], [{returnNode:'event:c'},'event:b'],
    [{from:'manual-url'},'event:b'], [{node:'evil&x=1',returnNode:'evil&x=1'},'evil&x=1'],
  ]) assert.equal(focusReplayReturnNode(selected,route(override),trusted),'physical-star-b')
  assert.equal(focusReplayReturnNode({...selected,authorization:'none'},route({}),'event:b'),'physical-star-b')
})

test('direct Life Map and canonical projected star remain supported, without admitting stale manifests', () => {
  const selected={...owner,id:'mem_b',star:{id:'physical-star-b'},replayManifest:{id:'manifest_b'}}
  const direct=new URLSearchParams({memoryId:'mem_b',manifestId:'manifest_b',node:'event:b',returnNode:'event:b',from:'life-map-semantic'})
  assert.equal(focusReplayReturnNode(selected,direct,null),'physical-star-b')
  assert.equal(focusReplayReturnNode(selected,direct,verifiedFocusEventNodeId([{...b,id:'event:b'}],selected,'private',false,'event:b')),'event:b')
  const projection=new URLSearchParams({memoryId:'mem_b',manifestId:'manifest_b',node:'canonical-memory:mem_b',from:'manual-direct'})
  assert.equal(focusReplayReturnNode(selected,projection,null),'physical-star-b')
  projection.set('from','life-map-semantic')
  const projectionNode=verifiedFocusEventNodeId([b],selected,'private',false,'canonical-memory:mem_b')
  assert.equal(focusReplayReturnNode(selected,projection,projectionNode),'canonical-memory:mem_b')
  projection.set('manifestId','manifest_a')
  assert.equal(focusReplayReturnNode(selected,projection,null),'physical-star-b')
})

test('malformed and duplicate IDs fail closed without generating untrusted route payloads', () => {
  const result=focusStarTravel([a,{...b,id:'bad?owner=other'}, {...c,replayManifestId:'bad&token=x'}], owner,'private',false)
  assert.equal(result.total,1)
  assert.equal(result.next,null)
})

test('repeated private Replay returns keep exact event without stale from or returnNode hints', () => {
  const event={...b,id:'event:b'}
  const selected={...owner,id:'mem_b',star:{id:'physical-star-b'},replayManifest:{id:'manifest_b'}}
  const verified=verifiedFocusEventNodeId([a,event,c],selected,'private',false,'event:b')
  assert.equal(verified,'event:b')
  const first=new URLSearchParams({memoryId:'mem_b',manifestId:'manifest_b',node:'event:b',returnNode:'event:b',from:'focus-star-step'})
  assert.equal(focusReplayReturnNode(selected,first,verified),'event:b')
  const replay=new URLSearchParams({memoryId:'mem_b',manifestId:'manifest_b',node:'event:b',returnNode:'event:b',from:'focus-artifact'})
  assert.equal(focusReplayReturnNode(selected,replay,verified),'event:b')
  const escaped=new URLSearchParams({memoryId:'mem_b',manifestId:'manifest_b',node:'event:b'})
  assert.equal(focusReplayReturnNode(selected,escaped,verified),'event:b')
  assert.equal(focusReplayReturnNode(selected,escaped,verified),'event:b')
})

test('two owner events with same memory never substitute each other on Replay return', () => {
  const first={...b,id:'event:one'}
  const second={...b,id:'event:two'}
  const selected={...owner,id:'mem_b',star:{id:'physical-star-b'},replayManifest:{id:'manifest_b'}}
  const travel=focusStarTravel([a,first,second,c],selected,'private',false)
  assert.equal(travel.currentNodeId,'event:one')
  const verified=verifiedFocusEventNodeId([a,first,second,c],selected,'private',false,'event:two')
  assert.equal(verified,'event:two')
  const route=new URLSearchParams({memoryId:'mem_b',manifestId:'manifest_b',node:'event:two'})
  assert.equal(focusReplayReturnNode(selected,route,verified),'event:two')
  assert.equal(focusReplayReturnNode(selected,route,travel.currentNodeId),'physical-star-b')
})

test('revalidated private event must disappear on revoke, loading, changed manifest, or cross-memory data', () => {
  const event={...b,id:'event:b'}
  const selected={...owner,id:'mem_b',star:{id:'physical-star-b'},replayManifest:{id:'manifest_b'}}
  const route=new URLSearchParams({memoryId:'mem_b',manifestId:'manifest_b',node:'event:b'})
  const variants=[[{...event,locked:true}], [{...event,privacyLevel:'hidden'}], [{...event,authorizedMemory:false}], [{...event,type:'relationship'}], [{...event,memoryId:'mem_c'}], [{...event,replayManifestId:'manifest_old'}]]
  for(const entries of variants){
    const verified=verifiedFocusEventNodeId(entries,selected,'private',false,'event:b')
    assert.equal(verified,null)
    assert.equal(focusReplayReturnNode(selected,route,verified),'physical-star-b')
  }
  for(const mode of ['signed-out','unavailable','explicit-demo','empty']) assert.equal(verifiedFocusEventNodeId([event],selected,mode,false,'event:b'),null)
  assert.equal(verifiedFocusEventNodeId([event],selected,'private',true,'event:b'),null)
  assert.equal(verifiedFocusEventNodeId([event],{...selected,authorization:'none'},'private',false,'event:b'),null)
  assert.equal(verifiedFocusEventNodeId([event],{...selected,privacy:'hidden'},'private',false,'event:b'),null)
  assert.equal(verifiedFocusEventNodeId([event],{...selected,demo:true},'private',false,'event:b'),null)
  assert.equal(verifiedFocusEventNodeId([event],selected,'private',false,'event:b?owner=other'),null)
})

test('Replay-return source cannot be forged to override a mismatched node/manifest or owner denial', () => {
  const event={...b,id:'event:b'}
  const selected={...owner,id:'mem_b',star:{id:'physical-star-b'},replayManifest:{id:'manifest_b'}}
  const verified=verifiedFocusEventNodeId([event],selected,'private',false,'event:b')
  const route=(extra)=>new URLSearchParams({memoryId:'mem_b',manifestId:'manifest_b',node:'event:b',from:'focus-artifact',...extra})
  assert.equal(focusReplayReturnNode(selected,route({}),verified),'event:b')
  for(const values of [{memoryId:'mem_c'},{manifestId:'manifest_c'},{node:'event:c'},{returnNode:'event:c'},{from:'manual-url'}]) assert.equal(focusReplayReturnNode(selected,route(values),verified),'physical-star-b')
  assert.equal(focusReplayReturnNode({...selected,authorization:'none'},route({}),verified),'physical-star-b')
})

test('Focus stepper preserves the exact second event for an authorized duplicate memory', () => {
  const first={...b,id:'event:one'}
  const second={...b,id:'event:two'}
  const selected={...owner,id:'mem_b',star:{id:'physical-star-b'},replayManifest:{id:'manifest_b'}}
  const stepper=focusStarTravel([a,first,second,c],selected,'private',false,'event:two')
  assert.equal(stepper.position,2)
  assert.equal(stepper.total,3)
  assert.equal(stepper.currentNodeId,'event:two')
  assert.equal(stepper.previous.nodeId,a.id)
  assert.equal(stepper.next.nodeId,c.id)
  const replay=new URLSearchParams({memoryId:'mem_b',manifestId:'manifest_b',node:stepper.currentNodeId,from:'focus-artifact'})
  assert.equal(focusReplayReturnNode(selected,replay,verifiedFocusEventNodeId([a,first,second,c],selected,'private',false,stepper.currentNodeId)),'event:two')
})

test('Focus stepper never promotes a hidden, stale or malformed duplicate event', () => {
  const first={...b,id:'event:one'}
  const selected={...owner,id:'mem_b',star:{id:'physical-star-b'},replayManifest:{id:'manifest_b'}}
  const privateNodes=[a,first,{...b,id:'event:two',privacyLevel:'hidden'},c]
  for(const nodeId of ['event:two','event:missing','evil?access=1']) {
    const result=focusStarTravel(privateNodes,selected,'private',false,nodeId)
    assert.equal(result.currentNodeId,'event:one')
    assert.equal(result.total,3)
  }
  const revoked=focusStarTravel(privateNodes,selected,'signed-out',false,'event:one')
  zero(revoked)
  const pending=focusStarTravel(privateNodes,selected,'private',true,'event:one')
  zero(pending)
})

test('canonical projection needs live owner Life Map evidence, not a URL-derived ID', () => {
  const selected={...owner,id:'mem_b',star:{id:'physical-star-b'},replayManifest:{id:'manifest_b'}}
  const route=new URLSearchParams({memoryId:'mem_b',manifestId:'manifest_b',node:'canonical-memory:mem_b',from:'focus-artifact'})
  assert.equal(focusReplayReturnNode(selected,route,null),'physical-star-b')
  const match=verifiedFocusEventNodeId([b],selected,'private',false,'canonical-memory:mem_b')
  assert.equal(focusReplayReturnNode(selected,route,match),'canonical-memory:mem_b')
  assert.equal(verifiedFocusEventNodeId([{...b,privacyLevel:'hidden'}],selected,'private',false,'canonical-memory:mem_b'),null)
  assert.equal(verifiedFocusEventNodeId([{...b,replayManifestId:'stale'}],selected,'private',false,'canonical-memory:mem_b'),null)
})

test('canonical mounted Focus must import owner-scoped Life Map hook and use same-route stepper', (t) => {
  const path = new URL('../src/app/focus/FocusChamberClient.tsx',import.meta.url)
  if (!existsSync(path)) { t.skip('full repo checkout unavailable on this host'); return }
  const src = readFileSync(path,'utf8')
  assert.match(src,/useLifeMapEvents\(/)
  assert.match(src,/focusStarTravel\(/)
  assert.match(src,/verifiedFocusEventNodeId\(/)
  assert.match(src,/focusReplayReturnNode\(/)
  assert.match(src,/router\.replace\(target\.href/)
  assert.match(src,/focus-star-step/)
})
