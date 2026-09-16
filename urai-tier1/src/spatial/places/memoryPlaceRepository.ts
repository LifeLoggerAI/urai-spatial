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

const personalizedSourceRequired = (): MemoryPlaceResolution => ({
  ok: false,
  status: 404,
  reason: 'personalized-place-source-required',
  safeHref: '/ground',
})

/** Ordinary user authority when no validated personalized provider is active. */
export const failClosedMemoryPlaceRepository: MemoryPlaceRepository = {
  async resolvePlace() {
    return personalizedSourceRequired()
  },
  async listPlaceObjects() {
    return []
  },
  async listPlaces() {
    return []
  },
}

/** Historical/demo authority only. It must never be the ordinary user fallback. */
export const demoMemoryPlaceRepository: MemoryPlaceRepository = {
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
  if (context?.source === 'demo') return demoMemoryPlaceRepository.resolvePlace(placeId, context)
  return failClosedMemoryPlaceRepository.resolvePlace(placeId, context)
}

export async function listMemoryPlaceObjects(placeId: string | undefined | null, context?: MemoryPlaceRepositoryContext) {
  if (context?.source === 'demo') return demoMemoryPlaceRepository.listPlaceObjects(placeId, context)
  return failClosedMemoryPlaceRepository.listPlaceObjects(placeId, context)
}

export async function listMemoryPlaces(context?: MemoryPlaceRepositoryContext) {
  if (context?.source === 'demo') return demoMemoryPlaceRepository.listPlaces(context)
  return failClosedMemoryPlaceRepository.listPlaces(context)
}
