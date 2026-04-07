import type { AuthorityPhase, Tier1Mode, UraiPhase } from './types'
import { modeToPhase, phaseToMode } from './state'

type PhaseLike = AuthorityPhase | Tier1Mode | string

export const LEGAL_PHASE_TRANSITIONS: Record<UraiPhase, UraiPhase[]> = {
  HOME: ['ASCENT'],
  ASCENT: ['LIFEMAP'],
  LIFEMAP: ['FOCUS', 'HOME'],
  FOCUS: ['REPLAY', 'LIFEMAP'],
  REPLAY: ['FOCUS'],
}

export function normalizeAuthorityPhase(input: PhaseLike): UraiPhase | null {
  if (input === 'HOME' || input === 'ASCENT' || input === 'LIFEMAP' || input === 'FOCUS' || input === 'REPLAY') {
    return input
  }
  if (input === 'home' || input === 'ascent' || input === 'lifemap' || input === 'focus' || input === 'replay') {
    return modeToPhase(input)
  }
  return null
}

export function assertAuthorityTransition(from: PhaseLike, to: PhaseLike): boolean {
  const a = normalizeAuthorityPhase(from)
  const b = normalizeAuthorityPhase(to)
  if (!a || !b) return false
  return Boolean(LEGAL_PHASE_TRANSITIONS[a]?.includes(b))
}

export function isFocusOrReplay(phase: PhaseLike): boolean {
  const p = normalizeAuthorityPhase(phase)
  return p === 'FOCUS' || p === 'REPLAY'
}

export function isReplayPhase(phase: PhaseLike): boolean {
  return normalizeAuthorityPhase(phase) === 'REPLAY'
}

export function isHomeLike(phase: PhaseLike): boolean {
  const p = normalizeAuthorityPhase(phase)
  return p === 'HOME' || p === 'ASCENT'
}

export function resolveStableMode(phase: PhaseLike): Tier1Mode {
  const normalized = normalizeAuthorityPhase(phase) ?? 'HOME'
  return phaseToMode(normalized)
}
