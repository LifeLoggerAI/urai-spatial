import type { UraiXrRegion } from './uraiXrDeploymentTopology'

export type UraiXrSfuRoomId = string
export type UraiXrSfuPeerId = string

export type UraiXrSfuTrackKind = 'audio' | 'video' | 'data'
export type UraiXrSfuTrackPurpose = 'spatial-voice' | 'headset-video' | 'world-sync' | 'telemetry'

export type UraiXrSfuPeer = {
  peerId: UraiXrSfuPeerId
  roomId: UraiXrSfuRoomId
  region: UraiXrRegion
  joinedAt: number
  lastSeenAt: number
  subscribedTrackIds: string[]
  publishedTrackIds: string[]
}

export type UraiXrSfuTrack = {
  trackId: string
  peerId: UraiXrSfuPeerId
  roomId: UraiXrSfuRoomId
  kind: UraiXrSfuTrackKind
  purpose: UraiXrSfuTrackPurpose
  priority: 'critical' | 'high' | 'normal' | 'low'
  spatialPosition?: [number, number, number]
  createdAt: number
}

export type UraiXrSfuRoomState = {
  roomId: UraiXrSfuRoomId
  region: UraiXrRegion
  peers: Record<UraiXrSfuPeerId, UraiXrSfuPeer>
  tracks: Record<string, UraiXrSfuTrack>
  maxPeers: number
  degraded: boolean
  updatedAt: number
}

export type UraiXrSfuAdapter = {
  name: 'mediasoup' | 'livekit' | 'ion-sfu' | 'in-memory-adapter'
  createRoom(roomId: UraiXrSfuRoomId, options: { region: UraiXrRegion; maxPeers: number }): Promise<UraiXrSfuRoomState>
  getRoom(roomId: UraiXrSfuRoomId): Promise<UraiXrSfuRoomState | undefined>
  joinPeer(roomId: UraiXrSfuRoomId, peerId: UraiXrSfuPeerId, options: { region: UraiXrRegion; now?: number }): Promise<UraiXrSfuPeer>
  leavePeer(roomId: UraiXrSfuRoomId, peerId: UraiXrSfuPeerId): Promise<void>
  publishTrack(track: Omit<UraiXrSfuTrack, 'trackId' | 'createdAt'> & { trackId?: string; createdAt?: number }): Promise<UraiXrSfuTrack>
  subscribe(peerId: UraiXrSfuPeerId, roomId: UraiXrSfuRoomId, trackIds: string[]): Promise<UraiXrSfuPeer>
}

export function createInMemoryUraiXrSfuAdapter(): UraiXrSfuAdapter {
  const rooms = new Map<string, UraiXrSfuRoomState>()

  return {
    name: 'in-memory-adapter',
    async createRoom(roomId, options) {
      const room: UraiXrSfuRoomState = {
        roomId,
        region: options.region,
        peers: {},
        tracks: {},
        maxPeers: options.maxPeers,
        degraded: false,
        updatedAt: Date.now(),
      }
      rooms.set(roomId, room)
      return room
    },
    async getRoom(roomId) {
      return rooms.get(roomId)
    },
    async joinPeer(roomId, peerId, options) {
      const room = rooms.get(roomId) ?? (await this.createRoom(roomId, { region: options.region, maxPeers: 64 }))
      const now = options.now ?? Date.now()
      const peer: UraiXrSfuPeer = { peerId, roomId, region: options.region, joinedAt: now, lastSeenAt: now, subscribedTrackIds: [], publishedTrackIds: [] }
      room.peers[peerId] = peer
      room.degraded = Object.keys(room.peers).length > Math.floor(room.maxPeers * 0.8)
      room.updatedAt = now
      return peer
    },
    async leavePeer(roomId, peerId) {
      const room = rooms.get(roomId)
      if (!room) return
      delete room.peers[peerId]
      room.tracks = Object.fromEntries(Object.entries(room.tracks).filter(([, track]) => track.peerId !== peerId))
      room.updatedAt = Date.now()
    },
    async publishTrack(trackInput) {
      const room = rooms.get(trackInput.roomId) ?? (await this.createRoom(trackInput.roomId, { region: 'local', maxPeers: 64 }))
      const track: UraiXrSfuTrack = { ...trackInput, trackId: trackInput.trackId ?? `${trackInput.peerId}:${trackInput.purpose}:${Date.now()}`, createdAt: trackInput.createdAt ?? Date.now() }
      room.tracks[track.trackId] = track
      const peer = room.peers[track.peerId]
      if (peer && !peer.publishedTrackIds.includes(track.trackId)) peer.publishedTrackIds.push(track.trackId)
      room.updatedAt = Date.now()
      return track
    },
    async subscribe(peerId, roomId, trackIds) {
      const room = rooms.get(roomId)
      if (!room?.peers[peerId]) throw new Error(`Cannot subscribe missing XR SFU peer ${peerId} in room ${roomId}`)
      room.peers[peerId].subscribedTrackIds = Array.from(new Set([...room.peers[peerId].subscribedTrackIds, ...trackIds]))
      room.peers[peerId].lastSeenAt = Date.now()
      room.updatedAt = Date.now()
      return room.peers[peerId]
    },
  }
}

export function selectUraiXrSfuTracksForPeer(room: UraiXrSfuRoomState, peerId: string) {
  const peer = room.peers[peerId]
  if (!peer) return []
  const tracks = Object.values(room.tracks).filter((track) => track.peerId !== peerId)
  return tracks.sort((a, b) => {
    const priority = { critical: 4, high: 3, normal: 2, low: 1 }
    return priority[b.priority] - priority[a.priority]
  }).slice(0, room.degraded ? 24 : 96)
}
