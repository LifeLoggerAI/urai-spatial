import type { TransitionPhase } from '@/lib/uraiCanon/types'

export type LockWindowSpec = {
  durationMs: number
  unlockAtEnd: boolean
}

export const transitionDurations: Record<TransitionPhase, number> = {
  idle: 0,
  ascent: 4800,
  arrive_lifemap: 2600,
  open_focus: 1100,
  close_focus: 900,
  open_replay: 3000,
  close_replay: 1100,
  go_home: 2000,
}

export const transitionLockWindows: Record<TransitionPhase, LockWindowSpec> = {
  idle: { durationMs: 0, unlockAtEnd: true },
  ascent: { durationMs: 4800, unlockAtEnd: false },
  arrive_lifemap: { durationMs: 2600, unlockAtEnd: true },
  open_focus: { durationMs: 1100, unlockAtEnd: true },
  close_focus: { durationMs: 900, unlockAtEnd: true },
  open_replay: { durationMs: 3600, unlockAtEnd: true },
  close_replay: { durationMs: 1100, unlockAtEnd: true },
  go_home: { durationMs: 2000, unlockAtEnd: true },
}

export function resolveTransitionDuration(phase: TransitionPhase): number {
  return transitionDurations[phase] ?? 0
}

export function resolveTransitionDurationMs(phase: TransitionPhase): number {
  return resolveTransitionDuration(phase)
}

export function resolveTransitionLockMs(phase: TransitionPhase): number {
  return transitionLockWindows[phase]?.durationMs ?? 0
}

export function resolveLockWindowSpec(phase: TransitionPhase): LockWindowSpec {
  return transitionLockWindows[phase] ?? transitionLockWindows.idle
}

export function shouldUnlockAtEnd(phase: TransitionPhase): boolean {
  return transitionLockWindows[phase]?.unlockAtEnd ?? true
}
