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
] as const

export type UraiDestination = (typeof URAI_DESTINATIONS)[number]

export type UraiWorldLayer = 'living-world' | 'transition' | 'infrastructure-world'

export type UraiPrivacyMode = 'private' | 'revealing' | 'held-private'
export type UraiOriginRealm = 'home' | 'ground' | 'life-map' | 'focus' | 'replay' | 'passport'
export type UraiReconstructionFidelity = 'confirmed' | 'partial' | 'unknown'

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
  privacyMode?: UraiPrivacyMode
  originRealm?: UraiOriginRealm
  returnToken?: string
  reconstructionFidelity?: UraiReconstructionFidelity
  demo?: boolean
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
    | 'privacyMode'
    | 'originRealm'
    | 'returnToken'
    | 'reconstructionFidelity'
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
}
