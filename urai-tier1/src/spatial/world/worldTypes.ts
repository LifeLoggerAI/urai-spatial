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
  replayManifestId?: string
  privacyMode?: UraiPrivacyMode
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
    | 'replayManifestId'
    | 'privacyMode'
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
