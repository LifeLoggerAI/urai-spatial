import { PlaceObject } from './placeObjectSchema'

export type MemoryPlaceLayerType = 'real' | 'emotional' | 'symbolic' | 'timeline' | 'future' | 'legacy' | 'recovery'

export type MemoryPlaceLayer = {
  id: string
  memoryPlaceId: string
  layerType: MemoryPlaceLayerType
  enabled: boolean
  scenePreset: string
  weatherPreset: string
  objectOverrides: PlaceObject[]
  narratorTone: 'quiet' | 'reflective' | 'celebratory' | 'protective'
  privacyLevel: 'private' | 'sensitive' | 'shareable' | 'demo'
}

export function defaultPlaceLayers(memoryPlaceId: string): MemoryPlaceLayer[] {
  return [
    {
      id: `${memoryPlaceId}-symbolic-layer`,
      memoryPlaceId,
      layerType: 'symbolic',
      enabled: true,
      scenePreset: 'symbolic-default',
      weatherPreset: 'soft-memory-weather',
      objectOverrides: [],
      narratorTone: 'reflective',
      privacyLevel: 'demo',
    },
    {
      id: `${memoryPlaceId}-timeline-layer`,
      memoryPlaceId,
      layerType: 'timeline',
      enabled: false,
      scenePreset: 'timeline-default',
      weatherPreset: 'timeline-weather',
      objectOverrides: [],
      narratorTone: 'quiet',
      privacyLevel: 'demo',
    },
  ]
}
