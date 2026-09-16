import type { ReconstructionFidelity } from './livedWorldGraph'

export const GROUND_MEMORY_CONTEXT_SESSION_KEY = 'urai:ground:memory-context:v1'

export type GroundCameraOrigin = {
  position: readonly [number, number, number]
  yaw: number
  pitch: number
}

export type GroundMemoryContext = {
  schemaVersion: 'urai-ground-memory-context-1'
  originRealm: 'ground'
  placeId: string
  memoryId: string
  eraId?: string
  personPresenceIds: readonly string[]
  sourceIds: readonly string[]
  privacyPurposes: readonly string[]
  reconstructionFidelity: ReconstructionFidelity
  camera: GroundCameraOrigin
  returnToken: string
  createdAt: string
}

export function makeGroundMemoryContext(input: Omit<GroundMemoryContext, 'schemaVersion' | 'originRealm' | 'createdAt'> & { createdAt?: string }): GroundMemoryContext {
  if (!input.placeId || !input.memoryId || !input.returnToken) throw new Error('GROUND_MEMORY_CONTEXT_IDENTITY_REQUIRED')
  if (!input.sourceIds.length && input.reconstructionFidelity === 'confirmed') throw new Error('CONFIRMED_MEMORY_REQUIRES_SOURCE')
  return {
    ...input,
    schemaVersion: 'urai-ground-memory-context-1',
    originRealm: 'ground',
    createdAt: input.createdAt ?? new Date().toISOString(),
    personPresenceIds: [...new Set(input.personPresenceIds)],
    sourceIds: [...new Set(input.sourceIds)],
    privacyPurposes: [...new Set(input.privacyPurposes)],
  }
}

export function serializeGroundMemoryContext(context: GroundMemoryContext) {
  return JSON.stringify(context)
}

export function parseGroundMemoryContext(raw: string | null): GroundMemoryContext | null {
  if (!raw) return null
  try {
    const value = JSON.parse(raw) as Partial<GroundMemoryContext>
    if (value.schemaVersion !== 'urai-ground-memory-context-1' || value.originRealm !== 'ground') return null
    if (!value.placeId || !value.memoryId || !value.returnToken || !value.createdAt) return null
    if (!Array.isArray(value.personPresenceIds) || !value.personPresenceIds.every((id) => typeof id === 'string')) return null
    if (!Array.isArray(value.sourceIds) || !value.sourceIds.every((id) => typeof id === 'string')) return null
    if (!Array.isArray(value.privacyPurposes) || !value.privacyPurposes.every((purpose) => typeof purpose === 'string')) return null
    if (value.reconstructionFidelity !== 'confirmed' && value.reconstructionFidelity !== 'partial' && value.reconstructionFidelity !== 'unknown') return null
    const camera = value.camera
    if (!camera || !Array.isArray(camera.position) || camera.position.length !== 3 || !camera.position.every((entry) => Number.isFinite(entry))) return null
    if (!Number.isFinite(camera.yaw) || !Number.isFinite(camera.pitch)) return null
    if (value.reconstructionFidelity === 'confirmed' && value.sourceIds.length === 0) return null
    return value as GroundMemoryContext
  } catch {
    return null
  }
}

export function persistGroundMemoryContext(context: GroundMemoryContext) {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(GROUND_MEMORY_CONTEXT_SESSION_KEY, serializeGroundMemoryContext(context))
}

export function readGroundMemoryContext() {
  if (typeof window === 'undefined') return null
  try {
    return parseGroundMemoryContext(window.sessionStorage.getItem(GROUND_MEMORY_CONTEXT_SESSION_KEY))
  } catch {
    return null
  }
}

export function clearGroundMemoryContext() {
  if (typeof window === 'undefined') return
  try { window.sessionStorage.removeItem(GROUND_MEMORY_CONTEXT_SESSION_KEY) } catch { /* storage remains best-effort */ }
}
