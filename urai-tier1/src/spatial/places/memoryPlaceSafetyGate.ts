import { MemoryPlace } from './memoryPlaceSchema'

export type MemoryPlaceGateLevel = 'none' | 'soft' | 'required'
export type MemoryPlaceGateAction = 'enter' | 'preview' | 'summarize' | 'skip' | 'hide'

export type MemoryPlaceSafetyGate = {
  id: string
  memoryPlaceId: string
  level: MemoryPlaceGateLevel
  reason: 'private-context' | 'low-confidence' | 'missing-permission' | 'user-hidden' | 'none'
  actions: MemoryPlaceGateAction[]
  required: boolean
}

export function gateForMemoryPlace(place: Pick<MemoryPlace, 'id' | 'privacyLevel'>): MemoryPlaceSafetyGate {
  if (place.privacyLevel === 'sensitive') {
    return {
      id: `${place.id}-gate`,
      memoryPlaceId: place.id,
      level: 'required',
      reason: 'private-context',
      actions: ['enter', 'preview', 'summarize', 'skip', 'hide'],
      required: true,
    }
  }

  if (place.privacyLevel === 'private') {
    return {
      id: `${place.id}-gate`,
      memoryPlaceId: place.id,
      level: 'soft',
      reason: 'private-context',
      actions: ['enter', 'preview', 'skip'],
      required: false,
    }
  }

  return {
    id: `${place.id}-gate`,
    memoryPlaceId: place.id,
    level: 'none',
    reason: 'none',
    actions: ['enter'],
    required: false,
  }
}

export function canEnterPlaceWithoutGate(place: Pick<MemoryPlace, 'id' | 'privacyLevel'>) {
  return !gateForMemoryPlace(place).required
}
