export type MemoryPlaceKind = 'real' | 'symbolic' | 'hybrid'

export type MemoryPlaceCategory =
  | 'home'
  | 'bedroom'
  | 'street'
  | 'car'
  | 'school'
  | 'workplace'
  | 'hospital'
  | 'restaurant'
  | 'airport'
  | 'nature'
  | 'water'
  | 'hotel'
  | 'office'
  | 'event'
  | 'unknown'

export type MemoryPlaceLocationPrivacy =
  | 'hidden'
  | 'symbolic-only'
  | 'city-only'
  | 'approx-private'
  | 'exact-private'
  | 'exact-share-opt-in'

export type MemoryPlacePrivacyLevel = 'private' | 'sensitive' | 'shareable' | 'demo'
export type MemoryPlaceCameraMode = 'walk' | 'float' | 'cinematic' | 'orbit'

export type MemoryPlace = {
  id: string
  userId: string | null
  title: string
  memoryIds: string[]
  kind: MemoryPlaceKind
  category: MemoryPlaceCategory
  locationPrivacy: MemoryPlaceLocationPrivacy
  reconstruction: {
    scenePreset: string
    layoutPreset: string
    terrainPreset: string
    skyPreset: string
    weatherPreset: string
    lightingPreset: string
    soundPreset: string
    objectPackIds: string[]
  }
  emotionalOverlay: {
    mood: string
    intensity: number
    auraColor: string
    fogLevel: number
    distortionLevel: number
    bloomLevel: number
    memoryEchoLevel: number
  }
  navigation: {
    spawnPoint: [number, number, number]
    exitPortalPosition: [number, number, number]
    walkable: boolean
    cameraMode: MemoryPlaceCameraMode
  }
  privacyLevel: MemoryPlacePrivacyLevel
  createdAt: string
  updatedAt: string
}

export type MemoryPlaceResolution =
  | { ok: true; place: MemoryPlace; status: 200 }
  | { ok: false; status: 404 | 423; reason: string; safeHref: string }

export function isExactLocationMode(locationPrivacy: MemoryPlaceLocationPrivacy) {
  return locationPrivacy === 'exact-private' || locationPrivacy === 'exact-share-opt-in'
}

export function isDefaultSafeLocationMode(locationPrivacy: MemoryPlaceLocationPrivacy) {
  return locationPrivacy === 'hidden' || locationPrivacy === 'symbolic-only' || locationPrivacy === 'city-only' || locationPrivacy === 'approx-private'
}
