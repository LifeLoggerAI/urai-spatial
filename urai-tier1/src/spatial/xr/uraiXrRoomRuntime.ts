import { getUraiXrSignalPeerId, reduceWorldSnapshot, type UraiXrPersistenceAdapter, type UraiXrSignalMessage, type UraiXrWorldSnapshot } from './uraiXrProductionRuntime'
import { getOrCreateXrSnapshot } from './uraiXrPersistence'
import { validateUraiXrRoomSession, type UraiXrSessionScope } from './uraiXrRoomSecurity'
import { buildUraiXrReplicationPlan, pruneUraiXrSnapshotForPeer, type UraiXrReplicationPlan } from './uraiXrReplicationOptimizer'
import { createInMemoryUraiXrSfuAdapter, selectUraiXrSfuTracksForPeer, type UraiXrSfuAdapter, type UraiXrSfuRoomState } from './uraiXrSfuAdapter'
import { selectUraiXrShard } from './uraiXrDeploymentTopology'

export type UraiXrRuntimeEvent =
  | { type: 'room.joined'; roomId: string; peerId: string; at: number }
  | { type: 'room.left'; roomId: string; peerId: string; at: number }
  | { type: 'room.reduced'; roomId: string; messageType: UraiXrSignalMessage['type']; version: number; at: number }
  | { type: 'room.rejected'; roomId: string; peerId: string; reason: string; at: number }
  | { type: 'room.persisted'; roomId: string; version: number; at: number }
  | { type: 'room.replication_planned'; roomId: string; largeRoomMode: boolean; peers: number; at: number }
  | { type: 'room.sfu_updated'; roomId: string; peers: number; tracks: number; degraded: boolean; at: number }

export type UraiXrRoomRuntimeResult = {
  ok: boolean
  roomId: string
  peerId: string
  snapshot?: UraiXrWorldSnapshot
  peerSnapshot?: UraiXrWorldSnapshot
  replicationPlan?: UraiXrReplicationPlan
  sfuRoom?: UraiXrSfuRoomState
  events: UraiXrRuntimeEvent[]
  error?: string
  rotateToken?: boolean
}

export type UraiXrRoomRuntime = {
  persistence: UraiXrPersistenceAdapter
  sfu: UraiXrSfuAdapter
  handle(message: UraiXrSignalMessage): Promise<UraiXrRoomRuntimeResult>
  observe(roomId: string, peerId: string, token?: string): Promise<UraiXrRoomRuntimeResult>
}

function scopeForMessage(message: UraiXrSignalMessage): UraiXrSessionScope {
  if (message.type === 'join') return 'room:join'
  if (message.type === 'voice') return 'room:publish'
  if (message.type === 'telemetry' || message.type === 'presence') return 'room:publish'
  return 'room:signal'
}

function validateMessage(message: UraiXrSignalMessage) {
  const peerId = getUraiXrSignalPeerId(message)
  const roomOk = /^[a-zA-Z0-9_-]{1,64}$/.test(message.roomId)
  const peerOk = /^[a-zA-Z0-9_-]{1,96}$/.test(peerId)
  return { ok: roomOk && peerOk, roomOk, peerOk, peerId }
}

export function createUraiXrRoomRuntime(input: {
  persistence: UraiXrPersistenceAdapter
  sfu?: UraiXrSfuAdapter
  requireToken?: boolean
  now?: () => number
}): UraiXrRoomRuntime {
  const sfu = input.sfu ?? createInMemoryUraiXrSfuAdapter()
  const now = input.now ?? (() => Date.now())

  async function observe(roomId: string, peerId: string, token?: string): Promise<UraiXrRoomRuntimeResult> {
    const events: UraiXrRuntimeEvent[] = []
    if (input.requireToken) {
      const validation = validateUraiXrRoomSession({ token: token ?? '', requiredScope: 'room:observe', roomId, peerId, now: now() })
      if (!validation.ok) return { ok: false, roomId, peerId, events, error: validation.reason ?? 'unauthorized', rotateToken: validation.reason === 'rotation_required' }
    }
    const snapshot = await getOrCreateXrSnapshot(input.persistence, roomId)
    const plan = buildUraiXrReplicationPlan({ snapshot, localPeerId: peerId })
    return { ok: true, roomId, peerId, snapshot, peerSnapshot: pruneUraiXrSnapshotForPeer(snapshot, plan, peerId), replicationPlan: plan, sfuRoom: await sfu.getRoom(roomId), events }
  }

  async function handle(message: UraiXrSignalMessage): Promise<UraiXrRoomRuntimeResult> {
    const basic = validateMessage(message)
    const events: UraiXrRuntimeEvent[] = []
    if (!basic.ok) {
      events.push({ type: 'room.rejected', roomId: message.roomId, peerId: basic.peerId, reason: 'malformed', at: now() })
      return { ok: false, roomId: message.roomId, peerId: basic.peerId, events, error: 'malformed' }
    }

    if (input.requireToken) {
      const validation = validateUraiXrRoomSession({ token: message.token ?? '', requiredScope: scopeForMessage(message), roomId: message.roomId, peerId: basic.peerId, now: now() })
      if (!validation.ok) {
        events.push({ type: 'room.rejected', roomId: message.roomId, peerId: basic.peerId, reason: validation.reason ?? 'unauthorized', at: now() })
        return { ok: false, roomId: message.roomId, peerId: basic.peerId, events, error: validation.reason ?? 'unauthorized', rotateToken: validation.reason === 'rotation_required' }
      }
    }

    const shard = selectUraiXrShard(message.roomId)
    const existing = await getOrCreateXrSnapshot(input.persistence, message.roomId)
    const next = reduceWorldSnapshot(existing, message)
    await input.persistence.append(message.roomId, message)
    await input.persistence.set(message.roomId, next)
    events.push({ type: 'room.reduced', roomId: message.roomId, messageType: message.type, version: next.version, at: now() })
    events.push({ type: 'room.persisted', roomId: message.roomId, version: next.version, at: now() })

    if (message.type === 'join') {
      await sfu.joinPeer(message.roomId, message.peerId, { region: shard.region, now: now() })
      events.push({ type: 'room.joined', roomId: message.roomId, peerId: message.peerId, at: now() })
    }

    if (message.type === 'leave') {
      await sfu.leavePeer(message.roomId, message.peerId)
      events.push({ type: 'room.left', roomId: message.roomId, peerId: message.peerId, at: now() })
    }

    if (message.type === 'voice') {
      await sfu.publishTrack({ roomId: message.roomId, peerId: message.from, kind: 'audio', purpose: 'spatial-voice', priority: 'critical', spatialPosition: message.position })
    }

    if (message.type === 'telemetry') {
      await sfu.publishTrack({ roomId: message.roomId, peerId: message.peerId, kind: 'data', purpose: 'telemetry', priority: 'low' })
    }

    const sfuRoom = await sfu.getRoom(message.roomId)
    if (sfuRoom && sfuRoom.peers[basic.peerId]) {
      const tracks = selectUraiXrSfuTracksForPeer(sfuRoom, basic.peerId)
      if (tracks.length) await sfu.subscribe(basic.peerId, message.roomId, tracks.map((track) => track.trackId))
      events.push({ type: 'room.sfu_updated', roomId: message.roomId, peers: Object.keys(sfuRoom.peers).length, tracks: Object.keys(sfuRoom.tracks).length, degraded: sfuRoom.degraded, at: now() })
    }

    const replicationPlan = buildUraiXrReplicationPlan({ snapshot: next, localPeerId: basic.peerId })
    events.push({ type: 'room.replication_planned', roomId: message.roomId, largeRoomMode: replicationPlan.largeRoomMode, peers: replicationPlan.peers.length, at: now() })

    return {
      ok: true,
      roomId: message.roomId,
      peerId: basic.peerId,
      snapshot: next,
      peerSnapshot: pruneUraiXrSnapshotForPeer(next, replicationPlan, basic.peerId),
      replicationPlan,
      sfuRoom: await sfu.getRoom(message.roomId),
      events,
    }
  }

  return { persistence: input.persistence, sfu, handle, observe }
}
