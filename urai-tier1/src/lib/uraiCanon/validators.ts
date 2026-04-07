import type { UraiPhase, UraiState } from './types'

export function isUraiState(value: unknown): value is UraiState {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v.phase === 'string' &&
    typeof v.mode === 'string' &&
    typeof v.isTransitioning === 'boolean' &&
    typeof v.transitioning === 'boolean' &&
    typeof v.inputLocked === 'boolean' &&
    typeof v.transitionLock === 'boolean'
  )
}

export function hasValidPhase(value: unknown): value is UraiPhase {
  return value === 'HOME' ||
    value === 'ASCENT' ||
    value === 'LIFEMAP' ||
    value === 'FOCUS' ||
    value === 'REPLAY'
}

export function requiresSelectedStar(phase: UraiPhase): boolean {
  return phase === 'FOCUS' || phase === 'REPLAY'
}
