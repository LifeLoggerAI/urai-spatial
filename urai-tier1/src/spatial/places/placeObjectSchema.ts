export type PlaceObjectType =
  | 'door'
  | 'window'
  | 'bed'
  | 'chair'
  | 'table'
  | 'lamp'
  | 'seat'
  | 'road'
  | 'tree'
  | 'water'
  | 'photo'
  | 'phone'
  | 'mirror'
  | 'threshold'
  | 'echo'
  | 'silhouette'
  | 'artifact'
  | 'portal'

export type PlaceObjectInteractionType = 'inspect' | 'replay' | 'open-portal' | 'none'
export type PlaceObjectPrivacyLevel = 'private' | 'sensitive' | 'shareable' | 'demo'

export type PlaceObject = {
  id: string
  memoryPlaceId: string
  memoryId?: string
  objectType: PlaceObjectType
  label: string
  position: [number, number, number]
  rotation?: [number, number, number]
  scale: number
  emotionalMeaning?: string
  interactionType: PlaceObjectInteractionType
  privacyLevel: PlaceObjectPrivacyLevel
}
