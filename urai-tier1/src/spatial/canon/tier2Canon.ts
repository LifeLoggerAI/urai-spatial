export type CanonMode = 'home' | 'lifemap' | 'focus' | 'replay'
export type TransitionPhase =
  | 'idle'
  | 'open_lifemap'
  | 'close_lifemap'
  | 'open_focus'
  | 'close_focus'
  | 'open_replay'
  | 'close_replay'

export const TIER2_REPLAY_HOLD_MS = 2000

export const TIER2_MODE_PROFILE = {
  home: {
    clearColor: '#02060b',
    fogColor: '#02060b',
    fogNear: 8,
    fogFar: 38,
  },
  lifemap: {
    clearColor: '#01030a',
    fogColor: '#01030a',
    fogNear: 14,
    fogFar: 96,
  },
  focus: {
    clearColor: '#050814',
    fogColor: '#050814',
    fogNear: 10,
    fogFar: 56,
  },
  replay: {
    clearColor: '#0b040d',
    fogColor: '#0b040d',
    fogNear: 7,
    fogFar: 28,
  },
} as const

export function isReplayEnvelope(mode: string, phase: string): boolean {
  return mode === 'replay' || phase === 'open_replay' || phase === 'close_replay'
}

export function isFocusEnvelope(mode: string, phase: string): boolean {
  return mode === 'focus' || phase === 'open_focus' || phase === 'close_focus'
}

export function resolveReplayVeilOpacity(phase: string): number {
  if (phase === 'open_replay') return 0.18
  if (phase === 'close_replay') return 0.10
  return 0.22
}

export function resolveFocusBoost(isSelected: boolean): number {
  return isSelected ? 1.28 : 0.82
}

export function resolveFocusOpacity(isSelected: boolean): number {
  return isSelected ? 1.0 : 0.22
}

export function resolveDepthScale(z: number): number {
  if (z <= -90) return 0.68
  if (z <= -45) return 0.84
  return 1.0
}

export const CANON_ACTIONS = [
  'OPEN_FOCUS',
  'CLOSE_FOCUS',
  'OPEN_REPLAY',
  'CLOSE_REPLAY',
  'ESCAPE',
] as const
