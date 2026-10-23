export const URAI_DESTINATIONS = [
  'home',
  'infrastructure-hub',
  'life-map',
  'mirror',
  'shadow',
  'council',
  'passport',
  'privacy-controls',
  'location-map',
  'focus',
  'replay',
  'life-movie',
  'possible-futures',
] as const

export type UraiDestination = (typeof URAI_DESTINATIONS)[number]

export type UraiWorldLayer = 'living-world' | 'transition' | 'infrastructure-world' | 'scenario-world'

export type UraiPrivacyMode = 'private' | 'revealing' | 'held-private'
export type UraiOriginRealm = 'home' | 'ground' | 'life-map' | 'focus' | 'replay' | 'passport' | 'mirror' | 'shadow' | 'council' | 'privacy-controls' | 'location-map' | 'life-movie' | 'possible-futures'
export type UraiReconstructionFidelity = 'confirmed' | 'partial' | 'unknown'
export type UraiTruthMode = 'reality' | 'memory' | 'interpretation' | 'scenario'

export type UraiWorldState = {
  destination: UraiDestination
  layer: UraiWorldLayer
  entryPortal?: string
  previousDestination?: UraiDestination
  cameraCheckpoint?: string
  memoryId?: string
  threadId?: string
  personId?: string
  placeId?: string
  eraId?: string
  replayManifestId?: string
  movieId?: string
  chapterId?: string
  privacyMode?: UraiPrivacyMode
  originRealm?: UraiOriginRealm
  returnToken?: string
  reconstructionFidelity?: UraiReconstructionFidelity
  scenarioId?: string
  scenarioBranchId?: string
  scenarioBasisRevision?: number
  truthMode?: UraiTruthMode
  scenarioOrigin?: UraiOriginRealm
  demo?: boolean
}

// Focus is the outward step between Replay and Life Map. Returning from Replay
// must not make Focus's next outward action re-enter Replay indefinitely.
export function previousDestinationForReturn(world: Pick<UraiWorldState, 'destination' | 'previousDestination'>): UraiDestination | undefined {
  // Replay always unwinds to its selected star in Focus. The route-state
  // previousDestination may be Home after a direct-link reload or a return
  // from the separate Memory World route; it is not reliable journey authority.
  // The genuine Life Movie -> Replay handoff remains a separate nested return.
  if (world.destination === 'replay') {
    return world.previousDestination === 'life-movie' ? 'life-movie' : 'focus'
  }
  if (world.destination === 'focus') return 'life-map'
  return world.previousDestination
}

export type UraiWorldContextPatch = Partial<
  Pick<
    UraiWorldState,
    | 'entryPortal'
    | 'cameraCheckpoint'
    | 'memoryId'
    | 'threadId'
    | 'personId'
    | 'placeId'
    | 'eraId'
    | 'replayManifestId'
    | 'movieId'
    | 'chapterId'
    | 'privacyMode'
    | 'originRealm'
    | 'returnToken'
    | 'reconstructionFidelity'
    | 'scenarioId'
    | 'scenarioBranchId'
    | 'scenarioBasisRevision'
    | 'truthMode'
    | 'scenarioOrigin'
    | 'demo'
  >
>

export type UraiWorldTravelRequest = {
  destination: UraiDestination
  entryPortal?: string
  cameraCheckpoint?: string
  href?: string
  context?: UraiWorldContextPatch
}

export const INITIAL_URAI_WORLD_STATE: UraiWorldState = {
  destination: 'home',
  layer: 'living-world',
  privacyMode: 'private',
  truthMode: 'reality',
}
