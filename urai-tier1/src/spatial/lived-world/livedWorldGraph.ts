export type ConsentTier = 'C0' | 'C1' | 'C2' | 'C3' | 'C4' | 'C5' | 'C6' | 'C7' | 'C8'
export type ConsentStatus = 'granted' | 'denied' | 'revoked' | 'expired' | 'missing'
export type ReconstructionFidelity = 'confirmed' | 'partial' | 'unknown'
export type ProvenanceClass = 'recorded' | 'imported' | 'user-confirmed' | 'derived' | 'generated-context' | 'disputed'
export type LivedWorldVisibility = 'private' | 'user-approved' | 'suppressed'
export type PersonPresenceMode = 'recognizable' | 'partial' | 'silhouette' | 'voice-only' | 'environmental-trace' | 'memory-specific' | 'unavailable'

export type LivedWorldEntityKind =
  | 'user'
  | 'place'
  | 'building'
  | 'room'
  | 'vehicle-place'
  | 'route'
  | 'object'
  | 'person-presence'
  | 'memory'
  | 'event'
  | 'era'
  | 'environment'
  | 'emotional-association'

export type LivedWorldSource = {
  id: string
  provenance: ProvenanceClass
  sourceType: 'photo' | 'video' | 'audio' | 'scan' | 'map' | 'device-location' | 'location-history' | 'user-statement' | 'connected-source' | 'replay-source' | 'system-derived'
  sourceTime?: string
  capturedAt?: string
  checksum?: string
  locator?: string
  transformations: readonly string[]
  disputed?: boolean
}

export type ConsentDecisionSnapshot = {
  purpose: string
  tier: ConsentTier
  status: ConsentStatus
  policyVersion?: string
  evaluatedAt?: string
}

export type LivedWorldPrivacyAuthority = {
  requiredPurposes: readonly string[]
  consentTiers: readonly ConsentTier[]
  thirdPartyPresent: boolean
  exactLocationAllowed: boolean
  biometricIdentityAllowed: boolean
  sensitiveInferenceAllowed: boolean
  publicContributionAllowed: boolean
}

export type ReconstructionAuthority = {
  fidelity: ReconstructionFidelity
  confidence: number
  sourceIds: readonly string[]
  privacy: LivedWorldPrivacyAuthority
  visibility: LivedWorldVisibility
  userCorrectionRevision: number
  lastConfirmedAt?: string
}

export type LivedWorldBaseEntity = {
  id: string
  kind: LivedWorldEntityKind
  label: string
  eraIds: readonly string[]
  sourceIds: readonly string[]
  reconstruction: ReconstructionAuthority
  semanticImportance: number
}

export type PlaceEntity = LivedWorldBaseEntity & {
  kind: 'place'
  placeType: 'home' | 'workplace' | 'school' | 'hospital' | 'family-home' | 'neighborhood' | 'store' | 'office' | 'park' | 'community' | 'travel' | 'outdoor' | 'other'
  geographicPrecision: 'none' | 'coarse' | 'city' | 'approximate' | 'exact-private'
  parentPlaceId?: string
  buildingIds: readonly string[]
  routeIds: readonly string[]
}

export type BuildingEntity = LivedWorldBaseEntity & {
  kind: 'building'
  placeId: string
  roomIds: readonly string[]
  geometryRef?: string
}

export type RoomEntity = LivedWorldBaseEntity & {
  kind: 'room'
  buildingId: string
  geometryRef?: string
  knownSurfaceIds: readonly string[]
}

export type VehiclePlaceEntity = LivedWorldBaseEntity & {
  kind: 'vehicle-place'
  vehicleType: 'car' | 'truck' | 'motorcycle' | 'bicycle' | 'boat' | 'aircraft' | 'transit' | 'other'
  routeIds: readonly string[]
  memoryIds: readonly string[]
  geometryRef?: string
}

export type RouteEntity = LivedWorldBaseEntity & {
  kind: 'route'
  fromEntityId?: string
  toEntityId?: string
  geographicPrecision: 'none' | 'coarse' | 'approximate' | 'exact-private'
  memoryIds: readonly string[]
}

export type ObjectEntity = LivedWorldBaseEntity & {
  kind: 'object'
  objectClass: string
  containerEntityId?: string
  geometryRef?: string
  memoryIds: readonly string[]
}

export type PersonPresenceEntity = LivedWorldBaseEntity & {
  kind: 'person-presence'
  relationship?: string
  associatedEntityIds: readonly string[]
  memoryIds: readonly string[]
  renderingMode: PersonPresenceMode
  likenessAuthority: 'explicit' | 'memory-context-only' | 'restricted' | 'none'
  voiceAuthority: 'explicit' | 'recorded-source-only' | 'restricted' | 'none'
  thirdParty: boolean
  minorOrDependent: boolean
  griefOrLegacySensitive: boolean
  autonomousDialogueAllowed: false
}

export type MemoryEntity = LivedWorldBaseEntity & {
  kind: 'memory'
  placeIds: readonly string[]
  personPresenceIds: readonly string[]
  objectIds: readonly string[]
  eventIds: readonly string[]
  replaySourceIds: readonly string[]
  occurredAt?: string
}

export type EventEntity = LivedWorldBaseEntity & {
  kind: 'event'
  memoryIds: readonly string[]
  placeIds: readonly string[]
  occurredAt?: string
}

export type EraEntity = LivedWorldBaseEntity & {
  kind: 'era'
  startsAt?: string
  endsAt?: string
}

export type EnvironmentEntity = LivedWorldBaseEntity & {
  kind: 'environment'
  placeId?: string
  environmentType: 'interior' | 'exterior' | 'weather' | 'season' | 'soundscape' | 'other'
}

export type EmotionalAssociationEntity = LivedWorldBaseEntity & {
  kind: 'emotional-association'
  targetEntityIds: readonly string[]
  language: 'possible-signal' | 'pattern' | 'pressure' | 'calm' | 'mist' | 'turbulence' | 'recovery' | 'clearing'
  inferencePurpose: 'inference.sensitive'
}

export type UserEntity = LivedWorldBaseEntity & {
  kind: 'user'
}

export type LivedWorldEntity =
  | UserEntity
  | PlaceEntity
  | BuildingEntity
  | RoomEntity
  | VehiclePlaceEntity
  | RouteEntity
  | ObjectEntity
  | PersonPresenceEntity
  | MemoryEntity
  | EventEntity
  | EraEntity
  | EnvironmentEntity
  | EmotionalAssociationEntity

export type LivedWorldEdgeType = 'contains' | 'located-at' | 'traveled-by' | 'associated-with' | 'remembered-at' | 'occurred-during' | 'participated-in' | 'autobiographically-adjacent'

export type LivedWorldEdge = {
  id: string
  from: string
  to: string
  type: LivedWorldEdgeType
  confidence: number
  sourceIds: readonly string[]
}

export type LivedWorldGraph = {
  schemaVersion: 'urai-lived-world-1'
  ownerId: string
  generatedAt: string
  sourcePolicyVersion: string
  sources: Record<string, LivedWorldSource>
  entities: Record<string, LivedWorldEntity>
  edges: readonly LivedWorldEdge[]
}

const clampConfidence = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0))

export function isSourceBacked(entity: LivedWorldEntity, graph: LivedWorldGraph) {
  if (entity.reconstruction.fidelity !== 'confirmed') return false
  if (!entity.reconstruction.sourceIds.length) return false
  return entity.reconstruction.sourceIds.every((id) => Boolean(graph.sources[id]) && graph.sources[id].provenance !== 'generated-context')
}

export function placesForUser(graph: LivedWorldGraph): PlaceEntity[] {
  return Object.values(graph.entities).filter((entity): entity is PlaceEntity => entity.kind === 'place')
}

export function memoriesForEntity(graph: LivedWorldGraph, entityId: string): MemoryEntity[] {
  const memoryIds = new Set<string>()
  for (const edge of graph.edges) {
    if (edge.from === entityId && edge.type === 'remembered-at') memoryIds.add(edge.to)
    if (edge.to === entityId && edge.type === 'remembered-at') memoryIds.add(edge.from)
  }
  return [...memoryIds]
    .map((id) => graph.entities[id])
    .filter((entity): entity is MemoryEntity => Boolean(entity) && entity.kind === 'memory')
}

export function normalizeReconstructionAuthority(authority: ReconstructionAuthority): ReconstructionAuthority {
  return {
    ...authority,
    confidence: clampConfidence(authority.confidence),
    sourceIds: [...new Set(authority.sourceIds)],
    userCorrectionRevision: Math.max(0, Math.floor(authority.userCorrectionRevision || 0)),
  }
}

export function validateLivedWorldGraph(graph: LivedWorldGraph): readonly string[] {
  const errors: string[] = []
  if (graph.schemaVersion !== 'urai-lived-world-1') errors.push('UNSUPPORTED_SCHEMA')
  if (!graph.ownerId) errors.push('OWNER_REQUIRED')

  for (const [id, entity] of Object.entries(graph.entities)) {
    if (id !== entity.id) errors.push(`ENTITY_KEY_MISMATCH:${id}`)
    if (entity.reconstruction.confidence < 0 || entity.reconstruction.confidence > 1) errors.push(`INVALID_CONFIDENCE:${id}`)
    for (const sourceId of entity.sourceIds) if (!graph.sources[sourceId]) errors.push(`MISSING_SOURCE:${id}:${sourceId}`)
    for (const sourceId of entity.reconstruction.sourceIds) if (!graph.sources[sourceId]) errors.push(`MISSING_RECONSTRUCTION_SOURCE:${id}:${sourceId}`)
    if (entity.reconstruction.fidelity === 'confirmed' && entity.reconstruction.sourceIds.length === 0) errors.push(`CONFIRMED_WITHOUT_SOURCE:${id}`)
    if (entity.kind === 'person-presence' && entity.autonomousDialogueAllowed !== false) errors.push(`PERSON_AUTONOMOUS_DIALOGUE_FORBIDDEN:${id}`)
    if (entity.kind === 'emotional-association' && !entity.reconstruction.privacy.consentTiers.includes('C4')) errors.push(`SENSITIVE_INFERENCE_REQUIRES_C4:${id}`)
  }

  for (const edge of graph.edges) {
    if (!graph.entities[edge.from]) errors.push(`EDGE_FROM_MISSING:${edge.id}`)
    if (!graph.entities[edge.to]) errors.push(`EDGE_TO_MISSING:${edge.id}`)
    if (edge.confidence < 0 || edge.confidence > 1) errors.push(`EDGE_CONFIDENCE_INVALID:${edge.id}`)
    for (const sourceId of edge.sourceIds) if (!graph.sources[sourceId]) errors.push(`EDGE_SOURCE_MISSING:${edge.id}:${sourceId}`)
  }

  return errors
}
