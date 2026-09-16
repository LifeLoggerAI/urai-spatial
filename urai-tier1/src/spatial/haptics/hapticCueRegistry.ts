export type SpatialHapticCueId =
  | 'enter-place'
  | 'select-object'
  | 'start-replay'
  | 'complete-replay'
  | 'portal-open'
  | 'gate-shown'
  | 'return-home'
  | 'ground-activation'
  | 'ground-crossing'
  | 'ground-arrival'
  | 'orb-attention'
  | 'memory-ready'
  | 'replay-commit'

export type SpatialHapticCue = {
  id: SpatialHapticCueId
  label: string
  patternMs: number[]
  reducedMotionSafe: boolean
}

export const HAPTIC_CUE_REGISTRY: Record<SpatialHapticCueId, SpatialHapticCue> = {
  'enter-place': { id: 'enter-place', label: 'Enter Place', patternMs: [16, 24, 32], reducedMotionSafe: true },
  'select-object': { id: 'select-object', label: 'Select Object', patternMs: [12], reducedMotionSafe: true },
  'start-replay': { id: 'start-replay', label: 'Start Replay', patternMs: [18, 32, 18], reducedMotionSafe: true },
  'complete-replay': { id: 'complete-replay', label: 'Complete Replay', patternMs: [24, 24, 48], reducedMotionSafe: true },
  'portal-open': { id: 'portal-open', label: 'Portal Open', patternMs: [20, 20, 20], reducedMotionSafe: true },
  'gate-shown': { id: 'gate-shown', label: 'Gate Shown', patternMs: [10], reducedMotionSafe: true },
  'return-home': { id: 'return-home', label: 'Return Home', patternMs: [18], reducedMotionSafe: true },
  'ground-activation': { id: 'ground-activation', label: 'Ground Activation', patternMs: [12], reducedMotionSafe: true },
  'ground-crossing': { id: 'ground-crossing', label: 'Ground Material Crossing', patternMs: [14, 34, 20], reducedMotionSafe: true },
  'ground-arrival': { id: 'ground-arrival', label: 'Ground Arrival', patternMs: [24], reducedMotionSafe: true },
  'orb-attention': { id: 'orb-attention', label: 'Orb Attention', patternMs: [10], reducedMotionSafe: true },
  'memory-ready': { id: 'memory-ready', label: 'Memory Ready', patternMs: [18, 90, 8], reducedMotionSafe: true },
  'replay-commit': { id: 'replay-commit', label: 'Replay Commit', patternMs: [22], reducedMotionSafe: true },
}

export function getHapticCue(id: SpatialHapticCueId) {
  return HAPTIC_CUE_REGISTRY[id]
}
