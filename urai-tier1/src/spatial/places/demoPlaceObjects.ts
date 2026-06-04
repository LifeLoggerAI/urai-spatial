import { PlaceObject } from './placeObjectSchema'
import { DEMO_MEMORY_PLACES } from './demoMemoryPlaces'

export const DEMO_PLACE_OBJECTS: PlaceObject[] = DEMO_MEMORY_PLACES.flatMap((place) => [
  {
    id: `${place.id}-entry`,
    memoryPlaceId: place.id,
    memoryId: place.memoryIds[0],
    objectType: 'threshold',
    label: 'Entry',
    position: [0, 1.2, -3.2],
    scale: 1,
    interactionType: 'open-portal',
    privacyLevel: 'demo',
  },
  {
    id: `${place.id}-marker-a`,
    memoryPlaceId: place.id,
    memoryId: place.memoryIds[0],
    objectType: 'echo',
    label: 'Marker A',
    position: [-1.6, 1.1, -0.8],
    scale: 0.8,
    interactionType: 'inspect',
    privacyLevel: 'demo',
  },
  {
    id: `${place.id}-marker-b`,
    memoryPlaceId: place.id,
    memoryId: place.memoryIds[0],
    objectType: 'artifact',
    label: 'Marker B',
    position: [1.45, 0.75, -1.2],
    scale: 0.9,
    interactionType: 'replay',
    privacyLevel: 'demo',
  },
])

export const DEMO_PLACE_OBJECTS_BY_PLACE_ID: Record<string, PlaceObject[]> = DEMO_PLACE_OBJECTS.reduce(
  (acc, object) => {
    acc[object.memoryPlaceId] = [...(acc[object.memoryPlaceId] ?? []), object]
    return acc
  },
  {} as Record<string, PlaceObject[]>,
)

export function getDemoPlaceObjects(placeId: string | undefined | null) {
  if (!placeId) return []
  return DEMO_PLACE_OBJECTS_BY_PLACE_ID[placeId] ?? []
}
