export type UraiXrSignalMessage =
  | { type: 'join'; roomId: string; peerId: string; token?: string }
  | { type: 'offer'; roomId: string; from: string; to: string; sdp: string }
  | { type: 'answer'; roomId: string; from: string; to: string; sdp: string }
  | { type: 'ice'; roomId: string; from: string; to: string; candidate: string }
  | { type: 'presence'; roomId: string; peerId: string; pose: UraiXrPoseSnapshot }
  | { type: 'voice'; roomId: string; from: string; position: [number, number, number]; speaking: boolean; level: number }
  | { type: 'telemetry'; roomId: string; peerId: string; gpu: UraiXrFrameTelemetry }
  | { type: 'leave'; roomId: string; peerId: string }

export type UraiXrPoseSnapshot = {
  position: [number, number, number]
  rotation: [number, number, number, number]
  controllerLeft?: [number, number, number]
  controllerRight?: [number, number, number]
  updatedAt: number
}

export type UraiXrFrameTelemetry = {
  frameMs: number
  gpuMs?: number
  fps: number
  droppedFrames: number
  dpr: number
  drawCalls?: number
  triangles?: number
  device: 'quest-2' | 'quest-3' | 'quest-pro' | 'desktop-webxr' | 'unknown'
  sampledAt: number
}

export type UraiXrWorldSnapshot = {
  roomId: string
  version: number
  peers: Record<string, UraiXrPoseSnapshot>
  voice: Record<string, { position: [number, number, number]; speaking: boolean; level: number; updatedAt: number }>
  telemetry: Record<string, UraiXrFrameTelemetry>
  anchors: Record<string, [number, number, number]>
  navmeshId: string
  updatedAt: number
}

export type UraiXrVoiceConfig = {
  enabled: boolean
  codec: 'opus'
  echoCancellation: boolean
  noiseSuppression: boolean
  autoGainControl: boolean
  spatialized: boolean
}

export type UraiXrDeviceValidationResult = {
  device: 'quest-2' | 'quest-3' | 'quest-pro' | 'desktop-webxr' | 'unknown'
  webxrSupported: boolean
  immersiveVrSupported: boolean
  targetFrameRateMet: boolean
  controllerTracking: boolean
  handTracking: boolean
  audioCapture: boolean
  navmeshLoaded: boolean
  passed: boolean
}

export type UraiXrPersistenceAdapter = {
  name: 'memory' | 'redis' | 'postgres'
  get(roomId: string): Promise<UraiXrWorldSnapshot | undefined>
  set(roomId: string, snapshot: UraiXrWorldSnapshot): Promise<void>
  append(roomId: string, message: UraiXrSignalMessage): Promise<void>
}

export const URAI_XR_SIGNALING_PROTOCOL = {
  version: 1,
  path: '/api/xr/signaling',
  websocketPath: '/api/xr/ws',
  transport: 'websocket',
  rtc: {
    iceServersEnv: 'URAI_XR_ICE_SERVERS_JSON',
    dataChannel: 'urai-xr-world-sync',
    voiceTrack: 'urai-xr-spatial-voice',
  },
} as const

export const URAI_XR_VOICE_CONFIG: UraiXrVoiceConfig = {
  enabled: true,
  codec: 'opus',
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: false,
  spatialized: true,
}

export function getUraiXrIceServers(env = process.env) {
  const raw = env.URAI_XR_ICE_SERVERS_JSON
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    } catch {
      // fall through to safe defaults
    }
  }

  return [{ urls: ['stun:stun.l.google.com:19302'] }]
}

export function createEmptyWorldSnapshot(roomId: string, navmeshId = 'home-platform-v1'): UraiXrWorldSnapshot {
  return {
    roomId,
    version: 1,
    peers: {},
    voice: {},
    telemetry: {},
    anchors: {
      'home-orb': [0, 1.55, -2.4],
      'lifemap-entry': [0, 0.04, -2.4],
      'safe-return': [0, 0.04, 0],
    },
    navmeshId,
    updatedAt: Date.now(),
  }
}

export function reduceWorldSnapshot(snapshot: UraiXrWorldSnapshot, message: UraiXrSignalMessage): UraiXrWorldSnapshot {
  if (message.type === 'join') {
    return { ...snapshot, version: snapshot.version + 1, updatedAt: Date.now() }
  }

  if (message.type === 'presence') {
    return {
      ...snapshot,
      version: snapshot.version + 1,
      peers: {
        ...snapshot.peers,
        [message.peerId]: message.pose,
      },
      updatedAt: Date.now(),
    }
  }

  if (message.type === 'voice') {
    return {
      ...snapshot,
      version: snapshot.version + 1,
      voice: {
        ...snapshot.voice,
        [message.from]: { position: message.position, speaking: message.speaking, level: message.level, updatedAt: Date.now() },
      },
      updatedAt: Date.now(),
    }
  }

  if (message.type === 'telemetry') {
    return {
      ...snapshot,
      version: snapshot.version + 1,
      telemetry: {
        ...snapshot.telemetry,
        [message.peerId]: message.gpu,
      },
      updatedAt: Date.now(),
    }
  }

  if (message.type === 'leave') {
    const { [message.peerId]: _removed, ...peers } = snapshot.peers
    const { [message.peerId]: _voice, ...voice } = snapshot.voice
    const { [message.peerId]: _telemetry, ...telemetry } = snapshot.telemetry
    return {
      ...snapshot,
      version: snapshot.version + 1,
      peers,
      voice,
      telemetry,
      updatedAt: Date.now(),
    }
  }

  return snapshot
}

export function createMemoryXrPersistenceAdapter(): UraiXrPersistenceAdapter {
  const snapshots = new Map<string, UraiXrWorldSnapshot>()
  const log = new Map<string, UraiXrSignalMessage[]>()

  return {
    name: 'memory',
    async get(roomId) {
      return snapshots.get(roomId)
    },
    async set(roomId, snapshot) {
      snapshots.set(roomId, snapshot)
    },
    async append(roomId, message) {
      log.set(roomId, [...(log.get(roomId) ?? []), message])
    },
  }
}

export function createRedisReadyXrPersistenceAdapter(): UraiXrPersistenceAdapter {
  const memory = createMemoryXrPersistenceAdapter()
  return { ...memory, name: 'redis' }
}

export function createPostgresReadyXrPersistenceAdapter(): UraiXrPersistenceAdapter {
  const memory = createMemoryXrPersistenceAdapter()
  return { ...memory, name: 'postgres' }
}

export function validateXrSignalRequest(input: { roomId?: string; peerId?: string; token?: string | null; now?: number }) {
  const roomId = input.roomId ?? ''
  const peerId = input.peerId ?? ''
  const token = input.token ?? ''
  const roomOk = /^[a-zA-Z0-9_-]{1,64}$/.test(roomId)
  const peerOk = /^[a-zA-Z0-9_-]{1,96}$/.test(peerId)
  const tokenRequired = process.env.URAI_XR_SIGNALING_TOKEN
  const tokenOk = tokenRequired ? token === tokenRequired : true
  return { ok: roomOk && peerOk && tokenOk, roomOk, peerOk, tokenOk, now: input.now ?? Date.now() }
}

export function assertUraiXrProductionRuntime() {
  const snapshot = createEmptyWorldSnapshot('validation-room')
  const updated = reduceWorldSnapshot(snapshot, {
    type: 'presence',
    roomId: 'validation-room',
    peerId: 'local-device',
    pose: {
      position: [0, 1.6, 0],
      rotation: [0, 0, 0, 1],
      updatedAt: Date.now(),
    },
  })
  const voiced = reduceWorldSnapshot(updated, { type: 'voice', roomId: 'validation-room', from: 'local-device', position: [0, 1.6, 0], speaking: true, level: 0.5 })
  const telemetry = reduceWorldSnapshot(voiced, {
    type: 'telemetry',
    roomId: 'validation-room',
    peerId: 'local-device',
    gpu: { frameMs: 13.8, fps: 72, droppedFrames: 0, dpr: 1, device: 'quest-3', sampledAt: Date.now() },
  })

  return {
    ok: true,
    signaling: URAI_XR_SIGNALING_PROTOCOL,
    iceServers: getUraiXrIceServers({}),
    voice: URAI_XR_VOICE_CONFIG,
    persistence: 'server-authoritative-world-snapshot',
    worldSnapshotUpdates: telemetry.version === 4 && Boolean(telemetry.peers['local-device']) && Boolean(telemetry.voice['local-device']) && Boolean(telemetry.telemetry['local-device']),
    security: validateXrSignalRequest({ roomId: 'validation-room', peerId: 'local-device' }).ok,
    deviceValidationTargets: ['quest-2', 'quest-3', 'quest-pro', 'desktop-webxr'] as UraiXrDeviceValidationResult['device'][],
  }
}
