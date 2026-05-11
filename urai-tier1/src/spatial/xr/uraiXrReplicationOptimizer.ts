import type { UraiXrFrameTelemetry, UraiXrPoseSnapshot, UraiXrWorldSnapshot } from './uraiXrProductionRuntime'

export type UraiXrReplicationQuality = 'realtime' | 'balanced' | 'constrained' | 'observer'

export type UraiXrInterestRegion = {
  id: string
  center: [number, number, number]
  radiusMeters: number
  priority: number
}

export type UraiXrPeerReplicationState = {
  peerId: string
  pose: UraiXrPoseSnapshot
  quality: UraiXrReplicationQuality
  subscribedRegions: string[]
  maxHz: 10 | 20 | 30 | 60
  includeVoice: boolean
  includeControllers: boolean
}

export type UraiXrReplicationPlan = {
  roomId: string
  peers: UraiXrPeerReplicationState[]
  droppedPeerIds: string[]
  updateBudgetHz: number
  largeRoomMode: boolean
}

function distance(a: [number, number, number], b: [number, number, number]) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
}

export const URAI_XR_DEFAULT_INTEREST_REGIONS: UraiXrInterestRegion[] = [
  { id: 'home-orb', center: [0, 1.55, -2.4], radiusMeters: 5.5, priority: 1 },
  { id: 'life-map-entry', center: [0, 0.04, -2.4], radiusMeters: 4.8, priority: 0.8 },
  { id: 'safe-return', center: [0, 0.04, 0], radiusMeters: 3.2, priority: 0.6 },
]

export function buildUraiXrReplicationPlan(input: {
  snapshot: UraiXrWorldSnapshot
  localPeerId?: string
  telemetry?: Record<string, UraiXrFrameTelemetry>
  regions?: UraiXrInterestRegion[]
  maxPeersRealtime?: number
}): UraiXrReplicationPlan {
  const regions = input.regions ?? URAI_XR_DEFAULT_INTEREST_REGIONS
  const peerEntries = Object.entries(input.snapshot.peers)
  const largeRoomMode = peerEntries.length > (input.maxPeersRealtime ?? 24)
  const peers = peerEntries.map(([peerId, pose]) => {
    const peerRegions = regions.filter((region) => distance(pose.position, region.center) <= region.radiusMeters).sort((a, b) => b.priority - a.priority)
    const telemetry = input.telemetry?.[peerId] ?? input.snapshot.telemetry[peerId]
    const degraded = Boolean(telemetry && (telemetry.fps < 68 || telemetry.droppedFrames > 3))
    const observer = peerRegions.length === 0 || (largeRoomMode && peerId !== input.localPeerId && peerRegions[0]?.priority < 0.75)
    const quality: UraiXrReplicationQuality = observer ? 'observer' : degraded ? 'constrained' : largeRoomMode ? 'balanced' : 'realtime'
    return {
      peerId,
      pose,
      quality,
      subscribedRegions: peerRegions.map((region) => region.id),
      maxHz: quality === 'realtime' ? 60 : quality === 'balanced' ? 30 : quality === 'constrained' ? 20 : 10,
      includeVoice: quality !== 'observer',
      includeControllers: quality === 'realtime' || quality === 'balanced',
    } satisfies UraiXrPeerReplicationState
  })

  return {
    roomId: input.snapshot.roomId,
    peers,
    droppedPeerIds: peers.filter((peer) => peer.quality === 'observer' && peer.subscribedRegions.length === 0).map((peer) => peer.peerId),
    updateBudgetHz: largeRoomMode ? 30 : 60,
    largeRoomMode,
  }
}

export function pruneUraiXrSnapshotForPeer(snapshot: UraiXrWorldSnapshot, plan: UraiXrReplicationPlan, peerId: string): UraiXrWorldSnapshot {
  const allowed = new Set(plan.peers.filter((peer) => peer.peerId === peerId || peer.quality !== 'observer' || peer.subscribedRegions.length > 0).map((peer) => peer.peerId))
  return {
    ...snapshot,
    peers: Object.fromEntries(Object.entries(snapshot.peers).filter(([id]) => allowed.has(id))),
    voice: Object.fromEntries(Object.entries(snapshot.voice).filter(([id]) => allowed.has(id))),
    telemetry: Object.fromEntries(Object.entries(snapshot.telemetry).filter(([id]) => allowed.has(id))),
  }
}
