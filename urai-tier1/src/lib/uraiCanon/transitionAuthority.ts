import {
  normalizeAuthorityPhase,
  assertAuthorityTransition,
  isFocusOrReplay,
  isReplayPhase,
  isHomeLike,
  resolveStableMode,
} from '@/lib/uraiCanon/authorityGuards'
import type { Phase, UraiPhase } from '@/lib/uraiCanon/state'

export type AuthorityPhase = Phase | UraiPhase

export function normalizeTransitionPhase(input: AuthorityPhase): UraiPhase {
  return normalizeAuthorityPhase(input)
}

export function canTransition(from: AuthorityPhase, to: AuthorityPhase): boolean {
  try {
    assertAuthorityTransition(from, to)
    return true
  } catch {
    return false
  }
}

export function isImmersivePhase(input: AuthorityPhase): boolean {
  return isFocusOrReplay(input)
}

export function isTerminalReplayPhase(input: AuthorityPhase): boolean {
  return isReplayPhase(input)
}

export function isHomeEnvelopePhase(input: AuthorityPhase): boolean {
  return isHomeLike(input)
}

export function getStableAuthorityPhase(input: AuthorityPhase): UraiPhase {
  return resolveStableMode(input)
}

// ---- RESTORED API SURFACE (COMPAT LAYER) ----

export const normalizePhaseLike = normalizeTransitionPhase

export function assertTransitionAuthority(from: AuthorityPhase, to: AuthorityPhase): boolean {
  return canTransition(from, to)
}

export function resolveAuthorityTransition(from: AuthorityPhase, to: AuthorityPhase): UraiPhase {
  assertAuthorityTransition(from, to)
  return normalizeTransitionPhase(to)
}

export function resolveTransitionPhaseName(input: AuthorityPhase): UraiPhase {
  return normalizeTransitionPhase(input)
}
