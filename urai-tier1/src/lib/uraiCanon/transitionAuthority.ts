import { assertAuthorityTransition, normalizeAuthorityPhase } from '@/lib/uraiCanon/authorityGuards'
import type { AuthorityPhase, Tier1Mode, TransitionPhase, UraiPhase } from '@/lib/uraiCanon/types'

type PhaseLike = AuthorityPhase | Tier1Mode | string

export function normalizePhaseLike(input: PhaseLike): UraiPhase | null {
  return normalizeAuthorityPhase(input)
}

export function assertTransitionAuthority(from: PhaseLike, to: PhaseLike): boolean {
  return assertAuthorityTransition(from, to)
}

export function resolveAuthorityTransition(from: PhaseLike): UraiPhase | null {
  const phase = normalizeAuthorityPhase(from)
  if (phase === 'HOME') return 'ASCENT'
  if (phase === 'ASCENT') return 'LIFEMAP'
  if (phase === 'LIFEMAP') return 'FOCUS'
  if (phase === 'FOCUS') return 'REPLAY'
  if (phase === 'REPLAY') return 'FOCUS'
  return null
}

export function resolveTransitionPhaseName(from: PhaseLike, to: PhaseLike): TransitionPhase {
  const a = normalizeAuthorityPhase(from)
  const b = normalizeAuthorityPhase(to)

  if (a === 'HOME' && b === 'ASCENT') return 'ascent'
  if (a === 'ASCENT' && b === 'LIFEMAP') return 'arrive_lifemap'
  if (a === 'LIFEMAP' && b === 'FOCUS') return 'open_focus'
  if (a === 'FOCUS' && b === 'REPLAY') return 'open_replay'
  if (a === 'REPLAY' && b === 'FOCUS') return 'close_replay'
  if (a === 'FOCUS' && b === 'LIFEMAP') return 'close_focus'
  if (a === 'LIFEMAP' && b === 'HOME') return 'go_home'
  return 'idle'
}
