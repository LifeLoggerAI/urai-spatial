export type GroundDescentPhase =
  | 'ground-recognition'
  | 'home-avatar-camera-approach'
  | 'home-avatar-eye-transfer'
  | 'ground-surface-approach'
  | 'ground-surface-crossing'
  | 'ground-spatial-fold'
  | 'ground-world-reveal'
  | 'ground-arrival-handoff'
  | 'ground-first-person'

export type GroundReturnPhase =
  | 'ground-return-commit'
  | 'ground-return-compression'
  | 'ground-return-geology'
  | 'ground-return-surface-crossing'
  | 'home-avatar-eye-return'
  | 'home-avatar-camera-withdraw'
  | 'home-idle-restored'

export type GroundPhaseWindow<T extends string> = {
  phase: T
  startMs: number
  endMs: number
}

export const GROUND_DESCENT_TOTAL_MS = 2650
export const GROUND_REDUCED_MOTION_TOTAL_MS = 520
export const GROUND_RETURN_TOTAL_MS = 2650
export const GROUND_REDUCED_RETURN_TOTAL_MS = 520

export const GROUND_DESCENT_WINDOWS: readonly GroundPhaseWindow<GroundDescentPhase>[] = [
  { phase: 'ground-recognition', startMs: 0, endMs: 180 },
  { phase: 'home-avatar-camera-approach', startMs: 180, endMs: 550 },
  { phase: 'home-avatar-eye-transfer', startMs: 550, endMs: 720 },
  { phase: 'ground-surface-approach', startMs: 720, endMs: 1100 },
  { phase: 'ground-surface-crossing', startMs: 1100, endMs: 1560 },
  { phase: 'ground-spatial-fold', startMs: 1560, endMs: 2100 },
  { phase: 'ground-world-reveal', startMs: 2100, endMs: 2420 },
  { phase: 'ground-arrival-handoff', startMs: 2420, endMs: GROUND_DESCENT_TOTAL_MS },
] as const

// Reduced motion preserves the same semantic order while removing the long
// translational/parallax-heavy camera travel. These windows are intentionally
// short but non-zero so assistive narration, lighting, material state and route
// ownership remain deterministic.
export const GROUND_REDUCED_DESCENT_WINDOWS: readonly GroundPhaseWindow<GroundDescentPhase>[] = [
  { phase: 'ground-recognition', startMs: 0, endMs: 70 },
  { phase: 'home-avatar-camera-approach', startMs: 70, endMs: 135 },
  { phase: 'home-avatar-eye-transfer', startMs: 135, endMs: 195 },
  { phase: 'ground-surface-approach', startMs: 195, endMs: 260 },
  { phase: 'ground-surface-crossing', startMs: 260, endMs: 350 },
  { phase: 'ground-spatial-fold', startMs: 350, endMs: 430 },
  { phase: 'ground-world-reveal', startMs: 430, endMs: 485 },
  { phase: 'ground-arrival-handoff', startMs: 485, endMs: GROUND_REDUCED_MOTION_TOTAL_MS },
] as const

export const GROUND_RETURN_WINDOWS: readonly GroundPhaseWindow<GroundReturnPhase>[] = [
  { phase: 'ground-return-commit', startMs: 0, endMs: 180 },
  { phase: 'ground-return-compression', startMs: 180, endMs: 720 },
  { phase: 'ground-return-geology', startMs: 720, endMs: 1320 },
  { phase: 'ground-return-surface-crossing', startMs: 1320, endMs: 1900 },
  { phase: 'home-avatar-eye-return', startMs: 1900, endMs: 2260 },
  { phase: 'home-avatar-camera-withdraw', startMs: 2260, endMs: GROUND_RETURN_TOTAL_MS },
] as const

export const GROUND_REDUCED_RETURN_WINDOWS: readonly GroundPhaseWindow<GroundReturnPhase>[] = [
  { phase: 'ground-return-commit', startMs: 0, endMs: 70 },
  { phase: 'ground-return-compression', startMs: 70, endMs: 155 },
  { phase: 'ground-return-geology', startMs: 155, endMs: 255 },
  { phase: 'ground-return-surface-crossing', startMs: 255, endMs: 360 },
  { phase: 'home-avatar-eye-return', startMs: 360, endMs: 435 },
  { phase: 'home-avatar-camera-withdraw', startMs: 435, endMs: GROUND_REDUCED_RETURN_TOTAL_MS },
] as const

function phaseAt<T extends string>(elapsedMs: number, windows: readonly GroundPhaseWindow<T>[], terminal: T): T {
  const elapsed = Math.max(0, elapsedMs)
  for (const window of windows) {
    if (elapsed < window.endMs) return window.phase
  }
  return terminal
}

export function groundDescentPhaseAt(elapsedMs: number, reducedMotion = false): GroundDescentPhase {
  return phaseAt(
    elapsedMs,
    reducedMotion ? GROUND_REDUCED_DESCENT_WINDOWS : GROUND_DESCENT_WINDOWS,
    'ground-first-person',
  )
}

export function groundReturnPhaseAt(elapsedMs: number, reducedMotion = false): GroundReturnPhase {
  return phaseAt(
    elapsedMs,
    reducedMotion ? GROUND_REDUCED_RETURN_WINDOWS : GROUND_RETURN_WINDOWS,
    'home-idle-restored',
  )
}

export function groundTransitionProgress(elapsedMs: number, reducedMotion = false) {
  const total = reducedMotion ? GROUND_REDUCED_MOTION_TOTAL_MS : GROUND_DESCENT_TOTAL_MS
  return Math.min(1, Math.max(0, elapsedMs / total))
}

export function groundReturnProgress(elapsedMs: number, reducedMotion = false) {
  const total = reducedMotion ? GROUND_REDUCED_RETURN_TOTAL_MS : GROUND_RETURN_TOTAL_MS
  return Math.min(1, Math.max(0, elapsedMs / total))
}
