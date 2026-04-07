import type { Tier1Mode, UraiPhase } from './types'

export function resolveEscPhaseTarget(phase: UraiPhase): UraiPhase | null {
  if (phase === 'REPLAY') return 'FOCUS'
  if (phase === 'FOCUS') return 'LIFEMAP'
  if (phase === 'LIFEMAP') return 'HOME'
  return null
}

export function resolveEscModeTarget(phase: UraiPhase): Tier1Mode | null {
  if (phase === 'REPLAY') return 'focus'
  if (phase === 'FOCUS') return 'lifemap'
  if (phase === 'LIFEMAP') return 'home'
  return null
}

export function canEsc(phase: UraiPhase): boolean {
  return resolveEscPhaseTarget(phase) !== null
}
