import type { TransitionSpec, UraiPhase } from './types'

export const TRANSITION_MATRIX: Record<UraiPhase, UraiPhase[]> = {
  HOME: ['ASCENT'],
  ASCENT: ['LIFEMAP'],
  LIFEMAP: ['FOCUS', 'HOME'],
  FOCUS: ['REPLAY', 'LIFEMAP'],
  REPLAY: ['FOCUS'],
}

export const TRANSITION_SPECS: Record<string, TransitionSpec> = {
  HOME__ASCENT: { from: 'HOME', to: 'ASCENT', durationMs: 2200, damping: 5.8 },
  ASCENT__LIFEMAP: { from: 'ASCENT', to: 'LIFEMAP', durationMs: 1200, damping: 5.2 },
  LIFEMAP__FOCUS: { from: 'LIFEMAP', to: 'FOCUS', durationMs: 950, damping: 5.0 },
  FOCUS__REPLAY: { from: 'FOCUS', to: 'REPLAY', durationMs: 1350, damping: 4.8 },
  REPLAY__FOCUS: { from: 'REPLAY', to: 'FOCUS', durationMs: 900, damping: 5.0 },
  FOCUS__LIFEMAP: { from: 'FOCUS', to: 'LIFEMAP', durationMs: 900, damping: 5.2 },
  LIFEMAP__HOME: { from: 'LIFEMAP', to: 'HOME', durationMs: 1500, damping: 5.0 },
}

export function getTransitionSpec(from: UraiPhase, to: UraiPhase): TransitionSpec | null {
  return TRANSITION_SPECS[`${from}__${to}`] ?? null
}

export function canTransition(from: UraiPhase, to: UraiPhase): boolean {
  return Boolean(TRANSITION_MATRIX[from]?.includes(to))
}
