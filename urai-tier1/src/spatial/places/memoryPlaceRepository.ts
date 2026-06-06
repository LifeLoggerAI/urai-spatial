import { MemoryPlace, MemoryPlaceResolution } from './memoryPlaceSchema'
import { PlaceObject } from './placeObjectSchema'
import { getDemoPlaceObjects } from './demoPlaceObjects'
import { resolveDemoMemoryPlace } from './demoMemoryPlaces'

export type MemoryPlaceRepositoryContext = {
  userId?: string | null
  source?: 'demo' | 'firestore' | 'fallback'
}

export type MemoryPlaceRepository = {
  resolvePlace(placeId: string | undefined | null, context?: MemoryPlaceRepositoryContext): Promise<MemoryPlaceResolution>
  listPlaceObjects(placeId: string | undefined | null, context?: MemoryPlaceRepositoryContext): Promise<PlaceObject[]>
  listPlaces(context?: MemoryPlaceRepositoryContext): Promise<MemoryPlace[]>
}

export const fallbackMemoryPlaceRepository: MemoryPlaceRepository = {
  async resolvePlace(placeId) {
    return resolveDemoMemoryPlace(placeId)
  },
  async listPlaceObjects(placeId) {
    return getDemoPlaceObjects(placeId)
  },
  async listPlaces() {
    const { DEMO_MEMORY_PLACES } = await import('./demoMemoryPlaces')
    return DEMO_MEMORY_PLACES
  },
}

export async function resolveMemoryPlace(placeId: string | undefined | null, context?: MemoryPlaceRepositoryContext) {
  return fallbackMemoryPlaceRepository.resolvePlace(placeId, context)
}

export async function listMemoryPlaceObjects(placeId: string | undefined | null, context?: MemoryPlaceRepositoryContext) {
  return fallbackMemoryPlaceRepository.listPlaceObjects(placeId, context)
}

export async function listMemoryPlaces(context?: MemoryPlaceRepositoryContext) {
  return fallbackMemoryPlaceRepository.listPlaces(context)
}
