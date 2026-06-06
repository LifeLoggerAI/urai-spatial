import { MemoryPlaceRepository, fallbackMemoryPlaceRepository } from './memoryPlaceRepository'

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
      // Fallback remains active until the live adapter is connected.
      return fallbackMemoryPlaceRepository.resolvePlace(placeId, { ...context, userId: options.userId, source: 'fallback' })
    },
    async listPlaceObjects(placeId, context) {
      // Firestore wiring point:
      // users/{userId}/placeObjects where memoryPlaceId == placeId
      return fallbackMemoryPlaceRepository.listPlaceObjects(placeId, { ...context, userId: options.userId, source: 'fallback' })
    },
    async listPlaces(context) {
      // Firestore wiring point:
      // users/{userId}/memoryPlaces
      return fallbackMemoryPlaceRepository.listPlaces({ ...context, userId: options.userId, source: 'fallback' })
    },
  }
}
