import assert from 'node:assert/strict'
import test from 'node:test'
import { createEmptyWorldSnapshot, reduceWorldSnapshot } from '../src/spatial/xr/uraiXrProductionRuntime.ts'
import { createMemoryPersistence, getOrCreateXrSnapshot } from '../src/spatial/xr/uraiXrPersistence.ts'
import { issueUraiXrRoomSession, encodeUraiXrRoomSession } from '../src/spatial/xr/uraiXrRoomSecurity.ts'
import { createUraiXrRoomRuntime } from '../src/spatial/xr/uraiXrRoomRuntime.ts'
import { buildUraiXrReplicationPlan, pruneUraiXrSnapshotForPeer } from '../src/spatial/xr/uraiXrReplicationOptimizer.ts'
import { createInMemoryUraiXrSfuAdapter, selectUraiXrSfuTracksForPeer } from '../src/spatial/xr/uraiXrSfuAdapter.ts'

function signed(roomId, peerId, scopes = ['room:join', 'room:signal', 'room:publish', 'room:observe']) {
  return encodeUraiXrRoomSession(issueUraiXrRoomSession({ roomId, peerId, scopes, now: 1000, rotationMs: 60000, ttlMs: 120000, secret: 'local-xr-dev-secret' }))
}

test('XR room join validates token and creates authoritative room state', async () => {
  const roomId = 'home-join-contract'
  const runtime = createUraiXrRoomRuntime({ persistence: createMemoryPersistence(), requireToken: true, now: () => 2000 })
  const token = signed(roomId, 'peer-a')
  const result = await runtime.handle({ type: 'join', roomId, peerId: 'peer-a', token })
  assert.equal(result.ok, true)
  assert.equal(result.snapshot?.roomId, roomId)
  assert.equal(result.snapshot?.version, 2)
  assert.equal(result.sfuRoom?.peers['peer-a'].peerId, 'peer-a')
  assert.ok(result.events.some((event) => event.type === 'room.joined'))
})

test('XR room signaling fails closed on missing or under-scoped token', async () => {
  const roomId = 'home-security-contract'
  const runtime = createUraiXrRoomRuntime({ persistence: createMemoryPersistence(), requireToken: true, now: () => 2000 })
  const missing = await runtime.handle({ type: 'join', roomId, peerId: 'peer-a' })
  assert.equal(missing.ok, false)
  const observeOnly = signed(roomId, 'peer-a', ['room:observe'])
  const rejected = await runtime.handle({ type: 'presence', roomId, peerId: 'peer-a', token: observeOnly, pose: { position: [0, 1.6, 0], rotation: [0, 0, 0, 1], updatedAt: 1 } })
  assert.equal(rejected.ok, false)
  assert.equal(rejected.error, 'missing_scope')
})

test('presence, telemetry and voice messages reduce into one coherent snapshot', () => {
  const roomId = 'home-reducer-contract'
  const base = createEmptyWorldSnapshot(roomId)
  const withPresence = reduceWorldSnapshot(base, { type: 'presence', roomId, peerId: 'peer-a', pose: { position: [0, 1.6, -1], rotation: [0, 0, 0, 1], updatedAt: 1 } })
  const withTelemetry = reduceWorldSnapshot(withPresence, { type: 'telemetry', roomId, peerId: 'peer-a', gpu: { frameMs: 13.8, fps: 72, droppedFrames: 0, dpr: 1, device: 'quest-3', sampledAt: 2 } })
  const withVoice = reduceWorldSnapshot(withTelemetry, { type: 'voice', roomId, from: 'peer-a', position: [0, 1.6, -1], speaking: true, level: 0.7 })
  assert.deepEqual(withVoice.peers['peer-a'].position, [0, 1.6, -1])
  assert.equal(withVoice.telemetry['peer-a'].fps, 72)
  assert.equal(withVoice.voice['peer-a'].speaking, true)
})

test('SDP and ICE signaling messages round-trip through runtime transport contract', async () => {
  const roomId = 'home-sdp-contract'
  const runtime = createUraiXrRoomRuntime({ persistence: createMemoryPersistence(), requireToken: false, now: () => 2000 })
  await runtime.handle({ type: 'join', roomId, peerId: 'peer-a' })
  await runtime.handle({ type: 'join', roomId, peerId: 'peer-b' })
  const offer = await runtime.handle({ type: 'offer', roomId, from: 'peer-a', to: 'peer-b', sdp: 'v=0' })
  const answer = await runtime.handle({ type: 'answer', roomId, from: 'peer-b', to: 'peer-a', sdp: 'v=0' })
  const ice = await runtime.handle({ type: 'ice', roomId, from: 'peer-a', to: 'peer-b', candidate: '{"candidate":"candidate:1"}' })
  assert.equal(offer.ok, true)
  assert.equal(answer.ok, true)
  assert.equal(ice.ok, true)
  assert.equal(ice.snapshot?.version, 3)
})

test('persistence snapshots, journals, hydrates and recovers room state', async () => {
  const roomId = 'home-persistence-contract'
  const persistence = createMemoryPersistence()
  const snapshot = await getOrCreateXrSnapshot(persistence, roomId)
  const next = reduceWorldSnapshot(snapshot, { type: 'presence', roomId, peerId: 'peer-a', pose: { position: [1, 1, 1], rotation: [0, 0, 0, 1], updatedAt: 1 } })
  await persistence.append(roomId, { type: 'join', roomId, peerId: 'peer-a' })
  await persistence.set(roomId, next)
  const recovered = await persistence.get(roomId)
  assert.equal(recovered?.peers['peer-a'].position[0], 1)
  assert.equal(recovered?.version, 2)
})

test('replication optimizer prunes large-room snapshots deterministically', () => {
  const roomId = 'home-replication-contract'
  const snapshot = createEmptyWorldSnapshot(roomId)
  for (let index = 0; index < 30; index += 1) {
    const peerId = `peer-${index}`
    snapshot.peers[peerId] = { position: [index * 10, 1.6, -index], rotation: [0, 0, 0, 1], updatedAt: index }
    snapshot.telemetry[peerId] = { frameMs: 18, fps: index % 2 ? 60 : 72, droppedFrames: index % 3, dpr: 1, device: 'quest-3', sampledAt: index }
  }
  const plan = buildUraiXrReplicationPlan({ snapshot, localPeerId: 'peer-0', maxPeersRealtime: 8 })
  const pruned = pruneUraiXrSnapshotForPeer(snapshot, plan, 'peer-0')
  assert.equal(plan.largeRoomMode, true)
  assert.ok(Object.keys(pruned.peers).length <= Object.keys(snapshot.peers).length)
  assert.ok(plan.peers.some((peer) => peer.quality === 'observer' || peer.quality === 'balanced' || peer.quality === 'constrained'))
})

test('SFU adapter creates rooms, peers, tracks and subscriptions coherently', async () => {
  const roomId = 'home-sfu-contract'
  const sfu = createInMemoryUraiXrSfuAdapter()
  await sfu.createRoom(roomId, { region: 'iad', maxPeers: 4 })
  await sfu.joinPeer(roomId, 'peer-a', { region: 'iad', now: 1 })
  await sfu.joinPeer(roomId, 'peer-b', { region: 'iad', now: 2 })
  const track = await sfu.publishTrack({ roomId, peerId: 'peer-a', kind: 'audio', purpose: 'spatial-voice', priority: 'critical', spatialPosition: [0, 1.6, -1] })
  const room = await sfu.getRoom(roomId)
  const selected = selectUraiXrSfuTracksForPeer(room, 'peer-b')
  const subscribed = await sfu.subscribe('peer-b', roomId, selected.map((entry) => entry.trackId))
  assert.equal(track.purpose, 'spatial-voice')
  assert.equal(selected[0].trackId, track.trackId)
  assert.ok(subscribed.subscribedTrackIds.includes(track.trackId))
})

test('home scene source exposes XR metadata without removing composition anchors', async () => {
  const { readFile } = await import('node:fs/promises')
  const source = await readFile(new URL('../src/spatial/home/visual/HomeScene.tsx', import.meta.url), 'utf8')
  assert.match(source, /data-xr-enabled/)
  assert.match(source, /data-xr-navmesh/)
  assert.match(source, /urai-sky-deep/)
  assert.match(source, /orb-companion/)
  assert.match(source, /urai-ground/)
})
