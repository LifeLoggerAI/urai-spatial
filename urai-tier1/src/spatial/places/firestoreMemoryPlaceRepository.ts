import { MemoryPlaceRepository, fallbackMemoryPlaceRepository } from './memoryPlaceRepository'
import { validateMemoryPlace, validatePlaceObject } from './memoryPlaceValidation'

export type FirestoreMemoryPlaceRepositoryOptions = {
  enabled: boolean
  userId?: string | null
}

export function createFirestoreMemoryPlaceRepository(options: FirestoreMemoryPlaceRepositoryOptions): MemoryPlaceRepository {
  if (!options.enabled || !options.userId) return fallbackMemoryPlaceRepository

  return {
    async resolvePlace(placeId, context) {
      // Firestore wiring point:
      // users/{userId}/memoryPlaces/{placeId}
      // The live adapter must validate every loaded record with validateMemoryPlace.
      const resolved = await fallbackMemoryPlaceRepository.resolvePlace(placeId, { ...context, userId: options.userId, source: 'fallback' })
      if (!resolved.ok) return resolved
      const validation = validateMemoryPlace(resolved.place)
      if (!validation.ok) return { ok: false, status: 404, reason: 'invalid-memory-place', safeHref: '/life-map' }
      return { ...resolved, place: validation.value }
    },
    async listPlaceObjects(placeId, context) {
      // Firestore wiring point:
      // users/{userId}/placeObjects where memoryPlaceId == placeId
      const objects = await fallbackMemoryPlaceRepository.listPlaceObjects(placeId, { ...context, userId: options.userId, source: 'fallback' })
      return objects.flatMap((object) => {
        const validation = validatePlaceObject(object)
        return validation.ok ? [validation.value] : []
      })
    },
    async listPlaces(context) {
      // Firestore wiring point:
      // users/{userId}/memoryPlaces
      const places = await fallbackMemoryPlaceRepository.listPlaces({ ...context, userId: options.userId, source: 'fallback' })
      return places.flatMap((place) => {
        const validation = validateMemoryPlace(place)
        return validation.ok ? [validation.value] : []
      })
    },
  }
}
