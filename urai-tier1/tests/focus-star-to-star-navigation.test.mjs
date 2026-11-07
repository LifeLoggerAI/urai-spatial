import assert from 'node:assert/strict'
import test from 'node:test'
import { existsSync, readFileSync } from 'node:fs'
import { focusStarTravel } from '../src/app/focus/focusStarTravel.ts'

const owner = { id: 'mem_a', ownerId: 'owner-a', demo: false, privacy: 'private', authorization: 'owner', star: { id: 'canonical-memory:mem_a' }, replayManifest: { id: 'manifest_a' } }
const a = { id: 'canonical-memory:mem_a', type: 'memory', memoryId: 'mem_a', replayManifestId: 'manifest_a', authorizedMemory: true, replayAvailable: true, privacyLevel: 'private' }
const b = { id: 'canonical-memory:mem_b', type: 'memory', memoryId: 'mem_b', replayManifestId: 'manifest_b', authorizedMemory: true, replayAvailable: true, privacyLevel: 'private' }
const c = { id: 'canonical-memory:mem_c', type: 'memory', memoryId: 'mem_c', replayManifestId: 'manifest_c', authorizedMemory: true, replayAvailable: true, privacyLevel: 'private' }
const nodes = [a,b,c]

function zero(result) { assert.equal(result.total, 0); assert.equal(result.previous, null); assert.equal(result.next, null) }

test('authorized current memory stays inside Focus and offers precise neighbor identity', () => {
  const result = focusStarTravel(nodes, owner, 'private', false)
  assert.equal(result.position, 1)
  assert.equal(result.total, 3)
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

test('malformed and duplicate IDs fail closed without generating untrusted route payloads', () => {
  const result=focusStarTravel([a,{...b,id:'bad?owner=other'}, {...c,replayManifestId:'bad&token=x'}], owner,'private',false)
  assert.equal(result.total,1)
  assert.equal(result.next,null)
})

test('canonical mounted Focus must import owner-scoped Life Map hook and use same-route stepper', (t) => {
  const path = new URL('../src/app/focus/FocusChamberClient.tsx',import.meta.url)
  if (!existsSync(path)) { t.skip('full repo checkout unavailable on this host'); return }
  const src = readFileSync(path,'utf8')
  assert.match(src,/useLifeMapEvents\(/)
  assert.match(src,/focusStarTravel\(/)
  assert.match(src,/router\.replace\(target\.href/)
  assert.match(src,/focus-star-step/)
})
