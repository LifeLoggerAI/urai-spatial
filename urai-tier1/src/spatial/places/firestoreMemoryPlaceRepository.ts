import { MemoryPlaceRepository, failClosedMemoryPlaceRepository } from './memoryPlaceRepository'
import { validateMemoryPlace, validatePlaceObject } from './memoryPlaceValidation'

export type FirestoreMemoryPlaceRepositoryOptions = {
  enabled: boolean
  userId?: string | null
}

export function createFirestoreMemoryPlaceRepository(options: FirestoreMemoryPlaceRepositoryOptions): MemoryPlaceRepository {
  if (!options.enabled || !options.userId) return failClosedMemoryPlaceRepository

  return {
    async resolvePlace(placeId, context) {
      // Firestore wiring point:
      // users/{userId}/memoryPlaces/{placeId}
      // No live provider is wired in this repository yet. Until one exists,
      // fail closed rather than substituting demo or generated autobiographical data.
      const resolved = await failClosedMemoryPlaceRepository.resolvePlace(placeId, { ...context, userId: options.userId, source: 'firestore' })
      if (!resolved.ok) return resolved
      const validation = validateMemoryPlace(resolved.place)
      if (!validation.ok) return { ok: false, status: 404, reason: 'invalid-memory-place', safeHref: '/ground' }
      return { ...resolved, place: validation.value }
    },
    async listPlaceObjects(placeId, context) {
      const objects = await failClosedMemoryPlaceRepository.listPlaceObjects(placeId, { ...context, userId: options.userId, source: 'firestore' })
      return objects.flatMap((object) => {
        const validation = validatePlaceObject(object)
        return validation.ok ? [validation.value] : []
      })
    },
    async listPlaces(context) {
      const places = await failClosedMemoryPlaceRepository.listPlaces({ ...context, userId: options.userId, source: 'firestore' })
      return places.flatMap((place) => {
        const validation = validateMemoryPlace(place)
        return validation.ok ? [validation.value] : []
      })
    },
  }
}
