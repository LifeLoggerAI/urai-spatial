export type UraiXrRegion = 'iad' | 'sfo' | 'fra' | 'sin' | 'local'
export type UraiXrMediaRole = 'signal' | 'turn' | 'sfu' | 'persistence' | 'observer'
export type UraiXrShardStrategy = 'room-hash' | 'region-affinity' | 'load-aware'

export type UraiXrTurnDeployment = {
  urls: string[]
  usernameEnv: string
  credentialEnv: string
  ttlSeconds: number
  region: UraiXrRegion
}

export type UraiXrSfuDeployment = {
  provider: 'mediasoup' | 'livekit' | 'ion-sfu' | 'adapter'
  endpointEnv: string
  apiKeyEnv: string
  apiSecretEnv: string
  maxPublishersPerRoom: number
  maxSubscribersPerRoom: number
  simulcast: boolean
  audioOnlyFallback: boolean
}

export type UraiXrReplicationShard = {
  shardId: string
  region: UraiXrRegion
  strategy: UraiXrShardStrategy
  maxRooms: number
  maxPeersPerRoom: number
  persistenceDriver: 'redis' | 'postgres'
}

export type UraiXrDeploymentTopology = {
  service: 'urai-spatial-xr'
  roles: UraiXrMediaRole[]
  turn: UraiXrTurnDeployment[]
  sfu: UraiXrSfuDeployment
  shards: UraiXrReplicationShard[]
  observability: {
    metricsNamespace: string
    tracesEnabled: boolean
    roomLifecycleEvents: boolean
    persistenceHealthEvents: boolean
    syncHealthEvents: boolean
  }
}

export const URAI_XR_DEPLOYMENT_TOPOLOGY: UraiXrDeploymentTopology = {
  service: 'urai-spatial-xr',
  roles: ['signal', 'turn', 'sfu', 'persistence', 'observer'],
  turn: [
    { urls: ['turns:turn-iad.urai.internal:5349'], usernameEnv: 'URAI_XR_TURN_USERNAME', credentialEnv: 'URAI_XR_TURN_CREDENTIAL', ttlSeconds: 3600, region: 'iad' },
    { urls: ['turns:turn-sfo.urai.internal:5349'], usernameEnv: 'URAI_XR_TURN_USERNAME', credentialEnv: 'URAI_XR_TURN_CREDENTIAL', ttlSeconds: 3600, region: 'sfo' },
  ],
  sfu: {
    provider: 'adapter',
    endpointEnv: 'URAI_XR_SFU_ENDPOINT',
    apiKeyEnv: 'URAI_XR_SFU_API_KEY',
    apiSecretEnv: 'URAI_XR_SFU_API_SECRET',
    maxPublishersPerRoom: 16,
    maxSubscribersPerRoom: 64,
    simulcast: true,
    audioOnlyFallback: true,
  },
  shards: [
    { shardId: 'xr-iad-a', region: 'iad', strategy: 'room-hash', maxRooms: 2000, maxPeersPerRoom: 64, persistenceDriver: 'redis' },
    { shardId: 'xr-sfo-a', region: 'sfo', strategy: 'room-hash', maxRooms: 2000, maxPeersPerRoom: 64, persistenceDriver: 'redis' },
  ],
  observability: {
    metricsNamespace: 'urai.xr',
    tracesEnabled: true,
    roomLifecycleEvents: true,
    persistenceHealthEvents: true,
    syncHealthEvents: true,
  },
}

export function selectUraiXrShard(roomId: string, topology: UraiXrDeploymentTopology = URAI_XR_DEPLOYMENT_TOPOLOGY) {
  const hash = [...roomId].reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return topology.shards[hash % topology.shards.length]
}

export function buildUraiXrTurnIceServers(env: Record<string, string | undefined> = process.env, topology: UraiXrDeploymentTopology = URAI_XR_DEPLOYMENT_TOPOLOGY) {
  const username = env.URAI_XR_TURN_USERNAME
  const credential = env.URAI_XR_TURN_CREDENTIAL
  if (!username || !credential) return [{ urls: ['stun:stun.l.google.com:19302'] }]
  return topology.turn.map((turn) => ({ urls: turn.urls, username, credential }))
}
