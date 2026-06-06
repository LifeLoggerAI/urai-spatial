import { MemoryPlace } from './memoryPlaceSchema'
import { PlaceObject } from './placeObjectSchema'

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: string }

function isTuple3(value: unknown): value is [number, number, number] {
  return Array.isArray(value) && value.length === 3 && value.every((item) => typeof item === 'number' && Number.isFinite(item))
}

export function validateMemoryPlace(value: unknown): ValidationResult<MemoryPlace> {
  if (!value || typeof value !== 'object') return { ok: false, reason: 'not-object' }
  const place = value as Partial<MemoryPlace>
  if (typeof place.id !== 'string') return { ok: false, reason: 'missing-id' }
  if (typeof place.title !== 'string') return { ok: false, reason: 'missing-title' }
  if (!Array.isArray(place.memoryIds)) return { ok: false, reason: 'missing-memoryIds' }
  if (!place.reconstruction) return { ok: false, reason: 'missing-reconstruction' }
  if (!place.emotionalOverlay) return { ok: false, reason: 'missing-emotionalOverlay' }
  if (!place.navigation || !isTuple3(place.navigation.spawnPoint) || !isTuple3(place.navigation.exitPortalPosition)) {
    return { ok: false, reason: 'invalid-navigation' }
  }
  if (!place.privacyLevel) return { ok: false, reason: 'missing-privacyLevel' }
  if (!place.locationPrivacy) return { ok: false, reason: 'missing-locationPrivacy' }
  return { ok: true, value: place as MemoryPlace }
}

export function validatePlaceObject(value: unknown): ValidationResult<PlaceObject> {
  if (!value || typeof value !== 'object') return { ok: false, reason: 'not-object' }
  const object = value as Partial<PlaceObject>
  if (typeof object.id !== 'string') return { ok: false, reason: 'missing-id' }
  if (typeof object.memoryPlaceId !== 'string') return { ok: false, reason: 'missing-memoryPlaceId' }
  if (typeof object.label !== 'string') return { ok: false, reason: 'missing-label' }
  if (!isTuple3(object.position)) return { ok: false, reason: 'invalid-position' }
  if (typeof object.scale !== 'number') return { ok: false, reason: 'missing-scale' }
  if (!object.privacyLevel) return { ok: false, reason: 'missing-privacyLevel' }
  return { ok: true, value: object as PlaceObject }
}
